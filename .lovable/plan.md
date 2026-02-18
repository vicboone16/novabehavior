
# Diagnosis & Fix Plan: Jayden Jurado's Missing Data and Structured Form Dates

## What the Investigation Found

After a thorough database audit, here is the definitive picture:

### The Good News — Data Is NOT Lost
All of Jayden's behavioral data exists in the database:
- **12 session_data rows** with frequency, duration, and ABC entries all intact
- **Sessions table** contains 14 associated sessions 
- **Historical data** (4 entries) stored in the student record's `historical_data` column

### Root Cause #1: Observation/Session History Not Visible
The session data IS in the database, but the sync system is failing to load it into the UI. The network logs show the `POST /sessions` presence-sync calls failing with "Load failed" errors — these network failures during the initial load mean the `SyncContext` never fetches session_data and populates the local store correctly.

The critical chain:
1. `SyncContext` fetches sessions from `sessions` table ✓
2. Then fetches `session_data` filtered against those session IDs ✓
3. But the sessions query returns data linked to `20a7d34a...` and `b17a22a7...` session IDs
4. The **sessions table RLS** only allows `user_id = auth.uid()` — no expanded access path for agency members or admins accessing students they didn't personally create the session for
5. When the SyncContext queries `sessions` and `session_data`, there appear to be stale/broken session entries from the network failure period (duplicate sessions created during the "Load failed" era that conflict)

### Root Cause #2: FAST/Indirect Assessment Data Missing
The `indirect_assessments` column on Jayden's student record in the database is an **empty array `[]`**. This means:
- `addIndirectAssessment()` in `dataStore.ts` only updates local Zustand state
- The SyncContext **does** write `indirect_assessments` back to the database during a full sync
- However, if the sync was disrupted (which the network logs confirm it was), the FAST results were never written to the database
- They lived only in localStorage, and localStorage was cleared/reset (possibly by the security hardening work that excluded session state from persistence)

### Root Cause #3: Cannot Modify Date on Historical Structured Forms
When viewing a historical indirect assessment result (FAST, MAS, QABF), the `completedAt` date is set at save time (`new Date()`) and there is no UI affordance in `IndirectAssessmentTools.tsx` to edit the date after the fact. The assessment object is stored with a fixed timestamp and there is no edit flow exposed in the saved assessments list.

---

## Fix Plan

### Fix 1: Restore Visibility of Session Data (Observation History)

**Problem**: The network failure created duplicate/ghost sessions (visible in the network log: sessions `b142cbd2`, `71445e51`, `69ceefd6` were POST-failed). The valid session data belongs to session `20a7d34a` and `b17a22a7`, which DO exist and DO have `user_id = 98e3f44c`.

**Fix**: Ensure the SyncContext correctly falls back and loads `session_data` independently of the sessions list — querying `session_data` by `user_id` directly (not just by filtering through sessions). Also clean up the ghost/failed sessions.

**In `SyncContext.tsx`**: Add a secondary fetch path that loads all `session_data` rows for `user_id = auth.uid()` directly when session entries are sparse, bypassing any session linkage gap.

### Fix 2: Immediate Persistence of Indirect Assessment Data (FAST/MAS/QABF)

**Problem**: `addIndirectAssessment` only updates local state — the SyncContext only writes it back during a full debounced student sync. If that sync fails, the data is lost.

**Fix**: In `IndirectAssessmentTools.tsx`, after calling `addIndirectAssessment()`, immediately write the updated `indirect_assessments` array to the database (similar to how `saveHistoricalDataDirect` works for historical data):

```typescript
// After addIndirectAssessment(student.id, result):
await supabase
  .from('students')
  .update({ indirect_assessments: [...existing, newAssessment] })
  .eq('id', student.id);
```

This ensures FAST/MAS/QABF results are persisted immediately, not dependent on the sync cycle.

### Fix 3: Allow Editing the Date on Historical Assessments (Structured Forms)

**Problem**: The `IndirectAssessmentResult` type has a `completedAt: Date` field set at save time. The saved assessments list in `IndirectAssessmentTools.tsx` shows each saved result with no way to modify the date.

**Fix**: Add an "Edit date" feature to each saved assessment card. This requires:
1. Adding an inline date picker to each saved assessment card in `IndirectAssessmentTools.tsx`
2. Adding an `updateIndirectAssessment` action to `dataStore.ts` that mutates `indirectAssessments` for a given student
3. Immediately persisting the date change to the database

### Fix 4: Clean Up Ghost Sessions

The network logs show failed session-sync calls that created duplicate, empty session records (`b142cbd2`, `71445e51`, `69ceefd6`). These bloat the session list and confuse the UI. 

**Fix**: Run a database cleanup to remove sessions with no associated `session_data` entries that were created during the known failure window (Feb 18).

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/IndirectAssessmentTools.tsx` | Immediate DB persist on save; Add date-edit UI on saved assessments |
| `src/store/dataStore.ts` | Add `updateIndirectAssessment` action |
| `src/contexts/SyncContext.tsx` | Add secondary session_data load path by user_id; remove ghost sessions |
| Database migration | Clean up ghost sessions; add `updateIndirectAssessment` RLS-safe path |

---

## Technical Notes

- The session data for Jayden (ABC entries, frequency, duration) is **confirmed intact** in the database. Once the sync path is fixed it will be visible again.
- The FAST results cannot be recovered from the database since they were never written — they existed only in localStorage before the security hardening excluded session state from the persistence layer.
- The structural form date edit will require a new `updateIndirectAssessment` method in the store that also immediately writes to the database.
- Ghost sessions (empty sessions from failed syncs) will be removed via a targeted SQL cleanup during this fix.
