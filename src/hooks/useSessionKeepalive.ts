import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';

/**
 * Proactively refreshes the auth token every 10 minutes while a live
 * observation session is running, preventing mid-assessment logouts.
 * Also refreshes on user interaction (mouse/keyboard) if the token
 * is older than 8 minutes.
 */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 min
const ACTIVITY_REFRESH_THRESHOLD_MS = 8 * 60 * 1000; // 8 min

export function useSessionKeepalive() {
  const sessionStartTime = useDataStore((s) => s.sessionStartTime);
  const lastRefreshRef = useRef<number>(Date.now());

  // Periodic refresh while session is active
  useEffect(() => {
    if (!sessionStartTime) return;

    const refresh = async () => {
      try {
        const { error } = await supabase.auth.refreshSession();
        if (!error) {
          lastRefreshRef.current = Date.now();
          console.log('[Keepalive] Token refreshed');
        } else {
          console.warn('[Keepalive] Token refresh failed:', error.message);
        }
      } catch (e) {
        console.warn('[Keepalive] Refresh error:', e);
      }
    };

    // Refresh immediately when session starts
    refresh();

    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Activity-based refresh (mouse/keyboard while session is active)
  useEffect(() => {
    if (!sessionStartTime) return;

    const onActivity = () => {
      const elapsed = Date.now() - lastRefreshRef.current;
      if (elapsed > ACTIVITY_REFRESH_THRESHOLD_MS) {
        supabase.auth.refreshSession().then(({ error }) => {
          if (!error) {
            lastRefreshRef.current = Date.now();
          }
        });
      }
    };

    // Throttle: only listen every 30s
    let throttleTimer: NodeJS.Timeout | null = null;
    const throttled = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        onActivity();
      }, 30_000);
    };

    window.addEventListener('mousemove', throttled, { passive: true });
    window.addEventListener('keydown', throttled, { passive: true });
    window.addEventListener('touchstart', throttled, { passive: true });

    return () => {
      window.removeEventListener('mousemove', throttled);
      window.removeEventListener('keydown', throttled);
      window.removeEventListener('touchstart', throttled);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [sessionStartTime]);
}
