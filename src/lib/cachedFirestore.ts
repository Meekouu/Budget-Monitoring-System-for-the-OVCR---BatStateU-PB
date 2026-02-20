import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  limit as firestoreLimit,
  startAfter
} from 'firebase/firestore';
import { db } from '../firebase';
import type { WFPActivity } from '../types/wfp';
import { dataCache } from '../contexts/AuthContext';

const wfpActivitiesCollection = collection(db, 'wfpActivities');

// Cache keys
const CACHE_KEYS = {
  ALL_ACTIVITIES: 'all_wfp_activities',
  ACTIVITIES_BY_CAMPUS: (campusId: string) => `activities_campus_${campusId}`,
  ACTIVITIES_BY_STATUS: (status: string) => `activities_status_${status}`,
  ACTIVITY_BY_ID: (id: string) => `activity_${id}`,
  WFP_SUMMARY: 'wfp_summary',
};

// Cache TTL (in milliseconds)
const CACHE_TTL = {
  SHORT: 2 * 60 * 1000,      // 2 minutes for frequently changing data
  MEDIUM: 5 * 60 * 1000,     // 5 minutes for moderately changing data
  LONG: 15 * 60 * 1000,      // 15 minutes for relatively stable data
};

// Helper function to convert Firestore data
const convertFirestoreData = (doc: any): WFPActivity => {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    lastUpdated: data.lastUpdated?.toDate() || new Date(),
    completionDate: data.completionDate?.toDate() || null,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as WFPActivity;
};

// Invalidate cache entries
const invalidateCache = (patterns: string[]) => {
  patterns.forEach(pattern => {
    if (pattern.includes('*')) {
      // Wildcard pattern matching
      const regex = new RegExp(pattern.replace('*', '.*'));
      const keys = dataCache.getKeys();
      for (const key of keys) {
        if (regex.test(key)) {
          dataCache.deleteKey(key);
        }
      }
    } else {
      // Exact match
      dataCache.deleteKey(pattern);
    }
  });
};

