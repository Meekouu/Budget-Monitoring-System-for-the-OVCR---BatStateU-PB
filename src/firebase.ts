import { initializeApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Firestore types based on our data model
export interface Campus {
  id: string;
  name: string;
  type: 'campus' | 'department';
}

export interface SummaryBudget {
  id: string;
  fiscalYear: number;
  contingencyAllocated: number;
  contingencyObligated: number;
  contingencyBalance: number;
  pbAllocated: number;
  pbObligated: number;
  pbBalance: number;
  lemeryAllocated: number;
  lemeryObligated: number;
  lemeryBalance: number;
  rosarioAllocated: number;
  rosarioObligated: number;
  rosarioBalance: number;
  sanJuanAllocated: number;
  sanJuanObligated: number;
  sanJuanBalance: number;
  lastSyncedAt: Timestamp;
}

export interface PAP {
  id: string;
  fiscalYear: number;
  title: string;
  proposedImplementation: string;
  campusId: string;
  consolidatedPR: number | null;
  amountRequested: number | null;
  obligated: number | null;
  balance: number | null;
  sheetRow: number;
  lastSyncedAt: Timestamp;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'department';
  campusId?: string;
}

// Firestore helpers
export const campusesCollection = collection(db, 'campuses');
export const summaryBudgetsCollection = collection(db, 'summary_budgets');
export const papsCollection = collection(db, 'paps');
export const usersCollection = collection(db, 'users');

// Export commonly used Firestore functions
export { doc, getDoc, getDocs, query, where, orderBy, limit, setDoc };

// Get current fiscal year (assuming fiscal year starts in January)
export const getCurrentFiscalYear = (): number => {
  return new Date().getFullYear();
};

export default app;
