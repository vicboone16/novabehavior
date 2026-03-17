import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PushTokenDebug {
  permissionStatus: string;
  currentToken: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'failed';
  lastSyncTime: string | null;
  appEnvironment: string;
  deviceTimezone: string;
  userId: string | null;
  platform: string;
  error: string | null;
}

export function usePushTokenRegistration() {
  const { user } = useAuth();
  const [debug, setDebug] = useState<PushTokenDebug>({
    permissionStatus: 'not_checked',
    currentToken: null,
    syncStatus: 'idle',
    lastSyncTime: null,
    appEnvironment: 'beta',
    deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userId: null,
    platform: 'web',
    error: null,
  });

  const checkPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setDebug(prev => ({ ...prev, permissionStatus: 'unsupported' }));
      return 'unsupported';
    }
    const perm = Notification.permission;
    setDebug(prev => ({ ...prev, permissionStatus: perm, userId: user?.id || null }));
    return perm;
  }, [user]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';
    const perm = await Notification.requestPermission();
    setDebug(prev => ({ ...prev, permissionStatus: perm }));
    return perm;
  }, []);

  const syncToken = useCallback(async (token: string) => {
    if (!user) {
      setDebug(prev => ({ ...prev, error: 'Not authenticated', syncStatus: 'failed' }));
      return false;
    }
    setDebug(prev => ({ ...prev, syncStatus: 'syncing', currentToken: token }));
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const deviceName = /iPhone|iPad/.test(navigator.userAgent) ? 'iOS Device' :
                         /Android/.test(navigator.userAgent) ? 'Android Device' :
                         /Mac/.test(navigator.userAgent) ? 'Mac' :
                         /Windows/.test(navigator.userAgent) ? 'Windows PC' : 'Web Browser';

      // Try upsert: insert, on conflict update
      const { error: insertErr } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          device_token: token,
          platform: /iPhone|iPad/.test(navigator.userAgent) ? 'ios' : 'web',
          app_environment: 'beta',
          device_name: deviceName,
          timezone: tz,
          is_active: true,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'device_token,app_environment' });

      if (insertErr) throw insertErr;

      setDebug(prev => ({
        ...prev,
        syncStatus: 'success',
        lastSyncTime: new Date().toISOString(),
        error: null,
        platform: /iPhone|iPad/.test(navigator.userAgent) ? 'ios' : 'web',
        deviceTimezone: tz,
      }));
      return true;
    } catch (err: any) {
      setDebug(prev => ({
        ...prev,
        syncStatus: 'failed',
        error: err?.message || 'Unknown error',
      }));
      return false;
    }
  }, [user]);

  const refreshPushToken = useCallback(async () => {
    // For web push, re-check service worker subscription
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setDebug(prev => ({ ...prev, error: 'Push not supported in this browser' }));
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (!reg?.pushManager) {
        setDebug(prev => ({ ...prev, error: 'No push manager found', currentToken: null }));
        return null;
      }
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const token = JSON.stringify(sub.toJSON());
        setDebug(prev => ({ ...prev, currentToken: token }));
        return token;
      }
      setDebug(prev => ({ ...prev, currentToken: null, error: 'No active subscription' }));
      return null;
    } catch (err: any) {
      setDebug(prev => ({ ...prev, error: err?.message }));
      return null;
    }
  }, []);

  return {
    debug,
    checkPermission,
    requestPermission,
    syncToken,
    refreshPushToken,
  };
}
