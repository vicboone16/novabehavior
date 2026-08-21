import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const cache = new Map<string, SupabaseClient<Database>>();

/**
 * Returns a Supabase client that presents a share/access token via the
 * `x-form-token` header. Row-level security policies for public
 * token-gated tables (forms, consents, delivery links, observation
 * requests) require this header to match the row's token, so no row can
 * be read or updated without holding the exact token.
 */
export function getTokenClient(token: string): SupabaseClient<Database> {
  const cached = cache.get(token);
  if (cached) return cached;

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-form-token': token } },
  });
  cache.set(token, client);
  return client;
}
