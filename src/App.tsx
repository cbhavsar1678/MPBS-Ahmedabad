import React, { useState, useEffect } from 'react';
import { FirebaseProvider, useFirebase } from './contexts/FirebaseContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MemberDirectory from './components/MemberDirectory';
import Login from './components/Login';
import Events from './components/Events';
import Donations from './components/Donations';
import AnnualFees from './components/AnnualFees';
import Teams from './components/Teams';
import FamilyTree from './components/FamilyTree';
import ChildrenDirectory from './components/ChildrenDirectory';
import EventExpenses from './components/EventExpenses';
import BalanceSheet from './components/BalanceSheet';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const AppContent: React.FC = () => {
  const { user, loading } = useFirebase();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const removePanktiImage = async () => {
      if (!user) return;
      
      const nameToRemove = "Pankti Chirag Bhavsar";
      
      // Check members collection
      const membersQuery = query(collection(db, 'members'), where('name', '==', nameToRemove));
      const membersSnap = await getDocs(membersQuery);
      membersSnap.forEach(async (document) => {
        await updateDoc(doc(db, 'members', document.id), { photoUrl: '' });
        console.log(`Removed photo for member: ${nameToRemove}`);
      });

      // Check children collection
      const childrenQuery = query(collection(db, 'children'), where('name', '==', nameToRemove));
      const childrenSnap = await getDocs(childrenQuery);
      childrenSnap.forEach(async (document) => {
        await updateDoc(doc(db, 'children', document.id), { photoUrl: '' });
        console.log(`Removed photo for child: ${nameToRemove}`);
      });
    };

    removePanktiImage();
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading Community Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'directory':
        return <MemberDirectory />;
      case 'children':
        return <ChildrenDirectory />;
      case 'family-tree':
        return <FamilyTree />;
      case 'events':
        return <Events />;
      case 'donations':
        return <Donations />;
      case 'annual-fees':
        return <AnnualFees />;
      case 'event-expenses':
        return <EventExpenses />;
      case 'balance-sheet':
        return <BalanceSheet />;
      case 'teams':
        return <Teams />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
