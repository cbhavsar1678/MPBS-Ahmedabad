import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member, FamilyMember, Child } from '../types';
import { UserPlus, Plus, User, Users, X, Save, Trash2, Baby, Heart, Edit2, Download, FileText, Search, MapPin, ChevronDown, ChevronUp, Grid, List, Filter, GraduationCap, Briefcase, Phone, IndianRupee, Eye, TreePalm } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import ConfirmationModal from './ConfirmationModal';

const FamilyTree: React.FC = () => {
  const { isAdmin } = useFirebase();
  const [members, setMembers] = useState<Member[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'area'>('name');
  
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showChildForm, setShowChildForm] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [viewingFamilyMember, setViewingFamilyMember] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null; type: 'family' | 'child' | null }>({ isOpen: false, id: null, type: null });

  const initialFamilyData: Omit<FamilyMember, 'id' | 'memberId'> = {
    name: '',
    relation: 'Spouse',
    age: 0,
    gender: 'Male',
    address: '',
    area: '',
    mobile: '',
    email: '',
    isAlive: true,
    maritalStatus: 'Married',
    education: '',
    profession: ''
  };

  const [familyData, setFamilyData] = useState({
    ...initialFamilyData,
    photoUrl: ''
  });

  const [childData, setChildData] = useState({
    name: '',
    gender: 'Male',
    dob: '',
    education: '',
    job: '',
    age: 0,
    photoUrl: ''
  });

  useEffect(() => {
    const unsubMembers = onSnapshot(query(collection(db, 'members'), orderBy('name')), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'members'));

    const unsubFamily = onSnapshot(collection(db, 'family-members'), (snapshot) => {
      setFamilyMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyMember)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'family-members'));

    const unsubChildren = onSnapshot(collection(db, 'children'), (snapshot) => {
      setChildren(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'children'));

    return () => {
      unsubMembers();
      unsubFamily();
      unsubChildren();
    };
  }, []);

  const filteredMembers = useMemo(() => {
    let result = [...members];
    
    if (searchTerm) {
      result = result.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.area.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'area') return a.area.localeCompare(b.area);
      return 0;
    });

    return result;
  }, [members, searchTerm, sortBy]);

  const allFamilyLinks = useMemo(() => {
    const links = [
      ...familyMembers.map(f => ({ ...f, type: 'family' as const })),
      ...children.map(c => ({ ...c, type: 'child' as const, relation: 'Child' }))
    ];

    if (searchTerm) {
      return links.filter(l => 
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        members.find(m => m.id === l.memberId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return links;
  }, [familyMembers, children, searchTerm, members]);

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown Member';

  const handleExportAllCSV = () => {
    const data: any[] = [];
    members.forEach(member => {
      const memberFamily = familyMembers.filter(f => f.memberId === member.id);
      const memberChildren = children.filter(c => c.memberId === member.id);
      
      memberFamily.forEach(f => {
        data.push({
          'Main Member': member.name,
          'Name': f.name,
          'Relation': f.relation,
          'Age': f.age,
          'Gender': f.gender,
          'Mobile': f.mobile,
          'Email': f.email,
          'Area': f.area,
          'Address': f.address,
          'Education': f.education,
          'Profession': f.profession,
          'Marital Status': f.maritalStatus,
          'Living Status': f.isAlive ? 'Live' : 'No Live'
        });
      });

      memberChildren.forEach(c => {
        data.push({
          'Main Member': member.name,
          'Name': c.name,
          'Relation': 'Child',
          'Age': c.age,
          'Gender': c.gender,
          'Mobile': c.mobile || 'N/A',
          'Email': 'N/A',
          'Area': member.area,
          'Address': c.address || member.address,
          'Education': c.education,
          'Profession': c.job || 'N/A',
          'Marital Status': c.maritalStatus || 'Single',
          'Living Status': 'Live'
        });
      });
    });
    exportToCSV(data, 'all_family_members_details');
  };

  const handleExportAllPDF = () => {
    const data: any[] = [];
    members.forEach(member => {
      const memberFamily = familyMembers.filter(f => f.memberId === member.id);
      const memberChildren = children.filter(c => c.memberId === member.id);
      
      memberFamily.forEach(f => {
        data.push({
          Main: member.name,
          Name: f.name,
          Relation: f.relation,
          Age: f.age,
          Gender: f.gender,
          Mobile: f.mobile,
          Profession: f.profession
        });
      });

      memberChildren.forEach(c => {
        data.push({
          Main: member.name,
          Name: c.name,
          Relation: 'Child',
          Age: c.age,
          Gender: c.gender,
          Mobile: c.mobile || 'N/A',
          Profession: c.job || 'N/A'
        });
      });
    });
    exportToPDF(data, 'Family Members Directory', 'all_family_members_details');
  };

  const handleAddFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    const mId = activeMemberId || (familyData as any).memberId;
    if (!mId) return;
    setLoading(true);
    try {
      if (editingFamilyId) {
        await updateDoc(doc(db, 'family-members', editingFamilyId), {
          ...familyData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'family-members'), {
          ...familyData,
          memberId: mId,
          createdAt: serverTimestamp()
        });
      }
      setShowFamilyForm(false);
      setEditingFamilyId(null);
      setFamilyData(initialFamilyData);
    } catch (error) {
      console.error('Error saving family member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.id && deleteConfirm.type) {
      try {
        const collectionName = deleteConfirm.type === 'family' ? 'family-members' : 'children';
        await deleteDoc(doc(db, collectionName, deleteConfirm.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, deleteConfirm.type === 'family' ? 'family-members' : 'children');
      }
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    const mId = activeMemberId || (childData as any).memberId;
    if (!mId) return;
    setLoading(true);
    try {
      if (editingChildId) {
        await updateDoc(doc(db, 'children', editingChildId), {
          ...childData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'children'), {
          ...childData,
          memberId: mId,
          createdAt: serverTimestamp()
        });
      }
      setShowChildForm(false);
      setEditingChildId(null);
      setChildData({ name: '', gender: 'Male', dob: '', education: '', job: '', age: 0, photoUrl: '' });
    } catch (error) {
      console.error('Error saving child:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = (member: Member) => {
    const memberFamily = familyMembers.filter(f => f.memberId === member.id);
    const memberChildren = children.filter(c => c.memberId === member.id);
    
    const data = [
      { Type: 'Main Member', Name: member.name, Relation: 'Self', Age: member.age, Gender: member.gender, Area: member.area },
      ...memberFamily.map(f => ({ Type: 'Family', Name: f.name, Relation: f.relation, Age: f.age, Gender: f.gender, Area: f.area })),
      ...memberChildren.map(c => ({ Type: 'Child', Name: c.name, Relation: 'Child', Age: c.age, Gender: c.gender, Area: member.area }))
    ];
    exportToCSV(data, `family_${member.name.replace(/\s+/g, '_')}`);
  };

  const handleExportPDF = (member: Member) => {
    const memberFamily = familyMembers.filter(f => f.memberId === member.id);
    const memberChildren = children.filter(c => c.memberId === member.id);
    
    const data = [
      { Type: 'Main Member', Name: member.name, Relation: 'Self', Age: member.age, Gender: member.gender },
      ...memberFamily.map(f => ({ Type: 'Family', Name: f.name, Relation: f.relation, Age: f.age, Gender: f.gender })),
      ...memberChildren.map(c => ({ Type: 'Child', Name: c.name, Relation: 'Child', Age: c.age, Gender: c.gender }))
    ];
    exportToPDF(data, `Family Tree - ${member.name}`, `family_${member.name.replace(/\s+/g, '_')}`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Family Management</h2>
          <p className="text-gray-500 mt-1">Manage family members and children for community members</p>
        </div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <button 
              onClick={() => { setActiveMemberId(null); setEditingFamilyId(null); setFamilyData({ ...initialFamilyData, photoUrl: '' }); setShowFamilyForm(true); }}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Plus size={20} />
              <span>Link Family Member</span>
            </button>
          )}
          <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <button 
              onClick={handleExportAllCSV}
              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
              title="Export All CSV"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={handleExportAllPDF}
              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
              title="Export All PDF"
            >
              <FileText size={20} />
            </button>
          </div>
          <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('tree')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'tree' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Tree View"
            >
              <TreePalm size={20} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grid View"
            >
              <Grid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="List View"
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={viewMode === 'tree' ? "Search member by name or area..." : "Search by member or family name..."}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {viewMode === 'tree' && (
          <div className="flex items-center space-x-3">
            <Filter className="text-gray-400" size={20} />
            <select 
              className="bg-gray-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'area')}
            >
              <option value="name">Sort by Name</option>
              <option value="area">Sort by Area</option>
            </select>
          </div>
        )}
      </div>

      {viewMode === 'tree' && (
        <div className="space-y-4">
          {filteredMembers.map(member => {
            const memberFamily = familyMembers.filter(f => f.memberId === member.id);
            const memberChildren = children.filter(c => c.memberId === member.id);
            const isExpanded = expandedMemberId === member.id;

            return (
              <div key={member.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Member Row */}
                <div 
                  className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}
                  onClick={() => setExpandedMemberId(isExpanded ? null : member.id!)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1" /> {member.area}
                        </div>
                        <div className="flex items-center">
                          <Phone size={14} className="mr-1" /> {member.mobile}
                        </div>
                        <div className="flex items-center text-indigo-600 font-medium">
                          <Users size={14} className="mr-1" /> {memberFamily.length + memberChildren.length} Members
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleExportCSV(member); }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Download CSV"
                    >
                      <Download size={20} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleExportPDF(member); }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Download PDF"
                    >
                      <FileText size={20} />
                    </button>
                    {isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                  </div>
                </div>

                {/* Family Tree Row */}
                {isExpanded && (
                  <div className="p-6 border-t border-gray-100 bg-white space-y-8 relative">
                    {/* Visual Tree Lines (Simple CSS) */}
                    <div className="absolute left-12 top-0 bottom-0 w-px bg-gray-100 -z-10"></div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Spouse & Others */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 flex items-center">
                            <Heart className="text-pink-500 mr-2" size={18} />
                            Spouse & Others
                          </h4>
                          {isAdmin && (
                            <button 
                              onClick={() => { setActiveMemberId(member.id!); setEditingFamilyId(null); setFamilyData({ ...initialFamilyData, photoUrl: '' }); setShowFamilyForm(true); }}
                              className="p-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors"
                            >
                              <Plus size={18} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {memberFamily.map(f => (
                            <div key={f.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group relative">
                              <div className="absolute -left-6 top-1/2 w-6 h-px bg-gray-100"></div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{f.name}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{f.relation} • {f.age} yrs</p>
                              </div>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setViewingFamilyMember({ ...f, type: 'family' })} className="p-1 text-gray-400 hover:text-indigo-600"><Eye size={14} /></button>
                                {isAdmin && (
                                  <>
                                    <button onClick={() => { setEditingFamilyId(f.id!); setFamilyData(f); setShowFamilyForm(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                                    <button onClick={() => setDeleteConfirm({ isOpen: true, id: f.id!, type: 'family' })} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                          {memberFamily.length === 0 && <p className="text-xs text-gray-400 italic">No family members added</p>}
                        </div>
                      </div>

                      {/* Children */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 flex items-center">
                            <Baby className="text-blue-500 mr-2" size={18} />
                            Children
                          </h4>
                          {isAdmin && (
                            <button 
                              onClick={() => { setActiveMemberId(member.id!); setEditingChildId(null); setChildData({ name: '', gender: 'Male', dob: '', education: '', job: '', age: 0, photoUrl: '' }); setShowChildForm(true); }}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Plus size={18} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {memberChildren.map(c => (
                            <div key={c.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col group relative">
                              <div className="absolute -left-6 top-1/2 w-6 h-px bg-gray-100"></div>
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{c.name}</p>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{c.gender} • {c.age} yrs</p>
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setViewingFamilyMember({ ...c, type: 'child', relation: 'Child' })} className="p-1 text-gray-400 hover:text-indigo-600"><Eye size={14} /></button>
                                  {isAdmin && (
                                    <>
                                      <button onClick={() => { setEditingChildId(c.id!); setChildData(c); setShowChildForm(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                                      <button onClick={() => setDeleteConfirm({ isOpen: true, id: c.id!, type: 'child' })} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-1 border-t border-gray-100 pt-2 mt-1">
                                <p className="text-[10px] text-gray-600 flex items-center"><GraduationCap size={10} className="mr-1" /> {c.education || 'N/A'}</p>
                                <p className="text-[10px] text-gray-600 flex items-center"><Briefcase size={10} className="mr-1" /> {c.job || 'N/A'}</p>
                              </div>
                            </div>
                          ))}
                          {memberChildren.length === 0 && <p className="text-xs text-gray-400 italic">No children added</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-6">
          {filteredMembers.map(member => {
            const memberLinks = allFamilyLinks.filter(l => l.memberId === member.id);
            if (memberLinks.length === 0 && !searchTerm) return null;
            if (memberLinks.length === 0 && searchTerm && !member.name.toLowerCase().includes(searchTerm.toLowerCase())) return null;

            return (
              <div key={member.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl">
                    {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 text-sm text-gray-500">
                      <span>{member.area}</span>
                      {member.mobile && (
                        <span className="flex items-center">
                          <Phone size={12} className="mr-1" /> {member.mobile}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative pl-12 space-y-6">
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-100"></div>
                  {memberLinks.map((link) => (
                    <div key={link.id} className="flex items-center justify-between group relative">
                      {/* Horizontal branch line */}
                      <div className="absolute -left-6 top-1/2 w-6 h-px bg-gray-100"></div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 flex items-center justify-center text-gray-400">
                          <User size={18} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-gray-900">{link.name}</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-md tracking-wider">
                              {link.relation}
                            </span>
                            <span className="text-sm text-gray-500">
                              {link.gender}, Age {link.age}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-gray-500">
                            {link.mobile && <span className="flex items-center"><Phone size={10} className="mr-1" /> {link.mobile}</span>}
                            {link.education && <span className="flex items-center"><GraduationCap size={10} className="mr-1" /> {link.education}</span>}
                            {(link.profession || (link as any).job) && <span className="flex items-center"><Briefcase size={10} className="mr-1" /> {link.profession || (link as any).job}</span>}
                            {link.maritalStatus && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{link.maritalStatus}</span>}
                            <span className={`px-1.5 py-0.5 rounded ${link.isAlive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {link.isAlive !== false ? 'Live' : 'No Live'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewingFamilyMember(link)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors">
                          <Eye size={18} />
                        </button>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => {
                                if (link.type === 'family') {
                                  setEditingFamilyId(link.id!);
                                  setFamilyData(link as any);
                                  setShowFamilyForm(true);
                                } else {
                                  setEditingChildId(link.id!);
                                  setChildData(link as any);
                                  setShowChildForm(true);
                                }
                              }} 
                              className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => setDeleteConfirm({ isOpen: true, id: link.id!, type: link.type })} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {memberLinks.length === 0 && (
                    <p className="text-sm text-gray-400 italic ml-12">No family members linked</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allFamilyLinks.map((link) => (
            <div key={link.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    {link.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{link.name}</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{link.relation} of {getMemberName(link.memberId)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button onClick={() => setViewingFamilyMember(link)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Eye size={16} /></button>
                  {isAdmin && (
                    <>
                      <button 
                        onClick={() => {
                          if (link.type === 'family') {
                            setEditingFamilyId(link.id!);
                            setFamilyData(link as any);
                            setShowFamilyForm(true);
                          } else {
                            setEditingChildId(link.id!);
                            setChildData(link as any);
                            setShowChildForm(true);
                          }
                        }} 
                        className="p-1.5 text-gray-400 hover:text-indigo-600"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setDeleteConfirm({ isOpen: true, id: link.id!, type: link.type })} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Gender</span>
                  <span className="font-medium text-gray-900">{link.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Age</span>
                  <span className="font-medium text-gray-900">{link.age} yrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Education</span>
                  <span className="font-medium text-gray-900">{link.education || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Profession</span>
                  <span className="font-medium text-gray-900">{link.profession || (link as any).job || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Family Member Form Modal */}
      {showFamilyForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8">
            <header className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{editingFamilyId ? 'Edit' : 'Add'} Family Member</h3>
              <button onClick={() => setShowFamilyForm(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleAddFamily} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!activeMemberId && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-gray-700">Main Member</label>
                    <select
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={familyData.memberId || ''}
                      onChange={e => setFamilyData({ ...familyData, memberId: e.target.value })}
                    >
                      <option value="">Select Main Member...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.name || ''}
                    onChange={e => setFamilyData({ ...familyData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Relation</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.relation || 'Spouse'}
                    onChange={e => setFamilyData({ ...familyData, relation: e.target.value })}
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Son">Son</option>
                    <option value="Grand Child">Grand Child</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Age</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.age || 0}
                    onChange={e => setFamilyData({ ...familyData, age: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Gender</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.gender || 'Male'}
                    onChange={e => setFamilyData({ ...familyData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Mobile Number</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.mobile || ''}
                    onChange={e => setFamilyData({ ...familyData, mobile: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Email ID</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.email || ''}
                    onChange={e => setFamilyData({ ...familyData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Area</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.area || ''}
                    onChange={e => setFamilyData({ ...familyData, area: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Live or No Live</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.isAlive ? 'Live' : 'No Live'}
                    onChange={e => setFamilyData({ ...familyData, isAlive: e.target.value === 'Live' })}
                  >
                    <option value="Live">Live</option>
                    <option value="No Live">No Live</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Marital Status</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.maritalStatus || 'Married'}
                    onChange={e => setFamilyData({ ...familyData, maritalStatus: e.target.value })}
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widow">Widow</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Education</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.education || ''}
                    onChange={e => setFamilyData({ ...familyData, education: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Profession</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={familyData.profession || ''}
                    onChange={e => setFamilyData({ ...familyData, profession: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Photo URL</label>
                  <input
                    type="url"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={(familyData as any).photoUrl || ''}
                    onChange={e => setFamilyData({ ...familyData, photoUrl: e.target.value } as any)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Full Address</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  rows={3}
                  value={familyData.address || ''}
                  onChange={e => setFamilyData({ ...familyData, address: e.target.value })}
                />
              </div>
              <footer className="pt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowFamilyForm(false)} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition-all shadow-lg shadow-pink-200 flex items-center space-x-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={18} /><span>Save</span></>}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {showChildForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <header className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{editingChildId ? 'Edit' : 'Add'} Child Record</h3>
              <button onClick={() => setShowChildForm(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleAddChild} className="p-8 space-y-4">
              {!activeMemberId && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Main Member</label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={(childData as any).memberId || ''}
                    onChange={e => setChildData({ ...childData, memberId: e.target.value } as any)}
                  >
                    <option value="">Select Main Member...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={childData.name || ''}
                  onChange={e => setChildData({ ...childData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Gender</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={childData.gender || 'Male'}
                    onChange={e => setChildData({ ...childData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Age</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={childData.age || 0}
                    onChange={e => setChildData({ ...childData, age: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={childData.dob || ''}
                  onChange={e => setChildData({ ...childData, dob: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Education</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={childData.education || ''}
                  onChange={e => setChildData({ ...childData, education: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Job/Field</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={childData.job || ''}
                  onChange={e => setChildData({ ...childData, job: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Photo URL</label>
                <input
                  type="url"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={childData.photoUrl || ''}
                  onChange={e => setChildData({ ...childData, photoUrl: e.target.value })}
                />
              </div>
              <footer className="pt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowChildForm(false)} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center space-x-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={18} /><span>Save</span></>}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
      {/* View Family Member Modal */}
      {viewingFamilyMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8">
            <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                  {viewingFamilyMember.type === 'family' ? <Heart size={20} /> : <Baby size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{viewingFamilyMember.name}</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{viewingFamilyMember.relation} of {getMemberName(viewingFamilyMember.memberId)}</p>
                </div>
              </div>
              <button onClick={() => setViewingFamilyMember(null)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                <X size={20} />
              </button>
            </header>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Age</p>
                <p className="text-gray-900 font-medium">{viewingFamilyMember.age} years</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gender</p>
                <p className="text-gray-900 font-medium">{viewingFamilyMember.gender}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Living Status</p>
                <p className="text-gray-900 font-medium">{viewingFamilyMember.isAlive ? 'Live' : 'No Live'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Marital Status</p>
                <p className="text-gray-900 font-medium">{viewingFamilyMember.maritalStatus || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mobile</p>
                <p className="text-gray-900 font-medium">{viewingFamilyMember.mobile || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</p>
                <p className="text-gray-900 font-medium">{viewingFamilyMember.email || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Education</p>
                <p className="text-gray-900 font-medium">{viewingFamilyMember.education || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Profession</p>
                <p className="text-gray-900 font-medium">{viewingFamilyMember.profession || viewingFamilyMember.job || 'N/A'}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Area</p>
                <p className="text-gray-900 font-medium">{viewingFamilyMember.area || 'N/A'}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Address</p>
                <p className="text-gray-900 font-medium">{viewingFamilyMember.address || 'N/A'}</p>
              </div>
            </div>
            <footer className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setViewingFamilyMember(null)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all">Close</button>
            </footer>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, type: null })}
        onConfirm={handleDelete}
        title={`Delete ${deleteConfirm.type === 'family' ? 'Family Member' : 'Child'}`}
        message="Are you sure you want to delete this record? This action cannot be undone."
      />
    </div>
  );
};

export default FamilyTree;
