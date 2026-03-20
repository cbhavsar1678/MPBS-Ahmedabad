import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Event, EventExpense, ExpenseEntry } from '../types';
import { Search, Plus, Edit2, Trash2, Eye, Download, FileText, X, PlusCircle, MinusCircle, IndianRupee, Calendar, TrendingUp } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import ConfirmationModal from './ConfirmationModal';
import { useFirebase } from '../contexts/FirebaseContext';

const EventExpenses: React.FC = () => {
  const { isAdmin } = useFirebase();
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByYear, setSortByYear] = useState<'asc' | 'desc'>('desc');
  const [sortByEventName, setSortByEventName] = useState<'asc' | 'desc' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<EventExpense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<EventExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  // Form state
  const [formData, setFormData] = useState<{
    eventId: string;
    year: string;
    entries: ExpenseEntry[];
  }>({
    eventId: '',
    year: new Date().getFullYear().toString(),
    entries: [{ amount: 0, description: '', date: new Date().toISOString().split('T')[0] }]
  });

  useEffect(() => {
    const unsubExpenses = onSnapshot(query(collection(db, 'event-expenses'), orderBy('year', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventExpense)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'event-expenses');
    });

    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    return () => {
      unsubExpenses();
      unsubEvents();
    };
  }, []);

  const { groupedExpenses, overallGrandTotal, eventTotals } = useMemo(() => {
    let result = expenses.filter(exp => 
      exp.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.year.includes(searchTerm)
    );

    result.sort((a, b) => {
      if (sortByEventName) {
        if (sortByEventName === 'asc') return a.eventName.localeCompare(b.eventName);
        return b.eventName.localeCompare(a.eventName);
      }
      if (sortByYear === 'asc') return a.year.localeCompare(b.year);
      return b.year.localeCompare(a.year);
    });

    const overallTotal = result.reduce((sum, exp) => sum + exp.totalAmount, 0);

    const groups: { [key: string]: EventExpense[] } = {};
    const eventSummaries: { [key: string]: number } = {};

    result.forEach(exp => {
      if (!groups[exp.year]) groups[exp.year] = [];
      groups[exp.year].push(exp);

      if (!eventSummaries[exp.eventName]) eventSummaries[exp.eventName] = 0;
      eventSummaries[exp.eventName] += exp.totalAmount;
    });

    return { 
      groupedExpenses: groups, 
      overallGrandTotal: overallTotal,
      eventTotals: eventSummaries
    };
  }, [expenses, searchTerm, sortByYear, sortByEventName]);

  const sortedYears = useMemo(() => {
    return Object.keys(groupedExpenses).sort((a, b) => {
      if (sortByYear === 'asc') return a.localeCompare(b);
      return b.localeCompare(a);
    });
  }, [groupedExpenses, sortByYear]);

  const handleAddEntry = () => {
    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, { amount: 0, description: '', date: new Date().toISOString().split('T')[0] }]
    }));
  };

  const handleRemoveEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const handleEntryChange = (index: number, field: keyof ExpenseEntry, value: any) => {
    const newEntries = [...formData.entries];
    newEntries[index] = { ...newEntries[index], [field]: field === 'amount' ? Number(value) : value };
    setFormData(prev => ({ ...prev, entries: newEntries }));
  };

  const totalAmount = formData.entries.reduce((sum, entry) => sum + entry.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const selectedEvent = events.find(ev => ev.id === formData.eventId);
    if (!selectedEvent) return;

    const expenseData = {
      eventId: formData.eventId,
      eventName: selectedEvent.name,
      year: formData.year,
      expenses: formData.entries,
      totalAmount: totalAmount
    };

    try {
      if (editingExpense?.id) {
        await updateDoc(doc(db, 'event-expenses', editingExpense.id), expenseData);
      } else {
        await addDoc(collection(db, 'event-expenses'), expenseData);
      }
      setShowForm(false);
      setEditingExpense(null);
      setFormData({
        eventId: '',
        year: new Date().getFullYear().toString(),
        entries: [{ amount: 0, description: '', date: new Date().toISOString().split('T')[0] }]
      });
    } catch (error) {
      handleFirestoreError(error, editingExpense ? OperationType.UPDATE : OperationType.CREATE, 'event-expenses');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.id && isAdmin) {
      try {
        await deleteDoc(doc(db, 'event-expenses', deleteConfirm.id));
        setDeleteConfirm({ isOpen: false, id: null });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'event-expenses');
      }
    }
  };

  const handleExportCSV = (data: EventExpense[], filename: string) => {
    const exportData = data.map(exp => ({
      'Event Name': exp.eventName,
      'Year': exp.year,
      'Total Amount': exp.totalAmount
    }));
    exportToCSV(exportData, filename);
  };

  const handleExportPDF = (data: EventExpense[], title: string, filename: string) => {
    const exportData = data.map(exp => ({
      'Event Name': exp.eventName,
      'Year': exp.year,
      'Total Amount': exp.totalAmount
    }));
    exportToPDF(exportData, title, filename);
  };

  const handleViewExportCSV = (expense: EventExpense) => {
    const exportData = expense.expenses.map(entry => ({
      'Description': entry.description,
      'Date': entry.date,
      'Amount': entry.amount
    }));
    exportToCSV(exportData, `${expense.eventName}_expenses_${expense.year}`);
  };

  const handleViewExportPDF = (expense: EventExpense) => {
    const exportData = expense.expenses.map(entry => ({
      'Description': entry.description,
      'Date': entry.date,
      'Amount': entry.amount
    }));
    exportToPDF(exportData, `${expense.eventName} - ${expense.year}`, `${expense.eventName}_expenses_${expense.year}`);
  };

  const handleExportCSVAll = () => {
    const allData: EventExpense[] = [];
    sortedYears.forEach(year => {
      allData.push(...groupedExpenses[year]);
    });
    handleExportCSV(allData, 'event_expenses');
  };

  const handleExportPDFAll = () => {
    const allData: EventExpense[] = [];
    sortedYears.forEach(year => {
      allData.push(...groupedExpenses[year]);
    });
    handleExportPDF(allData, 'Event Expenses', 'event_expenses');
  };

  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Access Denied</div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Event Expenses</h2>
          <p className="text-gray-500 mt-1">Manage and track expenses for all community events</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-50 px-4 py-2 rounded-xl flex items-center mr-4">
            <span className="text-sm font-bold text-indigo-900 mr-2 uppercase tracking-wider">Grand Total:</span>
            <span className="text-xl font-black text-indigo-600 flex items-center">
              <IndianRupee size={18} className="mr-0.5" />
              {overallGrandTotal.toLocaleString()}
            </span>
          </div>
          <button 
            onClick={handleExportCSVAll}
            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            title="Export CSV"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={handleExportPDFAll}
            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            title="Export PDF"
          >
            <FileText size={20} />
          </button>
          <button
            onClick={() => {
              setEditingExpense(null);
              setFormData({
                eventId: '',
                year: new Date().getFullYear().toString(),
                entries: [{ amount: 0, description: '', date: new Date().toISOString().split('T')[0] }]
              });
              setShowForm(true);
            }}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={20} />
            <span>Add Event Expenses</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by event name or year..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            value={sortByYear}
            onChange={(e) => {
              setSortByYear(e.target.value as 'asc' | 'desc');
              setSortByEventName(null);
            }}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
          <select
            className="px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            value={sortByEventName || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setSortByEventName(null);
              } else {
                setSortByEventName(val as 'asc' | 'desc');
              }
            }}
          >
            <option value="">Sort by Event...</option>
            <option value="asc">Event: A-Z</option>
            <option value="desc">Event: Z-A</option>
          </select>
        </div>
      </div>

      {/* Event-wise Expense Summary Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="mr-2 text-indigo-600" size={24} />
            Event-wise Expense Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date / Year</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Event Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Total Expense</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.filter(exp => 
                exp.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                exp.year.includes(searchTerm)
              ).sort((a, b) => {
                if (sortByEventName) {
                  if (sortByEventName === 'asc') return a.eventName.localeCompare(b.eventName);
                  return b.eventName.localeCompare(a.eventName);
                }
                if (sortByYear === 'asc') return a.year.localeCompare(b.year);
                return b.year.localeCompare(a.year);
              }).map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar size={14} className="mr-2 text-indigo-400" />
                      <span className="font-medium">{expense.year}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{expense.eventName}</td>
                  <td className="px-6 py-4 text-right font-black text-indigo-600">₹{expense.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => setViewingExpense(expense)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingExpense(expense);
                          setFormData({
                            eventId: expense.eventId,
                            year: expense.year,
                            entries: expense.expenses
                          });
                          setShowForm(true);
                        }}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({ isOpen: true, id: expense.id! })}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-indigo-50 font-black border-t border-indigo-100">
              <tr>
                <td colSpan={2} className="px-6 py-4 text-indigo-900">GRAND TOTAL</td>
                <td className="px-6 py-4 text-right text-2xl text-indigo-600">₹{overallGrandTotal.toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="space-y-12">
        {/* Year sections removed as per request */}
        {expenses.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">No expense records found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <h3 className="text-xl font-bold">{editingExpense ? 'Edit Event Expenses' : 'Add Event Expenses'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Event Name</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    value={formData.eventId}
                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                  >
                    <option value="">Select Event</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Year</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900">Expense Entries</h4>
                  <button
                    type="button"
                    onClick={handleAddEntry}
                    className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-700 font-bold text-sm"
                  >
                    <PlusCircle size={18} />
                    <span>Add Entry</span>
                  </button>
                </div>

                {formData.entries.map((entry, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-2xl space-y-4 relative group">
                    {formData.entries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEntry(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                      >
                        <MinusCircle size={18} />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Description</label>
                        <input
                          type="text"
                          required
                          placeholder="Expense description"
                          className="w-full px-3 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                          value={entry.description}
                          onChange={(e) => handleEntryChange(index, 'description', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Amount (₹)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          className="w-full px-3 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                          value={entry.amount}
                          onChange={(e) => handleEntryChange(index, 'amount', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Date</label>
                        <input
                          type="date"
                          required
                          className="w-full px-3 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                          value={entry.date}
                          onChange={(e) => handleEntryChange(index, 'date', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-indigo-50 rounded-3xl flex items-center justify-between">
                <span className="text-lg font-bold text-indigo-900">Grand Total</span>
                <div className="flex items-center text-2xl font-black text-indigo-600">
                  <IndianRupee size={24} className="mr-1" />
                  {totalAmount.toLocaleString()}
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  {editingExpense ? 'Update Expenses' : 'Save Expenses'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <div>
                <h3 className="text-xl font-bold">{viewingExpense.eventName}</h3>
                <p className="text-indigo-100 text-sm">Year: {viewingExpense.year}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleViewExportCSV(viewingExpense)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  title="Export CSV"
                >
                  <Download size={20} />
                </button>
                <button 
                  onClick={() => handleViewExportPDF(viewingExpense)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  title="Export PDF"
                >
                  <FileText size={20} />
                </button>
                <button onClick={() => setViewingExpense(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 border-b pb-2">Expense Breakdown</h4>
                <div className="space-y-3">
                  {viewingExpense.expenses.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div>
                        <p className="font-bold text-gray-900">{entry.description}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Calendar size={12} className="mr-1" />
                          {entry.date}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-indigo-600">
                        ₹{entry.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 p-6 bg-indigo-50 rounded-3xl flex items-center justify-between">
                  <span className="text-lg font-bold text-indigo-900">Grand Total</span>
                  <div className="flex items-center text-3xl font-black text-indigo-600">
                    <IndianRupee size={28} className="mr-1" />
                    {viewingExpense.totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Expense Record"
        message="Are you sure you want to delete this expense record? This action cannot be undone."
      />
    </div>
  );
};

export default EventExpenses;
