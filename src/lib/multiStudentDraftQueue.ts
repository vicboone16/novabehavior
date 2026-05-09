/**
 * Persistent offline change queue for Multi-Student Session drafts.
 *
 * Edits made while offline (or when a Supabase upsert fails) are stored in
 * localStorage keyed by session_id. The latest snapshot per session wins
 * (last-write-wins). On app reopen, when the browser is online, the queue
 * is automatically drained — pending drafts are upserted to the
 * `multi_student_session_drafts` table.
 */
import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'multiStudentSessionDraftQueue:v1';

export interface QueuedDraft {
  sessionId: string;
  userId?: string;
  chosenStudents: string[];
  chosenBehaviors: Record<string, string[]>;
  configs: Record<string, unknown>;
  queuedAt: number;
}

type QueueMap = Record<string, QueuedDraft>;

function readQueue(): QueueMap {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueMap) : {};
  } catch {
    return {};
  }
}

function writeQueue(q: QueueMap) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}

export function enqueueDraft(d: QueuedDraft) {
  const q = readQueue();
  q[d.sessionId] = { ...d, queuedAt: Date.now() };
  writeQueue(q);
  notify();
}

export function dequeue(sessionId: string) {
  const q = readQueue();
  if (q[sessionId]) {
    delete q[sessionId];
    writeQueue(q);
    notify();
  }
}

export function getQueueSize(): number {
  return Object.keys(readQueue()).length;
}

const listeners = new Set<(size: number) => void>();
function notify() {
  const s = getQueueSize();
  listeners.forEach((l) => l(s));
}
export function subscribeQueue(cb: (size: number) => void): () => void {
  listeners.add(cb);
  cb(getQueueSize());
  return () => { listeners.delete(cb); };
}

let draining = false;

export async function drainQueue(): Promise<{ flushed: number; remaining: number }> {
  if (draining) return { flushed: 0, remaining: getQueueSize() };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { flushed: 0, remaining: getQueueSize() };
  }
  draining = true;
  let flushed = 0;
  try {
    const q = readQueue();
    const ids = Object.keys(q);
    if (ids.length === 0) return { flushed: 0, remaining: 0 };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { flushed: 0, remaining: ids.length };

    for (const sid of ids) {
      const d = q[sid];
      try {
        const { error } = await supabase
          .from('multi_student_session_drafts' as any)
          .upsert(
            {
              user_id: user.id,
              session_id: d.sessionId,
              chosen_students: d.chosenStudents as any,
              chosen_behaviors: d.chosenBehaviors as any,
              configs: d.configs as any,
              updated_at: new Date(d.queuedAt).toISOString(),
            },
            { onConflict: 'user_id,session_id' }
          );
        if (error) throw error;
        dequeue(sid);
        flushed += 1;
      } catch (e) {
        // Leave in queue for next attempt
        console.warn('[multiStudentDraftQueue] flush failed for', sid, e);
      }
    }
  } finally {
    draining = false;
  }
  return { flushed, remaining: getQueueSize() };
}

// Auto-drain on app load and whenever the browser regains connectivity.
if (typeof window !== 'undefined') {
  // Defer initial drain to next tick so auth has a chance to hydrate.
  setTimeout(() => { void drainQueue(); }, 1500);
  window.addEventListener('online', () => { void drainQueue(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void drainQueue();
  });
}
