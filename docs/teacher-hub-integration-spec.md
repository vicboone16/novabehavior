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
