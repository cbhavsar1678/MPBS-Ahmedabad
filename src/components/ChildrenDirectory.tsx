import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member, FamilyMember, Child } from '../types';
import { Search, Download, FileText, Baby, User, Users, Phone, MapPin, GraduationCap, Briefcase, MessageCircle } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

const ChildrenDirectory: React.FC = () => {
  const { isAdmin } = useFirebase();
  const [members, setMembers] = useState<Member[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  const getFatherName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || 'N/A';
  };

  const getMotherName = (memberId: string) => {
    const spouse = familyMembers.find(f => f.memberId === memberId && (f.relation === 'Spouse' || f.relation === 'Mother'));
    return spouse?.name || 'N/A';
  };

  const getArea = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.area || 'N/A';
  };

  const processedChildren = useMemo(() => {
    return children.map(child => ({
      ...child,
      fatherName: getFatherName(child.memberId),
      motherName: getMotherName(child.memberId),
      area: getArea(child.memberId)
    }));
  }, [children, members, familyMembers]);

  const filteredChildren = useMemo(() => {
    if (!searchTerm) return processedChildren;
    const term = searchTerm.toLowerCase();
    return processedChildren.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.fatherName.toLowerCase().includes(term) ||
      c.motherName.toLowerCase().includes(term) ||
      c.area.toLowerCase().includes(term) ||
      (c.mobile && c.mobile.includes(term))
    );
  }, [processedChildren, searchTerm]);

  const handleExportCSV = () => {
    const data = filteredChildren.map(c => ({
      'Child Name': c.name,
      'Relation': c.relation || 'N/A',
      'Father Name': c.fatherName,
      'Mother Name': c.motherName,
      'Age': c.age,
      'Gender': c.gender,
      'Area': c.area,
      'Phone': isAdmin ? (c.mobile || 'N/A') : 'Hidden',
      'Education': c.education || 'N/A',
      'Profession': c.profession || c.job || 'N/A'
    }));
    exportToCSV(data, 'children_directory');
  };

  const handleExportPDF = () => {
    const data = filteredChildren.map(c => ({
      'Name': c.name,
      'Relation': c.relation || 'N/A',
      'Father': c.fatherName,
      'Mother': c.motherName,
      'Age': c.age,
      'Gender': c.gender,
      'Phone': isAdmin ? (c.mobile || 'N/A') : 'Hidden',
      'Profession': c.profession || c.job || 'N/A'
    }));
    exportToPDF(data, 'Children Directory', 'children_directory');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Children Directory</h2>
          <p className="text-gray-500 mt-1">Comprehensive list of all community children</p>
        </div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
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
          )}
        </div>
      </header>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by child, parent name, area or mobile..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Child Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Relation</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Parents</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Age & Gender</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact & Area</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Education & Profession</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredChildren.map((child) => (
                <tr key={child.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold overflow-hidden shadow-sm">
                        {child.photoUrl ? (
                          <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Baby size={20} />
                        )}
                      </div>
                      <span className="font-bold text-gray-900">{child.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                      {child.relation || 'Son'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-700">
                        <User size={14} className="mr-2 text-gray-400" />
                        <span className="font-medium">F:</span> {child.fatherName}
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <Users size={14} className="mr-2 text-gray-400" />
                        <span className="font-medium">M:</span> {child.motherName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">{child.age} yrs</div>
                    <div className="text-xs text-gray-500">{child.gender}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {isAdmin ? (
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center">
                            <Phone size={14} className="mr-2 text-gray-400" /> {child.mobile || 'N/A'}
                          </div>
                          {child.mobile && (
                            <a 
                              href={`https://wa.me/${child.mobile.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">Phone Hidden</div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin size={14} className="mr-2 text-gray-400" /> {child.area}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <GraduationCap size={14} className="mr-2 text-gray-400" /> {child.education || 'N/A'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Briefcase size={14} className="mr-2 text-gray-400" /> {child.profession || child.job || 'N/A'}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredChildren.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    No children found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChildrenDirectory;
