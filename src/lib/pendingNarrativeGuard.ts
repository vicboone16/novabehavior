// Module-level guard: tracks students with pending narrative note changes.
// Prevents realtime subscriptions from overwriting local edits during the sync window.
const pendingNarrativeStudentIds = new Set<string>();

export function markNarrativeNotesPending(studentId: string) {
  pendingNarrativeStudentIds.add(studentId);
}

export function clearNarrativeNotesPending(studentId: string) {
  pendingNarrativeStudentIds.delete(studentId);
}

export function hasPendingNarrativeNotes(studentId: string) {
  return pendingNarrativeStudentIds.has(studentId);
}

export function clearAllPendingNarrativeNotes() {
  pendingNarrativeStudentIds.clear();
}
