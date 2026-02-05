/**
 * Hook for managing offline sync status and operations
 */
import { useState, useEffect, useCallback } from 'react';
import { syncQueue, SyncEventType } from '@/lib/syncQueue';
import {
  getSyncQueueStats,
  saveSessionDraft,
  getLatestSessionDraft,
  deleteSessionDraft,
  isIndexedDBAvailable,
  getStorageEstimate,
  SessionDraft,
} from '@/lib/offlineStorage';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';

interface UseOfflineSyncReturn {
  // Online status
  isOnline: boolean;
  
  // Sync status
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  
  // Actions
  syncNow: () => Promise<void>;
  saveDraft: () => Promise<void>;
  restoreDraft: () => Promise<boolean>;
  
  // Storage info
  storageAvailable: boolean;
  storageUsed: number | null;
  storageQuota: number | null;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState<number | null>(null);
  const [storageQuota, setStorageQuota] = useState<number | null>(null);
  
  const currentSessionId = useDataStore((state) => state.currentSessionId);
  const selectedStudentIds = useDataStore((state) => state.selectedStudentIds);
  const frequencyEntries = useDataStore((state) => state.frequencyEntries);
  const durationEntries = useDataStore((state) => state.durationEntries);
  const intervalEntries = useDataStore((state) => state.intervalEntries);
  const abcEntries = useDataStore((state) => state.abcEntries);
  const sessionNotes = useDataStore((state) => state.sessionNotes);
  const sessionStartTime = useDataStore((state) => state.sessionStartTime);
  
  const storageAvailable = isIndexedDBAvailable();

  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Data will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to sync events
  useEffect(() => {
    const unsubscribe = syncQueue.subscribe((event) => {
      switch (event.type) {
        case 'sync-start':
          setIsSyncing(true);
          break;
        case 'sync-complete':
        case 'sync-error':
          setIsSyncing(false);
          refreshStats();
          break;
        case 'queue-updated':
          refreshStats();
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Refresh queue stats
  const refreshStats = useCallback(async () => {
    if (!storageAvailable) return;
    
    try {
      const stats = await getSyncQueueStats();
      setPendingCount(stats.pending);
      setFailedCount(stats.failed);
    } catch (e) {
      console.error('[useOfflineSync] Failed to get stats:', e);
    }
  }, [storageAvailable]);

  // Refresh storage estimate
  const refreshStorageEstimate = useCallback(async () => {
    try {
      const estimate = await getStorageEstimate();
      if (estimate) {
        setStorageUsed(estimate.used);
        setStorageQuota(estimate.quota);
      }
    } catch (e) {
      console.error('[useOfflineSync] Failed to get storage estimate:', e);
    }
  }, []);

  // Initial stats fetch
  useEffect(() => {
    refreshStats();
    refreshStorageEstimate();
    
    // Refresh periodically
    const interval = setInterval(() => {
      refreshStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshStats, refreshStorageEstimate]);

  // Save current session as a draft
  const saveDraft = useCallback(async () => {
    if (!storageAvailable || !currentSessionId) return;

    try {
      const sessionEntries = {
        frequency: frequencyEntries.filter(e => e.sessionId === currentSessionId),
        duration: durationEntries.filter(e => e.sessionId === currentSessionId),
        interval: intervalEntries.filter(e => e.sessionId === currentSessionId),
        abc: abcEntries.filter(e => e.sessionId === currentSessionId),
      };

      const draft: Omit<SessionDraft, 'lastUpdated'> = {
        id: currentSessionId,
        sessionId: currentSessionId,
        studentIds: selectedStudentIds,
        frequencyEntries: sessionEntries.frequency,
        durationEntries: sessionEntries.duration,
        intervalEntries: sessionEntries.interval,
        abcEntries: sessionEntries.abc,
        sessionNotes,
        startTime: sessionStartTime ? new Date(sessionStartTime).getTime() : Date.now(),
      };

      await saveSessionDraft(draft);
      console.log('[useOfflineSync] Draft saved');
    } catch (e) {
      console.error('[useOfflineSync] Failed to save draft:', e);
    }
  }, [
    storageAvailable,
    currentSessionId,
    selectedStudentIds,
    frequencyEntries,
    durationEntries,
    intervalEntries,
    abcEntries,
    sessionNotes,
    sessionStartTime,
  ]);

  // Auto-save draft when session is active and data changes
  useEffect(() => {
    if (currentSessionId && !isOnline) {
      // Debounce the save
      const timeoutId = setTimeout(() => {
        saveDraft();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [
    currentSessionId,
    isOnline,
    frequencyEntries,
    durationEntries,
    intervalEntries,
    abcEntries,
    saveDraft,
  ]);

  // Restore draft session
  const restoreDraft = useCallback(async (): Promise<boolean> => {
    if (!storageAvailable) return false;

    try {
      const draft = await getLatestSessionDraft();
      if (!draft) return false;

      // TODO: Implement draft restoration by updating the data store
      console.log('[useOfflineSync] Draft found:', draft);
      
      // Clean up after restoration
      await deleteSessionDraft(draft.id);
      
      return true;
    } catch (e) {
      console.error('[useOfflineSync] Failed to restore draft:', e);
      return false;
    }
  }, [storageAvailable]);

  // Trigger manual sync
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    try {
      const { success, failed } = await syncQueue.forceSync();
      
      if (success > 0) {
        toast.success(`Synced ${success} item${success !== 1 ? 's' : ''}`);
      }
      if (failed > 0) {
        toast.error(`Failed to sync ${failed} item${failed !== 1 ? 's' : ''}`);
      }
      if (success === 0 && failed === 0) {
        toast.info('Nothing to sync');
      }
    } catch (e) {
      console.error('[useOfflineSync] Sync failed:', e);
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    syncNow,
    saveDraft,
    restoreDraft,
    storageAvailable,
    storageUsed,
    storageQuota,
  };
}
