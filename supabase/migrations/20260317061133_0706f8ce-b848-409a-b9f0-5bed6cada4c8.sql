
-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  local_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  data_log_reminders BOOLEAN NOT NULL DEFAULT true,
  escalation_alerts BOOLEAN NOT NULL DEFAULT true,
  session_note_reminders BOOLEAN NOT NULL DEFAULT true,
  caregiver_messages BOOLEAN NOT NULL DEFAULT true,
  supervision_reminders BOOLEAN NOT NULL DEFAULT true,
  admin_alerts BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME DEFAULT '21:00:00',
  quiet_hours_end TIME DEFAULT '07:00:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification prefs"
ON public.notification_preferences FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create default_reminder_schedules table
CREATE TABLE IF NOT EXISTS public.default_reminder_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL DEFAULT 'platform',
  owner_user_id UUID,
  organization_id UUID,
  school_id UUID,
  classroom_id UUID,
  role_scope TEXT,
  name TEXT NOT NULL,
  reminder_key TEXT NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'interval',
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_user_override BOOLEAN NOT NULL DEFAULT true,
  local_enabled BOOLEAN NOT NULL DEFAULT true,
  remote_enabled BOOLEAN NOT NULL DEFAULT false,
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '17:00:00',
  days_of_week INT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  interval_minutes INT NOT NULL DEFAULT 30,
  grace_period_minutes INT DEFAULT 5,
  message_title TEXT,
  message_body TEXT,
  app_environment TEXT NOT NULL DEFAULT 'beta',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.default_reminder_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform schedules"
ON public.default_reminder_schedules FOR SELECT TO authenticated
USING (scope_type = 'platform' OR owner_user_id = auth.uid());

CREATE POLICY "Users manage own schedules"
ON public.default_reminder_schedules FOR INSERT TO authenticated
WITH CHECK (scope_type = 'user' AND owner_user_id = auth.uid());

CREATE POLICY "Users update own schedules"
ON public.default_reminder_schedules FOR UPDATE TO authenticated
USING (scope_type = 'user' AND owner_user_id = auth.uid());

CREATE POLICY "Users delete own schedules"
ON public.default_reminder_schedules FOR DELETE TO authenticated
USING (scope_type = 'user' AND owner_user_id = auth.uid());

-- Create user_reminder_overrides table
CREATE TABLE IF NOT EXISTS public.user_reminder_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  default_schedule_id UUID NOT NULL REFERENCES public.default_reminder_schedules(id) ON DELETE CASCADE,
  override_enabled BOOLEAN NOT NULL DEFAULT false,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  custom_name TEXT,
  custom_timezone TEXT,
  custom_interval_minutes INT,
  custom_start_time TIME,
  custom_end_time TIME,
  custom_days_of_week INT[],
  local_enabled BOOLEAN,
  remote_enabled BOOLEAN,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, default_schedule_id)
);

ALTER TABLE public.user_reminder_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own overrides"
ON public.user_reminder_overrides FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  app_environment TEXT NOT NULL DEFAULT 'beta',
  device_name TEXT,
  timezone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_token, app_environment)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
ON public.push_tokens FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create view for scope ranking (computed scope_rank, no column conflict)
CREATE OR REPLACE VIEW public.default_reminder_scope_rank AS
SELECT
  id, scope_type, owner_user_id, organization_id, school_id, classroom_id,
  role_scope, name, reminder_key, reminder_type, timezone, is_active,
  allow_user_override, local_enabled, remote_enabled, start_time, end_time,
  days_of_week, interval_minutes, grace_period_minutes, message_title,
  message_body, app_environment, created_by, created_at, updated_at,
  CASE scope_type
    WHEN 'user' THEN 1
    WHEN 'classroom' THEN 2
    WHEN 'school' THEN 3
    WHEN 'organization' THEN 4
    WHEN 'platform' THEN 5
    ELSE 100
  END AS scope_rank
FROM public.default_reminder_schedules
WHERE is_active = true;

-- Seed 6 platform-level default schedules
INSERT INTO public.default_reminder_schedules (scope_type, name, reminder_key, reminder_type, timezone, is_active, allow_user_override, local_enabled, remote_enabled, start_time, end_time, days_of_week, interval_minutes, message_title, message_body, app_environment)
VALUES
  ('platform', 'Data Log Reminder', 'data_log_reminder', 'interval', 'America/Los_Angeles', true, true, true, false, '08:00:00', '16:00:00', ARRAY[1,2,3,4,5], 30, 'Time to log data', 'Please log your current session data.', 'beta'),
  ('platform', 'Escalation Alert', 'escalation_alert', 'event', 'America/Los_Angeles', true, true, true, true, '07:00:00', '19:00:00', ARRAY[1,2,3,4,5], 0, 'Escalation Alert', 'A behavior escalation has been flagged.', 'beta'),
  ('platform', 'Session Note Reminder', 'session_note_reminder', 'interval', 'America/Los_Angeles', true, true, true, false, '14:00:00', '18:00:00', ARRAY[1,2,3,4,5], 60, 'Complete your notes', 'You have session notes pending completion.', 'beta'),
  ('platform', 'Caregiver Message Alert', 'caregiver_message', 'event', 'America/Los_Angeles', true, true, true, true, '07:00:00', '21:00:00', ARRAY[1,2,3,4,5,6,7], 0, 'New caregiver message', 'You have a new message from a caregiver.', 'beta'),
  ('platform', 'Supervision Reminder', 'supervision_reminder', 'interval', 'America/Los_Angeles', true, true, true, false, '08:00:00', '17:00:00', ARRAY[1,2,3,4,5], 0, 'Supervision due', 'You have an upcoming supervision session.', 'beta'),
  ('platform', 'Admin Alert', 'admin_alert', 'event', 'America/Los_Angeles', true, false, true, true, '07:00:00', '20:00:00', ARRAY[1,2,3,4,5,6,7], 0, 'Admin notification', 'You have a new admin alert.', 'beta')
ON CONFLICT DO NOTHING;

-- Enable realtime for push_tokens
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_tokens;
