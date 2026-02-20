
# Fix: Observation Date Reverting and Structured Notes Not Saving

## Problem Summary

Two related bugs are preventing observation data from persisting for students (reported on Jayden Jurado):

1. **Observation dates revert to July 22, 2025** after save and refresh
2. **Structured observation notes disappear** after saving (even when saved twice)

## Root Causes

### Cause 1: Stale Closure in Save Callbacks
In `AssessmentDataCollection.tsx`, the `onSave` callbacks for both StructuredObservationForm and ObservationNotesPanel read `student.narrativeNotes` from the component's render-time closure. When a user saves multiple times without a full re-render, the second save reads the OLD array (before the first save), effectively overwriting and losing the first entry.

### Cause 2: Realtime Subscription Overwrites Local Changes
After `updateStudentProfile` modifies the local Zustand store and the 2-second debounced sync writes to the database, the Supabase realtime subscription fires back an UPDATE event. For students with large records, the realtime payload can contain stale or incomplete `narrative_notes` data, which then overwrites the local store -- reverting dates and losing unsaved notes.

### Cause 3: No Unsaved Data Guard for Narrative Notes
The sync system has an `hasUnsavedHistoricalData` guard that prevents realtime from overwriting pending historical data, but no equivalent guard exists for narrative notes. This means the realtime handler always overwrites narrative notes with whatever comes from the database payload.

---

## Implementation Plan

### Step 1: Fix stale closure in AssessmentDataCollection.tsx

Change the `onSave` callbacks to read the CURRENT student state from the Zustand store at save time, instead of from the closure:

```
// Before (stale closure):
const existingNotes = student.narrativeNotes || [];

// After (fresh read):
const currentStudent = useDataStore.getState().students.find(s => s.id === student.id);
const existingNotes = currentStudent?.narrativeNotes || [];
```

Apply this to both:
- The StructuredObservationForm `onSave` (line ~1447)
- The ObservationNotesPanel `onSave` (line ~1478)

### Step 2: Add unsaved narrative notes guard

Create a guard mechanism (similar to `hasUnsavedHistoricalData`) to protect pending narrative note changes from being overwritten by realtime:

- Add a `pendingNarrativeNoteStudents` Set (or ref) in SyncContext
- When `updateStudentProfile` is called with `narrativeNotes`, mark that student as having pending changes
- Clear the flag after `syncToCloud` completes successfully

### Step 3: Protect narrative notes in the realtime handler

In the realtime subscription handler (SyncContext.tsx, line ~1456), check the pending flag before overwriting:

```
// If this student has pending narrative note changes, preserve local data
narrativeNotes: hasPendingNarrativeNotes(s.id)
  ? (useDataStore.getState().students.find(st => st.id === s.id)?.narrativeNotes || [])
  : ((s.narrative_notes || []).map(...))
```

### Step 4: Fix handleUpdateObservationDate race condition

In `ObservationResultsViewer.tsx`, the date update handler should also read from the current store state rather than the component's `student` prop:

```
const handleUpdateObservationDate = (obsId: string) => {
  const currentStudent = useDataStore.getState().students.find(s => s.id === studentId);
  const updatedNotes = (currentStudent?.narrativeNotes || []).map(note => {
    // ... existing logic
  });
  updateStudentProfile(studentId, { narrativeNotes: updatedNotes });
};
```

### Step 5: Prevent duplicate note entries

In the ObservationNotesPanel `onSave`, check if a note with the same ID already exists and update it instead of appending a duplicate:

```
const existingIndex = existingNotes.findIndex(n => n.id === notes.id);
const updatedNotes = existingIndex >= 0
  ? existingNotes.map((n, i) => i === existingIndex ? observationNote : n)
  : [...existingNotes, observationNote];
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/AssessmentDataCollection.tsx` | Fix stale closures in both onSave callbacks; add duplicate prevention |
| `src/components/ObservationResultsViewer.tsx` | Read current store state in handleUpdateObservationDate |
| `src/contexts/SyncContext.tsx` | Add pending narrative notes guard; protect realtime handler |

## Technical Details

### Pending Notes Guard (SyncContext.tsx)

A module-level `Set<string>` will track student IDs with unsaved narrative note changes:

```text
pendingNarrativeStudentIds: Set<string>

markNarrativeNotesPending(studentId)  -- called when narrativeNotes updated
clearNarrativeNotesPending(studentId) -- called after successful sync
hasPendingNarrativeNotes(studentId)   -- checked in realtime handler
```

This mirrors the existing `hasUnsavedHistoricalData` pattern already proven in the codebase.

### Why This Works

- Reading from `useDataStore.getState()` at save-time ensures the latest notes array is always used
- The pending guard prevents realtime from overwriting local changes during the 2-second sync window
- Duplicate prevention ensures repeated saves update in-place rather than appending
