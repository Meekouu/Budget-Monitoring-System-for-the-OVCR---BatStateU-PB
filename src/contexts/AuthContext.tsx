import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, logoutUser, usersCollection, getDoc, doc, setDoc } from '../firebase';

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'department';
  campusId?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const allowedDomain = 'g.batstate-u.edu.ph';

  const isAllowedEmail = (email: string) => {
    return email.toLowerCase().endsWith(`@${allowedDomain}`);
  };

  const domainError = () => {
    const err: any = new Error(`Only ${allowedDomain} email addresses are allowed.`);
    err.code = 'auth/invalid-email-domain';
    return err;
  };

  const basicUserFromFirebase = (fbUser: FirebaseUser): User => {
    return {
      uid: fbUser.uid,
      email: fbUser.email || '',
      displayName: fbUser.displayName || '',
      role: 'department',
    };
  };

  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User> => {
    try {
      const userDoc = await Promise.race([
        getDoc(doc(usersCollection, firebaseUser.uid)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 5000)),
      ]);

      // Promise.race loses type info
      const typedDoc: any = userDoc;
      if (typedDoc?.exists?.()) {
        return typedDoc.data() as User;
      }
      
      // If user doesn't exist in Firestore, create a basic user record
      const newUser: User = basicUserFromFirebase(firebaseUser);

      // Try to persist the new user; ignore failures (e.g. offline / rules)
      try {
        await setDoc(doc(usersCollection, firebaseUser.uid), newUser, { merge: true });
      } catch (persistError) {
        console.error('Error persisting new user record:', persistError);
      }

      return newUser;
    } catch (error) {
      const message = (error as any)?.message as string | undefined;
      // Timeouts/offline are expected in dev and should not spam the console.
      if (message && (message.includes('Firestore read timeout') || message.includes('offline'))) {
        return basicUserFromFirebase(firebaseUser);
      }

      console.warn('Error fetching user data:', error);
      return basicUserFromFirebase(firebaseUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Let the app proceed immediately after auth; hydrate Firestore user data in background.
      setUser((prev) => prev ?? basicUserFromFirebase(fbUser));
      setLoading(false);

      fetchUserData(fbUser)
        .then((userData) => setUser(userData))
        .catch((error) => {
          console.warn('Error hydrating user data:', error);
        });
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      if (!isAllowedEmail(email)) {
        throw domainError();
      }
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email/password:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      if (!isAllowedEmail(email)) {
        throw domainError();
      }
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Create user record in Firestore
      const newUser: User = {
        uid: user.uid,
        email: user.email || '',
        displayName: displayName,
        role: 'department', // Default role for new users
      };

      // Persist user record, but don't block registration if Firestore is slow/offline.
      try {
        await Promise.race([
          setDoc(doc(usersCollection, user.uid), newUser),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 5000)),
        ]);
      } catch (persistError) {
        console.error('Error persisting user record during sign-up:', persistError);
      }
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const isAdmin = user?.role === 'admin';

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    logout,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
