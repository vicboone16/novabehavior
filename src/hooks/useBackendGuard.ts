/**
 * Backend Guard: validates app_handshake and SUPABASE_URL on startup.
 * Blocks the UI until the handshake passes.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const EXPECTED_APP_SLUG = 'novatrack';

// Allowlist of valid backend URLs for this app
const ALLOWED_URL_PATTERNS = [
  'yboqqmkghwhlhhnsegje.supabase.co',
];

interface BackendGuardDiagnostic {
  step: string;
  table?: string;
  query?: string;
  rpc?: string;
  code?: string;
  message: string;
}

export interface BackendGuardState {
  status: 'checking' | 'ok' | 'wrong_backend' | 'url_mismatch' | 'error';
  appSlug: string | null;
  environmentName: string | null;
  maskedUrl: string;
  lastPingAt: string | null;
  errorMessage: string | null;
  diagnostic: BackendGuardDiagnostic | null;
  retry: () => void;
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
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
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<BackendGuardState, 'retry'>>({
    status: 'checking',
    appSlug: null,
    environmentName: null,
    maskedUrl: maskUrl(import.meta.env.VITE_SUPABASE_URL || ''),
    lastPingAt: null,
    errorMessage: null,
    diagnostic: null,
  });

  const retry = useCallback(() => setAttempt(prev => prev + 1), []);

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const masked = maskUrl(supabaseUrl);

      if (!isMounted) return;
      setState(prev => ({
        ...prev,
        status: 'checking',
        maskedUrl: masked,
        errorMessage: null,
        diagnostic: null,
      }));

      // Step 1: URL allowlist check
      if (!isUrlAllowed(supabaseUrl)) {
        if (!isMounted) return;
        setState({
          status: 'url_mismatch',
          appSlug: null,
          environmentName: null,
          maskedUrl: masked,
          lastPingAt: null,
          errorMessage: 'Backend URL does not match the NovaTrack allowlist.',
          diagnostic: {
            step: 'URL Allowlist Check',
            message: 'Configured backend URL is not in the approved allowlist for this app.',
          },
        });
        return;
      }

      // Step 2: Query app_handshake with timeout + retries (mobile networks can be slow)
      const TIMEOUT_MS = 20000;
      const MAX_ATTEMPTS = 3;
      let data: any = null;
      let error: any = null;
      let lastErrMessage = '';
      try {
        for (let i = 1; i <= MAX_ATTEMPTS; i++) {
          console.log(`[BackendGuard] Step 2: querying app_handshake (id=1) attempt ${i}/${MAX_ATTEMPTS}`);
          try {
            const handshakePromise = supabase
              .from('app_handshake' as any)
              .select('app_slug, environment_name, updated_at')
              .eq('id', 1)
              .maybeSingle() as any;

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Handshake query timeout after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)
            );

            const result = (await Promise.race([handshakePromise, timeoutPromise])) as any;
            data = result?.data;
            error = result?.error;
            if (!error) break;
            lastErrMessage = error.message;
          } catch (e: any) {
            lastErrMessage = e?.message ?? 'Unknown error';
            if (i === MAX_ATTEMPTS) throw e;
            await new Promise(r => setTimeout(r, 800 * i));
          }
        }
        const pingAt = new Date().toISOString();

        if (error) {
          if (!isMounted) return;
          setState({
            status: 'error',
            appSlug: null,
            environmentName: null,
            maskedUrl: masked,
            lastPingAt: pingAt,
            errorMessage: `Handshake query failed: ${error.message}`,
            diagnostic: {
              step: 'Handshake Query',
              table: 'app_handshake',
              query: `select app_slug, environment_name, updated_at where id = 1`,
              code: error.code,
              message: error.message,
            },
          });
          return;
        }

        if (!data || data.app_slug !== EXPECTED_APP_SLUG) {
          if (!isMounted) return;
          setState({
            status: 'wrong_backend',
            appSlug: data?.app_slug ?? null,
            environmentName: data?.environment_name ?? null,
            maskedUrl: masked,
            lastPingAt: pingAt,
            errorMessage: `Expected app_slug "${EXPECTED_APP_SLUG}" but got "${data?.app_slug ?? 'null'}".`,
            diagnostic: {
              step: 'Handshake Validation',
              table: 'app_handshake',
              query: `expected app_slug = ${EXPECTED_APP_SLUG}, received = ${data?.app_slug ?? 'null'}`,
              message: 'Connected backend handshake does not match expected application.',
            },
          });
          return;
        }

        if (!isMounted) return;
        setState({
          status: 'ok',
          appSlug: data.app_slug,
          environmentName: data.environment_name,
          maskedUrl: masked,
          lastPingAt: pingAt,
          errorMessage: null,
          diagnostic: null,
        });
      } catch (err: any) {
        if (!isMounted) return;
        const pingAt = new Date().toISOString();
        const message = err?.message ?? 'Unknown error during handshake';

        setState({
          status: 'error',
          appSlug: null,
          environmentName: null,
          maskedUrl: masked,
          lastPingAt: pingAt,
          errorMessage: message,
          diagnostic: {
            step: 'Handshake Query',
            table: 'app_handshake',
            query: `select app_slug, environment_name, updated_at where id = 1`,
            message,
          },
        });
      }
    };

    check();

    return () => {
      isMounted = false;
    };
  }, [attempt]);

  return { ...state, retry };
}

