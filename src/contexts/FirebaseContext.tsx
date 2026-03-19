import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Member } from '../types';

interface FirebaseContextType {
  user: User | null;
  memberData: Member | null;
  loading: boolean;
  isAdmin: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [memberData, setMemberData] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Fetch member data to check role
          const memberDoc = await getDoc(doc(db, 'members', currentUser.uid));
          if (memberDoc.exists()) {
            setMemberData({ id: memberDoc.id, ...memberDoc.data() } as Member);
          } else {
            // Check for hardcoded accounts
            if (currentUser.email === 'admin@mpbs.com' || currentUser.email === 'cbhavsar1678@gmail.com') {
               setMemberData({ role: 'admin' } as Member);
            } else if (currentUser.email === 'member@mpbs.com') {
               setMemberData({ role: 'member' } as Member);
            } else {
               setMemberData(null);
            }
          }
        } catch (error) {
          console.error("Error fetching member data:", error);
          // Fallback for hardcoded accounts if getDoc fails due to permissions
          if (currentUser.email === 'admin@mpbs.com' || currentUser.email === 'cbhavsar1678@gmail.com') {
            setMemberData({ role: 'admin' } as Member);
          } else if (currentUser.email === 'member@mpbs.com') {
            setMemberData({ role: 'member' } as Member);
          } else {
            setMemberData(null);
          }
        }
      } else {
        setMemberData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = memberData?.role === 'admin' || user?.email === 'cbhavsar1678@gmail.com' || user?.email === 'admin@mpbs.com';

  return (
    <FirebaseContext.Provider value={{ user, memberData, loading, isAdmin }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
