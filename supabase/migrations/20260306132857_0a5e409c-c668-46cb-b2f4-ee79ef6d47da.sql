
-- Drop old ci_threshold_rules table and replace with new normalized schema
DROP TABLE IF EXISTS public.ci_threshold_rules CASCADE;

CREATE TABLE IF NOT EXISTS public.ci_threshold_rules (
  rule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NULL,
  client_id uuid NULL,
  setting text NULL,
  phase text NULL,
  behavior_id uuid NULL,
  metric_key text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','low','moderate','high','critical')),
  threshold_numeric numeric NULL,
  threshold_text text NULL,
  comparator text NOT NULL DEFAULT 'gte' CHECK (comparator IN ('gte','gt','lte','lt','eq')),
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_threshold_rules_lookup
ON public.ci_threshold_rules(metric_key, agency_id, client_id, is_active);

-- Enable RLS
ALTER TABLE public.ci_threshold_rules ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "ci_threshold_rules_super_admin" ON public.ci_threshold_rules
  FOR ALL TO authenticated
  USING (public.is_super_admin());

-- Agency admins can manage their agency rules
CREATE POLICY "ci_threshold_rules_agency_admin" ON public.ci_threshold_rules
  FOR ALL TO authenticated
  USING (
    agency_id IN (
      SELECT am.agency_id FROM public.agency_memberships am
      WHERE am.user_id = auth.uid() AND am.status = 'active'
        AND am.role IN ('agency_admin','clinical_director')
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT am.agency_id FROM public.agency_memberships am
      WHERE am.user_id = auth.uid() AND am.status = 'active'
        AND am.role IN ('agency_admin','clinical_director')
    )
  );

-- All authenticated users can read active global rules
CREATE POLICY "ci_threshold_rules_read_global" ON public.ci_threshold_rules
  FOR SELECT TO authenticated
  USING (agency_id IS NULL AND is_active = true);

-- Seed global defaults
INSERT INTO public.ci_threshold_rules (metric_key, severity, threshold_numeric, comparator, notes) VALUES
  ('risk_score', 'moderate', 50, 'gte', 'Global default: watch threshold'),
  ('risk_score', 'high', 65, 'gte', 'Global default: action threshold'),
  ('risk_score', 'critical', 80, 'gte', 'Global default: critical threshold'),
  ('data_freshness', 'moderate', 25, 'lte', 'Global default: watch threshold'),
  ('data_freshness', 'high', 15, 'lte', 'Global default: action threshold'),
  ('data_freshness', 'critical', 8, 'lte', 'Global default: critical threshold'),
  ('fidelity_score', 'moderate', 85, 'lte', 'Global default: watch threshold'),
  ('fidelity_score', 'high', 75, 'lte', 'Global default: action threshold'),
  ('fidelity_score', 'critical', 65, 'lte', 'Global default: critical threshold'),
  ('goal_velocity_score', 'moderate', 40, 'lte', 'Global default: watch threshold'),
  ('goal_velocity_score', 'high', 25, 'lte', 'Global default: action threshold'),
  ('goal_velocity_score', 'critical', 15, 'lte', 'Global default: critical threshold'),
  ('parent_impl_score', 'moderate', 70, 'lte', 'Global default: watch threshold'),
  ('parent_impl_score', 'high', 55, 'lte', 'Global default: action threshold'),
  ('parent_impl_score', 'critical', 40, 'lte', 'Global default: critical threshold'),
  ('trend_score', 'moderate', 30, 'gte', 'Global default: watch threshold'),
  ('trend_score', 'high', 50, 'gte', 'Global default: action threshold'),
  ('trend_score', 'critical', 70, 'gte', 'Global default: critical threshold');
