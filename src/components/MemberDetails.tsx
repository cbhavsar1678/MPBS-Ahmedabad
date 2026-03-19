import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, deleteDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member, FamilyMember, Child, Donation, AnnualFee } from '../types';
import { 
  User, Heart, Baby, CreditCard, HeartHandshake, 
  Edit2, Trash2, X, Save, ArrowLeft, Mail, Phone, MapPin, 
  Briefcase, GraduationCap, Calendar, Plus, IndianRupee, MessageCircle
} from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import ConfirmationModal from './ConfirmationModal';

interface MemberDetailsProps {
  memberId: string;
  onBack: () => void;
}

const MemberDetails: React.FC<MemberDetailsProps> = ({ memberId, onBack }) => {
  const { isAdmin } = useFirebase();
  const [member, setMember] = useState<Member | null>(null);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [fees, setFees] = useState<AnnualFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<{ type: string, data: any } | null>(null);
  const [showAddForm, setShowAddForm] = useState<{ type: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; collection: string; id: string | null }>({ isOpen: false, collection: '', id: null });

  useEffect(() => {
    if (!memberId) return;

    const unsubMember = onSnapshot(doc(db, 'members', memberId), (docSnap) => {
      if (docSnap.exists()) {
        setMember({ id: docSnap.id, ...docSnap.data() } as Member);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `members/${memberId}`));

    const unsubFamily = onSnapshot(query(collection(db, 'family-members'), where('memberId', '==', memberId)), (snapshot) => {
      setFamily(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyMember)));
    });

    const unsubChildren = onSnapshot(query(collection(db, 'children'), where('memberId', '==', memberId)), (snapshot) => {
      setChildren(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child)));
    });

    let unsubDonations = () => {};
    let unsubFees = () => {};

    if (isAdmin) {
      unsubDonations = onSnapshot(query(collection(db, 'donations'), where('memberId', '==', memberId)), (snapshot) => {
        setDonations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donation)));
      });

      unsubFees = onSnapshot(query(collection(db, 'annual-fees'), where('memberId', '==', memberId)), (snapshot) => {
        setFees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnnualFee)));
      });
    }

    return () => {
      unsubMember();
      unsubFamily();
      unsubChildren();
      unsubDonations();
      unsubFees();
    };
  }, [memberId]);

  const handleDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await deleteDoc(doc(db, deleteConfirm.collection, deleteConfirm.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, deleteConfirm.collection);
      }
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddForm) return;
    try {
      const { type } = showAddForm;
      const collectionName = type === 'family' ? 'family-members' : 
                            type === 'child' ? 'children' : 
                            type === 'donation' ? 'donations' : 'annual-fees';
      
      const newData = {
        ...formData,
        memberId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, collectionName), newData);
      setShowAddForm(null);
      setFormData({});
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'member-details');
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const { type, data } = editingItem;
      const collectionName = type === 'family' ? 'family-members' : 
                            type === 'child' ? 'children' : 
                            type === 'donation' ? 'donations' : 'annual-fees';
      
      const { id, ...updateData } = data;
      await updateDoc(doc(db, collectionName, id), {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'member-details');
    }
  };

  const [formData, setFormData] = useState<any>({});

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!member) return <div className="text-center p-20">Member not found</div>;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{member.name}</h2>
          <p className="text-gray-500">Member Profile & History</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-48 bg-indigo-600 relative">
              {member.photoUrl && (
                <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover opacity-50" />
              )}
              <div className="absolute -bottom-12 left-6">
                <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-xl">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <div className="w-full h-full bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-2xl">
                      {member.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="pt-16 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  member.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
                }`}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="space-y-3 text-sm text-gray-600">
                {isAdmin ? (
                  <>
                    <div className="flex items-center"><Mail size={16} className="mr-3 text-gray-400" /> {member.email}</div>
                    <div className="flex items-center">
                      <Phone size={16} className="mr-3 text-gray-400" /> {member.mobile}
                      <a 
                        href={`https://wa.me/${member.mobile.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                    <div className="flex items-center"><MapPin size={16} className="mr-3 text-gray-400" /> {member.area}, {member.address}</div>
                  </>
                ) : (
                  <div className="flex items-center text-gray-400 italic"><MapPin size={16} className="mr-3 text-gray-400" /> {member.area} (Address Hidden)</div>
                )}
                <div className="flex items-center"><Briefcase size={16} className="mr-3 text-gray-400" /> {member.profession}</div>
                <div className="flex items-center"><GraduationCap size={16} className="mr-3 text-gray-400" /> {member.education}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Sections */}
        <div className="lg:col-span-2 space-y-8">
          {/* Family Section */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Heart className="mr-2 text-pink-500" size={20} /> Family Members
              </h3>
              {isAdmin && (
                <button 
                  onClick={() => { setFormData({ name: '', relation: 'Spouse', age: 0 }); setShowAddForm({ type: 'family' }); }}
                  className="p-2 bg-pink-50 text-pink-600 rounded-xl hover:bg-pink-100 transition-colors"
                  title="Add Family Member"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {family.map(m => (
                  <div key={m.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-gray-900">{m.name}</p>
                        {isAdmin && m.mobile && (
                          <a 
                            href={`https://wa.me/${m.mobile.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle size={12} />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{m.relation} • {m.age} yrs</p>
                      {!isAdmin && <p className="text-[10px] text-gray-400 italic">Contact Hidden</p>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center space-x-2">
                        <button onClick={() => setEditingItem({ type: 'family', data: m })} className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteConfirm({ isOpen: true, collection: 'family-members', id: m.id! })} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {family.length === 0 && <p className="text-gray-400 text-sm italic">No family members recorded</p>}
              </div>
            </div>
          </section>

          {/* Children Section */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Baby className="mr-2 text-blue-500" size={20} /> Children
              </h3>
              {isAdmin && (
                <button 
                  onClick={() => { setFormData({ name: '', gender: 'Male', age: 0, education: '', job: '' }); setShowAddForm({ type: 'child' }); }}
                  className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                  title="Add Child"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map(c => (
                  <div key={c.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-gray-900">{c.name}</p>
                        {isAdmin && c.mobile && (
                          <a 
                            href={`https://wa.me/${c.mobile.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle size={12} />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{c.gender} • {c.age} yrs</p>
                      {!isAdmin && <p className="text-[10px] text-gray-400 italic">Contact Hidden</p>}
                      <div className="mt-1 space-y-0.5">
                        <p className="text-[10px] text-gray-400 flex items-center"><GraduationCap size={10} className="mr-1" /> {c.education || 'N/A'}</p>
                        <p className="text-[10px] text-gray-400 flex items-center"><Briefcase size={10} className="mr-1" /> {c.job || 'N/A'}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center space-x-2">
                        <button onClick={() => setEditingItem({ type: 'child', data: c })} className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteConfirm({ isOpen: true, collection: 'children', id: c.id! })} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {children.length === 0 && <p className="text-gray-400 text-sm italic">No children records found</p>}
              </div>
            </div>
          </section>

          {/* Donations Section */}
          {isAdmin && (
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <HeartHandshake className="mr-2 text-red-500" size={20} /> Donation History
                </h3>
                {isAdmin && (
                  <button 
                    onClick={() => { setFormData({ amount: 0, date: new Date().toISOString().split('T')[0], purpose: 'General' }); setShowAddForm({ type: 'donation' }); }}
                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                    title="Add Donation"
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Purpose</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Amount</th>
                      {isAdmin && <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {donations.map(d => (
                      <tr key={d.id}>
                        <td className="px-6 py-4 text-sm text-gray-600">{d.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{d.purpose || 'General'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{d.amount}</td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => setEditingItem({ type: 'donation', data: d })} className="text-gray-300 hover:text-indigo-600">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, collection: 'donations', id: d.id! })} className="text-gray-300 hover:text-red-500">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {donations.length === 0 && <p className="p-6 text-center text-gray-400 text-sm italic">No donations recorded</p>}
              </div>
            </section>
          )}

          {/* Fees Section */}
          {isAdmin && (
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <CreditCard className="mr-2 text-emerald-500" size={20} /> Annual Fees
                </h3>
                {isAdmin && (
                  <button 
                    onClick={() => { setFormData({ amount: 0, date: new Date().toISOString().split('T')[0], year: new Date().getFullYear().toString() }); setShowAddForm({ type: 'fee' }); }}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                    title="Add Annual Fee"
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Year</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Amount</th>
                      {isAdmin && <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {fees.map(f => (
                      <tr key={f.id}>
                        <td className="px-6 py-4 text-sm text-gray-600">{f.year}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{f.date}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{f.amount}</td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => setEditingItem({ type: 'fee', data: f })} className="text-gray-300 hover:text-indigo-600">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, collection: 'annual-fees', id: f.id! })} className="text-gray-300 hover:text-red-500">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fees.length === 0 && <p className="p-6 text-center text-gray-400 text-sm italic">No fee records found</p>}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Add {showAddForm.type}</h3>
              <button onClick={() => setShowAddForm(null)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              {showAddForm.type === 'family' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Relation</label>
                      <select 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={formData.relation || 'Spouse'} 
                        onChange={e => setFormData({ ...formData, relation: e.target.value })}
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
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Age</label>
                      <input 
                        type="number" 
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={formData.age || 0} 
                        onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </>
              )}
              {showAddForm.type === 'child' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Education</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={formData.education || ''} 
                        onChange={e => setFormData({ ...formData, education: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Profession</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={formData.job || ''} 
                        onChange={e => setFormData({ ...formData, job: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Age</label>
                      <input 
                        type="number" 
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={formData.age || 0} 
                        onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </>
              )}
              {showAddForm.type === 'donation' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Amount (₹)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                      value={formData.amount || 0} 
                      onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Purpose</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                      value={formData.purpose || ''} 
                      onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                      value={formData.date || ''} 
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </>
              )}
              {showAddForm.type === 'fee' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Year</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={formData.year || ''} 
                        onChange={e => setFormData({ ...formData, year: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Amount (₹)</label>
                      <input 
                        type="number" 
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={formData.amount || 0} 
                        onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                      value={formData.date || ''} 
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </>
              )}
              <footer className="pt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddForm(null)} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center space-x-2">
                  <Save size={18} />
                  <span>Add Record</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Simple Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Edit {editingItem.type}</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleUpdateItem} className="p-6 space-y-4">
              {editingItem.type === 'family' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                      value={editingItem.data.name || ''} 
                      onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, name: e.target.value } })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Relation</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={editingItem.data.relation || ''} 
                        onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, relation: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Age</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={editingItem.data.age || 0} 
                        onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, age: Number(e.target.value) } })}
                      />
                    </div>
                  </div>
                </>
              )}
              {editingItem.type === 'child' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                      value={editingItem.data.name || ''} 
                      onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, name: e.target.value } })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Education</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={editingItem.data.education || ''} 
                        onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, education: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Profession</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={editingItem.data.job || ''} 
                        onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, job: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Age</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                        value={editingItem.data.age || 0} 
                        onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, age: Number(e.target.value) } })}
                      />
                    </div>
                  </div>
                </>
              )}
              {(editingItem.type === 'donation' || editingItem.type === 'fee') && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Amount (₹)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                      value={editingItem.data.amount || 0} 
                      onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, amount: Number(e.target.value) } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl" 
                      value={editingItem.data.date || ''} 
                      onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, date: e.target.value } })}
                    />
                  </div>
                </>
              )}
              <footer className="pt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditingItem(null)} className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center space-x-2">
                  <Save size={18} />
                  <span>Save Changes</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        onConfirm={handleDelete}
        title="Delete Record"
        message={`Are you sure you want to delete this record from ${deleteConfirm.collection}? This action cannot be undone.`}
      />
    </div>
  );
};

export default MemberDetails;
