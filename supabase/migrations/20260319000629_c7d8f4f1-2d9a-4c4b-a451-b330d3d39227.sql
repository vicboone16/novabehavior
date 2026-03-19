
-- Remaining tables with corrected RLS (no sg.agency_id dependency)
-- Tables already created by previous partial migration: student_share_requests, classroom_presence, staff_shift_assignments, substitute_assignments, reinforcement_rules, announcements

-- Check what was created
-- Only create tables that don't exist yet

CREATE TABLE IF NOT EXISTS public.parent_channel_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.student_guardians(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(guardian_id, channel)
);
ALTER TABLE public.parent_channel_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage" ON public.parent_channel_preferences FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.parent_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.student_guardians(id) ON DELETE CASCADE,
  user_id uuid,
  portal_type text NOT NULL DEFAULT 'basic',
  active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  agency_id uuid REFERENCES public.agencies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_portal_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own portal access" ON public.parent_portal_access FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Agency members manage portal" ON public.parent_portal_access FOR ALL TO authenticated USING (
  agency_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agency_memberships am WHERE am.user_id = auth.uid() AND am.agency_id = parent_portal_access.agency_id)
);

CREATE TABLE IF NOT EXISTS public.parent_reply_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.student_guardians(id) ON DELETE CASCADE,
  reply_mode text NOT NULL DEFAULT 'teacher_only',
  active boolean NOT NULL DEFAULT true,
  agency_id uuid REFERENCES public.agencies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(guardian_id)
);
ALTER TABLE public.parent_reply_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage" ON public.parent_reply_permissions FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.parent_report_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.parent_report_profiles(id) ON DELETE CASCADE,
  guardian_id uuid REFERENCES public.student_guardians(id),
  student_id uuid,
  override_key text NOT NULL,
  override_value jsonb NOT NULL,
  reason text,
  created_by uuid NOT NULL,
  agency_id uuid REFERENCES public.agencies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_report_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members" ON public.parent_report_overrides FOR ALL TO authenticated USING (
  agency_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agency_memberships am WHERE am.user_id = auth.uid() AND am.agency_id = parent_report_overrides.agency_id)
);

CREATE TABLE IF NOT EXISTS public.parent_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.parent_notifications(id),
  guardian_id uuid REFERENCES public.student_guardians(id),
  student_id uuid NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  error_message text,
  agency_id uuid REFERENCES public.agencies(id)
);
ALTER TABLE public.parent_notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members" ON public.parent_notification_logs FOR ALL TO authenticated USING (
  agency_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agency_memberships am WHERE am.user_id = auth.uid() AND am.agency_id = parent_notification_logs.agency_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_notif_logs_student ON public.parent_notification_logs(student_id, sent_at DESC);

-- Seed 5 parent report profile presets (idempotent)
INSERT INTO public.parent_report_profiles (name, scope_type, scope_id, cadence, delivery_mode, detail_level, tone, active) VALUES
  ('Positive Daily Snapshot', 'preset', '00000000-0000-0000-0000-000000000001', 'daily', 'secure_link', 'minimal', 'celebratory', true),
  ('Standard Daily Summary', 'preset', '00000000-0000-0000-0000-000000000002', 'daily', 'email', 'standard', 'neutral', true),
  ('Weekly Progress Report', 'preset', '00000000-0000-0000-0000-000000000003', 'weekly', 'email', 'standard', 'teacher_friendly', true),
  ('Detailed Clinical Weekly', 'preset', '00000000-0000-0000-0000-000000000004', 'weekly', 'email', 'detailed', 'clinical', true),
  ('Minimal Parent Alert', 'preset', '00000000-0000-0000-0000-000000000005', 'daily', 'sms', 'minimal', 'celebratory', true)
ON CONFLICT DO NOTHING;
