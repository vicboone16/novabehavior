/**
 * useSessionStaffHistory
 *
 * Fetches staff attribution data for a completed session.
 * Used in session history views and report generation to show who collected what.
 *
 * Returns:
 *   - staffSummary: per-staff entry counts and time intervals
 *   - entriesByType: grouped by entry_type for report sections
 *   - allEntries: flat list ordered by collected_at
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SharedDataEntry } from './useSharedSessionSync';

export interface StaffSummaryItem {
  userId: string;
  displayName: string;
  entryCount: number;
  /** Earliest entry timestamp */
  firstEntryAt?: string;
  /** Latest entry timestamp */
  lastEntryAt?: string;
  /** From session_participants */
  joinedAt?: string;
  leftAt?: string | null;
  role?: string;
}

export interface SessionStaffHistoryResult {
  staffSummary: StaffSummaryItem[];
  entriesByType: Record<string, SharedDataEntry[]>;
  allEntries: SharedDataEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSessionStaffHistory(sessionId: string | null): SessionStaffHistoryResult {
  const [allEntries, setAllEntries] = useState<SharedDataEntry[]>([]);
  const [staffSummary, setStaffSummary] = useState<StaffSummaryItem[]>([]);
  const [entriesByType, setEntriesByType] = useState<Record<string, SharedDataEntry[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!sessionId) {
      setAllEntries([]);
      setStaffSummary([]);
      setEntriesByType({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all entries for this session
      const { data: entries, error: entryError } = await supabase
        .from('shared_session_data')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_deleted', false)
        .order('collected_at', { ascending: true });

      if (entryError) throw entryError;

      const typedEntries = (entries || []) as SharedDataEntry[];

      // Fetch participant records for join/leave timestamps
      const { data: participants } = await supabase
        .from('session_participants')
        .select('user_id, role, joined_at, left_at')
        .eq('session_id', sessionId);

      const participantMap = new Map(
        (participants || []).map(p => [p.user_id, p])
      );

      // Build staff summary
      const summaryMap = new Map<string, StaffSummaryItem>();
      for (const entry of typedEntries) {
        const uid = entry.collected_by_user_id;
        if (!summaryMap.has(uid)) {
          const participant = participantMap.get(uid);
          summaryMap.set(uid, {
            userId: uid,
            displayName: entry.collected_by_display_name || 'Staff',
            entryCount: 0,
            firstEntryAt: entry.collected_at,
            lastEntryAt: entry.collected_at,
            joinedAt: participant?.joined_at,
            leftAt: participant?.left_at,
            role: participant?.role,
          });
        }
        const item = summaryMap.get(uid)!;
        item.entryCount += 1;
        if (!item.firstEntryAt || entry.collected_at < item.firstEntryAt) {
          item.firstEntryAt = entry.collected_at;
        }
        if (!item.lastEntryAt || entry.collected_at > item.lastEntryAt) {
          item.lastEntryAt = entry.collected_at;
        }
      }

      // Also include participants who joined but didn't add any entries
      for (const [uid, p] of participantMap.entries()) {
        if (!summaryMap.has(uid)) {
          summaryMap.set(uid, {
            userId: uid,
            displayName: 'Staff',
            entryCount: 0,
            joinedAt: p.joined_at,
            leftAt: p.left_at,
            role: p.role,
          });
        }
      }

      const summary = Array.from(summaryMap.values()).sort(
        (a, b) => (a.joinedAt || '').localeCompare(b.joinedAt || '')
      );

      // Group by type
      const byType: Record<string, SharedDataEntry[]> = {};
      for (const entry of typedEntries) {
        if (!byType[entry.entry_type]) byType[entry.entry_type] = [];
        byType[entry.entry_type].push(entry);
      }

      setAllEntries(typedEntries);
      setStaffSummary(summary);
      setEntriesByType(byType);
    } catch (e: any) {
      console.error('[SessionStaffHistory] error:', e);
      setError(e?.message || 'Failed to load session history');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { allEntries, staffSummary, entriesByType, loading, error, refetch: fetch };
}
