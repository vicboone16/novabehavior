/**
 * IndexedDB-based offline storage using the idb library.
 * Provides reliable offline-first data persistence with sync queue support.
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface OfflineDBSchema extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-timestamp': number;
      'by-status': string;
      'by-table': string;
    };
  };
  cachedData: {
    key: string;
    value: CachedDataItem;
    indexes: {
      'by-type': string;
      'by-updated': number;
    };
  };
  sessionDrafts: {
    key: string;
    value: SessionDraft;
    indexes: {
      'by-timestamp': number;
    };
  };
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  table: string;
  recordId?: string;
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
  clientTimestamp: number;
}

export interface CachedDataItem {
  id: string;
  type: 'student' | 'session' | 'sessionData' | 'goal';
  data: any;
  updatedAt: number;
  syncedAt?: number;
}

export interface SessionDraft {
  id: string;
  sessionId: string;
  studentIds: string[];
  frequencyEntries: any[];
  durationEntries: any[];
  intervalEntries: any[];
  abcEntries: any[];
  sessionNotes: string;
  startTime: number;
  lastUpdated: number;
}

const DB_NAME = 'nova-behavior-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

/**
 * Get or create the IndexedDB database instance
 */
export async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('by-timestamp', 'timestamp');
          syncStore.createIndex('by-status', 'status');
          syncStore.createIndex('by-table', 'table');
        }

        // Cached data store
        if (!db.objectStoreNames.contains('cachedData')) {
          const cacheStore = db.createObjectStore('cachedData', { keyPath: 'id' });
          cacheStore.createIndex('by-type', 'type');
          cacheStore.createIndex('by-updated', 'updatedAt');
        }

        // Session drafts store
        if (!db.objectStoreNames.contains('sessionDrafts')) {
          const draftStore = db.createObjectStore('sessionDrafts', { keyPath: 'id' });
          draftStore.createIndex('by-timestamp', 'lastUpdated');
        }
      },
    });
  }
  return dbPromise;
}

// ============ Sync Queue Operations ============

/**
 * Add an item to the sync queue
 */
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status' | 'clientTimestamp'>): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = Date.now();
  
  const queueItem: SyncQueueItem = {
    ...item,
    id,
    timestamp: now,
    clientTimestamp: now,
    retryCount: 0,
    status: 'pending',
  };
  
  await db.put('syncQueue', queueItem);
  console.log('[OfflineStorage] Added to sync queue:', queueItem.table, queueItem.action, id);
  return id;
}

/**
 * Get all pending items from the sync queue
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex('syncQueue', 'by-status', 'pending');
  return items.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get failed items that can be retried
 */
export async function getRetryableSyncItems(maxRetries = 3): Promise<SyncQueueItem[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex('syncQueue', 'by-status', 'failed');
  return items.filter(item => item.retryCount < maxRetries);
}

/**
 * Update sync queue item status
 */
export async function updateSyncItemStatus(
  id: string, 
  status: SyncQueueItem['status'], 
  error?: string
): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    item.status = status;
    if (error) item.error = error;
    if (status === 'failed') item.retryCount++;
    await db.put('syncQueue', item);
  }
}

/**
 * Remove completed items from sync queue
 */
export async function clearCompletedSyncItems(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const store = tx.objectStore('syncQueue');
  const items = await store.index('by-status').getAll('completed');
  
  for (const item of items) {
    await store.delete(item.id);
  }
  
  await tx.done;
  return items.length;
}

/**
 * Get sync queue count by status
 */
export async function getSyncQueueStats(): Promise<{ pending: number; failed: number; syncing: number }> {
  const db = await getDB();
  const [pending, failed, syncing] = await Promise.all([
    db.countFromIndex('syncQueue', 'by-status', 'pending'),
    db.countFromIndex('syncQueue', 'by-status', 'failed'),
    db.countFromIndex('syncQueue', 'by-status', 'syncing'),
  ]);
  return { pending, failed, syncing };
}

// ============ Cached Data Operations ============

/**
 * Cache data for offline access
 */
export async function cacheData(type: CachedDataItem['type'], id: string, data: any): Promise<void> {
  const db = await getDB();
  const cacheItem: CachedDataItem = {
    id: `${type}:${id}`,
    type,
    data,
    updatedAt: Date.now(),
  };
  await db.put('cachedData', cacheItem);
}

/**
 * Get cached data by type and id
 */
export async function getCachedData<T>(type: CachedDataItem['type'], id: string): Promise<T | null> {
  const db = await getDB();
  const item = await db.get('cachedData', `${type}:${id}`);
  return item?.data as T | null;
}

/**
 * Get all cached data of a specific type
 */
export async function getAllCachedData<T>(type: CachedDataItem['type']): Promise<T[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex('cachedData', 'by-type', type);
  return items.map(item => item.data as T);
}

/**
 * Clear all cached data of a specific type
 */
export async function clearCachedData(type?: CachedDataItem['type']): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cachedData', 'readwrite');
  const store = tx.objectStore('cachedData');
  
  if (type) {
    const items = await store.index('by-type').getAll(type);
    for (const item of items) {
      await store.delete(item.id);
    }
  } else {
    await store.clear();
  }
  
  await tx.done;
}

// ============ Session Draft Operations ============

/**
 * Save a session draft for offline persistence
 */
export async function saveSessionDraft(draft: Omit<SessionDraft, 'lastUpdated'>): Promise<void> {
  const db = await getDB();
  const draftItem: SessionDraft = {
    ...draft,
    lastUpdated: Date.now(),
  };
  await db.put('sessionDrafts', draftItem);
  console.log('[OfflineStorage] Session draft saved:', draft.sessionId);
}

/**
 * Get the most recent session draft
 */
export async function getLatestSessionDraft(): Promise<SessionDraft | null> {
  const db = await getDB();
  const drafts = await db.getAllFromIndex('sessionDrafts', 'by-timestamp');
  return drafts.length > 0 ? drafts[drafts.length - 1] : null;
}

/**
 * Get a specific session draft
 */
export async function getSessionDraft(id: string): Promise<SessionDraft | null> {
  const db = await getDB();
  return await db.get('sessionDrafts', id) || null;
}

/**
 * Delete a session draft
 */
export async function deleteSessionDraft(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessionDrafts', id);
}

/**
 * Clear all session drafts
 */
export async function clearSessionDrafts(): Promise<void> {
  const db = await getDB();
  await db.clear('sessionDrafts');
}

// ============ Utility Functions ============

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Get total storage usage estimate
 */
export async function getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
}

/**
 * Clear all offline data (for debugging/reset)
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('syncQueue'),
    db.clear('cachedData'),
    db.clear('sessionDrafts'),
  ]);
  console.log('[OfflineStorage] All offline data cleared');
}
