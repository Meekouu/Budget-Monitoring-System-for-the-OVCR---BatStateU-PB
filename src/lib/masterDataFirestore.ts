import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Collections
const fundCategoriesCollection = collection(db, 'fundCategories');
const fundingSourcesCollection = collection(db, 'fundingSources');

// Types
export interface FundCategory {
  id?: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FundingSource {
  id?: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Fund Category Functions
export const createFundCategory = async (data: Omit<FundCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docData = {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const docRef = await addDoc(fundCategoriesCollection, docData);
  return docRef.id;
};

export const updateFundCategory = async (id: string, data: Partial<FundCategory>) => {
  const docRef = doc(fundCategoriesCollection, id);
  const updateData = {
    ...data,
    updatedAt: new Date(),
  };
  await updateDoc(docRef, updateData);
};

export const deleteFundCategory = async (id: string) => {
  const docRef = doc(fundCategoriesCollection, id);
  await deleteDoc(docRef);
};

export const getFundCategories = async (): Promise<FundCategory[]> => {
  const q = query(fundCategoriesCollection, where('isActive', '==', true), orderBy('name'));
  const querySnapshot = await getDocs(q);
  
  const categories: FundCategory[] = [];
  querySnapshot.forEach((doc) => {
    categories.push({ id: doc.id, ...doc.data() } as FundCategory);
  });
  
  return categories;
};

export const getFundCategory = async (id: string): Promise<FundCategory | null> => {
  const docRef = doc(fundCategoriesCollection, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as FundCategory;
  }
  
  return null;
};

// Funding Source Functions
export const createFundingSource = async (data: Omit<FundingSource, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docData = {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const docRef = await addDoc(fundingSourcesCollection, docData);
  return docRef.id;
};

export const updateFundingSource = async (id: string, data: Partial<FundingSource>) => {
  const docRef = doc(fundingSourcesCollection, id);
  const updateData = {
    ...data,
    updatedAt: new Date(),
  };
  await updateDoc(docRef, updateData);
};

export const deleteFundingSource = async (id: string) => {
  const docRef = doc(fundingSourcesCollection, id);
  await deleteDoc(docRef);
};

export const getFundingSources = async (): Promise<FundingSource[]> => {
  const q = query(fundingSourcesCollection, where('isActive', '==', true), orderBy('name'));
  const querySnapshot = await getDocs(q);
  
  const sources: FundingSource[] = [];
  querySnapshot.forEach((doc) => {
    sources.push({ id: doc.id, ...doc.data() } as FundingSource);
  });
  
  return sources;
};

export const getFundingSource = async (id: string): Promise<FundingSource | null> => {
  const docRef = doc(fundingSourcesCollection, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as FundingSource;
  }
  
  return null;
};

// Initialize default data
export const initializeDefaultMasterData = async (userId: string) => {
  // Check if categories already exist
  const existingCategories = await getFundCategories();
  if (existingCategories.length === 0) {
    // Create default fund categories
    const defaultCategories = [
      { name: 'GAD', code: 'GAD', description: 'Gender and Development Fund' },
      { name: 'MDS', code: 'MDS', description: 'Maintenance and Other Operating Expenses' },
      { name: 'STF', code: 'STF', description: 'Student Trust Fund' },
      { name: 'Extension', code: 'EXT', description: 'Extension Programs Fund' },
      { name: 'Supplemental', code: 'SUPP', description: 'Supplemental Fund' },
      { name: 'LEX', code: 'LEX', description: 'LEX Fund' },
      { name: 'STEP', code: 'STEP', description: 'STEP for STEM Fund' },
    ];
    
    for (const category of defaultCategories) {
      await createFundCategory({
        ...category,
        isActive: true,
        createdBy: userId,
      });
    }
  }

  // Check if funding sources already exist
  const existingSources = await getFundingSources();
  if (existingSources.length === 0) {
    // Create default funding sources
    const defaultSources = [
      { name: 'GAD Fund', code: 'GAD', description: 'Gender and Development Fund' },
      { name: 'MDS Fund', code: 'MDS', description: 'Maintenance and Other Operating Expenses' },
      { name: 'Student Trust Fund', code: 'STF', description: 'Student Trust Fund' },
      { name: 'Extension Fund', code: 'EXT', description: 'Extension Programs Fund' },
      { name: 'Supplemental Fund', code: 'SUPP', description: 'Supplemental Fund' },
    ];
    
    for (const source of defaultSources) {
      await createFundingSource({
        ...source,
        isActive: true,
        createdBy: userId,
      });
    }
  }
};
