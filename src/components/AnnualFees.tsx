import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AnnualFee, Member } from '../types';
import { CreditCard, Plus, Search, Filter, DollarSign, Calendar, User, X, Save, CheckCircle2, Edit2, Trash2, Download, FileText, Grid, List, ArrowUpDown, IndianRupee } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import ConfirmationModal from './ConfirmationModal';

const AnnualFees: React.FC = () => {
  const { isAdmin } = useFirebase();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 mb-4">
          <CreditCard className="text-amber-600 w-12 h-12 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-gray-500">You do not have permission to view annual fee records.</p>
        </div>
      </div>
    );
  }

  const [fees, setFees] = useState<AnnualFee[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFee, setEditingFee] = useState<AnnualFee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'year' | 'amount' | 'date'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  const [formData, setFormData] = useState({
    memberId: '',
    amount: 500,
    year: new Date().getFullYear().toString(),
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const q = query(collection(db, 'annual-fees'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnnualFee)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'annual-fees'));

    const fetchMembers = async () => {
      const snapshot = await getDocs(collection(db, 'members'));
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member)));
    };
    fetchMembers();

    return () => unsubscribe();
  }, []);

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown Member';

  const filteredAndSortedFees = useMemo(() => {
    let result = fees.filter(f => {
      const memberName = getMemberName(f.memberId).toLowerCase();
      const year = (f.year || '').toString();
      
      const matchesSearch = memberName.includes(searchTerm.toLowerCase()) || year.includes(searchTerm);
      const matchesYear = selectedYear === 'All' || year === selectedYear;
      
      return matchesSearch && matchesYear;
    });

    result.sort((a, b) => {
      if (sortConfig.key === 'name') {
        const nameA = getMemberName(a.memberId);
        const nameB = getMemberName(b.memberId);
        return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      if (sortConfig.key === 'year') {
        const yearA = (a as any).year || '';
        const yearB = (b as any).year || '';
        return sortConfig.direction === 'asc' ? yearA.localeCompare(yearB) : yearB.localeCompare(yearA);
      }
      return sortConfig.direction === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });

    return result;
  }, [fees, members, searchTerm, sortConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingFee) {
        await updateDoc(doc(db, 'annual-fees', editingFee.id!), { ...formData, amount: Number(formData.amount) });
      } else {
        await addDoc(collection(db, 'annual-fees'), { ...formData, amount: Number(formData.amount), createdAt: serverTimestamp() });
      }
      setShowForm(false);
      setEditingFee(null);
      setFormData({ memberId: '', amount: 500, year: new Date().getFullYear().toString(), date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      handleFirestoreError(error, editingFee ? OperationType.UPDATE : OperationType.CREATE, 'annual-fees');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fee: AnnualFee) => {
    setEditingFee(fee);
    setFormData({ memberId: fee.memberId, amount: fee.amount, year: (fee as any).year || new Date().getFullYear().toString(), date: fee.date });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await deleteDoc(doc(db, 'annual-fees', deleteConfirm.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'annual-fees');
      }
    }
  };

  const handleExportCSV = () => {
    const data = filteredAndSortedFees.map(f => ({ Member: getMemberName(f.memberId), Year: (f as any).year, Amount: f.amount, Date: f.date }));
    exportToCSV(data, 'annual_fees_history');
  };

  const handleExportPDF = () => {
    const data = filteredAndSortedFees.map(f => ({ Member: getMemberName(f.memberId), Year: (f as any).year, Amount: `₹${f.amount}`, Date: f.date }));
    exportToPDF(data, 'Annual Fees History', 'annual_fees_history');
  };

  const toggleSort = (key: 'name' | 'year' | 'amount' | 'date') => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const totalCollected = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalCollectedForYear = useMemo(() => {
    return fees
      .filter(f => selectedYear === 'All' || (f as any).year === selectedYear)
      .reduce((sum, f) => sum + f.amount, 0);
  }, [fees, selectedYear]);

  const years = useMemo(() => {
    const yearsSet = new Set<string>();
    fees.forEach(f => yearsSet.add((f as any).year));
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [fees]);

  const currentYearFees = fees.filter(f => (f as any).year === (selectedYear === 'All' ? new Date().getFullYear().toString() : selectedYear));

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Annual Fees</h2>
          <p className="text-gray-500 mt-1">Manage and track annual community membership fees</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <button onClick={handleExportCSV} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Export CSV"><Download size={20} /></button>
            <button onClick={handleExportPDF} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Export PDF"><FileText size={20} /></button>
          </div>
          <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><Grid size={20} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><List size={20} /></button>
          </div>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              <Plus size={20} />
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
          <div className="flex items-center space-x-3 text-indigo-600 mb-2">
            <CheckCircle2 size={20} />
            <span className="font-bold uppercase tracking-wider text-xs">
              {selectedYear === 'All' ? 'Total Collected' : `Collected in ${selectedYear}`}
            </span>
          </div>
          <p className="text-3xl font-bold text-indigo-900">₹{totalCollectedForYear.toLocaleString()}</p>
          {selectedYear !== 'All' && (
            <p className="text-xs text-indigo-600 mt-1 font-medium">Overall: ₹{totalCollected.toLocaleString()}</p>
          )}
        </div>
        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
          <div className="flex items-center space-x-3 text-amber-600 mb-2">
            <User size={20} />
            <span className="font-bold uppercase tracking-wider text-xs">
              {selectedYear === 'All' ? 'Total Payments' : `Payments in ${selectedYear}`}
            </span>
          </div>
          <p className="text-3xl font-bold text-amber-900">
            {selectedYear === 'All' ? fees.length : fees.filter(f => (f as any).year === selectedYear).length}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by member name or year..."
            className="w-full pl-12 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 min-w-[150px]">
          <Filter size={20} className="text-gray-400" />
          <select
            className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="All">All Years</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedFees.map((fee) => (
            <div key={fee.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{getMemberName(fee.memberId)}</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Year: {(fee as any).year}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center space-x-1">
                    <button onClick={() => handleEdit(fee)} className="p-2 text-gray-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                    <button onClick={() => setDeleteConfirm({ isOpen: true, id: fee.id! })} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                  <span className="text-sm text-gray-500">Amount</span>
                  <span className="font-bold text-indigo-600 text-lg">₹{fee.amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <Calendar size={12} />
                  <span>Paid on {new Date(fee.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th onClick={() => toggleSort('name')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600">
                    <div className="flex items-center">Member <ArrowUpDown size={14} className="ml-1" /></div>
                  </th>
                  <th onClick={() => toggleSort('year')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600">
                    <div className="flex items-center">Year <ArrowUpDown size={14} className="ml-1" /></div>
                  </th>
                  <th onClick={() => toggleSort('amount')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600">
                    <div className="flex items-center">Amount <ArrowUpDown size={14} className="ml-1" /></div>
                  </th>
                  <th onClick={() => toggleSort('date')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600">
                    <div className="flex items-center">Payment Date <ArrowUpDown size={14} className="ml-1" /></div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAndSortedFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{getMemberName(fee.memberId)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">{(fee as any).year}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      ₹{fee.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(fee.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => handleEdit(fee)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => setDeleteConfirm({ isOpen: true, id: fee.id! })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{editingFee ? 'Edit Fee Payment' : 'Record Fee Payment'}</h3>
              <button onClick={() => { setShowForm(false); setEditingFee(null); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Select Member</label>
                <select
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={formData.memberId}
                  onChange={e => setFormData({ ...formData, memberId: e.target.value })}
                >
                  <option value="">Choose a member...</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Year</label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                  >
                    {[0, 1, 2].map(offset => {
                      const year = (new Date().getFullYear() - offset).toString();
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Payment Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <footer className="pt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center space-x-2 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={18} /><span>Record Payment</span></>}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Fee Record"
        message="Are you sure you want to delete this fee record? This action cannot be undone."
      />
    </div>
  );
};

export default AnnualFees;
