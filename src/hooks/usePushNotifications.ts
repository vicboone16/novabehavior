import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  checkPushSupport,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
  type PushNotificationStatus
} from '@/lib/pushNotifications';
import { useToast } from '@/hooks/use-toast';

export interface PushPreferences {
  session_reminders: boolean;
  supervision_alerts: boolean;
  questionnaire_responses: boolean;
  approval_requests: boolean;
  schedule_changes: boolean;
}

const DEFAULT_PREFERENCES: PushPreferences = {
  session_reminders: true,
  supervision_alerts: true,
  questionnaire_responses: true,
  approval_requests: true,
  schedule_changes: true
};

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<PushNotificationStatus>({
    supported: false,
    permission: 'unsupported',
    subscribed: false,
    vapidConfigured: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [preferences, setPreferences] = useState<PushPreferences>(DEFAULT_PREFERENCES);

  // Load current status and preferences
  useEffect(() => {
    const loadStatus = async () => {
      const pushStatus = await checkPushSupport();
      setStatus(pushStatus);
    };

    loadStatus();
  }, []);

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('push_enabled, push_preferences')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setPushEnabled(data.push_enabled ?? true);
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...(data.push_preferences as Partial<PushPreferences> || {})
        });
      }
    };

    loadPreferences();
  }, [user]);

  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to enable notifications',
        variant: 'destructive'
      });
      return false;
    }

    if (!status.vapidConfigured) {
      toast({
        title: 'Push notifications not configured',
        description: 'VAPID keys need to be set up by the administrator',
        variant: 'destructive'
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission
      const permission = await requestNotificationPermission();
      
      if (permission !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please allow notifications in your browser settings',
          variant: 'destructive'
        });
        setStatus(prev => ({ ...prev, permission }));
        return false;
      }

      // Subscribe
      const subscription = await subscribeToPush(user.id);
      
      if (!subscription) {
        throw new Error('Failed to subscribe to push notifications');
      }

      // Update profile
      await supabase
        .from('profiles')
        .update({ push_enabled: true })
        .eq('user_id', user.id);

      setStatus(prev => ({ ...prev, permission: 'granted', subscribed: true }));
      setPushEnabled(true);

      toast({
        title: 'Notifications enabled',
        description: 'You will now receive push notifications'
      });

      return true;
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      toast({
        title: 'Failed to enable notifications',
        description: 'Please try again later',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, status.vapidConfigured, toast]);

  const disablePushNotifications = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);

    try {
      await unsubscribeFromPush(user.id);

      await supabase
        .from('profiles')
        .update({ push_enabled: false })
        .eq('user_id', user.id);

      setStatus(prev => ({ ...prev, subscribed: false }));
      setPushEnabled(false);

      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive push notifications'
      });

      return true;
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      toast({
        title: 'Failed to disable notifications',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const updatePreferences = useCallback(async (newPreferences: Partial<PushPreferences>): Promise<boolean> => {
    if (!user) return false;

    const updatedPreferences = { ...preferences, ...newPreferences };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_preferences: updatedPreferences })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(updatedPreferences);
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Failed to update preferences',
        variant: 'destructive'
      });
      return false;
    }
  }, [user, preferences, toast]);

  const testNotification = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const success = await sendTestNotification();
      
      if (success) {
        toast({
          title: 'Test notification sent',
          description: 'Check your notifications'
        });
      } else {
        toast({
          title: 'Failed to send test',
          variant: 'destructive'
        });
      }
      
      return success;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    status,
    isLoading,
    pushEnabled,
    preferences,
    enablePushNotifications,
    disablePushNotifications,
    updatePreferences,
    testNotification
  };
}
