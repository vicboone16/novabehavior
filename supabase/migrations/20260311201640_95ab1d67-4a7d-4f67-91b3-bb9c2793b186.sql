
-- Create helper function first
CREATE OR REPLACE FUNCTION public.is_agency_member(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_memberships
    WHERE user_id = _user_id AND agency_id = _agency_id AND status = 'active'
  )
$$;

-- Routing rules table
CREATE TABLE IF NOT EXISTS public.service_request_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  route_to_role TEXT,
  route_to_user_id UUID,
  auto_priority TEXT,
  notify_user_ids UUID[] DEFAULT '{}',
  notify_roles TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_request_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sr_routing_select" ON public.service_request_routing_rules
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "sr_routing_insert" ON public.service_request_routing_rules
  FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "sr_routing_update" ON public.service_request_routing_rules
  FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid(), agency_id));

-- Notification prefs
CREATE TABLE IF NOT EXISTS public.service_request_notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  notify_on_assignment BOOLEAN NOT NULL DEFAULT true,
  notify_on_urgent BOOLEAN NOT NULL DEFAULT true,
  notify_on_due_soon BOOLEAN NOT NULL DEFAULT true,
  notify_on_overdue BOOLEAN NOT NULL DEFAULT true,
  notify_on_status_change BOOLEAN NOT NULL DEFAULT true,
  notify_on_escalation BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, agency_id)
);

ALTER TABLE public.service_request_notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_notif_prefs_all" ON public.service_request_notification_prefs
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Live programs table
CREATE TABLE IF NOT EXISTS public.live_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.program_templates(id) ON DELETE SET NULL,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  classroom_id UUID,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  domain TEXT,
  custom_baseline JSONB DEFAULT '{}',
  objectives JSONB DEFAULT '[]',
  mastery_criteria JSONB DEFAULT '{}',
  prompt_guidance TEXT DEFAULT '',
  reinforcement_guidance TEXT DEFAULT '',
  implementation_notes TEXT DEFAULT '',
  client_notes TEXT DEFAULT '',
  linked_replacement_behaviors JSONB DEFAULT '[]',
  linked_interventions JSONB DEFAULT '[]',
  progress_status TEXT NOT NULL DEFAULT 'not_started',
  data_collection_recommendations TEXT DEFAULT '',
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_select" ON public.live_programs FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));
CREATE POLICY "lp_insert" ON public.live_programs FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(auth.uid(), agency_id) AND assigned_by = auth.uid());
CREATE POLICY "lp_update" ON public.live_programs FOR UPDATE TO authenticated
  USING (public.is_agency_member(auth.uid(), agency_id));

-- Add missing columns to program_templates
ALTER TABLE public.program_templates
  ADD COLUMN IF NOT EXISTS goals_objectives JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS suggested_strategies JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';

-- Add missing columns to service_requests
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_reason TEXT,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sr_routing_agency ON public.service_request_routing_rules(agency_id);
CREATE INDEX IF NOT EXISTS idx_live_programs_agency ON public.live_programs(agency_id);
CREATE INDEX IF NOT EXISTS idx_live_programs_student ON public.live_programs(student_id);
CREATE INDEX IF NOT EXISTS idx_live_programs_template ON public.live_programs(template_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('service-request-files', 'service-request-files', false)
ON CONFLICT (id) DO NOTHING;
