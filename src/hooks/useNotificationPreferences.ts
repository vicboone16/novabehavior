import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPrefs {
  id?: string;
  push_enabled: boolean;
  local_reminders_enabled: boolean;
  data_log_reminders: boolean;
  escalation_alerts: boolean;
  session_note_reminders: boolean;
  caregiver_messages: boolean;
  supervision_reminders: boolean;
  admin_alerts: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const DEFAULTS: NotificationPrefs = {
  push_enabled: true,
  local_reminders_enabled: true,
  data_log_reminders: true,
  escalation_alerts: true,
  session_note_reminders: true,
  caregiver_messages: true,
  supervision_reminders: true,
  admin_alerts: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '21:00:00',
  quiet_hours_end: '07:00:00',
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPrefs(data as unknown as NotificationPrefs);
      } else if (!error || error.code === 'PGRST116') {
        // No row yet, create defaults
        const { data: created } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id, ...DEFAULTS })
          .select()
          .single();
        if (created) setPrefs(created as unknown as NotificationPrefs);
      }
    } catch (err) {
      console.error('Error loading notification prefs:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const update = useCallback(async (partial: Partial<NotificationPrefs>) => {
    if (!user) return false;
    setSaving(true);
    try {
      const updated = { ...prefs, ...partial, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from('notification_preferences')
        .update(updated)
        .eq('user_id', user.id);
      if (error) throw error;
      setPrefs(prev => ({ ...prev, ...partial }));
      return true;
    } catch (err) {
      console.error('Error updating prefs:', err);
      toast({ title: 'Failed to save preferences', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, prefs, toast]);

  return { prefs, loading, saving, update, reload: load };
}
