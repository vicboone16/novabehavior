
-- Drop conflicting views first
DROP VIEW IF EXISTS public.v_school_comparison CASCADE;
DROP VIEW IF EXISTS public.v_supervisor_caseload_dashboard CASCADE;
DROP VIEW IF EXISTS public.v_staffing_capacity_vs_load CASCADE;
DROP VIEW IF EXISTS public.v_entity_client_counts CASCADE;

-- ============================================================
-- PHASE 1: Organizational Hierarchy + Attribution
-- ============================================================

CREATE TABLE IF NOT EXISTS public.org_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('district','school','program','agency','region','location','caseload','classroom')),
  name text NOT NULL,
  code text NULL,
  state text NULL,
  city text NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_entity_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entity_id uuid NOT NULL REFERENCES public.org_entities(id) ON DELETE CASCADE,
  child_entity_id uuid NOT NULL REFERENCES public.org_entities(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'contains',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_entity_id, child_entity_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS public.client_entity_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entity_id uuid NOT NULL REFERENCES public.org_entities(id) ON DELETE CASCADE,
  assignment_type text NOT NULL CHECK (assignment_type IN ('district','school','program','agency','region','location','caseload','classroom')),
  is_primary boolean NOT NULL DEFAULT false,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, entity_id, assignment_type)
);

CREATE TABLE IF NOT EXISTS public.staff_entity_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_id uuid NOT NULL REFERENCES public.org_entities(id) ON DELETE CASCADE,
  staff_role text NOT NULL CHECK (staff_role IN ('owner','executive','regional_manager','location_manager','bcba','supervisor','rbt','teacher_consultant','clinical_director')),
  is_primary boolean NOT NULL DEFAULT false,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_id, staff_role)
);

CREATE TABLE IF NOT EXISTS public.client_staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assignment_role text NOT NULL CHECK (assignment_role IN ('primary_bcba','supervisor','rbt','consultant','case_manager')),
  is_primary boolean NOT NULL DEFAULT false,
  starts_at timestamptz NULL,
  ends_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id, assignment_role)
);

CREATE TABLE IF NOT EXISTS public.agency_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.org_entities(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'owns',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, entity_id, link_type)
);

-- ============================================================
-- PHASE 2: Intelligence + Snapshot Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_intelligence_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  severity_level text NULL CHECK (severity_level IN ('low','moderate','high','critical')),
  severity_score numeric(8,2) NULL,
  risk_score numeric(8,2) NULL,
  communication_level text NULL CHECK (communication_level IN ('nonverbal','emerging_language','phrase_speech','conversational','unknown')),
  top_behavior_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_function_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  reinforcer_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  program_need_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_computed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_outcome_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('weekly','monthly','quarterly')),
  behavior_reduction_score numeric(8,2) NULL,
  replacement_growth_score numeric(8,2) NULL,
  goal_progress_score numeric(8,2) NULL,
  reinforcement_effectiveness_score numeric(8,2) NULL,
  attendance_consistency_score numeric(8,2) NULL,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, snapshot_date, period_type)
);

CREATE TABLE IF NOT EXISTS public.entity_compliance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.org_entities(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  documentation_compliance_rate numeric(8,2) NULL,
  supervision_compliance_rate numeric(8,2) NULL,
  authorization_risk_count integer NULL,
  missing_note_count integer NULL,
  utilization_rate numeric(8,2) NULL,
  service_gap_count integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS public.entity_outcome_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.org_entities(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  behavior_reduction_avg numeric(8,2) NULL,
  replacement_growth_avg numeric(8,2) NULL,
  progress_score_avg numeric(8,2) NULL,
  high_risk_client_count integer NULL,
  severity_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  top_behavior_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_id, snapshot_date)
);

