
-- ============================================
-- Clinical Intelligence Engine - Database Foundation
-- Adapted to existing schema (agencies.id, profiles, user_roles, students)
-- ============================================

-- 1) Agency Feature Flags
CREATE TABLE IF NOT EXISTS public.agency_feature_flags (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  cid_enabled_default boolean NOT NULL DEFAULT false,
  intervention_engine_default boolean NOT NULL DEFAULT false,
  auto_narratives_default boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_feature_flags ENABLE ROW LEVEL SECURITY;

-- 2) User Feature Flags (overrides)
CREATE TABLE IF NOT EXISTS public.user_feature_flags (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cid_enabled boolean,
  intervention_engine_access boolean,
  auto_narratives_enabled boolean,
  cross_agency_analytics boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;

-- 3) CI Client Metrics
CREATE TABLE IF NOT EXISTS public.ci_client_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  data_source_id uuid,
  risk_score numeric DEFAULT 0,
  trend_score numeric DEFAULT 0,
  data_freshness numeric DEFAULT 0,
  parent_impl_score numeric DEFAULT 0,
  goal_velocity_score numeric DEFAULT 0,
  fidelity_score numeric DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, agency_id, data_source_id)
);
ALTER TABLE public.ci_client_metrics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ci_metrics_agency_client ON public.ci_client_metrics(agency_id, client_id);
CREATE INDEX IF NOT EXISTS idx_ci_metrics_updated ON public.ci_client_metrics(updated_at);

-- 4) CI Alerts
CREATE TABLE IF NOT EXISTS public.ci_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  data_source_id uuid,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'info')),
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  explanation_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.ci_alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ci_alerts_agency_created ON public.ci_alerts(agency_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ci_alerts_unresolved ON public.ci_alerts(agency_id, resolved_at);

-- 5) CI Intervention Recommendations
CREATE TABLE IF NOT EXISTS public.ci_intervention_recs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  data_source_id uuid,
  behavior_id text,
  hypothesis_id uuid,
  intervention_id uuid,
  score numeric DEFAULT 0,
  reasons_json jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ci_intervention_recs ENABLE ROW LEVEL SECURITY;

-- 6) External adapter tables (structure only, no UI)
CREATE TABLE IF NOT EXISTS public.agency_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'novatrack_native',
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_data_sources_agency ON public.agency_data_sources(agency_id);
ALTER TABLE public.agency_data_sources ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.external_id_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id uuid NOT NULL REFERENCES public.agency_data_sources(id) ON DELETE CASCADE,
  external_type text NOT NULL,
  external_id text NOT NULL,
  internal_uuid uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data_source_id, external_type, external_id)
);
ALTER TABLE public.external_id_map ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id uuid NOT NULL REFERENCES public.agency_data_sources(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  ended_at timestamptz,
  error_json jsonb,
  stats_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- 7) Feature Flag Audit Log
CREATE TABLE IF NOT EXISTS public.feature_flag_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_user_id uuid,
  target_agency_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flag_audit ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper Functions
-- ============================================

-- Effective CID access check
CREATE OR REPLACE FUNCTION public.effective_cid_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    -- Super admins always have access
    public.is_super_admin(_user_id)
    OR
    -- User-level override is true
    COALESCE(
      (SELECT cid_enabled FROM public.user_feature_flags WHERE user_id = _user_id),
      -- Fall back to agency default
      (SELECT aff.cid_enabled_default 
       FROM public.agency_feature_flags aff
       INNER JOIN public.agency_memberships am ON am.agency_id = aff.agency_id
       WHERE am.user_id = _user_id AND am.status = 'active'
       LIMIT 1),
      false
    )
$$;

-- Effective cross-agency access check
CREATE OR REPLACE FUNCTION public.effective_cross_agency_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin(_user_id)
    AND COALESCE(
      (SELECT cross_agency_analytics FROM public.user_feature_flags WHERE user_id = _user_id),
      false
    )
$$;

-- ============================================
-- RLS Policies
-- ============================================

-- Agency Feature Flags: admins of the agency or super admins
CREATE POLICY "agency_feature_flags_select" ON public.agency_feature_flags
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_agency_access(auth.uid(), agency_id));

CREATE POLICY "agency_feature_flags_update" ON public.agency_feature_flags
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_agency_admin(auth.uid(), agency_id));

CREATE POLICY "agency_feature_flags_insert" ON public.agency_feature_flags
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_agency_admin(auth.uid(), agency_id));

-- User Feature Flags: own record or admins
CREATE POLICY "user_feature_flags_select" ON public.user_feature_flags
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "user_feature_flags_upsert" ON public.user_feature_flags
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- CI Client Metrics: agency-scoped or cross-agency for super admins
CREATE POLICY "ci_metrics_select" ON public.ci_client_metrics
  FOR SELECT TO authenticated
  USING (
    public.has_agency_access(auth.uid(), agency_id)
    OR public.effective_cross_agency_access(auth.uid())
  );

CREATE POLICY "ci_metrics_manage" ON public.ci_client_metrics
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- CI Alerts: agency-scoped or cross-agency
CREATE POLICY "ci_alerts_select" ON public.ci_alerts
  FOR SELECT TO authenticated
  USING (
    public.has_agency_access(auth.uid(), agency_id)
    OR public.effective_cross_agency_access(auth.uid())
  );

CREATE POLICY "ci_alerts_manage" ON public.ci_alerts
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- CI Intervention Recs: agency-scoped or cross-agency
CREATE POLICY "ci_recs_select" ON public.ci_intervention_recs
  FOR SELECT TO authenticated
  USING (
    public.has_agency_access(auth.uid(), agency_id)
    OR public.effective_cross_agency_access(auth.uid())
  );

CREATE POLICY "ci_recs_manage" ON public.ci_intervention_recs
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Agency Data Sources: agency-scoped
CREATE POLICY "data_sources_select" ON public.agency_data_sources
  FOR SELECT TO authenticated
  USING (public.has_agency_access(auth.uid(), agency_id));

CREATE POLICY "data_sources_manage" ON public.agency_data_sources
  FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_admin(auth.uid(), agency_id));

-- External ID Map: via data source agency
CREATE POLICY "external_id_map_select" ON public.external_id_map
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_data_sources ads
    WHERE ads.id = data_source_id
    AND public.has_agency_access(auth.uid(), ads.agency_id)
  ));

-- Ingestion Jobs: via data source agency
CREATE POLICY "ingestion_jobs_select" ON public.ingestion_jobs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_data_sources ads
    WHERE ads.id = data_source_id
    AND public.has_agency_access(auth.uid(), ads.agency_id)
  ));

-- Feature Flag Audit: super admins only
CREATE POLICY "feature_flag_audit_select" ON public.feature_flag_audit
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "feature_flag_audit_insert" ON public.feature_flag_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));
