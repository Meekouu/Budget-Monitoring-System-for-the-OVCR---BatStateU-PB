import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, usersCollection, getDoc, doc, setDoc } from '../firebase';

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'department';
  campusId?: string;
  sessionId?: string;
  tokenExpiry?: number;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  refreshToken: () => Promise<void>;
  isSessionExpired: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Session management utilities
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes before expiry

const generateSessionId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const isTokenExpired = (expiry?: number): boolean => {
  if (!expiry) return true;
  return Date.now() >= expiry;
};

const shouldRefreshToken = (expiry?: number): boolean => {
  if (!expiry) return true;
  return Date.now() >= (expiry - TOKEN_REFRESH_THRESHOLD);
};

// Cache utilities
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, timestamp: Date.now(), expiry });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get all cache keys for external access
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Delete specific key for external access
  deleteKey(key: string): boolean {
    return this.cache.delete(key);
  }
}

export const dataCache = new SimpleCache();

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const allowedDomain = 'g.batstate-u.edu.ph';

  // Check if session is expired
  const isSessionExpired = (): boolean => {
    if (!user?.tokenExpiry) return true;
    return isTokenExpired(user.tokenExpiry);
  };

  // Refresh session token
  const refreshToken = async (): Promise<void> => {
    if (!firebaseUser || !user) return;

    try {
      const newSessionId = generateSessionId();
      const newExpiry = Date.now() + SESSION_DURATION;

      // Update user document with new session
      const userRef = doc(usersCollection, user.uid);
      await setDoc(userRef, {
        sessionId: newSessionId,
        tokenExpiry: newExpiry,
        lastActivity: Date.now(),
      }, { merge: true });

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        sessionId: newSessionId,
        tokenExpiry: newExpiry,
      } : null);

      // Update cache
      dataCache.set(`user_${user.uid}`, {
        ...user,
        sessionId: newSessionId,
        tokenExpiry: newExpiry,
      });

      console.log('Session token refreshed');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      await logout();
    }
  };

  // Auto refresh token
  useEffect(() => {
    if (!user || !user.tokenExpiry) return;

    const checkAndRefresh = async () => {
      if (shouldRefreshToken(user.tokenExpiry)) {
        await refreshToken();
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  // Cleanup cache periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      dataCache.cleanup();
    }, 10 * 60 * 1000); // Every 10 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  // Save user to cache
  const cacheUser = (userData: User) => {
    dataCache.set(`user_${userData.uid}`, userData, SESSION_DURATION);
  };

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
    if (!isAllowedEmail(email)) {
      throw domainError();
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(usersCollection, firebaseUser.uid));
      
      if (!userDoc.exists()) {
        await firebaseSignOut(auth);
        throw new Error('User account not found. Please register first.');
      }

      const userData = userDoc.data();
      const sessionId = generateSessionId();
      const tokenExpiry = Date.now() + SESSION_DURATION;

      // Create user object with session info
      const userObj: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: userData.displayName || firebaseUser.displayName || '',
        role: userData.role || 'department',
        campusId: userData.campusId,
        sessionId,
        tokenExpiry,
      };

      // Update user document with session info
      await setDoc(doc(usersCollection, firebaseUser.uid), {
        sessionId,
        tokenExpiry,
        lastLogin: Date.now(),
        lastActivity: Date.now(),
      }, { merge: true });

      // Cache user data
      cacheUser(userObj);

      setUser(userObj);
      setFirebaseUser(firebaseUser);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!isAllowedEmail(email)) {
      throw domainError();
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const sessionId = generateSessionId();
      const tokenExpiry = Date.now() + SESSION_DURATION;

      // Create user object with session info
      const userObj: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName,
        role: 'department',
        sessionId,
        tokenExpiry,
      };

      // Save user to Firestore with session info
      await setDoc(doc(usersCollection, firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName,
        role: 'department',
        sessionId,
        tokenExpiry,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        lastActivity: Date.now(),
      });

      // Cache user data
      cacheUser(userObj);

      setUser(userObj);
      setFirebaseUser(firebaseUser);
    } catch (error: any) {
      console.error('Sign up error:', error);
      await firebaseSignOut(auth);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear session from Firestore
      if (user) {
        await setDoc(doc(usersCollection, user.uid), {
          sessionId: null,
          tokenExpiry: null,
          loggedOutAt: Date.now(),
        }, { merge: true });
      }

      // Clear cache
      if (user) {
        dataCache.deleteKey(`user_${user.uid}`);
      }

      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      setUser(null);
      setFirebaseUser(null);
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
    refreshToken,
    isSessionExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
