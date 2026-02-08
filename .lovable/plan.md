

## Plan: Sync Status Indicator + Historical Data Sync Tests + E2E Verification

This plan covers three deliverables:
1. A visual sync status indicator for historical data entries
2. Automated unit tests for the `historicalDataSync.ts` module
3. An end-to-end browser test of the historical data entry flow

---

### 1. Visual Sync Status Indicator for Historical Data

**What it does:** Shows users a small badge/icon near the save button and in the bulk entry dialog indicating whether their historical data has been saved to the cloud (synced), is still being saved (pending), or encountered an error.

**Implementation approach:**

- **Extend `historicalDataSync.ts`** to expose observable sync state:
  - Add a `historicalSyncStatus` map tracking per-student status: `'idle' | 'pending' | 'synced' | 'error'`
  - Export a `getHistoricalSyncStatus(studentId)` function
  - Add a `onSyncStatusChanged` event emitter so React components can subscribe
  - Update the save flow to set status to `'pending'` when data changes, `'synced'` on success, and `'error'` on failure

- **Create a `HistoricalSyncStatusBadge` component** (`src/components/HistoricalSyncStatusBadge.tsx`):
  - Subscribes to sync status changes via `useEffect` + the event emitter
  - Renders a small inline indicator:
    - Pending: orange dot + "Saving..." text with a spinner
    - Synced: green checkmark + "Saved" text (auto-fades after 3 seconds)
    - Error: red warning icon + "Save failed" text with retry option
  - Uses existing `Badge` component and Lucide icons (Cloud, CloudOff, Loader2, Check)

- **Integrate the badge in key locations:**
  - `HistoricalDataEntry.tsx`: Show status after the save button
  - `BulkHistoricalDataEntry.tsx`: Show status in the dialog footer near the save button
  - `HistoricalDataManager.tsx`: Show a summary status in the card header

---

### 2. Automated Tests for `historicalDataSync.ts`

**Test file:** `src/lib/__tests__/historicalDataSync.test.ts`

**Test cases:**

- **Event system tests:**
  - `onHistoricalDataChanged` registers a listener and returns an unsubscribe function
  - `emitHistoricalDataChanged` calls all registered listeners with the correct studentId
  - Unsubscribing removes the listener so it no longer fires

- **Pending state tracking tests:**
  - `hasUnsavedHistoricalData` returns `false` for unknown students
  - After emitting a change, `hasUnsavedHistoricalData` returns `true` for that student
  - After a successful save completes (mocked Supabase), it returns `false`

- **Save flow tests (with mocked Supabase):**
  - `initHistoricalDataSync` saves data to Supabase after the 500ms debounce
  - Multiple rapid emissions for the same student are debounced into a single save
  - If the getter returns `null`, the pending state is cleared without a Supabase call
  - Supabase errors are logged and pending state is retained

- **Flush tests:**
  - `flushPendingHistoricalData` saves all pending students immediately
  - Clears scheduled timeouts to avoid duplicate saves
  - On Supabase error, the pending state is retained for that student

**Mocking strategy:** Mock `@/integrations/supabase/client` with `vi.mock()` to intercept `.from('students').update().eq()` calls and control success/error responses.

---

### 3. End-to-End Browser Test

After implementing the above, use the browser tool to:

1. Open the preview and navigate to a student profile
2. Open the historical data entry form
3. Add a new historical frequency entry (e.g., Physical Aggression, Count: 3)
4. Verify the sync status badge shows "Saving..." then "Saved"
5. Perform a Force Refresh from the user menu
6. Navigate back to the student and confirm the entry persists in the historical data list
7. Take screenshots at each verification step

---

### Technical Details

**Files to create:**
- `src/components/HistoricalSyncStatusBadge.tsx` - React component for sync indicator
- `src/lib/__tests__/historicalDataSync.test.ts` - Unit tests

**Files to modify:**
- `src/lib/historicalDataSync.ts` - Add observable status tracking and status change events
- `src/components/HistoricalDataEntry.tsx` - Add sync status badge near save button
- `src/components/BulkHistoricalDataEntry.tsx` - Add sync status badge in dialog footer
- `src/components/HistoricalDataManager.tsx` - Add sync status indicator in header

**No database changes required.** This is purely frontend logic and testing.

