import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';

// Collections
const extensionProgramsCollection = collection(db, 'extensionPrograms');
const extensionBudgetAllocationsCollection = collection(db, 'extensionBudgetAllocations');

// Types
export interface ExtensionProgram {
  id?: string;
  fiscalYear: number;
  program: string;
  budgetCode: string;
  allocation: number;
  expenditure: number;
  balance: number;
  completion: number;
  beneficiaries: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ExtensionBudgetAllocation {
  id?: string;
  fiscalYear: number;
  allocations: Record<string, number>;
  totalBudget: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Create Extension Program
export const createExtensionProgram = async (data: Omit<ExtensionProgram, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docData = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await addDoc(extensionProgramsCollection, docData);
  return docRef.id;
};

// Update Extension Program
export const updateExtensionProgram = async (id: string, data: Partial<ExtensionProgram>) => {
  const docRef = doc(extensionProgramsCollection, id);
  const updateData = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  await updateDoc(docRef, updateData);
};

// Get Extension Programs by Fiscal Year
export const getExtensionProgramsByYear = async (year: number): Promise<ExtensionProgram[]> => {
  const q = query(
    extensionProgramsCollection,
    where('fiscalYear', '==', year),
    orderBy('program', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  const programs: ExtensionProgram[] = [];
  
  querySnapshot.forEach((doc) => {
    programs.push({ id: doc.id, ...doc.data() } as ExtensionProgram);
  });
  
  return programs;
};

// Get Extension Programs Summary by Year
export const getExtensionProgramsSummaryByYear = async (year: number) => {
  const programs = await getExtensionProgramsByYear(year);
  
  if (programs.length === 0) {
    return {
      year,
      totalAllocation: 0,
      totalExpenditure: 0,
      totalBalance: 0,
      overallCompletion: 0,
      totalBeneficiaries: 0,
      programBreakdown: []
    };
  }
  
  const totalAllocation = programs.reduce((sum, p) => sum + p.allocation, 0);
  const totalExpenditure = programs.reduce((sum, p) => sum + p.expenditure, 0);
  const totalBalance = programs.reduce((sum, p) => sum + p.balance, 0);
  const totalBeneficiaries = programs.reduce((sum, p) => sum + p.beneficiaries, 0);
  const overallCompletion = Math.round(
    programs.reduce((sum, p) => sum + p.completion, 0) / programs.length
  );
  
  return {
    year,
    totalAllocation,
    totalExpenditure,
    totalBalance,
    overallCompletion,
    totalBeneficiaries,
    programBreakdown: programs.map(({ id, createdAt, updatedAt, ...program }) => program)
  };
};

// Delete Extension Program
export const deleteExtensionProgram = async (id: string) => {
  const docRef = doc(extensionProgramsCollection, id);
  await deleteDoc(docRef);
};

// Initialize sample data for testing
export const initializeSampleData = async () => {
  const sampleData2023 = [
    {
      fiscalYear: 2023,
      program: 'CABEIHM',
      budgetCode: '250180001',
      allocation: 1800000,
      expenditure: 1400000,
      balance: 400000,
      completion: 78,
      beneficiaries: 450
    },
    {
      fiscalYear: 2023,
      program: 'CAS',
      budgetCode: '250180002',
      allocation: 1400000,
      expenditure: 850000,
      balance: 550000,
      completion: 61,
      beneficiaries: 320
    },
    {
      fiscalYear: 2023,
      program: 'CCJE',
      budgetCode: '250180003',
      allocation: 1700000,
      expenditure: 1100000,
      balance: 600000,
      completion: 65,
      beneficiaries: 420
    },
    {
      fiscalYear: 2023,
      program: 'CHS',
      budgetCode: '250180004',
      allocation: 2000000,
      expenditure: 1300000,
      balance: 700000,
      completion: 70,
      beneficiaries: 550
    },
    {
      fiscalYear: 2023,
      program: 'CTE',
      budgetCode: '250180005',
      allocation: 2300000,
      expenditure: 1350000,
      balance: 950000,
      completion: 59,
      beneficiaries: 680
    }
  ];

  const sampleData2024 = [
    {
      fiscalYear: 2024,
      program: 'CABEIHM',
      budgetCode: '250180001',
      allocation: 1900000,
      expenditure: 1450000,
      balance: 450000,
      completion: 76,
      beneficiaries: 480
    },
    {
      fiscalYear: 2024,
      program: 'CAS',
      budgetCode: '250180002',
      allocation: 1450000,
      expenditure: 880000,
      balance: 570000,
      completion: 61,
      beneficiaries: 335
    },
    {
      fiscalYear: 2024,
      program: 'CCJE',
      budgetCode: '250180003',
      allocation: 1750000,
      expenditure: 1150000,
      balance: 600000,
      completion: 66,
      beneficiaries: 435
    },
    {
      fiscalYear: 2024,
      program: 'CHS',
      budgetCode: '250180004',
      allocation: 2100000,
      expenditure: 1370000,
      balance: 730000,
      completion: 65,
      beneficiaries: 575
    },
    {
      fiscalYear: 2024,
      program: 'CTE',
      budgetCode: '250180005',
      allocation: 2400000,
      expenditure: 1410000,
      balance: 990000,
      completion: 59,
      beneficiaries: 715
    }
  ];

  const sampleData2025 = [
    {
      fiscalYear: 2025,
      program: 'CABEIHM',
      budgetCode: '250180001',
      allocation: 2000000,
      expenditure: 1500000,
      balance: 500000,
      completion: 75,
      beneficiaries: 500
    },
    {
      fiscalYear: 2025,
      program: 'CAS',
      budgetCode: '250180002',
      allocation: 1500000,
      expenditure: 900000,
      balance: 600000,
      completion: 60,
      beneficiaries: 350
    },
    {
      fiscalYear: 2025,
      program: 'CCJE',
      budgetCode: '250180003',
      allocation: 1800000,
      expenditure: 1200000,
      balance: 600000,
      completion: 67,
      beneficiaries: 450
    },
    {
      fiscalYear: 2025,
      program: 'CHS',
      budgetCode: '250180004',
      allocation: 2200000,
      expenditure: 1430000,
      balance: 770000,
      completion: 65,
      beneficiaries: 600
    },
    {
      fiscalYear: 2025,
      program: 'CTE',
      budgetCode: '250180005',
      allocation: 2500000,
      expenditure: 1470000,
      balance: 1030000,
      completion: 59,
      beneficiaries: 750
    }
  ];

  const sampleData2026 = [
    {
      fiscalYear: 2026,
      program: 'CABEIHM',
      budgetCode: '250180001',
      allocation: 2100000,
      expenditure: 1200000,
      balance: 900000,
      completion: 57,
      beneficiaries: 520
    },
    {
      fiscalYear: 2026,
      program: 'CAS',
      budgetCode: '250180002',
      allocation: 1600000,
      expenditure: 700000,
      balance: 900000,
      completion: 44,
      beneficiaries: 370
    },
    {
      fiscalYear: 2026,
      program: 'CCJE',
      budgetCode: '250180003',
      allocation: 1900000,
      expenditure: 950000,
      balance: 950000,
      completion: 50,
      beneficiaries: 470
    },
    {
      fiscalYear: 2026,
      program: 'CHS',
      budgetCode: '250180004',
      allocation: 2300000,
      expenditure: 1150000,
      balance: 1150000,
      completion: 50,
      beneficiaries: 630
    },
    {
      fiscalYear: 2026,
      program: 'CTE',
      budgetCode: '250180005',
      allocation: 2600000,
      expenditure: 1300000,
      balance: 1300000,
      completion: 50,
      beneficiaries: 780
    }
  ];

  // Check if data already exists
  const existing2023 = await getExtensionProgramsByYear(2023);
  const existing2024 = await getExtensionProgramsByYear(2024);
  const existing2025 = await getExtensionProgramsByYear(2025);
  const existing2026 = await getExtensionProgramsByYear(2026);

  if (existing2023.length === 0) {
    for (const data of sampleData2023) {
      await createExtensionProgram(data);
    }
  }

  if (existing2024.length === 0) {
    for (const data of sampleData2024) {
      await createExtensionProgram(data);
    }
  }

  if (existing2025.length === 0) {
    for (const data of sampleData2025) {
      await createExtensionProgram(data);
    }
  }

  if (existing2026.length === 0) {
    for (const data of sampleData2026) {
      await createExtensionProgram(data);
    }
  }
};

// Extension Budget Allocation Functions
export const saveExtensionBudgetAllocation = async (data: Omit<ExtensionBudgetAllocation, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docData = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await addDoc(extensionBudgetAllocationsCollection, docData);
  return docRef.id;
};

export const updateExtensionBudgetAllocation = async (id: string, data: Partial<ExtensionBudgetAllocation>) => {
  const docRef = doc(extensionBudgetAllocationsCollection, id);
  const updateData = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  await updateDoc(docRef, updateData);
};

export const getExtensionBudgetAllocation = async (year: number): Promise<ExtensionBudgetAllocation | null> => {
  const q = query(
    extensionBudgetAllocationsCollection,
    where('fiscalYear', '==', year),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as ExtensionBudgetAllocation;
};

export const getOrCreateExtensionBudgetAllocation = async (year: number, defaultAllocations: Record<string, number>) => {
  let allocation = await getExtensionBudgetAllocation(year);
  
  if (!allocation) {
    const totalBudget = Object.values(defaultAllocations).reduce((sum, val) => sum + val, 0);
    const id = await saveExtensionBudgetAllocation({
      fiscalYear: year,
      allocations: defaultAllocations,
      totalBudget,
    });
    allocation = {
      id,
      fiscalYear: year,
      allocations: defaultAllocations,
      totalBudget,
    };
  }
  
  return allocation;
};
