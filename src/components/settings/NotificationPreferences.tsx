import { Bell, BellOff, Send, Smartphone, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationPreferences() {
  const {
    status,
    isLoading,
    pushEnabled,
    preferences,
    enablePushNotifications,
    disablePushNotifications,
    updatePreferences,
    testNotification
  } = usePushNotifications();

  const handleTogglePush = async () => {
    if (status.subscribed && pushEnabled) {
      await disablePushNotifications();
    } else {
      await enablePushNotifications();
    }
  };

  const handlePreferenceChange = (key: keyof typeof preferences, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  if (!status.supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your browser doesn't support push notifications. Try using Chrome, Firefox, or Edge on desktop, or Chrome on Android.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!status.vapidConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications need to be configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications require VAPID keys to be configured. Please contact your administrator.
            </AlertDescription>
          </Alert>
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
          Receive notifications even when you're not using the app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Push */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="text-base">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified on this device
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.subscribed && pushEnabled && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                <Check className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
            <Switch
              checked={status.subscribed && pushEnabled}
              onCheckedChange={handleTogglePush}
              disabled={isLoading}
            />
          </div>
        </div>

        {status.permission === 'denied' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notifications are blocked. Please enable them in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        {/* Notification Types */}
        {status.subscribed && pushEnabled && (
          <>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Notification Types</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Reminders</Label>
                    <p className="text-xs text-muted-foreground">
                      Upcoming session notifications
                    </p>
                  </div>
                  <Switch
                    checked={preferences.session_reminders}
                    onCheckedChange={(v) => handlePreferenceChange('session_reminders', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Supervision Alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      Supervision expiring or missing
                    </p>
                  </div>
                  <Switch
                    checked={preferences.supervision_alerts}
                    onCheckedChange={(v) => handlePreferenceChange('supervision_alerts', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Questionnaire Responses</Label>
                    <p className="text-xs text-muted-foreground">
                      When forms are completed
                    </p>
                  </div>
                  <Switch
                    checked={preferences.questionnaire_responses}
                    onCheckedChange={(v) => handlePreferenceChange('questionnaire_responses', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Approval Requests</Label>
                    <p className="text-xs text-muted-foreground">
                      Notes pending approval
                    </p>
                  </div>
                  <Switch
                    checked={preferences.approval_requests}
                    onCheckedChange={(v) => handlePreferenceChange('approval_requests', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Schedule Changes</Label>
                    <p className="text-xs text-muted-foreground">
                      Appointment updates and cancellations
                    </p>
                  </div>
                  <Switch
                    checked={preferences.schedule_changes}
                    onCheckedChange={(v) => handlePreferenceChange('schedule_changes', v)}
                  />
                </div>
              </div>
            </div>

            {/* Test Button */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                onClick={testNotification}
                disabled={isLoading}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test Notification
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
