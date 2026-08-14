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
import { mergeDrafts, DraftSnapshot } from '@/lib/multiStudentDraftMerge';

const QUEUE_KEY = 'multiStudentSessionDraftQueue:v1';
const BASE_KEY = 'multiStudentSessionDraftBase:v1';

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

// ---- Last-synced baselines (shared ancestor for three-way merges) ----

type BaseMap = Record<string, DraftSnapshot>;

function readBases(): BaseMap {
  try {
    const raw = localStorage.getItem(BASE_KEY);
    return raw ? (JSON.parse(raw) as BaseMap) : {};
  } catch {
    return {};
  }
}

export function getBaseline(sessionId: string): DraftSnapshot | null {
  return readBases()[sessionId] ?? null;
}

export function setBaseline(sessionId: string, snap: DraftSnapshot) {
  const b = readBases();
  b[sessionId] = snap;
  try { localStorage.setItem(BASE_KEY, JSON.stringify(b)); } catch {}
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

const mergeListeners = new Set<(sessionId: string, merged: DraftSnapshot) => void>();
/** Notified whenever a reconnect merge produced a draft different from the local one. */
export function subscribeMerges(cb: (sessionId: string, merged: DraftSnapshot) => void): () => void {
  mergeListeners.add(cb);
  return () => { mergeListeners.delete(cb); };
}

/**
 * Push a local draft snapshot to the server, three-way merging with whatever
 * is already stored there. Returns the merged snapshot that was persisted.
 */
export async function syncDraft(
  sessionId: string,
  local: DraftSnapshot,
  userId?: string
): Promise<DraftSnapshot> {
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('not authenticated');
    uid = user.id;
  }

  const { data: rows, error: fetchError } = await supabase
    .from('multi_student_session_drafts' as any)
    .select('chosen_students, chosen_behaviors, configs, updated_at')
    .eq('user_id', uid)
    .eq('session_id', sessionId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  const row = rows as any;
  const server: DraftSnapshot | null = row
    ? {
        chosenStudents: (row.chosen_students as string[]) || [],
        chosenBehaviors: (row.chosen_behaviors as Record<string, string[]>) || {},
        configs: (row.configs as Record<string, unknown>) || {},
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
      }
    : null;

  const merged = mergeDrafts(getBaseline(sessionId), local, server);

  const { error } = await supabase
    .from('multi_student_session_drafts' as any)
    .upsert(
      {
        user_id: uid,
        session_id: sessionId,
        chosen_students: merged.chosenStudents as any,
        chosen_behaviors: merged.chosenBehaviors as any,
        configs: merged.configs as any,
        updated_at: new Date(Math.max(merged.updatedAt, Date.now())).toISOString(),
      },
      { onConflict: 'user_id,session_id' }
    );
  if (error) throw error;

  setBaseline(sessionId, merged);

  const changed =
    JSON.stringify([local.chosenStudents, local.chosenBehaviors, local.configs]) !==
    JSON.stringify([merged.chosenStudents, merged.chosenBehaviors, merged.configs]);
  if (changed) mergeListeners.forEach((l) => l(sessionId, merged));

  return merged;
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
        await syncDraft(
          sid,
          {
            chosenStudents: d.chosenStudents,
            chosenBehaviors: d.chosenBehaviors,
            configs: d.configs,
            updatedAt: d.queuedAt,
          },
          user.id
        );
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
