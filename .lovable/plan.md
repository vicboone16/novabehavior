

## Plan: Fix Assessment Export, Auto-Session Start, Caseload Display, and Staff Management

This plan addresses four distinct issues you've reported.

---

### Issue 1: Assessment Export Not Showing Session Data for Jayden

**Root Cause:** The `getSessionEntries()` function in `ComprehensiveAssessmentExport.tsx` (line 172-177) only pulls data from the global store arrays (`abcEntries`, `frequencyEntries`, etc.). It does NOT check the inline session arrays (`session.frequencyEntries`, `session.durationEntries`, etc.) -- even though the session detection logic was already fixed to check both sources. This means sessions are correctly listed in the export dialog, but the actual exported document contains zero data for sessions that store entries inline.

**Fix:** Update `getSessionEntries()` to merge data from both the global store AND the inline session properties, deduplicating by entry ID.

Also update the Function Analysis section (line 416) and Hypothesis section (line 490) to similarly pull ABC data from inline session arrays, not just the global store.

---

### Issue 2: Session Auto-Starts on Login

**Root Cause:** In `AssessmentDataCollection.tsx` (line 307-311), the `handleStartObservation()` function calls `startSession()` automatically when there is no active session. Additionally, `SessionTimer.tsx` (line 69-71) does the same. The Zustand store persists `sessionStartTime` to localStorage, so if a session was active when the user last closed the app and is under 4 hours old, it rehydrates as active on the next login.

**Fix:**
- The store's `onRehydrateStorage` already clears sessions older than 4 hours. We need to add a setting or simply always clear the session state on fresh login/page load so stale sessions don't persist.
- Ensure `startSession()` is only called by explicit user action (clicking "Start Observation"), not implicitly on component mount. The current code already gates it behind `handleStartObservation`, so the real issue is likely the persisted session state rehydrating. We will clear session state on auth login.

---

### Issue 3: Clinician/Supervision Page Not Showing Clients

**Root Cause:** The Supervision Dashboard (`SupervisionDashboard.tsx`) fetches data from `supervision_requirements` and `supervision_logs` tables -- it does NOT query `staff_caseloads` or `client_team_assignments` to show the clinician's actual client list. The "Total Supervisees" stat comes from `supervision_requirements`, not caseload data.

**Fix:** Add a "My Caseload" section to the Supervision Dashboard that queries `staff_caseloads` and `client_team_assignments` for the logged-in user, similar to how `StaffAssignmentsTab` already does it. Display the count and list of assigned clients.

---

### Issue 4: Add/Remove Clients, Agencies, and Sites to Staff Profiles

**Root Cause:** The current "Add New Staff" dialog (`StaffManagement.tsx` lines 560-760) only collects basic info (name, email, credential, supervisor, role). There are no fields for assigning clients, agencies, or sites. The `StaffAssignmentsTab` shows existing assignments but has no UI to add or remove client assignments.

**Fix:**
- **Add Staff Dialog:** Add optional multi-select sections for client assignments, agency assignments, and site assignments during staff creation.
- **Staff Profile Assignments Tab:** Add "Assign Client", "Assign Agency", and "Assign Site" buttons with dialogs to add new assignments, plus remove/deactivate buttons on existing rows.

---

### Technical Details

**Files to modify:**

1. **`src/components/ComprehensiveAssessmentExport.tsx`**
   - Update `getSessionEntries()` (lines 172-177) to also pull from `session.abcEntries`, `session.frequencyEntries`, `session.durationEntries`, `session.intervalEntries` -- deduplicating by entry ID
   - Update Function Analysis section (line 416) and Hypothesis section (line 490) to also include inline ABC data from sessions

2. **`src/store/dataStore.ts`**
   - In `onRehydrateStorage` callback, always clear session state on app startup (reset `sessionStartTime`, `currentSessionId`, etc.) instead of only clearing after 4 hours

3. **`src/components/supervision/SupervisionDashboard.tsx`**
   - Add caseload query using current user's ID from `useAuth()`
   - Display a "My Clients" card showing assigned client count and list

4. **`src/components/staff-profile/tabs/StaffAssignmentsTab.tsx`**
   - Add "Assign Client" button and dialog to create `client_team_assignments` records
   - Add "Remove" button on each caseload row to deactivate assignments
   - Add "Assign Agency" and "Assign Site" sections (querying `agencies` and `agency_sites` tables)

5. **`src/components/admin/StaffManagement.tsx`**
   - Add optional client, agency, and site assignment fields to the "Add New Staff" dialog
   - Insert the corresponding records after staff creation succeeds

