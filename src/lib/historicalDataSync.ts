/**
 * Utility for immediately persisting historical data changes to the database.
 * 
 * Uses an event-based approach to avoid circular dependencies with the data store.
 * The data store emits events when historical data changes, and this module
 * listens for those events and immediately saves to the database.
 */
import { supabase } from '@/integrations/supabase/client';

// ── Sync status types ──────────────────────────────────────────────────────────
export type HistoricalSyncStatus = 'idle' | 'pending' | 'synced' | 'error';

type SyncStatusListener = (studentId: string, status: HistoricalSyncStatus) => void;
const statusListeners: SyncStatusListener[] = [];

// Per-student sync status
const syncStatusMap = new Map<string, HistoricalSyncStatus>();

/**
 * Get the current sync status for a student.
 */
export function getHistoricalSyncStatus(studentId: string): HistoricalSyncStatus {
  return syncStatusMap.get(studentId) || 'idle';
}

/**
 * Subscribe to sync status changes. Returns an unsubscribe function.
 */
export function onSyncStatusChanged(listener: SyncStatusListener) {
  statusListeners.push(listener);
  return () => {
    const idx = statusListeners.indexOf(listener);
    if (idx >= 0) statusListeners.splice(idx, 1);
  };
}

function setSyncStatus(studentId: string, status: HistoricalSyncStatus) {
  syncStatusMap.set(studentId, status);
  statusListeners.forEach(l => l(studentId, status));
}

// ── Historical data change events ──────────────────────────────────────────────
type HistoricalDataListener = (studentId: string) => void;
const listeners: HistoricalDataListener[] = [];

/**
 * Subscribe to historical data change events.
 */
export function onHistoricalDataChanged(listener: HistoricalDataListener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Emit a historical data change event.
 * Called by the data store when historical data is added/removed.
 * This does NOT import the data store - it simply notifies listeners.
 */
export function emitHistoricalDataChanged(studentId: string) {
  listeners.forEach(l => l(studentId));
}

// Track which students have pending (unsaved) historical data changes
const pendingHistoricalChanges = new Set<string>();

/**
 * Check if a student has pending historical data that hasn't been saved yet.
 * Used by realtime subscription to avoid overwriting local changes.
 */
export function hasUnsavedHistoricalData(studentId: string): boolean {
  return pendingHistoricalChanges.has(studentId);
}

// Timeout refs for debouncing per-student
const saveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Initialize the historical data sync listener.
 * Must be called once from a component that has access to the data store.
 * Pass a getter function that retrieves the student's historicalData.
 */
export function initHistoricalDataSync(
  getStudentHistoricalData: (studentId: string) => { frequencyEntries: any[]; durationEntries: any[] } | null
) {
  return onHistoricalDataChanged((studentId: string) => {
    pendingHistoricalChanges.add(studentId);
    setSyncStatus(studentId, 'pending');
    
    // Clear any existing timeout for this student
    const existing = saveTimeouts.get(studentId);
    if (existing) clearTimeout(existing);
    
    // Schedule a save in 500ms (short debounce to batch rapid additions)
    const timeout = setTimeout(async () => {
      saveTimeouts.delete(studentId);
      
      try {
        const historicalData = getStudentHistoricalData(studentId);
        if (!historicalData) {
          console.warn('[HistoricalSync] Student not found:', studentId);
          pendingHistoricalChanges.delete(studentId);
          setSyncStatus(studentId, 'idle');
          return;
        }

        const serialized = {
          frequencyEntries: (historicalData.frequencyEntries || []).map((e: any) => ({
            ...e,
            timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
          })),
          durationEntries: (historicalData.durationEntries || []).map((e: any) => ({
            ...e,
            timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
          })),
        };

        const { error } = await supabase
          .from('students')
          .update({ historical_data: serialized as any })
          .eq('id', studentId);

        if (error) {
          console.error('[HistoricalSync] Failed to save historical data:', error);
          setSyncStatus(studentId, 'error');
          return;
        }

        console.log('[HistoricalSync] Saved historical data for student:', studentId, 
          `(${serialized.frequencyEntries.length} freq, ${serialized.durationEntries.length} dur)`);
        pendingHistoricalChanges.delete(studentId);
        setSyncStatus(studentId, 'synced');
      } catch (e) {
        console.error('[HistoricalSync] Error saving historical data:', e);
        setSyncStatus(studentId, 'error');
      }
    }, 500);
    
    saveTimeouts.set(studentId, timeout);
  });
}

/**
 * Force save all pending historical data immediately.
 * Called before force sync.
 */
export async function flushPendingHistoricalData(
  getStudentHistoricalData: (studentId: string) => { frequencyEntries: any[]; durationEntries: any[] } | null
) {
  const pending = [...pendingHistoricalChanges];
  if (pending.length === 0) return;
  
  console.log('[HistoricalSync] Flushing pending historical data for', pending.length, 'students');
  
  for (const studentId of pending) {
    // Clear any scheduled timeout
    const timeout = saveTimeouts.get(studentId);
    if (timeout) {
      clearTimeout(timeout);
      saveTimeouts.delete(studentId);
    }
    
    setSyncStatus(studentId, 'pending');
    
    const historicalData = getStudentHistoricalData(studentId);
    if (!historicalData) {
      pendingHistoricalChanges.delete(studentId);
      setSyncStatus(studentId, 'idle');
      continue;
    }

    const serialized = {
      frequencyEntries: (historicalData.frequencyEntries || []).map((e: any) => ({
        ...e,
        timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
      })),
      durationEntries: (historicalData.durationEntries || []).map((e: any) => ({
        ...e,
        timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
      })),
    };

    const { error } = await supabase
      .from('students')
      .update({ historical_data: serialized as any })
      .eq('id', studentId);

    if (!error) {
      pendingHistoricalChanges.delete(studentId);
      setSyncStatus(studentId, 'synced');
    } else {
      setSyncStatus(studentId, 'error');
    }
  }
}

// ── Test helpers (only used by tests) ────────────────────────────────────────
export function _testResetState() {
  pendingHistoricalChanges.clear();
  saveTimeouts.forEach(t => clearTimeout(t));
  saveTimeouts.clear();
  syncStatusMap.clear();
  listeners.length = 0;
  statusListeners.length = 0;
}