// Create WFP Activity with cache invalidation
export const createWFPActivity = async (data: Omit<WFPActivity, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docData = {
    ...data,
    lastUpdated: Timestamp.fromDate(data.lastUpdated),
    completionDate: data.completionDate ? Timestamp.fromDate(data.completionDate) : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(wfpActivitiesCollection, docData);
  
  // Invalidate relevant cache entries
  invalidateCache([
    CACHE_KEYS.ALL_ACTIVITIES,
    CACHE_KEYS.ACTIVITIES_BY_CAMPUS(data.campusId),
    CACHE_KEYS.ACTIVITIES_BY_STATUS(data.status),
    CACHE_KEYS.WFP_SUMMARY,
    'activities_*', // Invalidate all activity list caches
  ]);
  
  return docRef.id;
};

// Update WFP Activity with cache invalidation
export const updateWFPActivity = async (id: string, data: Partial<WFPActivity>) => {
  const docRef = doc(wfpActivitiesCollection, id);
  
  // Get current activity for cache invalidation
  const currentDoc = await getDoc(docRef);
  const currentData = currentDoc.data();
  
  const updateData = {
    ...data,
    updatedAt: Timestamp.now(),
    ...(data.lastUpdated && { lastUpdated: Timestamp.fromDate(data.lastUpdated as any) }),
    ...(data.completionDate && { completionDate: Timestamp.fromDate(data.completionDate as any) }),
  };
  
  await updateDoc(docRef, updateData);
  
  // Invalidate cache entries
  invalidateCache([
    CACHE_KEYS.ALL_ACTIVITIES,
    CACHE_KEYS.ACTIVITY_BY_ID(id),
    CACHE_KEYS.WFP_SUMMARY,
    'activities_*', // Invalidate all activity list caches
  ]);
  
  // If campus or status changed, invalidate old cache entries too
  if (currentData && (data.campusId && data.campusId !== currentData.campusId)) {
    invalidateCache([CACHE_KEYS.ACTIVITIES_BY_CAMPUS(currentData.campusId)]);
  }
  if (currentData && (data.status && data.status !== currentData.status)) {
    invalidateCache([CACHE_KEYS.ACTIVITIES_BY_STATUS(currentData.status)]);
  }
};

// Delete WFP Activity with cache invalidation
export const deleteWFPActivity = async (id: string) => {
  const docRef = doc(wfpActivitiesCollection, id);
  
  // Get current activity for cache invalidation
  const currentDoc = await getDoc(docRef);
  const currentData = currentDoc.data();
  
  await deleteDoc(docRef);
  
  // Invalidate cache entries
  invalidateCache([
    CACHE_KEYS.ALL_ACTIVITIES,
    CACHE_KEYS.ACTIVITY_BY_ID(id),
    CACHE_KEYS.WFP_SUMMARY,
    'activities_*', // Invalidate all activity list caches
  ]);
  
  // Invalidate specific campus and status caches
  if (currentData) {
    invalidateCache([
      CACHE_KEYS.ACTIVITIES_BY_CAMPUS(currentData.campusId),
      CACHE_KEYS.ACTIVITIES_BY_STATUS(currentData.status),
    ]);
  }
};

// Get single WFP Activity (cached)
export const getWFPActivity = async (id: string): Promise<WFPActivity | null> => {
  const cacheKey = CACHE_KEYS.ACTIVITY_BY_ID(id);
  
  // Try cache first
  const cached = dataCache.get<WFPActivity>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from Firestore
  const docRef = doc(wfpActivitiesCollection, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  const activity = convertFirestoreData(docSnap);
  
  // Cache the result
  dataCache.set(cacheKey, activity, CACHE_TTL.MEDIUM);
  
  return activity;
};

// Get all WFP Activities (cached with pagination)
export const getAllWFPActivities = async (
  page: number = 1,
  pageSize: number = 50,
  forceRefresh: boolean = false
): Promise<WFPActivity[]> => {
  const cacheKey = `${CACHE_KEYS.ALL_ACTIVITIES}_page_${page}_size_${pageSize}`;
  
  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = dataCache.get<WFPActivity[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  // Build query with pagination
  let q = query(wfpActivitiesCollection, orderBy('lastUpdated', 'desc'));
  
  if (page > 1) {
    // For pagination, we need to get the previous page's last document
    const prevPageQuery = query(
      wfpActivitiesCollection,
      orderBy('lastUpdated', 'desc'),
      firestoreLimit((page - 1) * pageSize)
    );
    const prevPageSnapshot = await getDocs(prevPageQuery);
    
    if (prevPageSnapshot.docs.length > 0) {
      const lastDoc = prevPageSnapshot.docs[prevPageSnapshot.docs.length - 1];
      q = query(
        wfpActivitiesCollection,
        orderBy('lastUpdated', 'desc'),
        startAfter(lastDoc),
        firestoreLimit(pageSize)
      );
    } else {
      q = query(wfpActivitiesCollection, orderBy('lastUpdated', 'desc'), firestoreLimit(pageSize));
    }
  } else {
    q = query(wfpActivitiesCollection, orderBy('lastUpdated', 'desc'), firestoreLimit(pageSize));
  }
  
  const querySnapshot = await getDocs(q);
  const activities = querySnapshot.docs.map(convertFirestoreData);
  
  // Cache the result
  dataCache.set(cacheKey, activities, CACHE_TTL.MEDIUM);
  
  return activities;
};

// Get activities by campus (cached)
export const getWFPActivitiesByCampus = async (
  campusId: string,
  forceRefresh: boolean = false
): Promise<WFPActivity[]> => {
  const cacheKey = CACHE_KEYS.ACTIVITIES_BY_CAMPUS(campusId);
  
  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = dataCache.get<WFPActivity[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  // Fetch from Firestore
  const q = query(
    wfpActivitiesCollection, 
    where('campusId', '==', campusId), 
    orderBy('lastUpdated', 'desc')
  );
  const querySnapshot = await getDocs(q);
  const activities = querySnapshot.docs.map(convertFirestoreData);
  
  // Cache the result
  dataCache.set(cacheKey, activities, CACHE_TTL.MEDIUM);
  
  return activities;
};

// Get activities by status (cached)
export const getWFPActivitiesByStatus = async (
  status: string,
  forceRefresh: boolean = false
): Promise<WFPActivity[]> => {
  const cacheKey = CACHE_KEYS.ACTIVITIES_BY_STATUS(status);
  
  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = dataCache.get<WFPActivity[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  // Fetch from Firestore
  const q = query(
    wfpActivitiesCollection, 
    where('status', '==', status), 
    orderBy('lastUpdated', 'desc')
  );
  const querySnapshot = await getDocs(q);
  const activities = querySnapshot.docs.map(convertFirestoreData);
  
  // Cache the result
  dataCache.set(cacheKey, activities, CACHE_TTL.MEDIUM);
  
  return activities;
};

// Get WFP Summary (cached)
export const getWFPSummary = async (forceRefresh: boolean = false) => {
  const cacheKey = CACHE_KEYS.WFP_SUMMARY;
  
  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  // Fetch from Firestore
  const activities = await getAllWFPActivities(1, 1000, forceRefresh); // Get more for accurate summary
  
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
    lastUpdated: Date.now(),
  };
  
  // Cache the summary for shorter time since it's aggregate data
  dataCache.set(cacheKey, summary, CACHE_TTL.SHORT);
  
  return summary;
};

// Batch operations for better performance
export const batchUpdateActivities = async (updates: Array<{ id: string; data: Partial<WFPActivity> }>) => {
  const batch = [];
  const invalidatedCacheKeys = new Set<string>();
  
  for (const { id, data } of updates) {
    const docRef = doc(wfpActivitiesCollection, id);
    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
      ...(data.lastUpdated && { lastUpdated: Timestamp.fromDate(data.lastUpdated as any) }),
      ...(data.completionDate && { completionDate: Timestamp.fromDate(data.completionDate as any) }),
    };
    
    batch.push(updateDoc(docRef, updateData));
    invalidatedCacheKeys.add(CACHE_KEYS.ACTIVITY_BY_ID(id));
  }
  
  // Execute all updates in parallel
  await Promise.all(batch);
  
  // Invalidate cache entries
  invalidateCache([
    CACHE_KEYS.ALL_ACTIVITIES,
    CACHE_KEYS.WFP_SUMMARY,
    'activities_*',
    ...Array.from(invalidatedCacheKeys),
  ]);
};

// Export cache utilities for manual cache management
export const cacheUtils = {
  clear: () => dataCache.clear(),
  invalidate: (patterns: string[]) => invalidateCache(patterns),
  size: () => dataCache.size(),
  cleanup: () => dataCache.cleanup(),
  getStats: () => ({
    size: dataCache.size(),
    keys: dataCache.getKeys(),
  }),
};
