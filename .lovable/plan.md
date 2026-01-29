
# Implementation Plan: Questionnaire Access, Timer Behavior, Global Search, and Student Card Updates

## Overview
This plan addresses 5 main issues/requests:
1. **Questionnaire option not visible** - Add questionnaire tab to Assessment Dashboard
2. **Session timer auto-starts on reset** - Change reset/refresh behavior to require manual start
3. **Global search** - Add search functionality in header to find students/users
4. **Student card info** - Show DOB, school, tags, contact info instead of behavior count
5. **User tracking** - Already partially implemented, will verify coverage

---

## Issue 1: Questionnaire Not Visible

**Problem**: The QuestionnaireManager and QuestionnaireBuilder components exist but aren't integrated into the AssessmentDashboard.

**Solution**: Add a "Questionnaires" tab to the Assessment Dashboard

**Files to Modify**:
- `src/pages/AssessmentDashboard.tsx`

**Changes**:
- Import `QuestionnaireManager` from `@/components/questionnaire/QuestionnaireManager`
- Add a 7th tab "Questionnaires" to the TabsList
- Add TabsContent for questionnaires that renders `QuestionnaireManager` with the selected student

---

## Issue 2: Session Timer Auto-Starts on Reset

**Problem**: When clicking the reset button, the timer immediately starts a new session. Users want manual control.

**Solution**: Modify `handleReset` to only clear timer state without auto-starting

**Files to Modify**:
- `src/components/SessionTimer.tsx`

**Changes**:
- Update `handleReset` function:
  - Clear state: `setIsPaused(false)`, `setPausedTime(0)`, `setPausedAt(null)`, `setElapsed(0)`
  - Remove the `startSession()` call from reset
  - Add a store action `resetSession()` that clears `sessionStartTime` and `currentSessionId` without starting
- Update `src/store/dataStore.ts` to add `resetSession` function

```text
Current behavior:
  Reset → startSession() → Timer running at 00:00

Desired behavior:
  Reset → Clear state → Timer shows 00:00 (stopped)
  User must click "Start" to begin
```

---

## Issue 3: Global Search for Students/Users

**Problem**: No way to quickly search for a student or user by typing a few letters.

**Solution**: Add a command-palette style search in the header

**Files to Create**:
- `src/components/GlobalSearch.tsx`

**Features**:
- Search icon in header that opens a search dialog (using cmdk which is already installed)
- As user types, filter students by name (first 2-3 letters)
- Only show students the user has access to (owner, has_student_access, or admin)
- Show user profiles if the current user is admin
- Clicking a result navigates to the student profile or user profile
- Keyboard shortcut: Cmd/Ctrl+K to open

**Files to Modify**:
- `src/components/MainLayout.tsx` - Add GlobalSearch to header
- `src/pages/TeacherDashboard.tsx` - Add GlobalSearch to header
- `src/pages/Admin.tsx` - Ensure user search works here

**Access Rules**:
- Students: Show if `student.user_id = current_user` OR `user_student_access` exists with `can_collect_data` OR user is admin
- Users: Only show to admins

---

## Issue 4: Student Card Information

**Problem**: Student cards in the Students list show behavior count. User wants: name, DOB, school, tags, contact info.

**Solution**: Update the student card display

**Files to Modify**:
- `src/pages/Students.tsx`

**Current Display**:
```
[Avatar] John Smith
         3 behaviors | 2 custom A's | Tags
```

**New Display**:
```
[Avatar] John Smith
         DOB: 01/15/2015 | Grade 5 | Lincoln Elementary
         School-Based, Direct Services
         Contact: parent@email.com | (555) 123-4567
         [Tags displayed]
```

**Changes**:
- Replace behavior count badge with profile info
- Show date of birth formatted (if available)
- Show grade (if available)
- Show school/site (if available)
- Show case type badges
- Show tags (already displayed via StudentTagsDisplay)
- Add contact fields to Student type: `contactEmail`, `contactPhone`

**Database Changes**:
- Add `contact_email` and `contact_phone` columns to students table JSONB or as separate columns

---

## Issue 5: User Tracking for Notes/Data

**Status**: Partially implemented in types (recordedBy, recordedByName, modifiedBy, modifiedAt)

**Solution**: Ensure all data entry points capture user information

**Files to Verify/Update**:
- `src/components/TeacherFriendlyView.tsx` - Already has user tracking
- `src/store/dataStore.ts` - Ensure addHistoricalFrequency/Duration capture user
- Session notes, ABC entries, etc.

---

## Implementation Details

### Database Migration

Add contact fields to students table:

```sql
-- Add contact fields to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text;
```

### GlobalSearch Component Structure

```text
+------------------------------------------+
| [Search icon]                             |
+------------------------------------------+
| Opens dialog:                             |
| ┌────────────────────────────────────────┐|
| │ 🔍 Search students or users...        │|
| ├────────────────────────────────────────┤|
| │ Students                               │|
| │ ├─ John Smith (Lincoln Elementary)    │|
| │ ├─ Jane Doe (Washington High)         │|
| │                                        │|
| │ Users (admin only)                     │|
| │ ├─ Mary Johnson (Staff)               │|
| └────────────────────────────────────────┘|
+------------------------------------------+
```

### StudentCard Updated Layout

```text
┌─────────────────────────────────────────────────────┐
│ [Avatar]  John Smith                            → │
│           DOB: Jan 15, 2015 | Grade: 5             │
│           School: Lincoln Elementary                │
│           [School-Based] [Direct Services]          │
│           📧 parent@email.com | 📞 (555) 123-4567  │
│           [Tag1] [Tag2]                             │
└─────────────────────────────────────────────────────┘
```

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/AssessmentDashboard.tsx` | Modify | Add Questionnaires tab |
| `src/components/SessionTimer.tsx` | Modify | Remove auto-start on reset |
| `src/store/dataStore.ts` | Modify | Add resetSession function |
| `src/components/GlobalSearch.tsx` | Create | Global search component |
| `src/components/MainLayout.tsx` | Modify | Add GlobalSearch to header |
| `src/pages/TeacherDashboard.tsx` | Modify | Add GlobalSearch to header |
| `src/pages/Students.tsx` | Modify | Update student card info |
| `src/types/behavior.ts` | Modify | Add contactEmail, contactPhone to Student |
| Database migration | Create | Add contact columns |

---

## Implementation Order

1. **Database Migration** - Add contact fields to students
2. **Session Timer Fix** - Quick fix for reset behavior
3. **Questionnaire Tab** - Add to Assessment Dashboard
4. **Student Card Update** - Update display with profile info
5. **Global Search** - Create and integrate search component
6. **User Tracking Verification** - Ensure all data points capture user info
