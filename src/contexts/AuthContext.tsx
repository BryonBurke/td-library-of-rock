import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export type Role = 'student' | 'moderator';

export interface UserData {
  email: string;
  displayName: string;
  role: Role;
  createdAt: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  refreshUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string, email: string | null) => {
    const userRef = doc(db, 'users', uid);
    let userSnap;
    
    try {
      userSnap = await getDoc(userRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${uid}`);
      return;
    }

    if (userSnap.exists()) {
      let data = userSnap.data() as UserData;
      
      // Auto-upgrade bootstrapped admin if their role in the DB is not moderator yet
      if (email === 'bryonparis@gmail.com' && data.role !== 'moderator') {
        data = { ...data, role: 'moderator' };
        try {
          await setDoc(userRef, { role: 'moderator' }, { merge: true });
        } catch (e) {
          console.error("Failed to auto-upgrade bootstrapped admin", e);
        }
      }
      
      setUserData(data);
    } else {
      // Create new user profile
      const newUser: UserData = {
        email: email || '',
        displayName: email?.split('@')[0] || 'Unknown',
        role: email === 'bryonparis@gmail.com' ? 'moderator' : 'student',
        createdAt: Date.now(),
      };
      
      try {
        await setDoc(userRef, newUser);
        setUserData(newUser);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `users/${uid}`);
      }
    }
  };

  const refreshUserData = async () => {
    if (user) {
      try {
        await fetchUserData(user.uid, user.email);
      } catch (e) {
        console.error("refreshUserData error:", e);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await fetchUserData(firebaseUser.uid, firebaseUser.email);
        } catch (e) {
          console.error("fetchUserData error:", e);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};
