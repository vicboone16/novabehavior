import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AssessmentCaptureType =
  | 'fba_structured_observation'
  | 'cold_probe_session'
  | 'observation_notes';

export interface AssessmentCaptureRecord {
  id: string;
  student_id: string;
  record_type: AssessmentCaptureType;
  record_key: string;
  observation_date: string | null;
  payload: any;
  created_at: string;
  updated_at: string;
}

const db = supabase as any;

const LOCAL_QUEUE_KEY = 'nova_assessment_capture_queue';

interface QueuedCapture {
  student_id: string;
  record_type: AssessmentCaptureType;
  record_key: string;
  observation_date: string | null;
  payload: any;
  created_by: string | null;
  queued_at: string;
}

function readQueue(): QueuedCapture[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(rows: QueuedCapture[]) {
  try {
    localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(rows));
  } catch {
    /* storage full — nothing else we can do */
  }
}

/**
 * Durable, write-through persistence for assessment captures
 * (FBA structured observations, cold probe sessions, observation notes).
 *
 * Every save goes straight to the database. If the write fails (offline,
 * auth blip), the record is queued locally and retried, and the user is told
 * clearly rather than shown a false "saved" toast.
 */
export function useAssessmentCapture() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const flushQueue = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0) return 0;
    const remaining: QueuedCapture[] = [];
    let flushed = 0;
    for (const row of queue) {
      const { queued_at, ...insert } = row;
      const { error } = await db
        .from('assessment_capture_records')
        .upsert(
          { ...insert, created_by: insert.created_by || user?.id || null },
          { onConflict: 'student_id,record_type,record_key' }
        );
      if (error) remaining.push(row);
      else flushed++;
    }
    writeQueue(remaining);
    return flushed;
  }, [user?.id]);

  const saveCapture = useCallback(
    async (opts: {
      studentId: string;
      recordType: AssessmentCaptureType;
      recordKey: string;
      observationDate?: Date | string | null;
      payload: unknown;
    }): Promise<{ ok: boolean; queued: boolean }> => {
      setSaving(true);
      const observation_date = opts.observationDate
        ? new Date(opts.observationDate).toISOString().slice(0, 10)
        : null;
      const row = {
        student_id: opts.studentId,
        record_type: opts.recordType,
        record_key: opts.recordKey,
        observation_date,
        payload: opts.payload as any,
        created_by: user?.id || null,
      };

      try {
        const { error } = await db
          .from('assessment_capture_records')
          .upsert(row, { onConflict: 'student_id,record_type,record_key' });

        if (error) throw error;
        // Opportunistically drain anything stranded from earlier failures
        void flushQueue();
        return { ok: true, queued: false };
      } catch (err: any) {
        console.error('[AssessmentCapture] save failed, queueing locally:', err);
        writeQueue([...readQueue(), { ...row, queued_at: new Date().toISOString() }]);
        toast.warning('Saved on this device only — will sync when reconnected', {
          description: err?.message || 'Could not reach the server.',
        });
        return { ok: false, queued: true };
      } finally {
        setSaving(false);
      }
    },
    [user?.id, flushQueue]
  );

  const listCaptures = useCallback(
    async (studentId: string, recordType?: AssessmentCaptureType) => {
      let query = db
        .from('assessment_capture_records')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (recordType) query = query.eq('record_type', recordType);
      const { data, error } = await query;
      if (error) {
        console.error('[AssessmentCapture] list failed:', error);
        return [] as AssessmentCaptureRecord[];
      }
      return (data || []) as AssessmentCaptureRecord[];
    },
    []
  );

  const pendingCount = readQueue().length;

  return { saveCapture, listCaptures, flushQueue, saving, pendingCount };
}
