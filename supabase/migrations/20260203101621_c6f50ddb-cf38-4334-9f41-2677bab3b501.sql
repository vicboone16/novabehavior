-- =============================================
-- COVERAGE VERIFICATION ENGINE
-- =============================================

-- 1. Organization Coverage Settings
CREATE TABLE IF NOT EXISTS public.org_coverage_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coverage_mode TEXT NOT NULL DEFAULT 'SCHOOL_LIGHT' CHECK (coverage_mode IN ('INSURANCE_STRICT', 'SCHOOL_LIGHT', 'HYBRID')),
  default_verification_cadence_days INTEGER DEFAULT 30,
  auto_create_tasks_on_intake BOOLEAN DEFAULT true,
  auto_create_tasks_on_auth_renewal BOOLEAN DEFAULT true,
  auto_create_tasks_on_code_change BOOLEAN DEFAULT true,
  auto_create_tasks_on_plan_renewal BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default org settings
INSERT INTO public.org_coverage_settings (id, coverage_mode) 
VALUES ('00000000-0000-0000-0000-000000000001', 'SCHOOL_LIGHT')
ON CONFLICT DO NOTHING;

-- 2. Client Coverage Mode Override
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS coverage_mode_override TEXT CHECK (coverage_mode_override IN ('INSURANCE_STRICT', 'SCHOOL_LIGHT', 'HYBRID', NULL));

-- 3. Payer Plans (Insurance mode)
CREATE TABLE IF NOT EXISTS public.payer_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payer_name TEXT NOT NULL,
  plan_name TEXT,
  member_id TEXT,
  group_number TEXT,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  plan_renewal_date DATE,
  is_primary BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  notes_visibility TEXT DEFAULT 'internal_only',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Coverage Rules - Insurance Strict Mode
CREATE TABLE IF NOT EXISTS public.coverage_rules_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payer_plan_id UUID REFERENCES public.payer_plans(id) ON DELETE SET NULL,
  cpt_code TEXT NOT NULL,
  icd10_codes JSONB DEFAULT '[]'::jsonb,
  modifiers JSONB DEFAULT '[]'::jsonb,
  place_of_service JSONB DEFAULT '[]'::jsonb,
  provider_credential_required JSONB DEFAULT '[]'::jsonb,
  coverage_status TEXT NOT NULL DEFAULT 'unknown' CHECK (coverage_status IN ('covered', 'covered_auth_required', 'not_covered', 'conditional', 'unknown')),
  coverage_notes TEXT,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  next_verification_due_at TIMESTAMP WITH TIME ZONE,
  verification_source TEXT CHECK (verification_source IN ('eligibility_check', 'manual_verification', 'payer_portal', 'phone_call', 'eob_review', 'contract', 'other')),
  evidence_attachment_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Coverage Rules - School Light Mode
CREATE TABLE IF NOT EXISTS public.coverage_rules_school (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  service_line TEXT NOT NULL,
  allowed_settings JSONB DEFAULT '[]'::jsonb,
  provider_roles_allowed JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  source TEXT NOT NULL CHECK (source IN ('IEP', 'contract', 'site_policy', 'other')),
  source_document_id UUID,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  next_verification_due_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Coverage Check Audit Trail
CREATE TABLE IF NOT EXISTS public.coverage_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  mode_used TEXT NOT NULL CHECK (mode_used IN ('INSURANCE_STRICT', 'SCHOOL_LIGHT', 'HYBRID')),
  trigger_reason TEXT NOT NULL CHECK (trigger_reason IN ('intake', 'auth_renewal', 'code_change', 'modifier_change', 'plan_renewal', 'monthly_30_day', 'new_service_line', 'manual', 'session_scheduling', 'session_completion')),
  performed_by UUID,
  performed_by_type TEXT DEFAULT 'staff' CHECK (performed_by_type IN ('system', 'staff')),
  result_status TEXT NOT NULL CHECK (result_status IN ('pass', 'warn', 'fail')),
  summary TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  linked_rules_checked JSONB DEFAULT '[]'::jsonb,
  evidence_link TEXT,
  follow_up_tasks_created JSONB DEFAULT '[]'::jsonb,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Coverage Tasks Work Queue
CREATE TABLE IF NOT EXISTS public.coverage_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('verify_coverage', 'verify_plan', 'verify_new_service_line', 'update_expired_rule', 'resolve_coverage_block', 'renew_authorization')),
  due_date DATE NOT NULL,
  assigned_to UUID,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')),
  reason TEXT,
  linked_session_ids JSONB DEFAULT '[]'::jsonb,
  linked_coverage_rule_id UUID,
  linked_payer_plan_id UUID,
  resolution_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Service Line Coverage Mode Override (for HYBRID mode)
