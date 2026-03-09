
DROP VIEW IF EXISTS public.v_student_connect_intel_alerts CASCADE;
DROP VIEW IF EXISTS public.v_student_intelligence_summary CASCADE;
DROP VIEW IF EXISTS public.v_clinical_intelligence_alert_rollup CASCADE;
DROP VIEW IF EXISTS public.v_clinical_intelligence_alerts CASCADE;

CREATE VIEW public.v_clinical_intelligence_alerts AS
SELECT
  a.id AS alert_id,
  a.agency_id,
  a.client_id,
  s.first_name || ' ' || s.last_name AS client_name,
  a.severity,
  a.category AS alert_type,
  a.message AS title,
  a.message AS summary,
  CASE
    WHEN a.category ILIKE '%behavior%' OR a.category ILIKE '%replacement%' THEN 'behavior'
    WHEN a.category ILIKE '%skill%' OR a.category ILIKE '%mastery%' OR a.category ILIKE '%target%' THEN 'skill'
    WHEN a.category ILIKE '%caregiver%' OR a.category ILIKE '%parent%' THEN 'caregiver'
    WHEN a.category ILIKE '%supervision%' THEN 'supervision'
    WHEN a.category ILIKE '%auth%' OR a.category ILIKE '%utilization%' THEN 'clinical_tracking'
    WHEN a.category ILIKE '%programming%' OR a.category ILIKE '%intervention%' THEN 'programming'
    ELSE 'general'
  END AS domain,
  COALESCE(a.explanation_json->>'suggestion', '') AS suggested_action,
  a.created_at,
  a.resolved_at,
  a.resolved_by,
  'ci_engine' AS source
FROM public.ci_alerts a
LEFT JOIN public.students s ON s.id = a.client_id;

CREATE VIEW public.v_clinical_intelligence_alert_rollup AS
SELECT
  a.agency_id,
  COUNT(*) FILTER (WHERE a.resolved_at IS NULL) AS total_open,
  COUNT(*) FILTER (WHERE a.resolved_at IS NULL AND a.severity IN ('critical','action','high')) AS high_priority,
  COUNT(*) FILTER (WHERE a.resolved_at IS NULL AND a.category ILIKE '%behavior%') AS behavior_alerts,
  COUNT(*) FILTER (WHERE a.resolved_at IS NULL AND (a.category ILIKE '%skill%' OR a.category ILIKE '%mastery%' OR a.category ILIKE '%target%')) AS skill_alerts,
  COUNT(*) FILTER (WHERE a.resolved_at IS NULL AND (a.category ILIKE '%caregiver%' OR a.category ILIKE '%parent%')) AS caregiver_alerts,
  COUNT(*) FILTER (WHERE a.resolved_at IS NULL AND a.category ILIKE '%supervision%') AS supervision_alerts,
  COUNT(*) FILTER (WHERE a.resolved_at IS NULL AND (a.category ILIKE '%programming%' OR a.category ILIKE '%intervention%')) AS programming_alerts
FROM public.ci_alerts a
GROUP BY a.agency_id;

CREATE VIEW public.v_student_intelligence_summary AS
SELECT
  s.id AS student_id,
  s.agency_id,
  s.first_name || ' ' || s.last_name AS student_name,
  COALESCE(sk.total_targets, 0) AS total_targets,
  COALESCE(sk.mastered_targets, 0) AS mastered_targets,
  COALESCE(sk.in_progress_targets, 0) AS in_progress_targets,
  COALESCE(sk.stalled_targets, 0) AS stalled_targets,
  COALESCE(m.risk_score, 0) AS risk_score,
  COALESCE(m.trend_score, 0) AS trend_score,
  COALESCE(ac.open_alert_count, 0) AS open_alert_count,
  COALESCE(rb.weak_replacements, 0) AS weak_replacements,
  COALESCE(rb.strong_replacements, 0) AS strong_replacements
FROM public.students s
LEFT JOIN public.ci_client_metrics m ON m.client_id = s.id
LEFT JOIN (
  SELECT student_id,
    COUNT(*) AS total_targets,
    COUNT(*) FILTER (WHERE mastery_status = 'mastered') AS mastered_targets,
    COUNT(*) FILTER (WHERE mastery_status = 'in_progress') AS in_progress_targets,
    COUNT(*) FILTER (WHERE mastery_status = 'in_progress' AND COALESCE(percent_to_mastery,0) < 50 AND consecutive_sessions_at_criterion = 0) AS stalled_targets
  FROM public.student_targets GROUP BY student_id
) sk ON sk.student_id = s.id
LEFT JOIN (
  SELECT client_id, COUNT(*) AS open_alert_count
  FROM public.ci_alerts WHERE resolved_at IS NULL GROUP BY client_id
) ac ON ac.client_id = s.id
LEFT JOIN (
  SELECT student_id,
    COUNT(*) FILTER (WHERE replacement_status = 'weak') AS weak_replacements,
    COUNT(*) FILTER (WHERE replacement_status = 'strong') AS strong_replacements
  FROM public.student_bx_plan_links GROUP BY student_id
) rb ON rb.student_id = s.id;

CREATE VIEW public.v_student_connect_intel_alerts AS
SELECT
  a.id AS alert_id,
  a.client_id AS student_id,
  a.agency_id,
  CASE
    WHEN a.category ILIKE '%ready_to_advance%' OR a.category ILIKE '%mastered%' THEN 'Making strong progress'
    WHEN a.category ILIKE '%emerging%' THEN 'Positive replacement progress'
    WHEN a.category ILIKE '%strong_replacement%' THEN 'Strong support skill in use'
    WHEN a.category ILIKE '%skill%' OR a.category ILIKE '%target%' THEN 'Skill progress update'
    WHEN a.category ILIKE '%behavior%' THEN 'Behavior support update'
    WHEN a.category ILIKE '%caregiver%' THEN 'Caregiver training update'
    ELSE 'Progress update'
  END AS friendly_title,
  CASE
    WHEN a.severity IN ('critical','action','high') THEN 'needs_attention'
    WHEN a.category ILIKE '%ready_to_advance%' OR a.category ILIKE '%mastered%' OR a.category ILIKE '%strong%' THEN 'positive'
    ELSE 'neutral'
  END AS tone,
  a.created_at,
  a.resolved_at
FROM public.ci_alerts a
WHERE a.client_id IS NOT NULL
  AND a.resolved_at IS NULL
  AND a.category NOT ILIKE '%supervision%'
  AND a.category NOT ILIKE '%auth%'
  AND a.category NOT ILIKE '%billing%'
  AND a.category NOT ILIKE '%utilization%'
  AND a.category NOT ILIKE '%fidelity%';
