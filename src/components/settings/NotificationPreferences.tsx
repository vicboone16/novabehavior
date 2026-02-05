import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, Loader2, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  saveSubscriptionToDatabase,
  removeSubscriptionFromDatabase,
  updatePushPreferences,
  togglePushEnabled,
} from '@/lib/pushNotifications';

interface PushPreferences {
  session_reminders: boolean;
  supervision_alerts: boolean;
  questionnaire_responses: boolean;
  approval_requests: boolean;
  note_comments: boolean;
}

const DEFAULT_PREFERENCES: PushPreferences = {
  session_reminders: true,
  supervision_alerts: true,
  questionnaire_responses: true,
  approval_requests: true,
  note_comments: true,
};

const PREFERENCE_LABELS: Record<keyof PushPreferences, { label: string; description: string }> = {
  session_reminders: {
    label: 'Session Reminders',
    description: 'Get notified before scheduled sessions',
  },
  supervision_alerts: {
    label: 'Supervision Alerts',
    description: 'Compliance warnings and supervision updates',
  },
  questionnaire_responses: {
    label: 'Questionnaire Responses',
    description: 'When respondents complete questionnaires',
  },
  approval_requests: {
    label: 'Approval Requests',
    description: 'Notes and documents pending your approval',
  },
  note_comments: {
    label: 'Note Comments',
    description: 'When someone comments on your notes',
  },
};

export function NotificationPreferences() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [preferences, setPreferences] = useState<PushPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    const init = async () => {
      setSupported(isPushSupported());
      setPermission(getNotificationPermission());
      
      const subscription = await getCurrentSubscription();
      setIsSubscribed(!!subscription);

      // Load user preferences from database
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('push_enabled, push_preferences')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setPushEnabled(data.push_enabled ?? true);
          if (data.push_preferences) {
            setPreferences({ ...DEFAULT_PREFERENCES, ...data.push_preferences as Partial<PushPreferences> });
          }
        }
      }

      setLoading(false);
    };

    init();
  }, [user]);

  const handleEnablePush = async () => {
    setSubscribing(true);
    try {
      // Request permission first
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.error('Notification permission denied. Please enable in browser settings.');
        return;
      }

      // Get VAPID key from environment or use a placeholder
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error('Push notifications not configured. Contact administrator.');
        return;
      }

      const subscription = await subscribeToPush(vapidKey);
      if (subscription) {
        await saveSubscriptionToDatabase(subscription);
        setIsSubscribed(true);
        await togglePushEnabled(true);
        setPushEnabled(true);
        toast.success('Push notifications enabled!');
      }
    } catch (error) {
      console.error('Failed to enable push:', error);
      toast.error('Failed to enable push notifications');
    } finally {
      setSubscribing(false);
    }
  };

  const handleDisablePush = async () => {
    setSubscribing(true);
    try {
      await unsubscribeFromPush();
      await removeSubscriptionFromDatabase();
      await togglePushEnabled(false);
      setIsSubscribed(false);
      setPushEnabled(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Failed to disable push:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setSubscribing(false);
    }
  };

  const handlePreferenceChange = async (key: keyof PushPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    const success = await updatePushPreferences(newPreferences);
    if (!success) {
      // Revert on failure
      setPreferences(preferences);
      toast.error('Failed to update preference');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in this browser. 
            Try using Chrome, Firefox, or Edge for push notification support.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive real-time alerts even when the app is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status & Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isSubscribed ? 'bg-primary/10' : 'bg-muted'}`}>
              {isSubscribed ? (
                <CheckCircle className="h-5 w-5 text-primary" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {isSubscribed ? 'Notifications Enabled' : 'Notifications Disabled'}
              </p>
              <p className="text-sm text-muted-foreground">
                {permission === 'denied' 
                  ? 'Permission blocked in browser settings'
                  : isSubscribed 
                    ? 'You will receive push notifications' 
                    : 'Enable to receive alerts'}
              </p>
            </div>
          </div>
          <Button
            variant={isSubscribed ? 'outline' : 'default'}
            onClick={isSubscribed ? handleDisablePush : handleEnablePush}
            disabled={subscribing || permission === 'denied'}
          >
            {subscribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              'Disable'
            ) : (
              'Enable'
            )}
          </Button>
        </div>

        {permission === 'denied' && (
          <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            Notifications are blocked. Please enable them in your browser settings and refresh the page.
          </div>
        )}

        {isSubscribed && (
          <>
            <Separator />

            {/* Notification Categories */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Notification Types</h4>
              
              {(Object.keys(PREFERENCE_LABELS) as Array<keyof PushPreferences>).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={key} className="font-normal">
                      {PREFERENCE_LABELS[key].label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {PREFERENCE_LABELS[key].description}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={preferences[key]}
                    onCheckedChange={(checked) => handlePreferenceChange(key, checked)}
                  />
                </div>
              ))}
            </div>

            <Separator />

            {/* Device Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>Subscribed on this device</span>
              <Badge variant="secondary" className="text-xs">Active</Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
