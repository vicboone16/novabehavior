
-- Recreate clients view (was dropped by CASCADE)
CREATE OR REPLACE VIEW public.clients WITH (security_invoker = on) AS
SELECT
  s.id AS client_id, s.agency_id,
  ((COALESCE(s.is_archived, false) = false) AND (s.archived_at IS NULL)) AS active,
  COALESCE(NULLIF(s.preferred_name, ''), NULLIF(s.display_name, ''), NULLIF(TRIM(BOTH FROM (COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, ''))), ''), NULLIF(s.name, '')) AS full_name,
  s.first_name, s.last_name, s.grade, s.school_name, s.district_name,
  s.primary_setting, s.communication_level, s.diagnosis_cluster, s.date_of_birth,
  CASE WHEN s.date_of_birth IS NOT NULL THEN EXTRACT(year FROM age(CURRENT_DATE::timestamp, s.date_of_birth::timestamp))::integer ELSE NULL END AS age_years,
  s.case_opened_date, s.case_closed_date, s.activation_status,
  s.created_at, s.updated_at
FROM public.students s WHERE s.agency_id IS NOT NULL;

-- CI views
CREATE OR REPLACE VIEW v_ci_client_last_activity WITH (security_invoker = on) AS
WITH last_behavior AS (
  SELECT be.client_id, max(be.occurred_at) AS last_behavior_at FROM behavior_events be GROUP BY be.client_id
),
last_goal AS (
  SELECT g.client_id, max(gd.created_at) AS last_goal_data_at FROM goals g JOIN goal_data gd ON gd.goal_id = g.goal_id GROUP BY g.client_id
)
SELECT c.client_id,
  greatest(coalesce(lb.last_behavior_at, '1970-01-01'::timestamptz), coalesce(lg.last_goal_data_at, '1970-01-01'::timestamptz)) AS last_activity_at
FROM clients c LEFT JOIN last_behavior lb ON lb.client_id = c.client_id LEFT JOIN last_goal lg ON lg.client_id = c.client_id;

CREATE OR REPLACE VIEW v_ci_caseload_feed WITH (security_invoker = on) AS
WITH latest_hypothesis AS (
  SELECT DISTINCT ON (h.client_id) h.client_id, h.function_primary, h.function_secondary, h.effective_date
  FROM fba_hypotheses h WHERE (h.end_date IS NULL OR h.end_date >= current_date)
  ORDER BY h.client_id, h.effective_date DESC, h.created_at DESC
),
open_alert_counts AS (
  SELECT a.agency_id, a.client_id, a.data_source_id,
    count(*) FILTER (WHERE a.resolved_at IS NULL) AS open_alerts_total,
    count(*) FILTER (WHERE a.resolved_at IS NULL AND a.severity = 'critical') AS open_alerts_critical,
    count(*) FILTER (WHERE a.resolved_at IS NULL AND a.severity = 'high') AS open_alerts_high,
    count(*) FILTER (WHERE a.resolved_at IS NULL AND a.severity = 'medium') AS open_alerts_medium
  FROM ci_alerts a GROUP BY a.agency_id, a.client_id, a.data_source_id
)
SELECT c.agency_id, m.data_source_id, c.client_id, c.full_name AS client_name, c.active AS client_active,
  c.primary_setting, c.communication_level, c.diagnosis_cluster, c.age_years,
  m.risk_score, m.trend_score, m.data_freshness, m.parent_impl_score, m.goal_velocity_score, m.fidelity_score,
  m.updated_at AS metrics_updated_at,
  lh.function_primary, lh.function_secondary,
  la.last_activity_at, date_part('day', (now() - la.last_activity_at))::int AS days_since_last_activity,
  coalesce(oac.open_alerts_total, 0)::int AS open_alerts_total,
  coalesce(oac.open_alerts_critical, 0)::int AS open_alerts_critical,
  coalesce(oac.open_alerts_high, 0)::int AS open_alerts_high,
  coalesce(oac.open_alerts_medium, 0)::int AS open_alerts_medium
FROM clients c
LEFT JOIN ci_client_metrics m ON m.client_id = c.client_id AND m.agency_id = c.agency_id
LEFT JOIN latest_hypothesis lh ON lh.client_id = c.client_id
LEFT JOIN v_ci_client_last_activity la ON la.client_id = c.client_id
LEFT JOIN open_alert_counts oac ON oac.client_id = c.client_id AND oac.agency_id = c.agency_id
  AND ((oac.data_source_id IS NULL AND m.data_source_id IS NULL) OR (oac.data_source_id = m.data_source_id))
WHERE c.active = true;

CREATE OR REPLACE VIEW v_ci_client_final_score WITH (security_invoker = on) AS
SELECT c.client_id, c.agency_id, sum(cs.score * sc.weight) AS total_risk_score
FROM ci_client_component_scores cs
JOIN ci_score_components sc ON sc.component_id = cs.component_id
JOIN clients c ON c.client_id = cs.client_id
GROUP BY c.client_id, c.agency_id;
