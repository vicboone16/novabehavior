# Student Connect — Supervision & Supervisor Mode Integration Spec

**Target Project**: [Nova Student Connect](/projects/b3af6932-f814-424f-81f3-5bda9f6b9138)  
**Backend**: Shared Supabase (`yboqqmkghwhlhhnsegje`)  
**Date**: 2026-03-04

---

## 1. Supervision Tracking Page

### Purpose
Allow supervisors (BCBAs) to track supervisee/RBT supervision hours, compliance percentages, fieldwork hours, and approve supervision logs — all from within Student Connect.

### Data Source
Uses the shared backend view `v_supervision_compliance` which calculates:
- `supervision_hours` (total approved + pending)
- `direct_supervision_hours` / `indirect_supervision_hours`
- `total_fieldwork_hours`
- `pending_approval_count`
- `target_percentage`
- `supervisee_name`, `supervisor_name`, `supervisee_credential`

### Key Tables
| Table | Purpose |
|-------|---------|
| `supervision_logs` | Individual supervision session records |
| `supervision_requirements` | Active compliance targets per supervisee |
| `fieldwork_hours` | BACB fieldwork hour tracking |
| `supervisor_links` | Active supervisor ↔ supervisee relationships |
| `v_supervision_compliance` | Pre-calculated compliance view |
| `v_supervision_log_details` | Logs with joined profile/student names |

### Features to Implement
1. **Compliance Dashboard** — Card per supervisee showing:
   - Name, credential, supervision hours vs target
   - Compliance gauge (percentage circle)
   - Compliant/Non-Compliant badge
   - Direct vs Indirect hour breakdown

2. **Log Supervision** — Form to create `supervision_logs`:
   - Supervisee selector (from `supervisor_links`)
   - Date, start/end time, duration auto-calc
   - Type: direct | indirect | group
   - Activities multi-select (see `SUPERVISION_ACTIVITIES`)
   - Optional student link, notes

3. **Approval Workflow** — List pending logs, approve/reject with notes

4. **Fieldwork Tracker** — Log and view fieldwork hours:
   - Hours type: supervised | independent
   - Experience type: unrestricted | restricted | concentrated
   - BACB task list items checklist

### Query Pattern (via novaCore cross-project client)
```typescript
// Fetch compliance data for current supervisor
const { data } = await novaCore
  .from('v_supervision_compliance')
  .select('*')
  .eq('supervisor_user_id', userId);

// Fetch supervision logs with details
const { data: logs } = await novaCore
  .from('v_supervision_log_details')
  .select('*')
  .eq('supervisor_user_id', userId)
  .order('supervision_date', { ascending: false });

// Log new supervision
const { error } = await novaCore
  .from('supervision_logs')
  .insert({
    supervisor_user_id: userId,
    supervisee_user_id: selectedSupervisee,
    supervision_type: 'direct',
    supervision_date: date,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: calculatedDuration,
    activities: selectedActivities,
    notes: notes,
    status: 'pending'
  });
```

---

## 2. Supervisor Mode (Full Data Sync)

### Purpose
Provide supervisors with a read/write view of student behavioral data that syncs with Nova Track core. This includes:
- Student overview (goals, behaviors, session summaries)
- Data entry for behaviors and session data
- Supervision logs and compliance tracking

### Data Access
Uses the same `check-user-access` edge function to resolve:
- `user_id` → authorized `student_ids`
- Role-based access (supervisor sees all assigned clients)

### Synced Data Tables
| Table | Access |
|-------|--------|
| `students` | Read (profile, demographics) |
| `session_data` | Read + Write (behavior counts, trials) |
| `sessions` | Read + Write (start/end sessions) |
| `supervision_logs` | Read + Write |
| `fieldwork_hours` | Read + Write |
| `staff_messages` / `teacher_messages` | Read + Write (messaging) |
| `clinical_targets` | Read (goals, programs) |
| `abc_logs` | Read + Write |

### Navigation
Add "Supervisor Mode" as a bottom tab or section within Student Connect that provides:
1. **Caseload Overview** — All assigned students with quick stats
2. **Student Detail** — Tap into a student for full data view
3. **Supervision** — Compliance dashboard + log entry
4. **Messages** — Cross-app messaging (see messaging spec below)

---

## 3. Cross-App Messaging

### Purpose
Enable two-way threaded messaging between Student Connect users (supervisors/BCBAs) and Teacher Hub users.

### Architecture
Both apps read/write to the SAME tables:
- `staff_messages` — Messages from BCBAs/supervisors
- `teacher_messages` — Messages from teachers (with `is_reviewed`, `is_completed` flags)

### Key Fields
- `app_source` — Identifies origin app (`student_connect`, `teacher_hub`, `nova_track`)
- `sender_id` / `recipient_id` — User IDs resolved via `check-user-access`
- `student_id` — Scopes conversation to a specific student
- `parent_message_id` — Threading support
- `thread_id` — Groups related messages

### Realtime
Both tables have been added to `supabase_realtime` publication. Subscribe:
```typescript
const channel = novaCore
  .channel('messages')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'staff_messages',
    filter: `recipient_id=eq.${userId}`
  }, handleNewMessage)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'teacher_messages',
    filter: `recipient_id=eq.${userId}`
  }, handleNewMessage)
  .subscribe();
```

### Send Message
```typescript
await novaCore.from('staff_messages').insert({
  sender_id: userId,
  recipient_id: teacherUserId,
  student_id: studentId,
  content: messageText,
  subject: subject,
  message_type: 'message',
  app_source: 'student_connect',
  agency_id: agencyId
});
```

---

## Copy-Paste Prompt for Student Connect

```
Add a Supervision page to Student Connect with these features:
1. Compliance Dashboard using the `v_supervision_compliance` view from the shared backend - show cards per supervisee with compliance gauge, hours breakdown (direct/indirect), and compliant/non-compliant badges
2. Log Supervision form - supervisee selector from `supervisor_links`, date/time, type (direct/indirect/group), activities multi-select, notes
3. Approval list for pending supervision logs with approve/reject actions
4. Fieldwork hour tracker with hours type, experience type, and BACB task list items
5. Add a "Supervisor Mode" section that syncs with Nova Track data - show assigned students with their behavioral data, session summaries, and clinical targets using the novaCore cross-project client
6. Add cross-app messaging using `staff_messages` and `teacher_messages` tables with realtime subscriptions - support threading via `parent_message_id` and `thread_id`, and mark `app_source` as 'student_connect'

Use the existing `check-user-access` edge function pattern and novaCore client for all data access. Reference the integration spec at docs/student-connect-supervision-spec.md in the Nova Track project.
```
