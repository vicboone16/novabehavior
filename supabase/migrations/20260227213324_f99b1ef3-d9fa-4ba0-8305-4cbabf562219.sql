
-- ===== 1. CID SQL Views =====

CREATE OR REPLACE VIEW public.v_ci_caseload_feed AS
SELECT
  cm.client_id,
  cm.agency_id,
  c.full_name AS client_name,
  cm.risk_score,
  cm.trend_score,
  cm.data_freshness,
  cm.fidelity_score,
  cm.goal_velocity_score,
  cm.parent_impl_score,
  cm.updated_at AS metrics_updated_at,
  (SELECT count(*) FROM public.ci_alerts a WHERE a.client_id = cm.client_id AND a.resolved_at IS NULL) AS open_alert_count
FROM public.ci_client_metrics cm
JOIN public.clients c ON c.client_id = cm.client_id;

CREATE OR REPLACE VIEW public.v_ci_alert_feed AS
SELECT
  a.id AS alert_id,
  a.agency_id,
  a.client_id,
  c.full_name AS client_name,
  a.category,
  a.severity,
  a.message,
  a.explanation_json,
  a.alert_key,
  a.created_at,
  a.resolved_at,
  a.resolved_by
FROM public.ci_alerts a
LEFT JOIN public.clients c ON c.client_id = a.client_id
WHERE a.resolved_at IS NULL;

CREATE OR REPLACE VIEW public.v_ci_agency_comparison AS
SELECT
  cm.agency_id,
  ag.name AS agency_name,
  count(*) AS client_count,
  round(avg(cm.risk_score), 1) AS avg_risk,
  round(100.0 * count(*) FILTER (WHERE cm.data_freshness <= 20) / greatest(count(*), 1), 1) AS pct_stale,
  round(100.0 * count(*) FILTER (WHERE cm.fidelity_score < 80) / greatest(count(*), 1), 1) AS pct_low_fidelity,
  round((SELECT count(*) FROM public.ci_alerts al WHERE al.agency_id = cm.agency_id AND al.resolved_at IS NULL)::numeric * 10.0 / greatest(count(*), 1), 1) AS alerts_per_10_clients
FROM public.ci_client_metrics cm
JOIN public.agencies ag ON ag.id = cm.agency_id
GROUP BY cm.agency_id, ag.name;

CREATE OR REPLACE VIEW public.v_ci_stale_leaderboard AS
SELECT
  cm.client_id,
  c.full_name AS client_name,
  cm.agency_id,
  ag.name AS agency_name,
  cm.data_freshness,
  cm.risk_score,
  cm.updated_at AS metrics_updated_at
FROM public.ci_client_metrics cm
JOIN public.clients c ON c.client_id = cm.client_id
JOIN public.agencies ag ON ag.id = cm.agency_id
ORDER BY cm.data_freshness ASC;

-- ===== 2. LMS Automation Tables =====

-- Alert-to-LMS mapping table
CREATE TABLE IF NOT EXISTS public.ci_alert_to_lms_map (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  role_slug text NOT NULL,
  module_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ci_alert_to_lms_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage alert-lms mappings"
  ON public.ci_alert_to_lms_map FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- LMS assignments table
CREATE TABLE IF NOT EXISTS public.lms_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  module_id uuid NOT NULL,
  related_client_id uuid,
  source_trigger text,
  source_alert_id uuid REFERENCES public.ci_alerts(id),
  status text NOT NULL DEFAULT 'assigned',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lms_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own assignments"
  ON public.lms_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage assignments"
  ON public.lms_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Unique constraint to prevent duplicate active assignments
CREATE UNIQUE INDEX IF NOT EXISTS lms_assignments_unique_active
  ON public.lms_assignments (user_id, module_id, related_client_id, source_trigger)
  WHERE status IN ('assigned', 'in_progress');

-- ===== 3. Agency Entity Label =====

ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS primary_entity_label text NOT NULL DEFAULT 'client';
