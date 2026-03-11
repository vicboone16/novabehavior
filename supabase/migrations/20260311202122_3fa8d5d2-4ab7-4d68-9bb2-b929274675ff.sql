
-- Strategy mismatch detection: compare plan function_hypothesis against strategy function_targets
-- Since there's no join table, we'll create a simple one
CREATE TABLE IF NOT EXISTS public.student_behavior_plan_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.student_behavior_plans(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.behavior_strategies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, strategy_id)
);

ALTER TABLE public.student_behavior_plan_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sbps_select" ON public.student_behavior_plan_strategies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sbps_insert" ON public.student_behavior_plan_strategies
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sbps_delete" ON public.student_behavior_plan_strategies
  FOR DELETE TO authenticated USING (true);

-- Strategy mismatch detection view
CREATE OR REPLACE VIEW public.v_ci_strategy_mismatch WITH (security_invoker = on) AS
SELECT
  sbp.student_id AS client_id,
  s.agency_id,
  sbp.id AS plan_id,
  sbp.plan_name,
  sbp.function_hypothesis,
  bs.id AS strategy_id,
  bs.strategy_name,
  bs.strategy_group,
  bs.function_targets,
  CASE
    WHEN sbp.function_hypothesis ILIKE '%escape%' AND NOT (
      bs.function_targets::text ILIKE '%escape%'
      OR bs.strategy_group ILIKE '%demand%'
    ) THEN true
    WHEN sbp.function_hypothesis ILIKE '%attention%' AND NOT (
      bs.function_targets::text ILIKE '%attention%'
    ) THEN true
    WHEN sbp.function_hypothesis ILIKE '%sensory%' AND NOT (
      bs.function_targets::text ILIKE '%sensory%'
      OR bs.strategy_group ILIKE '%regulation%'
    ) THEN true
    WHEN sbp.function_hypothesis ILIKE '%tangible%' AND NOT (
      bs.function_targets::text ILIKE '%tangible%'
      OR bs.function_targets::text ILIKE '%access%'
    ) THEN true
    ELSE false
  END AS is_mismatch
FROM public.student_behavior_plans sbp
JOIN public.students s ON s.id = sbp.student_id
JOIN public.student_behavior_plan_strategies sbps ON sbps.plan_id = sbp.id
JOIN public.behavior_strategies bs ON bs.id = sbps.strategy_id
WHERE sbp.active = true;

-- Treatment integrity gap view
CREATE OR REPLACE VIEW public.v_ci_treatment_integrity_gaps WITH (security_invoker = on) AS
SELECT
  tfc.student_id AS client_id,
  s.agency_id,
  tfc.template_id,
  COUNT(tfc.id) AS total_checks,
  AVG(tfc.fidelity_percentage) AS avg_fidelity,
  COUNT(CASE WHEN tfc.fidelity_percentage < 80 THEN 1 END) AS low_fidelity_count,
  MAX(tfc.check_date) AS last_check_at,
  CASE
    WHEN AVG(tfc.fidelity_percentage) < 60 THEN 'critical'
    WHEN AVG(tfc.fidelity_percentage) < 80 THEN 'warning'
    ELSE 'ok'
  END AS fidelity_status
FROM public.treatment_fidelity_checks tfc
JOIN public.students s ON s.id = tfc.student_id
WHERE tfc.check_date >= now() - interval '30 days'
GROUP BY tfc.student_id, s.agency_id, tfc.template_id;

-- Intervention effectiveness view
CREATE OR REPLACE VIEW public.v_ci_intervention_effectiveness WITH (security_invoker = on) AS
WITH active_interventions AS (
  SELECT
    tfc.student_id AS client_id,
    s.agency_id,
    tfc.intervention_id,
    COUNT(tfc.id) AS sessions_count,
    AVG(tfc.fidelity_percentage) AS avg_fidelity,
    MIN(tfc.check_date) AS first_check,
    MAX(tfc.check_date) AS last_check
  FROM public.treatment_fidelity_checks tfc
  JOIN public.students s ON s.id = tfc.student_id
  WHERE tfc.intervention_id IS NOT NULL
  GROUP BY tfc.student_id, s.agency_id, tfc.intervention_id
)
SELECT
  ai.*,
  CASE
    WHEN ai.sessions_count >= 8 AND ai.avg_fidelity < 70 THEN true
    ELSE false
  END AS low_effectiveness_flag
FROM active_interventions ai;