-- ============================================================
-- PHASE 3: Optimization + Recommendation Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_capacity_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  primary_role text NOT NULL,
  home_entity_id uuid NULL REFERENCES public.org_entities(id) ON DELETE SET NULL,
  max_clients integer NULL,
  max_direct_hours numeric(8,2) NULL,
  max_supervision_hours numeric(8,2) NULL,
  max_high_intensity_cases integer NULL,
  geo_preferences jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_preferences jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staffing_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.org_entities(id) ON DELETE CASCADE,
  recommendation_level text NOT NULL CHECK (recommendation_level IN ('agency','region','location','school','caseload')),
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('add_rbt','add_bcba','rebalance_caseload','reassign_case','increase_supervision','geo_gap')),
  title text NOT NULL,
  rationale text NULL,
  impacted_client_count integer NULL,
  impacted_staff_count integer NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  recommendation_status text NOT NULL DEFAULT 'open' CHECK (recommendation_status IN ('open','reviewed','accepted','dismissed')),
  supporting_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.org_entities(id) ON DELETE CASCADE,
  recommendation_level text NOT NULL CHECK (recommendation_level IN ('district','school','agency','region','location')),
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('communication_programming','elopement_support','adaptive_skills','replacement_behavior_support','classroom_regulation','staff_training','behavior_reduction_balance')),
  title text NOT NULL,
  rationale text NULL,
  affected_client_count integer NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  recommendation_status text NOT NULL DEFAULT 'open' CHECK (recommendation_status IN ('open','reviewed','accepted','dismissed')),
  supporting_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generated_behavior_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('intake','fba','intake_plus_fba','ai_review')),
  target_type text NOT NULL CHECK (target_type IN ('problem_behavior','replacement_behavior','goal','tracking_target')),
  target_name text NOT NULL,
  target_definition text NULL,
  proposed_measurement_type text NULL,
  rationale text NULL,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  source_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_shell_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NULL,
  service_model text NULL,
  age_band text NULL,
  use_case text NULL,
  is_active boolean NOT NULL DEFAULT true,
  shell_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_program_shell_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  program_shell_template_id uuid NOT NULL REFERENCES public.program_shell_templates(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed','dismissed')),
  assigned_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, program_shell_template_id)
);

-- ============================================================
-- PHASE 4: Reporting Views (security_invoker = on)
-- ============================================================

CREATE OR REPLACE VIEW public.v_entity_client_counts WITH (security_invoker = on) AS
SELECT cea.entity_id, count(DISTINCT cea.client_id) AS client_count
FROM public.client_entity_assignments cea
WHERE cea.ends_at IS NULL OR cea.ends_at > now()
GROUP BY cea.entity_id;

CREATE OR REPLACE VIEW public.v_school_comparison WITH (security_invoker = on) AS
SELECT
  e.id AS school_id, e.name AS school_name, e.agency_id,
  coalesce(cc.client_count, 0) AS student_count,
  ecs.documentation_compliance_rate, ecs.supervision_compliance_rate, ecs.utilization_rate,
  eos.behavior_reduction_avg, eos.replacement_growth_avg, eos.progress_score_avg,
  eos.high_risk_client_count, eos.severity_distribution, eos.top_behavior_distribution
FROM public.org_entities e
LEFT JOIN public.v_entity_client_counts cc ON cc.entity_id = e.id
LEFT JOIN public.entity_compliance_snapshots ecs ON ecs.entity_id = e.id
  AND ecs.snapshot_date = (SELECT max(ecs2.snapshot_date) FROM public.entity_compliance_snapshots ecs2 WHERE ecs2.entity_id = e.id)
LEFT JOIN public.entity_outcome_snapshots eos ON eos.entity_id = e.id
  AND eos.snapshot_date = (SELECT max(eos2.snapshot_date) FROM public.entity_outcome_snapshots eos2 WHERE eos2.entity_id = e.id)
WHERE e.entity_type = 'school' AND e.is_active = true;

CREATE OR REPLACE VIEW public.v_supervisor_caseload_dashboard WITH (security_invoker = on) AS
SELECT
  csa.user_id AS supervisor_user_id,
  count(DISTINCT csa.client_id) AS client_count,
  count(DISTINCT CASE WHEN cip.severity_level IN ('high','critical') THEN csa.client_id END) AS high_risk_clients,
  avg(cos.progress_score_avg) AS avg_progress_score,
  avg(cos.behavior_reduction_avg) AS avg_behavior_reduction,
  avg(cos.replacement_growth_avg) AS avg_replacement_growth
