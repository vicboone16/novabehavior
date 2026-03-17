import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nova-ai-chat`;

/**
 * Get a fresh access token, refreshing the session if needed.
 * Returns null if the user must re-authenticate.
 */
async function getAccessToken(): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (session?.access_token) {
    // Check if token expires within 60s — proactively refresh
    const expiresAt = session.expires_at ?? 0;
    const nowSec = Math.floor(Date.now() / 1000);
    if (expiresAt - nowSec < 60) {
      console.log('[NovaAI] Token expiring soon, refreshing…');
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !refreshed.session?.access_token) {
        console.warn('[NovaAI] Session refresh failed:', refreshErr?.message);
        return null;
      }
      return refreshed.session.access_token;
    }
    return session.access_token;
  }

  if (error) {
    console.warn('[NovaAI] getSession error:', error.message);
  }

  // No session — try refresh as last resort
  console.log('[NovaAI] No active session, attempting refresh…');
  const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr || !refreshed.session?.access_token) {
    console.warn('[NovaAI] Refresh failed:', refreshErr?.message);
    return null;
  }
  return refreshed.session.access_token;
}

export interface NovaAIFetchOptions {
  body: Record<string, unknown>;
  signal?: AbortSignal;
}

/**
 * Authenticated fetch to the nova-ai-chat edge function.
 * Handles token retrieval, refresh, retry on 401, and user-facing errors.
 * Returns the Response on success, or null if auth failed (toast shown).
 */
export async function novaAIFetch(options: NovaAIFetchOptions): Promise<Response | null> {
  let token = await getAccessToken();
  if (!token) {
    toast.error('Your session expired. Please sign in again.');
    console.error('[NovaAI] Auth failed: no access token available');
    return null;
  }

  const doFetch = (accessToken: string) =>
    fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(options.body),
      signal: options.signal,
    });

  let resp = await doFetch(token);

  // If 401, try one refresh + retry
  if (resp.status === 401) {
    console.log('[NovaAI] Got 401, attempting session refresh + retry…');
    await resp.text(); // consume body
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
    if (refreshErr || !refreshed.session?.access_token) {
      toast.error('Your session expired. Please sign in again.');
      console.error('[NovaAI] Retry auth failed:', refreshErr?.message);
      return null;
    }
    token = refreshed.session.access_token;
    resp = await doFetch(token);
  }

  // Handle non-OK responses
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    if (resp.status === 401) {
      toast.error('Your session expired. Please sign in again.');
      console.error('[NovaAI] Auth failed after retry');
    } else if (resp.status === 429) {
      toast.error('Rate limit exceeded. Please wait and try again.');
    } else if (resp.status === 402) {
      toast.error('AI credits depleted. Add credits in workspace settings.');
    } else {
      toast.error(err.error || 'AI service error');
      console.error('[NovaAI] Edge function error:', resp.status, err);
    }
    return null;
  }

  return resp;
}
