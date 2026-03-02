# Behavior Decoded — Integration Spec (From NovaTrack Core)

> **Generated from:** NovaTrack (core project, slug `novatrack`)  
> **Target app slug:** `behaviordecoded`  
> **Shared backend project ID:** `yboqqmkghwhlhhnsegje`

---

## ⚠️ CRITICAL: App Slug Update

Behavior Decoded's `useBackendGuard` must query for its **own** slug, not `novatrack`.

The `app_handshake` table now has all 4 apps registered:

| id | app_slug         | environment_name |
|----|------------------|-----------------|
| 1  | novatrack        | PROD            |
| 2  | student_connect  | PROD            |
| 3  | behaviordecoded  | PROD            |
| 4  | teacherhub       | PROD            |

### What to change in Behavior Decoded's `useBackendGuard.ts`:

```typescript
// BEFORE (wrong — checking for novatrack)
const EXPECTED_APP_SLUG = 'novatrack';
// query: .eq('id', 1)

// AFTER (correct)
const EXPECTED_APP_SLUG = 'behaviordecoded';
// query: .eq('id', 3)
```

The `ALLOWED_URL_PATTERNS` stays the same since all apps share the same backend:
```typescript
const ALLOWED_URL_PATTERNS = [
  'yboqqmkghwhlhhnsegje.supabase.co',
];
```

---

## 1. Existing Database Objects (Already Created — No Migrations Needed)

### `user_app_access` table
Already exists with this schema:

| Column      | Type       | Nullable | Notes                          |
|-------------|------------|----------|--------------------------------|
| id          | uuid       | NO       | PK, auto-generated             |
| user_id     | uuid       | NO       | FK → auth.users(id)            |
| app_slug    | text       | NO       | e.g. 'behaviordecoded'         |
| agency_id   | uuid       | YES      | Optional agency scope           |
| role        | text       | NO       | Default 'user'                  |
| is_active   | boolean    | NO       | Default true                    |
| granted_by  | uuid       | YES      | Who granted access              |
| granted_at  | timestamptz| NO       | When access was granted         |
| updated_at  | timestamptz| NO       | Auto-updated                    |

**Unique constraint:** `(user_id, app_slug)`

### `has_app_access()` function
Already exists as a `SECURITY DEFINER` function:

```sql
-- Signature:
has_app_access(_user_id uuid, _app_slug text, _agency_id uuid DEFAULT NULL)
RETURNS boolean

-- Usage examples:
SELECT has_app_access(auth.uid(), 'behaviordecoded');           -- any agency
SELECT has_app_access(auth.uid(), 'behaviordecoded', 'abc-123'); -- specific agency
```

### RLS Policies (already applied)
- **"Users can view own app access"** — users can SELECT their own rows
- **"Admins can manage app access"** — admins/owners can do everything

---

## 2. Frontend Gating Pattern

### On login / app load, check access:

```typescript
import { supabase } from '@/integrations/supabase/client';

async function checkAppAccess(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc('has_app_access', {
    _user_id: user.id,
    _app_slug: 'behaviordecoded',
  });

  return data === true;
}
```

### Show "Access Not Configured" screen if denied:

```tsx
function AppAccessGate({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<'checking' | 'granted' | 'denied'>('checking');

  useEffect(() => {
    checkAppAccess().then(ok => setAccess(ok ? 'granted' : 'denied'));
  }, []);

  if (access === 'checking') return <LoadingSpinner />;
  if (access === 'denied') return <AccessDeniedScreen />;
  return <>{children}</>;
}
```

---

## 3. Filtering Students by App Scope

The `student_app_visibility` table controls which students are visible in which apps:

```typescript
// Load only students visible in Behavior Decoded
const { data: students } = await supabase
  .from('student_app_visibility')
  .select('student_id, students(*)')
  .eq('app_slug', 'behaviordecoded')
  .eq('is_active', true);
```

Alternatively, filter `user_student_access` by `app_scope`:

```typescript
const { data } = await supabase
  .from('user_student_access')
  .select('student_id, students(*)')
  .eq('app_scope', 'behaviordecoded');
```

---

## 4. Role from `user_app_access`

Each user's role for Behavior Decoded is stored in `user_app_access.role`:

```typescript
const { data } = await supabase
  .from('user_app_access')
  .select('role, is_active')
  .eq('user_id', user.id)
  .eq('app_slug', 'behaviordecoded')
  .single();

// data.role → 'parent', 'caregiver', 'collaborator', etc.
```

---

## 5. Schema Cache Refresh

After any schema changes in NovaTrack (new tables, functions, views), each connected app project needs a PostgREST cache refresh. The easiest way:

```sql
NOTIFY pgrst, 'reload schema';
```

Or run a no-op migration in the target project. This ensures the frontend API layer recognizes new database objects.

---

## 6. Authentication

Behavior Decoded uses **standard email/password login** (NOT PIN). The same `auth.users` table is shared, so:

- Changing a password on any app changes it everywhere
- Email changes propagate to all apps
- No PIN login for Behavior Decoded — that's Nova Track and Student Connect only

---

## 7. App Handshake Summary

| App              | Slug              | id | PIN Login | Auth Method        |
|------------------|-------------------|----|-----------|-------------------|
| Nova Track       | novatrack         | 1  | ✅ Yes    | Email + PIN        |
| Student Connect  | student_connect   | 2  | ✅ Yes    | Email + PIN        |
| Behavior Decoded | behaviordecoded   | 3  | ❌ No     | Email + Password   |
| Teacher Hub      | teacherhub        | 4  | ❌ No     | Email + Password   |

---

## 8. Prompt to Paste into Behavior Decoded

Copy and paste this into the Behavior Decoded project chat:

---

**Paste this into Behavior Decoded:**

> The NovaTrack core project has updated the shared backend. Here's what changed:
>
> 1. **App Handshake:** Your app slug is `behaviordecoded` (id=3 in `app_handshake`). Update `useBackendGuard.ts`:
>    - Change `EXPECTED_APP_SLUG` to `'behaviordecoded'`
>    - Change the query from `.eq('id', 1)` to `.eq('id', 3)`
>    - Keep `ALLOWED_URL_PATTERNS` pointing to `yboqqmkghwhlhhnsegje.supabase.co`
>
> 2. **App Access Gating:** The `user_app_access` table and `has_app_access(_user_id, _app_slug)` function already exist. Use `has_app_access(auth.uid(), 'behaviordecoded')` to gate access on login.
>
> 3. **Student Filtering:** Use `student_app_visibility` table filtered by `app_slug = 'behaviordecoded'` to load visible students.
>
> 4. **No PIN login** — Behavior Decoded uses standard email/password only.
>
> 5. **Schema refresh:** Run `NOTIFY pgrst, 'reload schema';` or a no-op migration so the API layer picks up the `user_app_access` table and `has_app_access` function.
