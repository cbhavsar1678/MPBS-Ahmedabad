import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member, Event, Donation, AnnualFee, FamilyMember, Child } from '../types';
import { Users, UserCheck, UserMinus, Calendar, Heart, CreditCard, Edit2, Trash2, MoreVertical, MapPin, Phone, Briefcase, User, Baby, IndianRupee, MessageCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useFirebase } from '../contexts/FirebaseContext';
import MemberForm from './MemberForm';
import MemberDetails from './MemberDetails';
import ConfirmationModal from './ConfirmationModal';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
    <div className={`p-3 rounded-xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { isAdmin } = useFirebase();
  const [members, setMembers] = useState<Member[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [latestEvent, setLatestEvent] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | undefined>(undefined);
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalFamilies: 0,
    totalMale: 0,
    totalFemale: 0,
    totalDonations: 0,
    totalAnnualFees: 0,
    childrenUnder18: 0,
    children18Plus: 0,
  });

  const [genderData, setGenderData] = useState<any[]>([]);
  const [areaData, setAreaData] = useState<any[]>([]);

  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      setMembers(membersData);
      const male = membersData.filter(m => m.gender === 'Male').length;
      const female = membersData.filter(m => m.gender === 'Female').length;
      
      setStats(prev => ({
        ...prev,
        totalMembers: membersData.length,
        totalFamilies: membersData.length, // Assuming each main member represents a family
        totalMale: male,
        totalFemale: female,
      }));

      setGenderData([
        { name: 'Male', value: male },
        { name: 'Female', value: female },
      ]);

      // Calculate area distribution
      const areas: { [key: string]: number } = {};
      membersData.forEach(m => {
        const area = m.area || 'Unknown';
        areas[area] = (areas[area] || 0) + 1;
      });
      setAreaData(Object.entries(areas).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
    });

    const unsubFamily = onSnapshot(collection(db, 'family-members'), (snapshot) => {
      setFamilyMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyMember)));
    });

    const unsubChildren = onSnapshot(collection(db, 'children'), (snapshot) => {
      const childrenData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child));
      setChildren(childrenData);
      
      const under18 = childrenData.filter(c => c.age < 18).length;
      const eighteenPlus = childrenData.filter(c => c.age >= 18).length;
      
      setStats(prev => ({
        ...prev,
        childrenUnder18: under18,
        children18Plus: eighteenPlus,
      }));
    });

    let unsubDonations = () => {};
    if (isAdmin) {
      unsubDonations = onSnapshot(collection(db, 'donations'), (snapshot) => {
        const total = snapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
        setStats(prev => ({ ...prev, totalDonations: total }));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'donations');
      });
    }

    let unsubFees = () => {};
    if (isAdmin) {
      unsubFees = onSnapshot(collection(db, 'annual-fees'), (snapshot) => {
        const total = snapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
        setStats(prev => ({ ...prev, totalAnnualFees: total }));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'annual-fees');
      });
    }

    const unsubEvents = onSnapshot(query(collection(db, 'events'), orderBy('date', 'desc'), limit(1)), (snapshot) => {
      if (!snapshot.empty) {
        setLatestEvent({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Event);
      }
    });

    return () => {
      unsubMembers();
      unsubFamily();
      unsubChildren();
      unsubDonations();
      unsubFees();
      unsubEvents();
    };
  }, []);

  const COLORS = ['#6366f1', '#ec4899'];

  const handleDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await deleteDoc(doc(db, 'members', deleteConfirm.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'members');
      }
    }
  };

  const getFamilyCount = (memberId: string) => {
    const familyCount = familyMembers.filter(f => f.memberId === memberId).length;
    const childCount = children.filter(c => c.memberId === memberId).length;
    return familyCount + childCount;
  };

  if (viewingMemberId) {
    return <MemberDetails memberId={viewingMemberId} onBack={() => setViewingMemberId(null)} />;
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1 text-lg">Community overview and comprehensive statistics</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users className="text-indigo-600" />} label="Total Members" value={stats.totalMembers} color="bg-indigo-50" />
        <StatCard icon={<Users className="text-blue-600" />} label="Total Families" value={stats.totalFamilies} color="bg-blue-50" />
        <StatCard icon={<UserCheck className="text-emerald-600" />} label="Male Members" value={stats.totalMale} color="bg-emerald-50" />
        <StatCard icon={<UserMinus className="text-pink-600" />} label="Female Members" value={stats.totalFemale} color="bg-pink-50" />
        <StatCard icon={<Baby className="text-violet-600" />} label="Children (18+)" value={stats.children18Plus} color="bg-violet-50" />
        <StatCard icon={<Baby size={20} className="text-cyan-600" />} label="Children (<18)" value={stats.childrenUnder18} color="bg-cyan-50" />
        {isAdmin && (
          <>
            <StatCard icon={<Heart className="text-red-600" />} label="Total Donations" value={`₹${stats.totalDonations.toLocaleString()}`} color="bg-red-50" />
            <StatCard icon={<CreditCard className="text-amber-600" />} label="Total Fees" value={`₹${stats.totalAnnualFees.toLocaleString()}`} color="bg-amber-50" />
          </>
        )}
      </div>

      {/* Members List Section - Full Width */}
      <div className="w-full">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Members List</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mobile & Area</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Age & Profession</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Family Tree</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-600 overflow-hidden shadow-sm">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            member.name.split(' ').map(n => n[0]).join('').toUpperCase()
                          )}
                        </div>
                        <button 
                          onClick={() => setViewingMemberId(member.id!)}
                          className="font-bold text-gray-900 hover:text-indigo-600 transition-colors text-left"
                        >
                          {member.name}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center">
                            <Phone size={14} className="mr-2 text-gray-400" /> {isAdmin ? member.mobile : 'Hidden'}
                          </div>
                          {isAdmin && (
                            <a 
                              href={`https://wa.me/${member.mobile.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin size={14} className="mr-2 text-gray-400" /> {member.area}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900 font-medium">Age: {member.age}</div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Briefcase size={14} className="mr-2" /> {member.profession}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg w-fit">
                        <Users size={16} className="mr-2" />
                        {getFamilyCount(member.id!)} Members
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        member.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setViewingMemberId(member.id!)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="View Details"
                        >
                          <User size={18} />
                        </button>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => { setSelectedMember(member); setShowForm(true); }}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Edit Member"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm({ isOpen: true, id: member.id! })}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Member"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <CreditCard size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Fee Collection Summary</h3>
                <p className="text-sm text-gray-500">All till date</p>
              </div>
            </div>
            <p className="text-4xl font-black text-indigo-600">₹{stats.totalAnnualFees.toLocaleString()}</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                <Heart size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Donations Summary</h3>
                <p className="text-sm text-gray-500">All till date</p>
              </div>
            </div>
            <p className="text-4xl font-black text-emerald-600">₹{stats.totalDonations.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Latest Event Section - Full Width */}
      <div className="w-full">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900">Latest Event</h3>
          </div>
          {latestEvent ? (
            <div className="p-6 flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/2 aspect-video rounded-3xl overflow-hidden bg-gray-100 shadow-inner">
                {latestEvent.photos && latestEvent.photos.length > 0 ? (
                  <img src={latestEvent.photos[0]} alt={latestEvent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Calendar size={64} />
                  </div>
                )}
              </div>
              <div className="w-full md:w-1/2 flex flex-col justify-center space-y-6">
                <div>
                  <h4 className="text-3xl font-black text-gray-900 leading-tight">{latestEvent.name}</h4>
                  <div className="flex flex-wrap gap-4 mt-4">
                    <div className="flex items-center px-4 py-2 bg-gray-50 rounded-xl text-gray-600 font-medium">
                      <Calendar size={18} className="mr-2 text-indigo-500" />
                      {latestEvent.date}
                    </div>
                    <div className="flex items-center px-4 py-2 bg-gray-50 rounded-xl text-gray-600 font-medium">
                      <Users size={18} className="mr-2 text-indigo-500" />
                      {latestEvent.attendedCount || 0} Members Attended
                    </div>
                  </div>
                </div>
                <p className="text-gray-500 text-lg leading-relaxed">
                  {latestEvent.description || "Join us for our upcoming community event. We look forward to seeing everyone there!"}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-20" />
              <p>No upcoming events scheduled</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Members by Area Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Members by Area</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} width={100} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Distribution Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Gender Distribution</h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold text-gray-900">{stats.totalMembers}</span>
              <span className="text-sm text-gray-500">Total</span>
            </div>
          </div>
        </div>
      </div>

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

export default Dashboard;
