# Student Connect — PIN Auth & Integration Spec

> **Source project slug:** `novatrack`  
> **Target project slug:** `student_connect`  
> **Shared backend project ID:** `yboqqmkghwhlhhnsegje`

---

## Overview

Student Connect shares the same auth backend as Nova Track. The 6-digit PIN login system, app access gating, and all database objects already exist. This spec covers everything needed to wire them into the Student Connect frontend.

---

## 1. App Handshake

The `app_handshake` table now has all 4 apps:

| id  | app_slug        | environment_name |
| --- | --------------- | ---------------- |
| 1   | novatrack       | PROD             |
| 2   | student_connect | PROD             |
| 3   | behaviordecoded | PROD             |
| 4   | teacherhub      | PROD             |

### Backend Guard Config for Student Connect:

```typescript
// src/hooks/useBackendGuard.ts
const EXPECTED_APP_SLUG = 'student_connect';

const ALLOWED_URL_PATTERNS = [
  'yboqqmkghwhlhhnsegje.supabase.co',
];

// Query: .eq('id', 2)
```

---

## 2. Database Objects (Already Exist — No Migrations Needed)

### PIN Auth Tables & Functions

- **`profiles`** — stores `pin_hash`, `is_approved`, `email`, `user_id`
- **`pin_attempts`** — rate-limiting log
- **`verify_pin(_user_id uuid, _pin text)`** → `boolean` — SHA-256 hash comparison
- **`check_pin_rate_limit(_email text, _ip_address text)`** → `boolean` — 5 failures in 5 min lockout
- **`record_pin_attempt(_user_id uuid, _email text, _ip_address text, _success boolean)`** → void

### App Access Gating

- **`user_app_access`** — controls which apps each user can access
  - Columns: `id`, `user_id`, `app_slug`, `agency_id`, `role`, `is_active`, `granted_by`, `granted_at`, `updated_at`
  - Unique constraint: `(user_id, app_slug)`
- **`has_app_access(_user_id uuid, _app_slug text, _agency_id uuid DEFAULT NULL)`** → `boolean`

### Student Visibility

- **`student_app_visibility`** — controls which students appear in which apps
  - Filter by `app_slug = 'student_connect'` and `is_active = true`

### Edge Function

- **`pin-auth`** — already deployed, `verify_jwt = false`

---

## 3. PIN Auth Edge Function API

**Endpoint:** `POST /functions/v1/pin-auth`  
**JWT:** Not required

### Request Body

```json
{
  "email": "user@example.com",   // optional — omit for PIN-only lookup
  "pin": "123456"                // required — exactly 6 digits
}
```

### Response (Success — 200)

```json
{
  "access_token": "eyJ...",
  "refresh_token": "abc...",
  "expires_in": 3600,
  "token_type": "bearer",
  "user": { "id": "...", "email": "..." }
}
```

### Error Responses

| Status | Body                                                              | Meaning                            |
| ------ | ----------------------------------------------------------------- | ---------------------------------- |
| 400    | `{ "error": "PIN is required" }`                                  | Missing PIN                        |
| 400    | `{ "error": "Invalid PIN format" }`                               | Not 6 digits                       |
| 400    | `{ "error": "PIN not set for this user" }`                        | User has no PIN configured         |
| 401    | `{ "error": "Invalid PIN" }`                                      | Wrong PIN                          |
| 403    | `{ "error": "Account pending approval", "pending": true }`        | Not yet approved                   |
| 404    | `{ "error": "User not found" }`                                   | No matching profile                |
| 409    | `{ "error": "PIN is not unique..." }`                             | PIN-only lookup matched >1 user    |
| 429    | `{ "error": "Too many failed attempts...", "rateLimited": true }` | Rate limited (5 failures in 5 min) |
| 500    | `{ "error": "..." }`                                              | Server error                       |

---

## 4. Frontend Implementation

### 4a. PIN Login Hook

```typescript
// src/hooks/usePinLogin.ts
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PinLoginResult {
  success: boolean;
  error?: string;
  pending?: boolean;
  rateLimited?: boolean;
}

export function usePinLogin() {
  const [loading, setLoading] = useState(false);

  const loginWithPin = async (
    pin: string,
    email?: string
  ): Promise<PinLoginResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pin-auth', {
        body: { pin, email: email || undefined },
      });

      if (error) {
        const body = typeof error === 'object' ? error : { message: error };
        return {
          success: false,
          error: (body as any).message || 'Login failed',
        };
      }

      if (data?.error) {
        return {
          success: false,
          error: data.error,
          pending: data.pending,
          rateLimited: data.rateLimited,
        };
      }

      if (data?.access_token && data?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        return { success: true };
      }

      return { success: false, error: 'No session returned' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  return { loginWithPin, loading };
}
```

### 4b. PIN Login Component

```tsx
// src/components/PinLogin.tsx
import { useState } from 'react';
import { usePinLogin } from '@/hooks/usePinLogin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PinLoginProps {
  onSuccess: () => void;
  onSwitchToEmail?: () => void;
}

export function PinLogin({ onSuccess, onSwitchToEmail }: PinLoginProps) {
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const { loginWithPin, loading } = usePinLogin();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(pin)) {
      toast({ title: 'Invalid PIN', description: 'Enter a 6-digit PIN', variant: 'destructive' });
      return;
    }

    const result = await loginWithPin(pin, email || undefined);

    if (result.success) {
      onSuccess();
      return;
    }

    if (result.pending) {
      toast({ title: 'Pending Approval', description: 'Your account is awaiting admin approval.' });
      return;
    }

    if (result.rateLimited) {
      toast({
        title: 'Too Many Attempts',
        description: 'Please wait a few minutes and try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Login Failed', description: result.error, variant: 'destructive' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email (optional)
        </label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to log in with PIN only
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="pin" className="text-sm font-medium">
          6-Digit PIN
        </label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading || pin.length !== 6}>
        {loading ? 'Signing in...' : 'Sign In with PIN'}
      </Button>

      {onSwitchToEmail && (
        <Button type="button" variant="ghost" className="w-full" onClick={onSwitchToEmail}>
          Use email & password instead
        </Button>
      )}
    </form>
  );
}
```

