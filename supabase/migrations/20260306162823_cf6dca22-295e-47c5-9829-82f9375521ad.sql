
-- v_ci_effective_thresholds: pivots row-per-rule ci_threshold_rules into
-- columnar thresholds per client, resolving by precedence (most specific wins).
-- Precedence: client > agency > global (lower priority number wins within same specificity)

CREATE OR REPLACE VIEW public.v_ci_effective_thresholds AS
WITH ranked_rules AS (
  SELECT
    r.*,
    -- Specificity rank: client-level=0, agency-level=1, global=2
    CASE
      WHEN r.client_id IS NOT NULL THEN 0
      WHEN r.agency_id IS NOT NULL THEN 1
      ELSE 2
    END AS specificity
  FROM public.ci_threshold_rules r
  WHERE r.is_active = true
),
-- For each client × metric × severity, find the best matching rule
effective AS (
  SELECT DISTINCT ON (c.client_id, r.metric_key, r.severity)
    c.client_id,
    c.agency_id,
    r.metric_key,
    r.severity,
    r.comparator,
    r.threshold_numeric,
    r.rule_id
  FROM public.clients c
  CROSS JOIN ranked_rules r
  WHERE c.active = true
    AND (r.client_id IS NULL OR r.client_id = c.client_id)
    AND (r.agency_id IS NULL OR r.agency_id = c.agency_id)
    AND (r.setting IS NULL OR r.setting = c.primary_setting)
    AND (r.phase IS NULL)
    AND (r.behavior_id IS NULL)
  ORDER BY c.client_id, r.metric_key, r.severity, r.specificity ASC, r.updated_at DESC
)
-- Pivot into columnar format
SELECT
  e.client_id,
  e.agency_id,
  -- risk_score thresholds (gte)
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='risk_score' AND e.severity='moderate') AS risk_watch,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='risk_score' AND e.severity='high') AS risk_action,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='risk_score' AND e.severity='critical') AS risk_critical,
  -- trend_score thresholds (gte)
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='trend_score' AND e.severity='moderate') AS trend_watch,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='trend_score' AND e.severity='high') AS trend_action,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='trend_score' AND e.severity='critical') AS trend_critical,
  -- data_freshness thresholds (lte)
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='data_freshness' AND e.severity='moderate') AS freshness_watch,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='data_freshness' AND e.severity='high') AS freshness_action,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='data_freshness' AND e.severity='critical') AS freshness_critical,
  -- fidelity_score thresholds (lte)
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='fidelity_score' AND e.severity='moderate') AS fidelity_watch,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='fidelity_score' AND e.severity='high') AS fidelity_action,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='fidelity_score' AND e.severity='critical') AS fidelity_critical,
  -- goal_velocity_score thresholds (lte)
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='goal_velocity_score' AND e.severity='moderate') AS goal_vel_watch,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='goal_velocity_score' AND e.severity='high') AS goal_vel_action,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='goal_velocity_score' AND e.severity='critical') AS goal_vel_critical,
  -- parent_impl_score thresholds (lte)
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='parent_impl_score' AND e.severity='moderate') AS parent_impl_watch,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='parent_impl_score' AND e.severity='high') AS parent_impl_action,
  MAX(e.threshold_numeric) FILTER (WHERE e.metric_key='parent_impl_score' AND e.severity='critical') AS parent_impl_critical
FROM effective e
GROUP BY e.client_id, e.agency_id;

-- v_ci_stale_leaderboard: clients ordered by lowest data_freshness
CREATE OR REPLACE VIEW public.v_ci_stale_leaderboard AS
SELECT
  m.client_id,
  m.agency_id,
  c.full_name AS client_name,
  a.name AS agency_name,
  m.data_freshness,
  m.updated_at AS metrics_updated_at,
  c.primary_supervisor_staff_id
FROM public.ci_client_metrics m
JOIN public.clients c ON c.client_id = m.client_id AND c.active = true
JOIN public.agencies a ON a.id = m.agency_id
ORDER BY m.data_freshness ASC NULLS FIRST;
