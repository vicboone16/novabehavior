import { useState, useEffect } from 'react';
import { Bug, RefreshCw, Send, Smartphone, Bell, Clock, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushTokenRegistration } from '@/hooks/usePushTokenRegistration';
import { useReminderSchedules } from '@/hooks/useReminderSchedules';
import { useToast } from '@/hooks/use-toast';

export function AdminDebugPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { debug, checkPermission, requestPermission, refreshPushToken, syncToken } = usePushTokenRegistration();
  const { schedules, overrides, reload } = useReminderSchedules();
  const [pushTokens, setPushTokens] = useState<any[]>([]);
  const [pendingReminders, setPendingReminders] = useState(0);
  const [scheduleSource, setScheduleSource] = useState('loading...');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkPermission();
    loadDebugData();
  }, [user]);

  const loadDebugData = async () => {
    if (!user) return;
    // Load push tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('user_id', user.id);
    setPushTokens(tokens || []);

    // Count pending reminders (overrides that are active)
    const { count } = await supabase
      .from('user_reminder_overrides')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);
    setPendingReminders(count || 0);

    // Determine schedule source
    const userSchedules = schedules.filter(s => s.scope_type === 'user' && s.owner_user_id === user.id);
    if (userSchedules.length > 0) {
      setScheduleSource('User-scoped (custom)');
    } else if (schedules.some(s => s.scope_type === 'platform')) {
      setScheduleSource('Platform defaults');
    } else {
      setScheduleSource('None configured');
    }
  };

  useEffect(() => {
    if (schedules.length) loadDebugData();
  }, [schedules]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await Promise.all([reload(), loadDebugData(), checkPermission()]);
    const token = await refreshPushToken();
    if (token) await syncToken(token);
    setRefreshing(false);
    toast({ title: 'Debug data refreshed' });
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    toast({ title: `Permission: ${result}` });
  };

  const handleRefreshToken = async () => {
    const token = await refreshPushToken();
    if (token) {
      const synced = await syncToken(token);
      toast({ title: synced ? 'Token synced' : 'Token sync failed' });
    } else {
      toast({ title: 'No push token available', variant: 'destructive' });
    }
  };

  const handleTestNotification = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: { test: true }
      });
      toast({ title: error ? 'Test failed' : 'Test notification sent' });
    } catch {
      toast({ title: 'Test notification failed', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bug className="h-4 w-4" /> Admin Debug
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={handleRefreshAll} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Push Token */}
        <div>
          <div className="flex items-center gap-1 font-medium mb-1">
            <Smartphone className="h-3 w-3" /> Push Token
          </div>
          <div className="bg-muted rounded p-2 space-y-1 font-mono">
            <div>Permission: <Badge variant="outline" className="text-[10px]">{debug.permissionStatus}</Badge></div>
            <div>Token: {debug.currentToken ? `${debug.currentToken.slice(0, 40)}…` : 'None'}</div>
            <div>Sync: <Badge variant={debug.syncStatus === 'success' ? 'default' : 'outline'} className="text-[10px]">{debug.syncStatus}</Badge></div>
            {debug.lastSyncTime && <div>Last sync: {new Date(debug.lastSyncTime).toLocaleString()}</div>}
            <div>Platform: {debug.platform} · Env: {debug.appEnvironment}</div>
            <div>TZ: {debug.deviceTimezone}</div>
            <div>User: {debug.userId?.slice(0, 8) || 'none'}…</div>
            {debug.error && <div className="text-destructive">Error: {debug.error}</div>}
          </div>
          <div className="text-muted-foreground mt-1">
            DB tokens: {pushTokens.length} active
          </div>
        </div>

        <Separator />

        {/* Pending Reminders */}
        <div>
          <div className="flex items-center gap-1 font-medium mb-1">
            <Bell className="h-3 w-3" /> Pending Reminders
          </div>
          <div className="bg-muted rounded p-2">
            <div>Active overrides: {pendingReminders}</div>
            <div>Total schedules: {schedules.length}</div>
          </div>
        </div>

        <Separator />

        {/* Schedule Source */}
        <div>
          <div className="flex items-center gap-1 font-medium mb-1">
            <Clock className="h-3 w-3" /> Effective Schedule Source
          </div>
          <Badge variant="secondary">{scheduleSource}</Badge>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="font-medium flex items-center gap-1">
            <Database className="h-3 w-3" /> Actions
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleRequestPermission}>
              Request Permission
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleRefreshToken}>
              Refresh Token
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => syncToken(debug.currentToken || 'test-token')}>
              Re-sync Token
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleTestNotification}>
              <Send className="h-3 w-3 mr-1" /> Test Push
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8 col-span-2" onClick={handleRefreshAll}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
