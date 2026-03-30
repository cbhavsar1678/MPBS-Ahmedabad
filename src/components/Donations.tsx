import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Donation, Member } from '../types';
import { Heart, Plus, Search, Filter, IndianRupee, Calendar, User, X, Save, Edit2, Trash2, Download, FileText, Grid, List, ArrowUpDown } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import ConfirmationModal from './ConfirmationModal';

const Donations: React.FC = () => {
  const { isAdmin } = useFirebase();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 mb-4">
          <Heart className="text-red-600 w-12 h-12 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-gray-500">You do not have permission to view donation records.</p>
        </div>
      </div>
    );
  }

  const [donations, setDonations] = useState<Donation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'date' | 'amount'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  
  const [formData, setFormData] = useState({
    memberId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    purpose: '',
    paymentType: 'offline' as 'online' | 'offline'
  });

  useEffect(() => {
    const q = query(collection(db, 'donations'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDonations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donation)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'donations'));

    const fetchMembers = async () => {
      const snapshot = await getDocs(collection(db, 'members'));
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member)));
    };
    fetchMembers();

    return () => unsubscribe();
  }, []);

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown Member';

  const filteredAndSortedDonations = useMemo(() => {
    let result = donations.filter(d => {
      const memberName = getMemberName(d.memberId).toLowerCase();
      const purpose = (d.purpose || '').toLowerCase();
      const year = new Date(d.date).getFullYear().toString();
      
      const matchesSearch = memberName.includes(searchTerm.toLowerCase()) || purpose.includes(searchTerm.toLowerCase());
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
      return sortConfig.direction === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });

    return result;
  }, [donations, members, searchTerm, sortConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingDonation) {
        await updateDoc(doc(db, 'donations', editingDonation.id!), { ...formData, amount: Number(formData.amount) });
      } else {
        await addDoc(collection(db, 'donations'), { ...formData, amount: Number(formData.amount), createdAt: serverTimestamp() });
      }
      setShowForm(false);
      setEditingDonation(null);
      setFormData({ memberId: '', amount: 0, date: new Date().toISOString().split('T')[0], purpose: '', paymentType: 'offline' });
    } catch (error) {
      handleFirestoreError(error, editingDonation ? OperationType.UPDATE : OperationType.CREATE, 'donations');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (donation: Donation) => {
    setEditingDonation(donation);
    setFormData({ 
      memberId: donation.memberId, 
      amount: donation.amount, 
      date: donation.date, 
      purpose: donation.purpose || '',
      paymentType: donation.paymentType || 'offline'
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await deleteDoc(doc(db, 'donations', deleteConfirm.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'donations');
      }
    }
  };

  const handleExportCSV = () => {
    const data = filteredAndSortedDonations.map(d => ({ 
      Donor: getMemberName(d.memberId), 
      Amount: d.amount, 
      Date: d.date, 
      Purpose: d.purpose || 'General',
      'Payment Type': d.paymentType || 'offline'
    }));
    exportToCSV(data, 'donations_history');
  };

  const handleExportPDF = () => {
    const data = filteredAndSortedDonations.map(d => ({ 
      Donor: getMemberName(d.memberId), 
      Amount: `₹${d.amount}`, 
      Date: d.date, 
      Purpose: d.purpose || 'General',
      'Type': d.paymentType || 'offline'
    }));
    exportToPDF(data, 'Donations History', 'donations_history');
  };

  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
  const totalDonationsForYear = useMemo(() => {
    return donations
      .filter(d => selectedYear === 'All' || new Date(d.date).getFullYear().toString() === selectedYear)
      .reduce((sum, d) => sum + d.amount, 0);
  }, [donations, selectedYear]);

  const years = useMemo(() => {
    const yearsSet = new Set<string>();
    donations.forEach(d => yearsSet.add(new Date(d.date).getFullYear().toString()));
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [donations]);

  const toggleSort = (key: 'name' | 'date' | 'amount') => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Donations</h2>
          <p className="text-gray-500 mt-1">Track community contributions and support</p>
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
            <button onClick={() => setShowForm(true)} className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
              <Plus size={20} />
              <span>Record Donation</span>
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
          <div className="flex items-center space-x-3 text-emerald-600 mb-2">
            <Heart size={20} />
            <span className="font-bold uppercase tracking-wider text-xs">
              {selectedYear === 'All' ? 'Total Contributions' : `Contributions in ${selectedYear}`}
            </span>
          </div>
          <p className="text-3xl font-bold text-emerald-900">₹{totalDonationsForYear.toLocaleString()}</p>
          {selectedYear !== 'All' && (
            <p className="text-xs text-emerald-600 mt-1 font-medium">Overall: ₹{totalDonations.toLocaleString()}</p>
          )}
        </div>
        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
          <div className="flex items-center space-x-3 text-indigo-600 mb-2">
            <IndianRupee size={20} />
            <span className="font-bold uppercase tracking-wider text-xs">
              {selectedYear === 'All' ? 'Recent Donations' : `Donations in ${selectedYear}`}
            </span>
          </div>
          <p className="text-3xl font-bold text-indigo-900">
            {selectedYear === 'All' ? donations.length : donations.filter(d => new Date(d.date).getFullYear().toString() === selectedYear).length}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by donor name or purpose..."
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
          {filteredAndSortedDonations.map((donation) => (
            <div key={donation.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Heart size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{getMemberName(donation.memberId)}</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{new Date(donation.date).toLocaleDateString()}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center space-x-1">
                    <button onClick={() => handleEdit(donation)} className="p-2 text-gray-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                    <button onClick={() => setDeleteConfirm({ isOpen: true, id: donation.id! })} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                  <span className="text-sm text-gray-500">Amount</span>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 text-lg block">₹{donation.amount.toLocaleString()}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${donation.paymentType === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {donation.paymentType || 'offline'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 italic">“{donation.purpose || 'General Fund'}”</p>
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
                    <div className="flex items-center">Donor <ArrowUpDown size={14} className="ml-1" /></div>
                  </th>
                  <th onClick={() => toggleSort('amount')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600">
                    <div className="flex items-center">Amount <ArrowUpDown size={14} className="ml-1" /></div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th onClick={() => toggleSort('date')} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600">
                    <div className="flex items-center">Date <ArrowUpDown size={14} className="ml-1" /></div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Purpose</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAndSortedDonations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                          <User size={16} />
                        </div>
                        <span className="font-medium text-gray-900">{getMemberName(donation.memberId)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-emerald-600">₹{donation.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${donation.paymentType === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {donation.paymentType || 'offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(donation.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {donation.purpose || 'General Fund'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => handleEdit(donation)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => setDeleteConfirm({ isOpen: true, id: donation.id! })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
              <h3 className="text-xl font-bold text-gray-900">{editingDonation ? 'Edit Donation' : 'Record New Donation'}</h3>
              <button onClick={() => { setShowForm(false); setEditingDonation(null); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Purpose</label>
                  <input
                    type="text"
                    placeholder="e.g. Building Fund, Charity"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={formData.purpose}
                    onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Payment Type</label>
                  <div className="flex items-center space-x-6 h-10">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="paymentType"
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        checked={formData.paymentType === 'offline'}
                        onChange={() => setFormData({ ...formData, paymentType: 'offline' })}
                      />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">Offline</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="paymentType"
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        checked={formData.paymentType === 'online'}
                        onChange={() => setFormData({ ...formData, paymentType: 'online' })}
                      />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">Online</span>
                    </label>
                  </div>
                </div>
              </div>
              <footer className="pt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center space-x-2 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={18} /><span>Record Donation</span></>}
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
        title="Delete Donation"
        message="Are you sure you want to delete this donation record? This action cannot be undone."
      />
    </div>
  );
};

export default Donations;
