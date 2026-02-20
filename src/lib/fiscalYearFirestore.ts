import { collection, getDocs, deleteDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

// All collections that hold fiscal year data
const TRANSACTIONAL_COLLECTIONS = [
  'budgetTransactions',
  'budgetLines',
  'wfpActivities',
  'extensionBudgetAllocations',
];

const MASTER_DATA_COLLECTIONS = [
  'campuses',
  'colleges',
  'programs',
  'projects',
  'activities',
  'fundingSources',
  'fundCategories',
  'extensionPrograms',
];

const ALL_COLLECTIONS = [...TRANSACTIONAL_COLLECTIONS, ...MASTER_DATA_COLLECTIONS];

// Archive metadata collection
const archivesCollection = collection(db, 'fiscalYearArchives');

export interface FiscalYearArchive {
  id: string;
  fiscalYear: number;
  archivedAt: Date;
  archivedBy: string;
  totalRecords: number;
  collections: Record<string, number>;
  notes: string;
}

export interface BackupData {
  metadata: {
    fiscalYear: number;
    exportedAt: string;
    exportedBy: string;
    appVersion: string;
    totalRecords: number;
  };
  collections: Record<string, any[]>;
}

/**
 * Export all data from specified collections as a JSON backup
 */
export const exportAllData = async (fiscalYear: number, exportedBy: string): Promise<BackupData> => {
  const backup: BackupData = {
    metadata: {
      fiscalYear,
      exportedAt: new Date().toISOString(),
      exportedBy,
      appVersion: '1.0.0',
      totalRecords: 0,
    },
    collections: {},
  };

  for (const collectionName of ALL_COLLECTIONS) {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const docs = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
    backup.collections[collectionName] = docs;
    backup.metadata.totalRecords += docs.length;
  }

  return backup;
};

/**
 * Download backup data as a JSON file
 */
export const downloadBackup = (backup: BackupData) => {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RDES_Budget_Backup_FY${backup.metadata.fiscalYear}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Wipe transactional data only (keeps master data like campuses, programs, etc.)
 */
export const wipeTransactionalData = async (
  onProgress?: (collection: string, deleted: number, total: number) => void
): Promise<Record<string, number>> => {
  const results: Record<string, number> = {};

  for (const collectionName of TRANSACTIONAL_COLLECTIONS) {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const total = snapshot.size;
    let deleted = 0;

    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, collectionName, docSnap.id));
      deleted++;
      onProgress?.(collectionName, deleted, total);
    }

    results[collectionName] = total;
  }

  return results;
};

/**
 * Wipe ALL data including master data
 */
export const wipeAllData = async (
  onProgress?: (collection: string, deleted: number, total: number) => void
): Promise<Record<string, number>> => {
  const results: Record<string, number> = {};

  for (const collectionName of ALL_COLLECTIONS) {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const total = snapshot.size;
    let deleted = 0;

    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, collectionName, docSnap.id));
      deleted++;
      onProgress?.(collectionName, deleted, total);
    }

    results[collectionName] = total;
  }

  return results;
};

/**
 * Save archive metadata record
 */
export const saveArchiveRecord = async (
  fiscalYear: number,
  archivedBy: string,
  totalRecords: number,
  collectionCounts: Record<string, number>,
  notes: string
): Promise<string> => {
  const docRef = await addDoc(archivesCollection, {
    fiscalYear,
    archivedAt: Timestamp.now(),
    archivedBy,
    totalRecords,
    collections: collectionCounts,
    notes,
  });
  return docRef.id;
};

/**
 * Get all archive records
 */
export const getArchiveRecords = async (): Promise<FiscalYearArchive[]> => {
  const snapshot = await getDocs(archivesCollection);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      fiscalYear: data.fiscalYear,
      archivedAt: data.archivedAt?.toDate?.() || new Date(),
      archivedBy: data.archivedBy,
      totalRecords: data.totalRecords,
      collections: data.collections,
      notes: data.notes,
    } as FiscalYearArchive;
  });
};

/**
 * Get collection counts for preview
 */
export const getCollectionCounts = async (): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};

  for (const collectionName of ALL_COLLECTIONS) {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    counts[collectionName] = snapshot.size;
  }

  return counts;
};

/**
 * Restore data from a backup file
 */
export const restoreFromBackup = async (
  backup: BackupData,
  onProgress?: (collection: string, restored: number, total: number) => void
): Promise<Record<string, number>> => {
  const results: Record<string, number> = {};

  for (const [collectionName, docs] of Object.entries(backup.collections)) {
    const colRef = collection(db, collectionName);
    const total = docs.length;
    let restored = 0;

    for (const docData of docs) {
      const { id, ...data } = docData;
      await addDoc(colRef, data);
      restored++;
      onProgress?.(collectionName, restored, total);
    }

    results[collectionName] = total;
  }

  return results;
};
