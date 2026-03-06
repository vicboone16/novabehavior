
-- 1) Add missing columns to students (no generated column - compute age in views)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS communication_level text,
  ADD COLUMN IF NOT EXISTS diagnosis_cluster text;

-- 2) fba_hypotheses table
CREATE TABLE IF NOT EXISTS public.fba_hypotheses (
  hypothesis_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id),
  function_primary text,
  function_secondary text,
  antecedent_summary text,
  consequence_summary text,
  setting text,
  effective_date date DEFAULT current_date,
  end_date date,
  status text DEFAULT 'active',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.fba_hypotheses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fba_hyp_select" ON public.fba_hypotheses FOR SELECT
  USING (public.is_super_admin() OR agency_id = public.current_agency_id());
CREATE POLICY "fba_hyp_insert" ON public.fba_hypotheses FOR INSERT
  WITH CHECK (public.is_super_admin() OR agency_id = public.current_agency_id());
CREATE POLICY "fba_hyp_update" ON public.fba_hypotheses FOR UPDATE
  USING (public.is_super_admin() OR agency_id = public.current_agency_id());

-- 3) interventions_master
CREATE TABLE IF NOT EXISTS public.interventions_master (
  intervention_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  functions text[] DEFAULT '{}',
  setting_tags text[],
  age_min int,
  age_max int,
  communication_levels text[],
  diagnosis_clusters text[],
  evidence_rating int DEFAULT 3 CHECK (evidence_rating BETWEEN 1 AND 5),
  complexity_level int DEFAULT 3 CHECK (complexity_level BETWEEN 1 AND 5),
  contraindications text,
  active boolean DEFAULT true,
  source text DEFAULT 'library',
  agency_id uuid REFERENCES public.agencies(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.interventions_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "int_master_select" ON public.interventions_master FOR SELECT
  USING (public.is_super_admin() OR agency_id IS NULL OR agency_id = public.current_agency_id());
CREATE POLICY "int_master_insert" ON public.interventions_master FOR INSERT
  WITH CHECK (public.is_super_admin() OR agency_id = public.current_agency_id());
CREATE POLICY "int_master_update" ON public.interventions_master FOR UPDATE
  USING (public.is_super_admin() OR agency_id = public.current_agency_id());

-- 4) interventions_tags
CREATE TABLE IF NOT EXISTS public.interventions_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES public.interventions_master(intervention_id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.interventions_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "int_tags_select" ON public.interventions_tags FOR SELECT TO authenticated USING (true);

-- 5) Canonical views (security_invoker = on)
CREATE OR REPLACE VIEW public.canon_clients
WITH (security_invoker = on) AS
SELECT
  s.id AS client_id, s.agency_id, s.name, s.display_name, s.date_of_birth,
  CASE WHEN s.date_of_birth IS NOT NULL THEN extract(year FROM age(current_date, s.date_of_birth))::int END AS age_years,
  s.primary_setting, s.communication_level, s.diagnosis_cluster, s.is_archived,
  'novatrack_native'::text AS data_source_type, NULL::uuid AS data_source_id
FROM public.students s WHERE s.agency_id IS NOT NULL;

CREATE OR REPLACE VIEW public.canon_behavior_events
WITH (security_invoker = on) AS
SELECT
  be.event_id, be.client_id, s.agency_id, be.session_id, be.behavior_id, be.behavior_name,
  be.event_type, be.occurred_at, be.duration_seconds, be.abc_data, be.is_problem, be.intensity,
  'novatrack_native'::text AS data_source_type, NULL::uuid AS data_source_id
FROM public.behavior_events be JOIN public.students s ON s.id = be.client_id;

CREATE OR REPLACE VIEW public.canon_goal_data
WITH (security_invoker = on) AS
SELECT
  gd.data_id, g.client_id, s.agency_id, gd.goal_id, gd.target_id, g.goal_name,
  gd.outcome, gd.correct, gd.prompt_level_id, gd.recorded_at,
  'novatrack_native'::text AS data_source_type, NULL::uuid AS data_source_id
FROM public.goal_data gd JOIN public.goals g ON g.goal_id = gd.goal_id JOIN public.students s ON s.id = g.client_id;

CREATE OR REPLACE VIEW public.canon_fidelity_checks
WITH (security_invoker = on) AS
SELECT
  fc.id, fc.client_id, s.agency_id, fc.fidelity_score, fc.created_at,
  'novatrack_native'::text AS data_source_type, NULL::uuid AS data_source_id
FROM public.fidelity_checks fc JOIN public.students s ON s.id = fc.client_id;

CREATE OR REPLACE VIEW public.canon_parent_implementation
WITH (security_invoker = on) AS
SELECT
  pl.id, pl.client_id, s.agency_id, pl.consistency_rating, pl.created_at,
  'novatrack_native'::text AS data_source_type, NULL::uuid AS data_source_id
FROM public.parent_implementation_logs pl JOIN public.students s ON s.id = pl.client_id;

CREATE OR REPLACE VIEW public.canon_hypotheses
WITH (security_invoker = on) AS
SELECT
  fh.hypothesis_id, fh.client_id, fh.agency_id, fh.function_primary, fh.function_secondary,
  fh.antecedent_summary, fh.consequence_summary, fh.setting, fh.effective_date, fh.end_date, fh.status,
  'novatrack_native'::text AS data_source_type, NULL::uuid AS data_source_id
FROM public.fba_hypotheses fh;

-- 6) Add data_source_id to ci_* output tables
ALTER TABLE public.ci_client_metrics ADD COLUMN IF NOT EXISTS data_source_id uuid;
ALTER TABLE public.ci_alerts ADD COLUMN IF NOT EXISTS data_source_id uuid;
ALTER TABLE public.ci_intervention_recs ADD COLUMN IF NOT EXISTS data_source_id uuid;