FROM public.client_staff_assignments csa
LEFT JOIN public.client_intelligence_profiles cip ON cip.client_id = csa.client_id
LEFT JOIN (
  SELECT client_id, avg(goal_progress_score) AS progress_score_avg,
    avg(behavior_reduction_score) AS behavior_reduction_avg,
    avg(replacement_growth_score) AS replacement_growth_avg
  FROM public.client_outcome_snapshots GROUP BY client_id
) cos ON cos.client_id = csa.client_id
WHERE csa.assignment_role IN ('primary_bcba','supervisor')
  AND (csa.ends_at IS NULL OR csa.ends_at > now())
GROUP BY csa.user_id;

CREATE OR REPLACE VIEW public.v_staffing_capacity_vs_load WITH (security_invoker = on) AS
SELECT
  scp.user_id, scp.primary_role, scp.home_entity_id, scp.max_clients,
  count(DISTINCT csa.client_id) AS assigned_clients,
  scp.max_high_intensity_cases,
  count(DISTINCT CASE WHEN cip.severity_level IN ('high','critical') THEN csa.client_id END) AS high_intensity_clients,
  CASE WHEN scp.max_clients IS NOT NULL AND scp.max_clients > 0
    THEN round((count(DISTINCT csa.client_id)::numeric / scp.max_clients::numeric) * 100, 2)
    ELSE NULL END AS client_capacity_pct
FROM public.staff_capacity_profiles scp
LEFT JOIN public.client_staff_assignments csa ON csa.user_id = scp.user_id AND (csa.ends_at IS NULL OR csa.ends_at > now())
LEFT JOIN public.client_intelligence_profiles cip ON cip.client_id = csa.client_id
GROUP BY scp.user_id, scp.primary_role, scp.home_entity_id, scp.max_clients, scp.max_high_intensity_cases;

-- ============================================================
-- PHASE 5: RLS + Indexes
-- ============================================================

ALTER TABLE public.org_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_entity_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_entity_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_intelligence_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_outcome_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_compliance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_outcome_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_capacity_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_behavior_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_shell_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_program_shell_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage org_entities" ON public.org_entities FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage org_entity_relationships" ON public.org_entity_relationships FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage client_entity_assignments" ON public.client_entity_assignments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage staff_entity_assignments" ON public.staff_entity_assignments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage client_staff_assignments" ON public.client_staff_assignments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage agency_entity_links" ON public.agency_entity_links FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage client_intelligence_profiles" ON public.client_intelligence_profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage client_outcome_snapshots" ON public.client_outcome_snapshots FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage entity_compliance_snapshots" ON public.entity_compliance_snapshots FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage entity_outcome_snapshots" ON public.entity_outcome_snapshots FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage staff_capacity_profiles" ON public.staff_capacity_profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage staffing_recommendations" ON public.staffing_recommendations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage program_recommendations" ON public.program_recommendations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage generated_behavior_targets" ON public.generated_behavior_targets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage program_shell_templates" ON public.program_shell_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage client_program_shell_assignments" ON public.client_program_shell_assignments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Staff view own entity assignments" ON public.staff_entity_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff view own client assignments" ON public.client_staff_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff view own capacity profile" ON public.staff_capacity_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_org_entities_agency ON public.org_entities(agency_id);
CREATE INDEX IF NOT EXISTS idx_org_entities_type ON public.org_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_org_rel_parent ON public.org_entity_relationships(parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_org_rel_child ON public.org_entity_relationships(child_entity_id);
CREATE INDEX IF NOT EXISTS idx_client_entity_client ON public.client_entity_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_entity_entity ON public.client_entity_assignments(entity_id);
CREATE INDEX IF NOT EXISTS idx_staff_entity_user ON public.staff_entity_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_entity_entity ON public.staff_entity_assignments(entity_id);
CREATE INDEX IF NOT EXISTS idx_client_staff_client ON public.client_staff_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_staff_user ON public.client_staff_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_client_intel_client ON public.client_intelligence_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_client_outcome_client ON public.client_outcome_snapshots(client_id);
CREATE INDEX IF NOT EXISTS idx_entity_compliance_entity ON public.entity_compliance_snapshots(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_outcome_entity ON public.entity_outcome_snapshots(entity_id);
CREATE INDEX IF NOT EXISTS idx_gen_behavior_client ON public.generated_behavior_targets(client_id);
