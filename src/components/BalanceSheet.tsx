import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AnnualFee, Donation, EventExpense, BankDeposit } from '../types';
import { Search, Plus, Edit2, Trash2, Eye, Download, FileText, X, IndianRupee, Landmark, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import ConfirmationModal from './ConfirmationModal';
import { useFirebase } from '../contexts/FirebaseContext';

const BalanceSheet: React.FC = () => {
  const { isAdmin } = useFirebase();
  const [annualFees, setAnnualFees] = useState<AnnualFee[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [eventExpenses, setEventExpenses] = useState<EventExpense[]>([]);
  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [sortByEventName, setSortByEventName] = useState<'asc' | 'desc' | null>(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingBank, setEditingBank] = useState<BankDeposit | null>(null);
  const [editingExpense, setEditingExpense] = useState<EventExpense | null>(null);
  const [viewingBank, setViewingBank] = useState<BankDeposit | null>(null);
  const [viewingExpense, setViewingExpense] = useState<EventExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null; type: 'bank' | 'expense' }>({ isOpen: false, id: null, type: 'bank' });

  const [expenseFormData, setExpenseFormData] = useState<{
    eventId: string;
    year: string;
    entries: { amount: number; description: string; date: string }[];
  }>({
    eventId: '',
    year: new Date().getFullYear().toString(),
    entries: [{ amount: 0, description: '', date: new Date().toISOString().split('T')[0] }]
  });

  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubEvents();
  }, []);

  const [bankFormData, setBankFormData] = useState<Omit<BankDeposit, 'id'>>({
    bankName: '',
    depositorName: '',
    depositAmount: 0,
    depositDate: new Date().toISOString().split('T')[0],
    maturityDate: '',
    maturityTime: '',
    finalAmount: 0
  });

  useEffect(() => {
    const unsubFees = onSnapshot(collection(db, 'annual-fees'), (snapshot) => {
      setAnnualFees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnnualFee)));
    });
    const unsubDonations = onSnapshot(collection(db, 'donations'), (snapshot) => {
      setDonations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donation)));
    });
    const unsubExpenses = onSnapshot(collection(db, 'event-expenses'), (snapshot) => {
      setEventExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventExpense)));
    });
    const unsubBank = onSnapshot(query(collection(db, 'bank-deposits'), orderBy('depositDate', 'desc')), (snapshot) => {
      setBankDeposits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankDeposit)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bank-deposits');
    });

    return () => {
      unsubFees();
      unsubDonations();
      unsubExpenses();
      unsubBank();
    };
  }, []);

  // Totals
  const totalAnnualFees = annualFees.reduce((sum, fee) => sum + fee.amount, 0);
  const totalDonations = donations.reduce((sum, don) => sum + don.amount, 0);
  const totalExpenses = eventExpenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
  const totalBankBalance = bankDeposits.reduce((sum, bank) => sum + bank.finalAmount, 0);

  // Filtered Bank Deposits
  const filteredBankDeposits = useMemo(() => {
    return bankDeposits.filter(bank => 
      bank.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bank.depositorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bank.depositDate.includes(searchTerm)
    );
  }, [bankDeposits, searchTerm]);

  // Balance Section Data for Selected Year
  const balanceData = useMemo(() => {
    const yearExpenses = eventExpenses.filter(exp => exp.year === selectedYear);
    const yearFees = annualFees.filter(fee => fee.year === selectedYear);
    const yearDonations = donations.filter(don => don.date.startsWith(selectedYear));

    const totalYearFees = yearFees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalYearDonations = yearDonations.reduce((sum, don) => sum + don.amount, 0);
    const totalYearExpenses = yearExpenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
    
    const eventRows = yearExpenses.map(exp => ({
      id: exp.id,
      name: exp.eventName,
      expense: exp.totalAmount,
      fees: 0,
      donations: 0,
      type: 'event',
      originalData: exp
    }));

    if (sortByEventName) {
      eventRows.sort((a, b) => {
        if (sortByEventName === 'asc') return a.name.localeCompare(b.name);
        return b.name.localeCompare(a.name);
      });
    }

    const rows = [
      ...eventRows,
      {
        name: 'Annual Fees (Total)',
        expense: 0,
        fees: totalYearFees,
        donations: 0,
        type: 'summary'
      },
      {
        name: 'Donations (Total)',
        expense: 0,
        fees: 0,
        donations: totalYearDonations,
        type: 'summary'
      }
    ];

    return {
      rows,
      totals: {
        expense: totalYearExpenses,
        fees: totalYearFees,
        donations: totalYearDonations
      }
    };
  }, [eventExpenses, annualFees, donations, selectedYear, sortByEventName]);

  const yearGrandTotal = (balanceData.totals.fees + balanceData.totals.donations) - balanceData.totals.expense;

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      if (editingBank?.id) {
        await updateDoc(doc(db, 'bank-deposits', editingBank.id), bankFormData);
      } else {
        await addDoc(collection(db, 'bank-deposits'), bankFormData);
      }
      setShowBankForm(false);
      setEditingBank(null);
      setBankFormData({
        bankName: '',
        depositorName: '',
        depositAmount: 0,
        depositDate: new Date().toISOString().split('T')[0],
        maturityDate: '',
        maturityTime: '',
        finalAmount: 0
      });
    } catch (error) {
      handleFirestoreError(error, editingBank ? OperationType.UPDATE : OperationType.CREATE, 'bank-deposits');
    }
  };

  const handleBankDelete = async () => {
    if (deleteConfirm.id && isAdmin) {
      try {
        if (deleteConfirm.type === 'bank') {
          await deleteDoc(doc(db, 'bank-deposits', deleteConfirm.id));
        } else {
          await deleteDoc(doc(db, 'event-expenses', deleteConfirm.id));
        }
        setDeleteConfirm({ isOpen: false, id: null, type: 'bank' });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, deleteConfirm.type === 'bank' ? 'bank-deposits' : 'event-expenses');
      }
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const selectedEvent = events.find(ev => ev.id === expenseFormData.eventId);
    if (!selectedEvent) return;

    const totalAmount = expenseFormData.entries.reduce((sum, entry) => sum + entry.amount, 0);
    const expenseData = {
      eventId: expenseFormData.eventId,
      eventName: selectedEvent.name,
      year: expenseFormData.year,
      expenses: expenseFormData.entries,
      totalAmount: totalAmount
    };

    try {
      if (editingExpense?.id) {
        await updateDoc(doc(db, 'event-expenses', editingExpense.id), expenseData);
      } else {
        await addDoc(collection(db, 'event-expenses'), expenseData);
      }
      setShowExpenseForm(false);
      setEditingExpense(null);
      setExpenseFormData({
        eventId: '',
        year: new Date().getFullYear().toString(),
        entries: [{ amount: 0, description: '', date: new Date().toISOString().split('T')[0] }]
      });
    } catch (error) {
      handleFirestoreError(error, editingExpense ? OperationType.UPDATE : OperationType.CREATE, 'event-expenses');
    }
  };

  const handleAddExpenseEntry = () => {
    setExpenseFormData(prev => ({
      ...prev,
      entries: [...prev.entries, { amount: 0, description: '', date: new Date().toISOString().split('T')[0] }]
    }));
  };

  const handleRemoveExpenseEntry = (index: number) => {
    setExpenseFormData(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const handleExpenseEntryChange = (index: number, field: string, value: any) => {
    const newEntries = [...expenseFormData.entries];
    newEntries[index] = { ...newEntries[index], [field]: field === 'amount' ? Number(value) : value };
    setExpenseFormData(prev => ({ ...prev, entries: newEntries }));
  };

  const handleExportBankCSV = () => {
    const data = filteredBankDeposits.map(b => ({
      'Bank Name': b.bankName,
      'Depositor': b.depositorName,
      'Deposit Amount': b.depositAmount,
      'Deposit Date': b.depositDate,
      'Maturity Date': b.maturityDate,
      'Maturity Time': b.maturityTime,
      'Final Amount': b.finalAmount
    }));
    exportToCSV(data, 'bank_deposits');
  };

  const handleExportBankPDF = () => {
    const data = filteredBankDeposits.map(b => ({
      'Bank': b.bankName,
      'Depositor': b.depositorName,
      'Deposit': b.depositAmount,
      'Date': b.depositDate,
      'Maturity': b.maturityDate,
      'Time': b.maturityTime,
      'Final': b.finalAmount
    }));
    exportToPDF(data, 'Bank Deposits & FD', 'bank_deposits');
  };

  const handleExportBalanceCSV = () => {
    const data = balanceData.rows.map(row => ({
      'Item': row.name,
      'Expense': row.expense,
      'Fees': row.fees,
      'Donations': row.donations,
      'Net': row.fees + row.donations - row.expense
    }));
    exportToCSV(data, `balance_sheet_${selectedYear}`);
  };

  const handleExportBalancePDF = () => {
    const data = balanceData.rows.map(row => ({
      'Item': row.name,
      'Expense': row.expense,
      'Fees': row.fees,
      'Donations': row.donations,
      'Net': row.fees + row.donations - row.expense
    }));
    exportToPDF(data, `Balance Sheet - ${selectedYear}`, `balance_sheet_${selectedYear}`);
  };

  const handleViewExportCSV = (expense: EventExpense) => {
    const data = expense.expenses.map(e => ({
      'Date': e.date,
      'Description': e.description,
      'Amount': e.amount
    }));
    exportToCSV(data, `${expense.eventName}_expenses_${expense.year}`);
  };

  const handleViewExportPDF = (expense: EventExpense) => {
    const data = expense.expenses.map(e => ({
      'Date': e.date,
      'Description': e.description,
      'Amount': e.amount
    }));
    exportToPDF(data, `${expense.eventName} Expenses - ${expense.year}`, `${expense.eventName}_expenses_${expense.year}`);
  };

  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Access Denied</div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-gray-900">Balance Sheet</h2>
        <p className="text-gray-500 mt-1">Comprehensive financial overview of the community</p>
      </header>

      {/* Yearly Balance Summary Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-emerald-600" size={28} />
            <h3 className="text-2xl font-bold text-gray-900">Yearly Balance Summary</h3>
          </div>
          <div className="flex items-center space-x-3">
            <select
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-gray-600"
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
            <select
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {[...Array(10)].map((_, i) => {
                const year = (new Date().getFullYear() - i).toString();
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
            <button onClick={handleExportBalanceCSV} className="p-2 text-gray-400 hover:text-indigo-600"><Download size={20} /></button>
            <button onClick={handleExportBalancePDF} className="p-2 text-gray-400 hover:text-indigo-600"><FileText size={20} /></button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Event / Item Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-red-600">Event Total Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-emerald-600">Total Annual Fee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-emerald-600">Total Donation</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {balanceData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{row.name}</td>
                    <td className="px-6 py-4 text-red-600">
                      {row.expense > 0 ? `₹${row.expense.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {row.type === 'event' && (
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => setViewingExpense(row.originalData)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingExpense(row.originalData);
                              setExpenseFormData({
                                eventId: row.originalData.eventId,
                                year: row.originalData.year,
                                entries: row.originalData.expenses
                              });
                              setShowExpenseForm(true);
                            }}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ isOpen: true, id: row.id!, type: 'expense' })}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-emerald-600">
                      {row.fees > 0 ? `₹${row.fees.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-emerald-600">
                      {row.donations > 0 ? `₹${row.donations.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-black">
                      <span className={row.fees + row.donations - row.expense >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        ₹{(row.fees + row.donations - row.expense).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-black border-t border-gray-200">
                <tr className="text-sm">
                  <td className="px-6 py-4 text-gray-900">COLUMN TOTALS</td>
                  <td className="px-6 py-4 text-red-600">₹{balanceData.totals.expense.toLocaleString()}</td>
                  <td></td>
                  <td className="px-6 py-4 text-emerald-600">₹{balanceData.totals.fees.toLocaleString()}</td>
                  <td className="px-6 py-4 text-emerald-600">₹{balanceData.totals.donations.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={yearGrandTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      ₹{yearGrandTotal.toLocaleString()}
                    </span>
                  </td>
                </tr>
                <tr className="bg-indigo-50">
                  <td className="px-6 py-4 text-indigo-900">GRAND TOTAL ({selectedYear})</td>
                  <td colSpan={4} className="px-6 py-4 text-right text-indigo-900">
                    (Fees + Donations) - Expenses =
                  </td>
                  <td className="px-6 py-4 text-right text-2xl text-indigo-600">
                    ₹{yearGrandTotal.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* Bank Deposit Form Modal */}
      {showBankForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <h3 className="text-xl font-bold">{editingBank ? 'Edit Deposit' : 'Add New Deposit'}</h3>
              <button onClick={() => setShowBankForm(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleBankSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Bank Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={bankFormData.bankName}
                    onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Depositor Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={bankFormData.depositorName}
                    onChange={(e) => setBankFormData({ ...bankFormData, depositorName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Deposit Amount (₹)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={bankFormData.depositAmount}
                    onChange={(e) => setBankFormData({ ...bankFormData, depositAmount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Deposit Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={bankFormData.depositDate}
                    onChange={(e) => setBankFormData({ ...bankFormData, depositDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Maturity Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={bankFormData.maturityDate}
                    onChange={(e) => setBankFormData({ ...bankFormData, maturityDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Maturity Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 Year, 6 Months"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={bankFormData.maturityTime}
                    onChange={(e) => setBankFormData({ ...bankFormData, maturityTime: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Final Amount (₹)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={bankFormData.finalAmount}
                    onChange={(e) => setBankFormData({ ...bankFormData, finalAmount: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setShowBankForm(false)} className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200">
                  {editingBank ? 'Update Deposit' : 'Save Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank View Modal */}
      {viewingBank && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
              <h3 className="text-xl font-bold">Deposit Details</h3>
              <button onClick={() => setViewingBank(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Bank Name</p>
                  <p className="text-lg font-bold text-gray-900">{viewingBank.bankName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Depositor</p>
                  <p className="text-lg font-bold text-gray-900">{viewingBank.depositorName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Deposit Amount</p>
                  <p className="text-lg font-bold text-indigo-600">₹{viewingBank.depositAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Deposit Date</p>
                  <p className="text-lg font-bold text-gray-900">{viewingBank.depositDate}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Maturity Date</p>
                  <p className="text-lg font-bold text-gray-900">{viewingBank.maturityDate}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Maturity Time</p>
                  <p className="text-lg font-bold text-gray-900">{viewingBank.maturityTime}</p>
                </div>
              </div>
              <div className="p-6 bg-emerald-50 rounded-3xl flex items-center justify-between">
                <span className="text-lg font-bold text-emerald-900">Final Amount</span>
                <div className="flex items-center text-3xl font-black text-emerald-600">
                  <IndianRupee size={28} className="mr-1" />
                  {viewingBank.finalAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <h3 className="text-xl font-bold">{editingExpense ? 'Edit Event Expenses' : 'Add Event Expenses'}</h3>
              <button onClick={() => setShowExpenseForm(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Event</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={expenseFormData.eventId}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, eventId: e.target.value })}
                  >
                    <option value="">Choose an event...</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={expenseFormData.year}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, year: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900">Expense Entries</h4>
                  <button
                    type="button"
                    onClick={handleAddExpenseEntry}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Entry
                  </button>
                </div>
                
                {expenseFormData.entries.map((entry, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-2xl relative">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 bg-white border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={entry.description}
                        onChange={(e) => handleExpenseEntryChange(index, 'description', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        required
                        className="w-full px-3 py-2 bg-white border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={entry.amount}
                        onChange={(e) => handleExpenseEntryChange(index, 'amount', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                        <input
                          type="date"
                          required
                          className="w-full px-3 py-2 bg-white border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          value={entry.date}
                          onChange={(e) => handleExpenseEntryChange(index, 'date', e.target.value)}
                        />
                      </div>
                      {expenseFormData.entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExpenseEntry(index)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-indigo-50 rounded-3xl flex items-center justify-between">
                <span className="text-lg font-bold text-indigo-900">Grand Total</span>
                <div className="flex items-center text-2xl font-black text-indigo-600">
                  <IndianRupee size={24} className="mr-1" />
                  {expenseFormData.entries.reduce((sum, entry) => sum + entry.amount, 0).toLocaleString()}
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setShowExpenseForm(false)} className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200">
                  {editingExpense ? 'Update Expenses' : 'Save Expenses'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Expense View Modal */}
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
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, type: 'bank' })}
        onConfirm={handleBankDelete}
        title={deleteConfirm.type === 'bank' ? "Delete Deposit Record" : "Delete Expense Record"}
        message={deleteConfirm.type === 'bank' 
          ? "Are you sure you want to delete this deposit record? This action cannot be undone."
          : "Are you sure you want to delete this expense record? This action cannot be undone."}
      />
    </div>
  );
};

export default BalanceSheet;
