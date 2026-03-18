import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member } from '../types';
import { Search, Filter, Grid, List, MoreVertical, Phone, MapPin, Briefcase, UserPlus, Edit2, Trash2, Download, Eye, FileText, IndianRupee, Users, MessageCircle } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import MemberForm from './MemberForm';
import MemberDetails from './MemberDetails';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import ConfirmationModal from './ConfirmationModal';

const MemberDirectory: React.FC = () => {
  const { isAdmin } = useFirebase();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [areaFilter, setAreaFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | undefined>(undefined);
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      setMembers(memberList);
      setFilteredMembers(memberList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
    });

    const unsubFamily = onSnapshot(collection(db, 'family-members'), (snapshot) => {
      setFamilyMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubChildren = onSnapshot(collection(db, 'children'), (snapshot) => {
      setChildren(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      unsubFamily();
      unsubChildren();
    };
  }, []);

  useEffect(() => {
    let result = members;
    if (searchQuery) {
      result = result.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.mobile.includes(searchQuery) ||
        m.area.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (areaFilter !== 'All') {
      result = result.filter(m => m.area === areaFilter);
    }
    setFilteredMembers(result);
  }, [searchQuery, areaFilter, members]);

  const handleExportCSV = () => {
    const exportData = filteredMembers.map(({ id, ...rest }) => rest);
    exportToCSV(exportData, 'members_directory');
  };

  const handleExportPDF = () => {
    const exportData = filteredMembers.map(({ name, profession, mobile, area, education }) => ({
      Name: name,
      Profession: profession,
      Mobile: mobile,
      Area: area,
      Education: education
    }));
    exportToPDF(exportData, 'Member Directory', 'members_directory');
  };

  const areas = ['All', ...new Set(members.map(m => m.area))];

  const handleDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await deleteDoc(doc(db, 'members', deleteConfirm.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'members');
      }
    }
  };

  if (viewingMemberId) {
    return <MemberDetails memberId={viewingMemberId} onBack={() => setViewingMemberId(null)} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Member Directory</h2>
          <p className="text-gray-500 mt-1">Browse and search community members</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <button 
              onClick={handleExportCSV}
              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
              title="Export CSV"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={handleExportPDF}
              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
              title="Export PDF"
            >
              <FileText size={20} />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setSelectedMember(undefined); setShowForm(true); }}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <UserPlus size={20} />
              <span>Add Member</span>
            </button>
          )}
          <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, mobile, or area..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="text-gray-400" size={20} />
          <select
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
          >
            {areas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMembers.map((member) => (
            <div 
              key={member.id} 
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group cursor-pointer relative"
              onClick={() => setViewingMemberId(member.id!)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl font-bold text-indigo-600 overflow-hidden shadow-sm">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    member.name.split(' ').map(n => n[0]).join('').toUpperCase()
                  )}
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setViewingMemberId(member.id!); }}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="View Details"
                  >
                    <Eye size={18} />
                  </button>
                  {isAdmin && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setShowForm(true); }}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, id: member.id! }); }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{member.name}</h4>
              <p className="text-sm text-indigo-600 font-medium mb-4">{member.profession}</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Phone size={14} className="mr-2" />
                    {member.mobile}
                  </div>
                  <a 
                    href={`https://wa.me/${member.mobile.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </a>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin size={14} className="mr-2" />
                  {member.area}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Briefcase size={14} className="mr-2" />
                  {member.education}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-gray-900">Member</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-900">Contact</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-900">Details</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-900">Family</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMembers.map((member) => {
                  const familyCount = familyMembers.filter(f => f.memberId === member.id).length + 
                                    children.filter(c => c.memberId === member.id).length;
                  return (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-600 overflow-hidden">
                            {member.photoUrl ? (
                              <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              member.name.split(' ').map(n => n[0]).join('').toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{member.name}</span>
                            <span className="text-xs text-gray-500">{member.gender}, {member.age} yrs</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm text-gray-900">{member.mobile}</div>
                          <a 
                            href={`https://wa.me/${member.mobile.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        </div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{member.profession}</div>
                        <div className="text-xs text-gray-500">{member.education}</div>
                        <div className="text-xs text-gray-400">{member.area}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-indigo-600 font-bold">
                          <Users size={14} className="mr-1" />
                          {familyCount}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${member.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => setViewingMemberId(member.id!)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {isAdmin && (
                            <>
                              <button 
                                onClick={() => { setSelectedMember(member); setShowForm(true); }}
                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => setDeleteConfirm({ isOpen: true, id: member.id! })}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <MemberForm
          member={selectedMember}
          onClose={() => setShowForm(false)}
          onSuccess={() => {}}
        />
      )}

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Member"
        message="Are you sure you want to delete this member? This will permanently remove their record and all associated data."
      />
    </div>
  );
};

export default MemberDirectory;