ALTER TABLE public.client_service_lines
ADD COLUMN IF NOT EXISTS coverage_mode_override TEXT CHECK (coverage_mode_override IN ('INSURANCE_STRICT', 'SCHOOL_LIGHT', NULL));

-- 9. Session Coverage Gate Fields (extend sessions if exists, else create computed view approach)
-- We'll add columns to track coverage status per session
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS coverage_gate_status TEXT DEFAULT 'pending' CHECK (coverage_gate_status IN ('pending', 'pass', 'warn', 'fail', 'override')),
ADD COLUMN IF NOT EXISTS coverage_gate_reason_code TEXT,
ADD COLUMN IF NOT EXISTS coverage_last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS coverage_rule_match_ids JSONB DEFAULT '[]'::jsonb;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payer_plans_client ON public.payer_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_payer_plans_active ON public.payer_plans(client_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coverage_rules_insurance_client ON public.coverage_rules_insurance(client_id);
CREATE INDEX IF NOT EXISTS idx_coverage_rules_insurance_cpt ON public.coverage_rules_insurance(cpt_code);
CREATE INDEX IF NOT EXISTS idx_coverage_rules_school_client ON public.coverage_rules_school(client_id);
CREATE INDEX IF NOT EXISTS idx_coverage_checks_client ON public.coverage_checks(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coverage_tasks_due ON public.coverage_tasks(due_date, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_coverage_tasks_assigned ON public.coverage_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_coverage_tasks_client ON public.coverage_tasks(client_id);

-- Enable RLS
ALTER TABLE public.org_coverage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payer_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_rules_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_rules_school ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can view org settings" ON public.org_coverage_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage org settings" ON public.org_coverage_settings FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can view payer plans" ON public.payer_plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage payer plans" ON public.payer_plans FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view insurance rules" ON public.coverage_rules_insurance FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage insurance rules" ON public.coverage_rules_insurance FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view school rules" ON public.coverage_rules_school FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage school rules" ON public.coverage_rules_school FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view coverage checks" ON public.coverage_checks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can insert coverage checks" ON public.coverage_checks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view coverage tasks" ON public.coverage_tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage coverage tasks" ON public.coverage_tasks FOR ALL USING (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_org_coverage_settings_updated_at BEFORE UPDATE ON public.org_coverage_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payer_plans_updated_at BEFORE UPDATE ON public.payer_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coverage_rules_insurance_updated_at BEFORE UPDATE ON public.coverage_rules_insurance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coverage_rules_school_updated_at BEFORE UPDATE ON public.coverage_rules_school FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coverage_tasks_updated_at BEFORE UPDATE ON public.coverage_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to get effective coverage mode for a client
CREATE OR REPLACE FUNCTION public.get_client_coverage_mode(_client_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT coverage_mode_override FROM public.students WHERE id = _client_id),
    (SELECT coverage_mode FROM public.org_coverage_settings LIMIT 1),
    'SCHOOL_LIGHT'
  )
$$;

-- Helper function to check if coverage verification is due
CREATE OR REPLACE FUNCTION public.is_coverage_verification_due(_client_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT next_verification_due_at FROM public.coverage_rules_insurance 
      WHERE client_id = _client_id AND is_active = true
      UNION ALL
      SELECT next_verification_due_at FROM public.coverage_rules_school 
      WHERE client_id = _client_id AND is_active = true
    ) rules
    WHERE next_verification_due_at IS NOT NULL 
      AND next_verification_due_at <= CURRENT_TIMESTAMP
  )
$$;