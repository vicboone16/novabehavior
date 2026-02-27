/**
 * Backend Guard: validates app_handshake and SUPABASE_URL on startup.
 * Blocks the UI until the handshake passes.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const EXPECTED_APP_SLUG = 'novatrack';

// Allowlist of valid Supabase URLs for NovaTrack
const ALLOWED_URL_PATTERNS = [
  'yboqqmkghwhlhhnsegje.supabase.co',
];

export interface BackendGuardState {
  status: 'checking' | 'ok' | 'wrong_backend' | 'url_mismatch' | 'error';
  appSlug: string | null;
  environmentName: string | null;
  maskedUrl: string;
  lastPingAt: string | null;
  errorMessage: string | null;
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
    // Show first 6 and last 6 chars of hostname
    if (host.length > 14) {
      return `${u.protocol}//${host.slice(0, 6)}***${host.slice(-6)}`;
    }
    return `${u.protocol}//${host}`;
  } catch {
    return '***masked***';
  }
}

function isUrlAllowed(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_URL_PATTERNS.some(pattern => hostname.includes(pattern));
  } catch {
    return false;
  }
}

export function useBackendGuard(): BackendGuardState {
  const [state, setState] = useState<BackendGuardState>({
    status: 'checking',
    appSlug: null,
    environmentName: null,
    maskedUrl: maskUrl(import.meta.env.VITE_SUPABASE_URL || ''),
    lastPingAt: null,
    errorMessage: null,
  });

  useEffect(() => {
    const check = async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const masked = maskUrl(supabaseUrl);

      // Step 1: URL allowlist check
      if (!isUrlAllowed(supabaseUrl)) {
        setState({
          status: 'url_mismatch',
          appSlug: null,
          environmentName: null,
          maskedUrl: masked,
          lastPingAt: null,
          errorMessage: `Backend URL does not match the NovaTrack allowlist.`,
        });
        return;
      }

      // Step 2: Query app_handshake
      try {
        const { data, error } = await (supabase
          .from('app_handshake' as any)
          .select('app_slug, environment_name, updated_at')
          .eq('id', 1)
          .maybeSingle() as any);

        const pingAt = new Date().toISOString();

        if (error) {
          setState({
            status: 'error',
            appSlug: null,
            environmentName: null,
            maskedUrl: masked,
            lastPingAt: pingAt,
            errorMessage: `Handshake query failed: ${error.message}`,
          });
          return;
        }

        if (!data || data.app_slug !== EXPECTED_APP_SLUG) {
          setState({
            status: 'wrong_backend',
            appSlug: data?.app_slug ?? null,
            environmentName: data?.environment_name ?? null,
            maskedUrl: masked,
            lastPingAt: pingAt,
            errorMessage: `Expected app_slug "${EXPECTED_APP_SLUG}" but got "${data?.app_slug ?? 'null'}".`,
          });
          return;
        }

        setState({
          status: 'ok',
          appSlug: data.app_slug,
          environmentName: data.environment_name,
          maskedUrl: masked,
          lastPingAt: pingAt,
          errorMessage: null,
        });
      } catch (err: any) {
        setState({
          status: 'error',
          appSlug: null,
          environmentName: null,
          maskedUrl: masked,
          lastPingAt: new Date().toISOString(),
          errorMessage: err?.message ?? 'Unknown error during handshake',
        });
      }
    };

    check();
  }, []);

  return state;
}
