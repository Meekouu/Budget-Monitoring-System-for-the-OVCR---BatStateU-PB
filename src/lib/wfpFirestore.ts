import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { WFPActivity } from '../types/wfp';

const wfpActivitiesCollection = collection(db, 'wfpActivities');

export const createWFPActivity = async (data: Omit<WFPActivity, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docData = {
    ...data,
    lastUpdated: Timestamp.fromDate(data.lastUpdated),
    completionDate: data.completionDate ? Timestamp.fromDate(data.completionDate) : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await addDoc(wfpActivitiesCollection, docData);
  return docRef.id;
};

export const updateWFPActivity = async (id: string, data: Partial<WFPActivity>) => {
  const docRef = doc(wfpActivitiesCollection, id);
  const updateData = {
    ...data,
    updatedAt: Timestamp.now(),
    ...(data.lastUpdated && { lastUpdated: Timestamp.fromDate(data.lastUpdated as any) }),
    ...(data.completionDate && { completionDate: Timestamp.fromDate(data.completionDate as any) }),
  };
  await updateDoc(docRef, updateData);
};

export const getWFPActivity = async (id: string): Promise<WFPActivity | null> => {
  const docRef = doc(wfpActivitiesCollection, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as WFPActivity;
};

export const getAllWFPActivities = async (): Promise<WFPActivity[]> => {
  const q = query(wfpActivitiesCollection, orderBy('lastUpdated', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WFPActivity));
};

export const getWFPActivitiesByCampus = async (campusId: string): Promise<WFPActivity[]> => {
  const q = query(wfpActivitiesCollection, where('campusId', '==', campusId), orderBy('lastUpdated', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WFPActivity));
};

export const getWFPActivitiesByBudgetCode = async (budgetCode: string): Promise<WFPActivity[]> => {
  const q = query(wfpActivitiesCollection, where('budgetCode', '==', budgetCode), orderBy('lastUpdated', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WFPActivity));
};

export const getWFPActivitiesByStatus = async (status: string): Promise<WFPActivity[]> => {
  const q = query(wfpActivitiesCollection, where('status', '==', status), orderBy('lastUpdated', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WFPActivity));
};

export const deleteWFPActivity = async (id: string) => {
  const docRef = doc(wfpActivitiesCollection, id);
  await deleteDoc(docRef);
};

export const getWFPSummary = async () => {
  const activities = await getAllWFPActivities();
  
  const summary = {
    totalActivities: activities.length,
    totalAllocation: activities.reduce((sum, act) => sum + act.allocation, 0),
    totalBeneficiaries: activities.reduce((sum, act) => sum + act.beneficiaries, 0),
    actualBeneficiaries: activities.reduce((sum, act) => sum + (act.actualBeneficiaries || 0), 0),
    actualExpenditure: activities.reduce((sum, act) => sum + (act.actualExpenditure || 0), 0),
    completed: activities.filter(act => act.status === 'completed').length,
    ongoing: activities.filter(act => act.status === 'ongoing').length,
    planned: activities.filter(act => act.status === 'planned').length,
    cancelled: activities.filter(act => act.status === 'cancelled').length,
  };
  
  return summary;
};
