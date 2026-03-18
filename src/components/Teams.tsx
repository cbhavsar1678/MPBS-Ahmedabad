import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Team, Member } from '../types';
import { Users2, Plus, User, Calendar, X, Save, ShieldCheck, Edit2, Trash2, Search, Download, FileText, IndianRupee } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import ConfirmationModal from './ConfirmationModal';

const Teams: React.FC = () => {
  const { isAdmin } = useFirebase();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: [] as string[],
    photoUrl: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'teams'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));

    const fetchMembers = async () => {
      const snapshot = await getDocs(collection(db, 'members'));
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member)));
    };
    fetchMembers();

    return () => unsubscribe();
  }, []);

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown Member';

  const filteredTeams = useMemo(() => {
    return teams.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teams, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingTeam) {
        await updateDoc(doc(db, 'teams', editingTeam.id!), { ...formData });
      } else {
        await addDoc(collection(db, 'teams'), { ...formData, creationDate: new Date().toISOString(), createdAt: serverTimestamp() });
      }
      setShowForm(false);
      setEditingTeam(null);
      setFormData({ name: '', description: '', members: [], photoUrl: '' });
    } catch (error) {
      handleFirestoreError(error, editingTeam ? OperationType.UPDATE : OperationType.CREATE, 'teams');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({ name: team.name, description: (team as any).description || '', members: team.members, photoUrl: (team as any).photoUrl || '' });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await deleteDoc(doc(db, 'teams', deleteConfirm.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'teams');
      }
    }
  };

  const handleExportCSV = () => {
    const data = filteredTeams.map(t => ({ Name: t.name, Description: (t as any).description || '', Members: t.members.length, Established: new Date(t.creationDate).getFullYear() }));
    exportToCSV(data, 'community_teams');
  };

  const handleExportPDF = () => {
    const data = filteredTeams.map(t => ({ Name: t.name, Members: t.members.length, Established: new Date(t.creationDate).getFullYear() }));
    exportToPDF(data, 'Community Teams', 'community_teams');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Community Teams</h2>
          <p className="text-gray-500 mt-1">Organized groups working for community welfare</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={handleExportCSV} className="p-2 text-gray-400 hover:text-indigo-600" title="Export CSV"><Download size={20} /></button>
          <button onClick={handleExportPDF} className="p-2 text-gray-400 hover:text-indigo-600" title="Export PDF"><FileText size={20} /></button>
          {isAdmin && (
            <button onClick={() => { setEditingTeam(null); setFormData({ name: '', description: '', members: [], photoUrl: '' }); setShowForm(true); }} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              <Plus size={20} />
              <span>Create Team</span>
            </button>
          )}
        </div>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search teams by name or description..."
            className="w-full pl-12 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <div key={team.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            {(team as any).photoUrl && (
              <div className="h-40 overflow-hidden">
                <img src={(team as any).photoUrl} alt={team.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Users2 size={24} />
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-2">
                    {team.members.slice(0, 3).map((mId, idx) => (
                      <div key={idx} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                        {getMemberName(mId).charAt(0)}
                      </div>
                    ))}
                    {team.members.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                        +{team.members.length - 3}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex space-x-1 ml-2">
                      <button onClick={() => handleEdit(team)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteConfirm({ isOpen: true, id: team.id! })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{team.name}</h3>
              <p className="text-gray-500 text-sm line-clamp-2 mb-6">{(team as any).description || 'Dedicated community support team.'}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center text-gray-400 text-xs">
                  <Calendar size={14} className="mr-1" />
                  <span>Est. {new Date(team.creationDate).getFullYear()}</span>
                </div>
                <div className="flex items-center text-indigo-600 text-xs font-bold">
                  <ShieldCheck size={14} className="mr-1" />
                  <span>{team.members.length} Members</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredTeams.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <Users2 className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 font-medium">No teams found matching your search</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{editingTeam ? 'Edit Team' : 'Form New Team'}</h3>
              <button onClick={() => { setShowForm(false); setEditingTeam(null); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Team Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Description</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Photo URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/team-photo.jpg"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={formData.photoUrl}
                  onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Add Members</label>
                <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-2 space-y-1">
                  {members.map(member => (
                    <label key={member.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        checked={formData.members.includes(member.id!)}
                        onChange={e => {
                          const newMembers = e.target.checked
                            ? [...formData.members, member.id!]
                            : formData.members.filter(id => id !== member.id);
                          setFormData({ ...formData, members: newMembers });
                        }}
                      />
                      <span className="text-sm text-gray-700">{member.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <footer className="pt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center space-x-2 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={18} /><span>Create Team</span></>}
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
        title="Delete Team"
        message="Are you sure you want to delete this team? This action cannot be undone."
      />
    </div>
  );
};

export default Teams;
