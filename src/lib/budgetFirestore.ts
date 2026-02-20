import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, limit, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { BudgetTransaction, BudgetLine, Campus, College, Program, Project, Activity, FundingSource } from '../types/budget';

// Collections
const budgetTransactionsCollection = collection(db, 'budgetTransactions');
const budgetLinesCollection = collection(db, 'budgetLines');
const campusesCollection = collection(db, 'campuses');
const collegesCollection = collection(db, 'colleges');
const programsCollection = collection(db, 'programs');
const projectsCollection = collection(db, 'projects');
const activitiesCollection = collection(db, 'activities');
const fundingSourcesCollection = collection(db, 'fundingSources');

// Budget Transactions
export const createBudgetTransaction = async (data: Omit<BudgetTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docData = {
    ...data,
    dateReceived: Timestamp.fromDate(data.dateReceived),
    obligationDate: data.obligationDate ? Timestamp.fromDate(data.obligationDate) : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await addDoc(budgetTransactionsCollection, docData);
  return docRef.id;
};

export const updateBudgetTransaction = async (id: string, data: Partial<BudgetTransaction>) => {
  const docRef = doc(budgetTransactionsCollection, id);
  const updateData = {
    ...data,
    updatedAt: Timestamp.now(),
    ...(data.dateReceived && { dateReceived: Timestamp.fromDate(data.dateReceived as any) }),
    ...(data.obligationDate && { obligationDate: Timestamp.fromDate(data.obligationDate as any) }),
  };
  await updateDoc(docRef, updateData);
};

export const deleteBudgetTransaction = async (id: string) => {
  const docRef = doc(budgetTransactionsCollection, id);
  await deleteDoc(docRef);
};

export const getBudgetTransaction = async (id: string): Promise<BudgetTransaction | null> => {
  const docRef = doc(budgetTransactionsCollection, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as BudgetTransaction;
};

export const getBudgetTransactionsByUser = async (userId: string): Promise<BudgetTransaction[]> => {
  const q = query(budgetTransactionsCollection, where('createdBy', '==', userId), orderBy('dateReceived', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetTransaction));
};

export const getAllBudgetTransactions = async (): Promise<BudgetTransaction[]> => {
  const q = query(budgetTransactionsCollection, orderBy('dateReceived', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetTransaction));
};

export const getBudgetTransactionsByStatus = async (status: string): Promise<BudgetTransaction[]> => {
  const q = query(budgetTransactionsCollection, where('status', '==', status), orderBy('dateReceived', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetTransaction));
};

// Budget Lines
export const getBudgetLines = async (): Promise<BudgetLine[]> => {
  const querySnapshot = await getDocs(budgetLinesCollection);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetLine));
};

export const getBudgetLineByCode = async (budgetCode: string): Promise<BudgetLine | null> => {
  const q = query(budgetLinesCollection, where('budgetCode', '==', budgetCode), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as BudgetLine;
};

// Master Data
export const getCampuses = async (): Promise<Campus[]> => {
  const querySnapshot = await getDocs(campusesCollection);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campus));
};

export const createCampus = async (id: string, data: Omit<Campus, 'id'>) => {
  const docRef = doc(db, 'campuses', id);
  await setDoc(docRef, data);
  return id;
};

export const getColleges = async (): Promise<College[]> => {
  const querySnapshot = await getDocs(collegesCollection);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as College));
};

export const getPrograms = async (): Promise<Program[]> => {
  const querySnapshot = await getDocs(programsCollection);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program));
};

export const getProjects = async (programId?: string): Promise<Project[]> => {
  const q = programId 
    ? query(projectsCollection, where('programId', '==', programId))
    : projectsCollection;
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
};

export const getActivities = async (projectId?: string): Promise<Activity[]> => {
  const q = projectId 
    ? query(activitiesCollection, where('projectId', '==', projectId))
    : activitiesCollection;
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
};

export const getFundingSources = async (): Promise<FundingSource[]> => {
  const querySnapshot = await getDocs(fundingSourcesCollection);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FundingSource));
};
