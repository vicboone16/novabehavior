
-- ═══════════════════════════════════════════════════════════
-- Master Hybrid Demo Tenant: Cross-App Ecosystem Tables
-- ═══════════════════════════════════════════════════════════

-- 1. Cross-app inputs — records data flowing in from teacher/parent/caregiver apps
CREATE TABLE IF NOT EXISTS public.demo_cross_app_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_org_id UUID NOT NULL REFERENCES public.demo_organizations(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.demo_learner_scenarios(id) ON DELETE CASCADE,
  source_app TEXT NOT NULL CHECK (source_app IN (
    'teacher_mode_core','teacher_app','behavior_decoded_parent_app',
    'caregiver_portal','clinician_entered'
  )),
  input_type TEXT NOT NULL, -- abc_event, frequency_count, duration_entry, caregiver_log, parent_question, etc
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  staff_id UUID REFERENCES public.demo_staff_personas(id),
  downstream_use TEXT, -- parent_training, teacher_consult, assessment_review, fba_bip, recommendation, alert_task
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dcai_learner ON public.demo_cross_app_inputs(learner_id);
CREATE INDEX idx_dcai_source ON public.demo_cross_app_inputs(source_app);

-- 2. Demo session notes (clinical, supervision, narrative)
CREATE TABLE IF NOT EXISTS public.demo_session_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_org_id UUID NOT NULL REFERENCES public.demo_organizations(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.demo_learner_scenarios(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.demo_staff_personas(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL CHECK (note_type IN (
    'session','narrative','supervision','teacher_summary','caregiver_summary'
  )),
  session_date DATE NOT NULL,
  duration_minutes INT,
  cpt_code TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  source_app TEXT DEFAULT 'clinician_entered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dsn_learner ON public.demo_session_notes(learner_id);

-- 3. Demo assessments
CREATE TABLE IF NOT EXISTS public.demo_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_org_id UUID NOT NULL REFERENCES public.demo_organizations(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.demo_learner_scenarios(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.demo_staff_personas(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL, -- VB-MAPP, ABLLS, AFLS, SRS-2, ABAS-3, Vineland, custom
  assessment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_da_learner ON public.demo_assessments(learner_id);

-- 4. Demo billing/auth records
CREATE TABLE IF NOT EXISTS public.demo_billing_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_org_id UUID NOT NULL REFERENCES public.demo_organizations(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.demo_learner_scenarios(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('authorization','claim','payment')),
  payer_name TEXT NOT NULL,
  cpt_code TEXT,
  units_authorized INT,
  units_used INT,
  units_remaining INT,
  amount NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'active',
  effective_date DATE,
  expiry_date DATE,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dbr_learner ON public.demo_billing_records(learner_id);

-- 5. Demo FBA/BIP records
CREATE TABLE IF NOT EXISTS public.demo_fba_bip (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_org_id UUID NOT NULL REFERENCES public.demo_organizations(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.demo_learner_scenarios(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.demo_staff_personas(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('fba','bip','fba_update','bip_update')),
  document_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  target_behaviors JSONB NOT NULL DEFAULT '[]'::jsonb,
  functions_identified JSONB NOT NULL DEFAULT '[]'::jsonb,
  interventions JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  linked_inputs TEXT[], -- references to cross_app_inputs used
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dfb_learner ON public.demo_fba_bip(learner_id);

-- 6. Demo alerts/tasks
CREATE TABLE IF NOT EXISTS public.demo_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_org_id UUID NOT NULL REFERENCES public.demo_organizations(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES public.demo_learner_scenarios(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.demo_staff_personas(id),
  alert_type TEXT NOT NULL, -- auth_expiring, missing_notes, high_frequency, parent_question, mayday, assessment_due
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source_app TEXT DEFAULT 'clinician_entered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_dal_status ON public.demo_alerts(status);

-- 7. Demo dashboard metrics (pre-computed for fast display)
CREATE TABLE IF NOT EXISTS public.demo_dashboard_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_org_id UUID NOT NULL REFERENCES public.demo_organizations(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metric_label TEXT NOT NULL,
  metric_category TEXT NOT NULL, -- clinical, billing, engagement, compliance, cross_app
  trend_direction TEXT DEFAULT 'stable', -- up, down, stable
  trend_pct NUMERIC DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ddm_category ON public.demo_dashboard_metrics(metric_category);

-- All demo tables: RLS permissive for authenticated (demo data is non-sensitive)
ALTER TABLE public.demo_cross_app_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_fba_bip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_dashboard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo_cai_read" ON public.demo_cross_app_inputs FOR SELECT TO authenticated USING (true);
CREATE POLICY "demo_dsn_read" ON public.demo_session_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "demo_da_read" ON public.demo_assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "demo_dbr_read" ON public.demo_billing_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "demo_dfb_read" ON public.demo_fba_bip FOR SELECT TO authenticated USING (true);
CREATE POLICY "demo_dal_read" ON public.demo_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "demo_ddm_read" ON public.demo_dashboard_metrics FOR SELECT TO authenticated USING (true);
