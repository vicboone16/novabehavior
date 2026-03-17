import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ReminderSchedule {
  id: string;
  scope_type: string;
  owner_user_id: string | null;
  name: string;
  reminder_key: string;
  reminder_type: string;
  timezone: string;
  is_active: boolean;
  allow_user_override: boolean;
  local_enabled: boolean;
  remote_enabled: boolean;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  interval_minutes: number;
  grace_period_minutes: number | null;
  message_title: string | null;
  message_body: string | null;
  app_environment: string;
  created_at: string;
}

export interface ReminderOverride {
  id: string;
  user_id: string;
  default_schedule_id: string;
  override_enabled: boolean;
  notifications_enabled: boolean;
  custom_name: string | null;
  custom_interval_minutes: number | null;
  custom_start_time: string | null;
  custom_end_time: string | null;
  custom_days_of_week: number[] | null;
  local_enabled: boolean | null;
  remote_enabled: boolean | null;
  is_active: boolean;
}

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function formatDays(days: number[]): string {
  if (!days?.length) return 'None';
  if (days.length === 7) return 'Every day';
  if (JSON.stringify([...days].sort()) === JSON.stringify([1,2,3,4,5])) return 'Weekdays';
  return days.map(d => DAY_LABELS[d] || `D${d}`).join(', ');
}

export function computeNextFireTime(schedule: ReminderSchedule): string {
  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon..7=Sun
  const [startH, startM] = (schedule.start_time || '08:00:00').split(':').map(Number);
  const [endH, endM] = (schedule.end_time || '17:00:00').split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const days = schedule.days_of_week || [];
  if (!days.length) return 'No active days';

  // Check if today is active and we're within window
  if (days.includes(currentDay) && nowMinutes >= startMinutes && nowMinutes < endMinutes) {
    if (schedule.interval_minutes > 0) {
      const elapsed = nowMinutes - startMinutes;
      const nextInterval = Math.ceil(elapsed / schedule.interval_minutes) * schedule.interval_minutes;
      const nextMin = startMinutes + nextInterval;
      if (nextMin < endMinutes) {
        const h = Math.floor(nextMin / 60);
        const m = nextMin % 60;
        return `Today ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
      }
    }
    return 'Next active day';
  }

  // Check if today is active and we haven't started yet
  if (days.includes(currentDay) && nowMinutes < startMinutes) {
    return `Today ${schedule.start_time?.slice(0,5)}`;
  }

  // Find next active day
  for (let offset = 1; offset <= 7; offset++) {
    const checkDay = ((currentDay - 1 + offset) % 7) + 1;
    if (days.includes(checkDay)) {
      return `${DAY_LABELS[checkDay]} ${schedule.start_time?.slice(0,5)}`;
    }
  }
  return 'No upcoming';
}

export function useReminderSchedules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ReminderSchedule[]>([]);
  const [overrides, setOverrides] = useState<ReminderOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSchedules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [schedRes, overRes] = await Promise.all([
        supabase
          .from('default_reminder_schedules')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('user_reminder_overrides')
          .select('*')
          .eq('user_id', user.id)
      ]);

      if (schedRes.data) setSchedules(schedRes.data as unknown as ReminderSchedule[]);
      if (overRes.data) setOverrides(overRes.data as unknown as ReminderOverride[]);
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const getOverride = useCallback((scheduleId: string) => {
    return overrides.find(o => o.default_schedule_id === scheduleId) || null;
  }, [overrides]);

  const upsertOverride = useCallback(async (scheduleId: string, values: Partial<ReminderOverride>) => {
    if (!user) return false;
    try {
      const existing = getOverride(scheduleId);
      if (existing) {
        const { error } = await supabase
          .from('user_reminder_overrides')
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_reminder_overrides')
          .insert({
            user_id: user.id,
            default_schedule_id: scheduleId,
            override_enabled: true,
            notifications_enabled: true,
            is_active: true,
            ...values
          });
        if (error) throw error;
      }
      await loadSchedules();
      toast({ title: 'Override saved' });
      return true;
    } catch (err) {
      console.error('Error saving override:', err);
      toast({ title: 'Failed to save override', variant: 'destructive' });
      return false;
    }
  }, [user, getOverride, loadSchedules, toast]);

  const createUserSchedule = useCallback(async (values: {
    name: string;
    reminder_key: string;
    reminder_type: string;
    start_time: string;
    end_time: string;
    days_of_week: number[];
    interval_minutes: number;
    message_title: string;
    message_body: string;
  }) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('default_reminder_schedules')
        .insert({
          scope_type: 'user',
          owner_user_id: user.id,
          role_scope: 'teacher',
          is_active: true,
          allow_user_override: true,
          local_enabled: true,
          remote_enabled: false,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          app_environment: 'beta',
          created_by: user.id,
          ...values
        });
      if (error) throw error;
      await loadSchedules();
      toast({ title: 'Custom schedule created' });
      return true;
    } catch (err) {
      console.error('Error creating schedule:', err);
      toast({ title: 'Failed to create schedule', variant: 'destructive' });
      return false;
    }
  }, [user, loadSchedules, toast]);

  return {
    schedules,
    overrides,
    loading,
    getOverride,
    upsertOverride,
    createUserSchedule,
    reload: loadSchedules
  };
}
