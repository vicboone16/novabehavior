# Student Connect — PIN Auth Integration Spec

> **Source project slug:** `novatrack`  
> **Target project slug:** `studentconnect` _(adjust as needed)_  
> **Shared backend:** Same Lovable Cloud / Supabase instance (`yboqqmkghwhlhhnsegje`)

---

## Overview

Student Connect shares the same auth backend as Nova Track. The 6-digit PIN login system already exists in the database. This spec covers everything needed to wire it into the Student Connect frontend.

---

## 1. Database Objects (Already Exist — No New Migrations Needed)

These were created for Nova Track and are shared:

### Tables
- **`profiles`** — stores `pin_hash`, `is_approved`, `email`, `user_id`
- **`pin_attempts`** — rate-limiting log

### Functions
- **`verify_pin(_user_id uuid, _pin text)`** → `boolean` — compares bcrypt hash
- **`check_pin_rate_limit(_email text, _ip_address text)`** → `boolean` — returns `true` if allowed, `false` if locked out (5 failures in 5 min)
- **`record_pin_attempt(_user_id uuid, _email text, _ip_address text, _success boolean)`** → void

### Edge Function
- **`pin-auth`** — already deployed, handles the full PIN → session flow

---

## 2. Edge Function Details (`supabase/functions/pin-auth/index.ts`)

**Endpoint:** `POST /functions/v1/pin-auth`  
**JWT:** Not required (`verify_jwt = false`)

### Request Body
```json
{
  "email": "user@example.com",   // optional — if omitted, PIN-only lookup
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
| Status | Body | Meaning |
|--------|------|---------|
| 400 | `{ "error": "PIN is required" }` | Missing PIN |
| 400 | `{ "error": "Invalid PIN format" }` | Not 6 digits |
| 400 | `{ "error": "PIN not set for this user" }` | User has no PIN |
| 401 | `{ "error": "Invalid PIN" }` | Wrong PIN |
| 403 | `{ "error": "Account pending approval", "pending": true }` | Not yet approved |
| 404 | `{ "error": "User not found" }` | No matching profile |
| 409 | `{ "error": "PIN is not unique..." }` | PIN-only lookup hit >1 user |
| 429 | `{ "error": "Too many failed attempts...", "rateLimited": true }` | Rate limited |
| 500 | `{ "error": "..." }` | Server error |

---

## 3. Frontend Implementation

### 3a. PIN Login Hook

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
        // Edge function HTTP errors come through here
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

      // Set the session in Supabase client
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

### 3b. PIN Login Component

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
      toast({ title: 'Too Many Attempts', description: 'Please wait a few minutes and try again.', variant: 'destructive' });
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

### 3c. Session Handling After PIN Login

After `supabase.auth.setSession()`, the Supabase client automatically manages token refresh. Use the standard auth listener:

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

## 4. Backend Guard for Student Connect

Update the backend guard in the Student Connect project:

```typescript
// src/hooks/useBackendGuard.ts
const EXPECTED_APP_SLUG = 'studentconnect'; // ← change this

const ALLOWED_URL_PATTERNS = [
  'yboqqmkghwhlhhnsegje.supabase.co', // same backend
];
```

Then add a row to `app_handshake` for Student Connect:

```sql
INSERT INTO public.app_handshake (id, app_slug, environment_name)
VALUES (2, 'studentconnect', 'production')
ON CONFLICT (id) DO NOTHING;
```

> **Note:** The backend guard query uses `.eq('id', 1)` — Student Connect should use `.eq('id', 2)` or query by `app_slug` instead.

---

## 5. Config.toml (Already Set)

The `pin-auth` function is already configured with `verify_jwt = false`. No changes needed — all apps share the same Supabase project and edge functions.

---

## 6. SQL Reference (Already Applied — For Documentation Only)

These migrations were already run on the shared backend. Listed here for reference if you ever need to recreate:

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

  RETURN stored_hash = encode(
    digest(_pin, 'sha256'), 'hex'
  );
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

---

## 7. Checklist for Student Connect Integration

- [ ] Copy `usePinLogin` hook
- [ ] Copy `PinLogin` component (adjust styling to match Student Connect theme)
- [ ] Add PIN login option to the auth/login page
- [ ] Update `useBackendGuard` with `app_slug = 'studentconnect'` and `id = 2`
- [ ] Insert `app_handshake` row for Student Connect
- [ ] Test: valid PIN → session created
- [ ] Test: wrong PIN → error toast
- [ ] Test: 5+ failures → rate limit message
- [ ] Test: unapproved account → pending message
- [ ] Test: PIN-only login (no email) → works if PIN is unique