### 4c. App Access Gating

```typescript
// Check access on login
const { data } = await supabase.rpc('has_app_access', {
  _user_id: user.id,
  _app_slug: 'student_connect',
});


}
```

### 4d. Student Filtering

```typescript
// Load only students visible in Student Connect
const { data: students } = await supabase
  .from('student_app_visibility')
  .select('student_id, students(*)')
  .eq('app_slug', 'student_connect')
  .eq('is_active', true);
```

### 4e. Session Handling

After `supabase.auth.setSession()`, token refresh is automatic. Use the standard listener:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Navigate to dashboard
  }
  if (event === 'SIGNED_OUT') {
    // Navigate to login
  }
});
```

---

## 5. Config.toml

The `pin-auth` function is already configured with `verify_jwt = false`. No changes needed — all apps share the same edge functions.

---

## 6. SQL Reference (Already Applied — For Documentation Only)

### `verify_pin` function

```sql
CREATE OR REPLACE FUNCTION public.verify_pin(_user_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT pin_hash INTO stored_hash
  FROM public.profiles
  WHERE user_id = _user_id;

  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN stored_hash = encode(digest(_pin, 'sha256'), 'hex');
END;
$$;
```

### `check_pin_rate_limit` function

```sql
CREATE OR REPLACE FUNCTION public.check_pin_rate_limit(
  _email text,
  _ip_address text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_failures int;
BEGIN
  SELECT count(*) INTO recent_failures
  FROM public.pin_attempts
  WHERE (email = _email OR ip_address = _ip_address)
    AND success = false
    AND attempted_at > now() - interval '5 minutes';

  RETURN recent_failures < 5;
END;
$$;
```

### `record_pin_attempt` function

```sql
CREATE OR REPLACE FUNCTION public.record_pin_attempt(
  _user_id uuid,
  _email text,
  _ip_address text,
  _success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pin_attempts (user_id, email, ip_address, success, attempted_at)
  VALUES (_user_id, _email, _ip_address, _success, now());
END;
$$;
```

### `pin_attempts` table

```sql
CREATE TABLE IF NOT EXISTS public.pin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  ip_address text,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_attempts ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policies — only accessed via SECURITY DEFINER functions
```

### `has_app_access` function

```sql
CREATE OR REPLACE FUNCTION public.has_app_access(
  _user_id uuid,
  _app_slug text,
  _agency_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_app_access
    WHERE user_id = _user_id
      AND app_slug = _app_slug
      AND is_active = true
      AND (agency_id = _agency_id OR _agency_id IS NULL)
  );
$$;
```

---

## 7. App Summary

| App              | Slug            | id  | PIN Login | Auth Method      |
| ---------------- | --------------- | --- | --------- | ---------------- |
| Nova Track       | novatrack       | 1   | ✅ Yes    | Email + PIN      |
| Student Connect  | student_connect | 2   | ✅ Yes    | Email + PIN      |
| Behavior Decoded | behaviordecoded | 3   | ❌ No     | Email + Password |
| Teacher Hub      | teacherhub      | 4   | ❌ No     | Email + Password |

---

## 8. Schema Cache Refresh

After any schema changes in NovaTrack, run this in Student Connect to pick up new objects:

```sql
NOTIFY pgrst, 'reload schema';
```

Or run a no-op migration.

---

## 9. Checklist

- [ ] Copy `usePinLogin` hook
- [ ] Copy `PinLogin` component (restyle to match Student Connect theme)
- [ ] Add PIN login option to auth/login page
- [ ] Add `AppAccessGate` wrapper checking `has_app_access(uid, 'student_connect')`
- [ ] Update `useBackendGuard` with `app_slug = 'student_connect'` and `id = 2`
- [ ] Filter students via `student_app_visibility` where `app_slug = 'student_connect'`
- [ ] Run schema cache refresh (`NOTIFY pgrst, 'reload schema'`)
- [ ] Test: valid PIN → session created
- [ ] Test: wrong PIN → error toast
- [ ] Test: 5+ failures → rate limit message
- [ ] Test: unapproved account → pending message
- [ ] Test: PIN-only login (no email) → works if PIN is unique
- [ ] Test: user without Student Connect access → "Access Not Configured" screen

---

## 10. Prompt to Paste into Student Connect

> The NovaTrack core project has updated the shared backend. Here's what changed:
>
> 1. **App Handshake:** Your app slug is `student_connect` (id=2 in `app_handshake`). Update `useBackendGuard.ts`:
>    - Change `EXPECTED_APP_SLUG` to `'student_connect'`
>    - Change the query from `.eq('id', 1)` to `.eq('id', 2)`
>    - Keep `ALLOWED_URL_PATTERNS` pointing to `yboqqmkghwhlhhnsegje.supabase.co`
> 2. **PIN Login:** The `pin-auth` edge function is already deployed. Copy the `usePinLogin` hook and `PinLogin` component from the spec. Add PIN login as an option on your auth page.
> 3. **App Access Gating:** Use `has_app_access(auth.uid(), 'student_connect')` to gate access on login. Show an "Access Not Configured" screen if denied.
> 4. **Student Filtering:** Use `student_app_visibility` table filtered by `app_slug = 'student_connect'` to load visible students.
> 5. **Schema refresh:** Run `NOTIFY pgrst, 'reload schema';` or a no-op migration so the API layer picks up the shared tables and functions.
