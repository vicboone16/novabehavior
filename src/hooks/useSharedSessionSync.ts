/**
 * useSharedSessionSync
 * 
 * Handles real-time cross-device/cross-user synchronization for multi-staff sessions.
 * 
 * - Publishes every data entry to shared_session_data via Supabase
 * - Subscribes to changes and fires a callback when remote entries arrive
 * - Provides helpers to attribute each entry to the collecting staff member
 */
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SharedEntryType =
  | 'frequency'
  | 'abc'
  | 'duration'
  | 'interval'
  | 'skill'
  | 'cold_probe'
  | 'bx_reduction'
  | 'latency';

export interface SharedDataEntry {
  id: string;
  session_id: string;
  entry_type: SharedEntryType;
  entry_id: string;
  student_id: string;
  behavior_id?: string | null;
  collected_by_user_id: string;
  collected_by_display_name: string;
  collected_at: string;
  payload: Record<string, unknown>;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface PublishOptions {
  sessionId: string;
  entryType: SharedEntryType;
  entryId: string;
  studentId: string;
  behaviorId?: string | null;
  payload: Record<string, unknown>;
}

export function useSharedSessionSync(
  sessionId: string | null,
  onRemoteEntry?: (entry: SharedDataEntry) => void
) {
  const { user, profile } = useAuth() as any; // profile typed in AuthContext
  const onRemoteEntryRef = useRef(onRemoteEntry);
  onRemoteEntryRef.current = onRemoteEntry;

  // Subscribe to realtime changes for the active session
  useEffect(() => {
    if (!sessionId || !user) return;

    const channel = supabase
      .channel(`shared_session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_session_data',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const entry = (payload.new || payload.old) as SharedDataEntry;
          if (!entry) return;
          // Only process entries from OTHER users (our own are already in local state)
          if (entry.collected_by_user_id === user.id) return;
          onRemoteEntryRef.current?.(entry);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, user]);

  /** Publish a data entry to the shared sync table */
  const publishEntry = useCallback(async (opts: PublishOptions) => {
    if (!user || !opts.sessionId) return;

    const displayName =
      (profile as any)?.display_name ||
      `${(profile as any)?.first_name || ''} ${(profile as any)?.last_name || ''}`.trim() ||
      'Staff';

    const { error } = await supabase
      .from('shared_session_data')
      .upsert([{
        session_id: opts.sessionId,
        entry_type: opts.entryType,
        entry_id: opts.entryId,
        student_id: opts.studentId,
        behavior_id: opts.behaviorId || null,
        collected_by_user_id: user.id,
        collected_by_display_name: displayName,
        collected_at: new Date().toISOString(),
        payload: opts.payload as any,
        is_deleted: false,
      }], { onConflict: 'session_id,entry_id' });

    if (error) {
      console.warn('[SharedSessionSync] publish error:', error);
    }
  }, [user, profile]);

  /** Soft-delete an entry (e.g. when the user deletes a record) */
  const deleteEntry = useCallback(async (sessionId: string, entryId: string) => {
    if (!user) return;
    await supabase
      .from('shared_session_data')
      .update({ is_deleted: true })
      .eq('session_id', sessionId)
      .eq('entry_id', entryId)
      .eq('collected_by_user_id', user.id);
  }, [user]);

  /** Fetch all entries for a session (used for history / reports) */
  const fetchSessionEntries = useCallback(async (sid: string): Promise<SharedDataEntry[]> => {
    const { data, error } = await supabase
      .from('shared_session_data')
      .select('*')
      .eq('session_id', sid)
      .eq('is_deleted', false)
      .order('collected_at', { ascending: true });

    if (error) {
      console.error('[SharedSessionSync] fetch error:', error);
      return [];
    }
    return (data || []) as SharedDataEntry[];
  }, []);

  return { publishEntry, deleteEntry, fetchSessionEntries };
}
