import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';

/**
 * Fetches abc_logs from Supabase for a given client and merges them
 * into the local Zustand store so graphs can render cloud-sourced data.
 * Also ensures the student has corresponding behavior entries for graphing.
 */
export function useSupabaseAbcSync(clientId: string | undefined) {
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!clientId || syncedRef.current === clientId) return;
    syncedRef.current = clientId;

    const fetchAndMerge = async () => {
      try {
        const { data: logs, error } = await supabase
          .from('abc_logs')
          .select('*')
          .eq('client_id', clientId)
          .order('logged_at', { ascending: false })
          .limit(500);

        if (error || !logs || logs.length === 0) return;

        // Get existing local ABC entry IDs to avoid duplicates
        const existing = new Set(
          useDataStore.getState().abcEntries
            .filter(e => e.studentId === clientId)
            .map(e => e.id)
        );

        // Also track by source_request_id to avoid duplicates from Nova AI
        const existingSourceIds = new Set(
          useDataStore.getState().abcEntries
            .filter((e: any) => e.studentId === clientId && e.sourceRequestId)
            .map((e: any) => e.sourceRequestId)
        );

        const newEntries = logs
          .filter(log => !existing.has(log.id) && (!log.source_request_id || !existingSourceIds.has(log.source_request_id)))
          .map(log => ({
            id: log.id,
            studentId: log.client_id,
            behaviorId: log.behavior_category
              ? log.behavior_category.toLowerCase().replace(/\s+/g, '-')
              : 'unknown-behavior',
            behaviorName: log.behavior_category || log.behavior || 'Unknown',
            behavior: log.behavior || '',
            antecedent: log.antecedent || 'Unknown',
            consequence: log.consequence || 'Unknown',
            timestamp: log.logged_at,
            notes: log.notes || '',
            frequencyCount: 1,
            hasDuration: !!log.duration_seconds,
            durationMinutes: log.duration_seconds ? log.duration_seconds / 60 : 0,
            intensity: log.intensity,
            sourceRequestId: log.source_request_id,
            createdByAi: log.created_by_ai,
          }));

        if (newEntries.length === 0) return;

        // Ensure the student has behavior entries for all categories found in abc_logs
        const store = useDataStore.getState();
        const student = store.students.find(s => s.id === clientId);
        if (student) {
          const existingBehaviorIds = new Set(student.behaviors.map(b => b.id));
          const categoriesSeen = new Set<string>();
          const behaviorsToAdd: Array<{ id: string; name: string; type: string; methods: string[] }> = [];

          for (const entry of newEntries) {
            if (!categoriesSeen.has(entry.behaviorId) && !existingBehaviorIds.has(entry.behaviorId)) {
              categoriesSeen.add(entry.behaviorId);
              behaviorsToAdd.push({
                id: entry.behaviorId,
                name: entry.behaviorName,
                type: 'frequency',
                methods: ['frequency', 'abc'],
              });
            }
          }

          if (behaviorsToAdd.length > 0) {
            useDataStore.setState(state => ({
              students: state.students.map(s =>
                s.id === clientId
                  ? { ...s, behaviors: [...s.behaviors, ...behaviorsToAdd as any] }
                  : s
              ),
            } as any));
            console.log(`[AbcSync] Added ${behaviorsToAdd.length} missing behaviors for client ${clientId}:`, behaviorsToAdd.map(b => b.name));
          }
        }

        useDataStore.setState(state => ({
          abcEntries: [...state.abcEntries, ...newEntries],
        } as any));

        console.log(`[AbcSync] Merged ${newEntries.length} Supabase abc_logs for client ${clientId}`);
      } catch (err) {
        console.warn('[AbcSync] Failed to fetch abc_logs:', err);
      }
    };

    fetchAndMerge();
  }, [clientId]);
}
