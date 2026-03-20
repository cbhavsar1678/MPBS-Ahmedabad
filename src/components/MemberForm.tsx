import React, { useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member } from '../types';
import { X, Save, User, Phone, MapPin, Briefcase, GraduationCap } from 'lucide-react';

interface MemberFormProps {
  member?: Member;
  onClose: () => void;
  onSuccess: () => void;
}

const MemberForm: React.FC<MemberFormProps> = ({ member, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<Member>>(member || {
    name: '',
    age: 0,
    maritalStatus: 'Single',
    mobile: '',
    area: '',
    address: '',
    isAlive: true,
    status: 'Active',
    education: '',
    profession: '',
    gender: 'Male',
    photoUrl: '',
    isActive: true,
    role: 'member',
    email: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (member?.id) {
        await updateDoc(doc(db, 'members', member.id), formData);
      } else {
        await addDoc(collection(db, 'members'), formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      handleFirestoreError(error, member?.id ? OperationType.UPDATE : OperationType.CREATE, 'members');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDOBChange = (dob: string) => {
    const age = calculateAge(dob);
    setFormData({ ...formData, dob, age });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <User size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{member ? 'Edit Member' : 'Add New Member'}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Mobile Number</label>
              <input
                type="tel"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.mobile || ''}
                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Date of Birth</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.dob || ''}
                onChange={e => handleDOBChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Age</label>
              <input
                type="number"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.age || 0}
                onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Marital Status</label>
              <select
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.maritalStatus || 'Single'}
                onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })}
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Photo URL</label>
              <input
                type="url"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.photoUrl || ''}
                onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Gender</label>
              <select
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.gender || 'Male'}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Area</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.area || ''}
                onChange={e => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Education</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.education || ''}
                onChange={e => setFormData({ ...formData, education: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Profession</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.profession || ''}
                onChange={e => setFormData({ ...formData, profession: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Full Address</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              rows={3}
              value={formData.address || ''}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <span className="text-sm font-medium text-gray-700">Active Member</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                checked={formData.isAlive}
                onChange={e => setFormData({ ...formData, isAlive: e.target.checked })}
              />
              <span className="text-sm font-medium text-gray-700">Alive</span>
            </label>
          </div>
        </form>

        <footer className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={18} />
                <span>Save Member</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default MemberForm;
