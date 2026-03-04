# Teacher Hub — Integration Spec (From NovaTrack Core)

> **Generated from:** NovaTrack (core project, slug `novatrack`)  
> **Target app slug:** `teacherhub`  
> **Shared backend project ID:** `yboqqmkghwhlhhnsegje`

---

## App Handshake

| id | app_slug         | environment_name |
|----|------------------|-----------------|
| 4  | teacherhub       | PROD            |

### Backend Guard Config:

```typescript
const EXPECTED_APP_SLUG = 'teacherhub';
// Query: .eq('id', 4)

const ALLOWED_URL_PATTERNS = [
  'yboqqmkghwhlhhnsegje.supabase.co',
];
```

---

## Authentication

**Email + Password only** — no PIN login for Teacher Hub.

---

## App Access Gating

```typescript
const { data } = await supabase.rpc('has_app_access', {
  _user_id: user.id,
  _app_slug: 'teacherhub',
});
```

---

## Student Filtering

```typescript
const { data } = await supabase
  .from('student_app_visibility')
  .select('student_id, students(*)')
  .eq('app_slug', 'teacherhub')
  .eq('is_active', true);
```

---

## App Summary

| App              | Slug              | id | PIN Login | Auth Method        |
|------------------|-------------------|----|-----------|-------------------|
| Nova Track       | novatrack         | 1  | ✅ Yes    | Email + PIN        |
| Student Connect  | student_connect   | 2  | ✅ Yes    | Email + PIN        |
| Behavior Decoded | behaviordecoded   | 3  | ❌ No     | Email + Password   |
| Teacher Hub      | teacherhub        | 4  | ❌ No     | Email + Password   |

---

## Prompt to Paste into Teacher Hub

> The NovaTrack core project has updated the shared backend. Here's what changed:
>
> 1. **App Handshake:** Your app slug is `teacherhub` (id=4 in `app_handshake`). Update `useBackendGuard.ts`:
>    - Change `EXPECTED_APP_SLUG` to `'teacherhub'`
>    - Change the query from `.eq('id', 1)` to `.eq('id', 4)`
>    - Keep `ALLOWED_URL_PATTERNS` pointing to `yboqqmkghwhlhhnsegje.supabase.co`
>
> 2. **App Access Gating:** Use `has_app_access(auth.uid(), 'teacherhub')` to gate access on login.
>
> 3. **Student Filtering:** Use `student_app_visibility` filtered by `app_slug = 'teacherhub'`.
>
> 4. **No PIN login** — Teacher Hub uses standard email/password only.
>
> 5. **Schema refresh:** Run `NOTIFY pgrst, 'reload schema';` or a no-op migration.
>
> ---
>
> ## Cross-App Messaging Tables (NEW)
>
> ### `teacher_messages`
> Two-way threaded messaging between BCBAs and teachers, scoped per student.
>
> | Column | Type | Notes |
> |--------|------|-------|
> | id | UUID PK | |
> | student_id | UUID FK→students | Required |
> | agency_id | UUID FK→agencies | Optional |
> | sender_id | UUID | Auth user who sent |
> | recipient_id | UUID | Auth user who receives |
> | thread_id | UUID | Group messages into threads |
> | message_type | TEXT | `message`, `task_assignment`, `data_share`, `pdf_share`, `summary` |
> | subject | TEXT | Optional subject line |
> | content | TEXT | Message body |
> | metadata | JSONB | Attachments, references, etc. |
> | is_read | BOOLEAN | Recipient has read |
> | is_reviewed | BOOLEAN | Teacher marked reviewed |
> | is_completed | BOOLEAN | Teacher marked completed |
> | parent_message_id | UUID FK→self | For threaded replies |
> | app_source | TEXT | `teacherhub` or `novatrack` |
> | created_at | TIMESTAMPTZ | |
>
> **RLS:** sender or recipient can read; sender can insert; recipient can update (read/reviewed/completed); admins can view all.
>
> **Realtime:** Enabled — subscribe to `teacher_messages` for live updates.
>
> ### `teacher_message_attachments`
> Linked to `teacher_messages.id`. Supports `file`, `pdf_report`, `data_snapshot`, `assessment_result`.
>
> ### `pending_student_changes`
> When a teacher edits a Core-owned student field, create a pending record:
>
> ```typescript
> await supabase.from('pending_student_changes').insert({
>   student_id: studentId,
>   agency_id: agencyId,
>   submitted_by: user.id,
>   field_changes: {
>     grade: { from: "3rd", to: "4th", label: "Grade" },
>     school_name: { from: "Oak Elementary", to: "Pine Elementary", label: "School" }
>   }
> });
> ```
>
> BCBAs see these on the student Profile tab and can approve (auto-applies) or reject with a note. Teachers get notified either way.
>
> ### Usage from Teacher Hub
>
> **Send a message to BCBA:**
> ```typescript
> await supabase.from('teacher_messages').insert({
>   student_id: studentId,
>   sender_id: user.id,
>   recipient_id: bcbaUserId, // from student owner or agency admin
>   message_type: 'message',
>   content: 'Student showed great progress today!',
>   app_source: 'teacherhub',
> });
> ```
>
> **Listen for new messages (realtime):**
> ```typescript
> supabase.channel('teacher-inbox')
>   .on('postgres_changes', {
>     event: 'INSERT',
>     schema: 'public',
>     table: 'teacher_messages',
>     filter: `recipient_id=eq.${user.id}`,
>   }, (payload) => { /* new message */ })
>   .subscribe();
> ```
