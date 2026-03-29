import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';

/**
 * Syncs behavior_session_data from the database into the local Zustand store
 * so that behavior graphs render server-side data (e.g. data inserted via migrations or AI).
 */
export function useBehaviorSessionSync(clientId: string | undefined) {
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const fetchAndMerge = async () => {
      try {
        const { data: rows, error } = await supabase
          .from('behavior_session_data')
          .select('id, session_id, behavior_id, frequency, duration_seconds, data_state, created_at, sessions!inner(start_time, started_at)')
          .eq('student_id', clientId)
          .eq('data_state', 'measured')
          .order('created_at', { ascending: true })
          .limit(500);

        if (error || !rows || rows.length === 0) {
          // Fallback: fetch without inner join but still get session dates via left join
          const { data: fallbackRows, error: fallbackError } = await supabase
            .from('behavior_session_data')
            .select('id, session_id, behavior_id, frequency, duration_seconds, data_state, created_at, sessions(start_time, started_at)')
            .eq('student_id', clientId)
            .eq('data_state', 'measured')
            .order('created_at', { ascending: true })
            .limit(500);
          
          if (fallbackError || !fallbackRows || fallbackRows.length === 0) return;
          mergeRows(fallbackRows, clientId);
          return;
        }

        mergeRows(rows, clientId);
      } catch (err) {
        console.warn('[BehaviorSessionSync] Failed:', err);
      }
    };

    // Listen for edits to re-fetch
    const handleEdited = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.studentId === clientId) {
        syncedRef.current = null;
        fetchAndMerge();
      }
    };
    window.addEventListener('behavior-data-edited', handleEdited);

    if (syncedRef.current !== clientId) {
      syncedRef.current = clientId;
      fetchAndMerge();
    }

    return () => {
      window.removeEventListener('behavior-data-edited', handleEdited);
    };
  }, [clientId]);
}

function getObservationDate(r: any): string {
  const session = (r as any).sessions;
  // Prefer started_at (actual observation date) > start_time > created_at
  if (session?.started_at) return session.started_at;
  if (session?.start_time) return session.start_time;
  return r.created_at;
}

function mergeRows(rows: any[], clientId: string) {
  const store = useDataStore.getState();

  // IMPORTANT: Always clear previous bsd- entries for this student first,
  // then re-add with correct observation dates. This ensures that if timestamps
  // were previously wrong (e.g., used created_at instead of session.started_at),
  // they get corrected on every sync.
  const cleanedFreq = store.frequencyEntries.filter(
    e => !(e.id.startsWith('bsd-') && e.studentId === clientId)
  );
  const cleanedDur = store.durationEntries.filter(
    e => !(e.id.startsWith('bsd-dur-') && e.studentId === clientId)
  );

  // Get behavior names from student_behavior_map or behaviors
  const student = store.students.find(s => s.id === clientId);
  const behaviorMap = new Map<string, string>();
  if (student) {
    for (const b of student.behaviors) {
      behaviorMap.set(b.id, b.name);
    }
  }

  // Build fresh entries using observation date (session.started_at), never created_at
  const newFrequencyEntries = rows
    .filter(r => r.frequency != null)
    .map(r => ({
      id: `bsd-${r.id}`,
      studentId: clientId,
      behaviorId: r.behavior_id,
      count: r.frequency,
      timestamp: getObservationDate(r),
      notes: r.frequency === 0 ? 'observed_zero' : '',
    }));

  const newDurationEntries = rows
    .filter(r => r.duration_seconds != null && r.duration_seconds > 0)
    .map(r => ({
      id: `bsd-dur-${r.id}`,
      studentId: clientId,
      behaviorId: r.behavior_id,
      duration: r.duration_seconds,
      startTime: new Date(getObservationDate(r)),
    }));

  // Ensure student has the behavior in their behavior list
  if (student) {
    const existingBehaviorIds = new Set(student.behaviors.map(b => b.id));
    const missingBehaviorIds = new Set<string>();
    
    for (const r of rows) {
      if (!existingBehaviorIds.has(r.behavior_id)) {
        missingBehaviorIds.add(r.behavior_id);
      }
    }

    if (missingBehaviorIds.size > 0) {
      // Fetch behavior names
      supabase
        .from('behaviors')
        .select('id, name')
        .in('id', Array.from(missingBehaviorIds))
        .then(({ data: behaviors }) => {
          if (!behaviors) return;
          const behaviorsToAdd = behaviors.map(b => ({
            id: b.id,
            name: b.name,
            type: 'frequency' as const,
            methods: ['frequency'] as any[],
          }));
          
          if (behaviorsToAdd.length > 0) {
            useDataStore.setState(state => ({
              students: state.students.map(s =>
                s.id === clientId
                  ? { ...s, behaviors: [...s.behaviors, ...behaviorsToAdd as any] }
                  : s
              ),
            } as any));
            console.log(`[BehaviorSessionSync] Added ${behaviorsToAdd.length} behaviors for graphing`);
          }
        });
    }
  }

  // Replace (not append) store entries for this student
  useDataStore.setState({
    frequencyEntries: [...cleanedFreq, ...newFrequencyEntries],
    durationEntries: [...cleanedDur, ...newDurationEntries],
  } as any);

  if (newFrequencyEntries.length > 0) {
    console.log(`[BehaviorSessionSync] Synced ${newFrequencyEntries.length} frequency entries for client ${clientId} (using observation dates)`);
  }
  if (newDurationEntries.length > 0) {
    console.log(`[BehaviorSessionSync] Synced ${newDurationEntries.length} duration entries for client ${clientId} (using observation dates)`);
  }
}
