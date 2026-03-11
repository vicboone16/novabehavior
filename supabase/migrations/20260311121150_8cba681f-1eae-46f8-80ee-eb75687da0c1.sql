
-- Risk inputs view (from behavior metrics)
CREATE OR REPLACE VIEW public.v_student_risk_inputs AS
SELECT
  b.student_id,
  max(b.session_day) AS last_day,
  count(*) FILTER (WHERE b.session_day >= (current_date - 7)) AS sessions_last_7d,
  sum(coalesce(b.frequency_plot,0)) FILTER (WHERE b.session_day >= (current_date - 7)) AS freq_7d,
  sum(coalesce(b.frequency_plot,0)) FILTER (WHERE b.session_day >= (current_date - 1)) AS freq_1d,
  CASE
    WHEN sum(coalesce(b.frequency_plot,0)) FILTER (WHERE b.session_day = current_date) >
         (sum(coalesce(b.frequency_plot,0)) FILTER (WHERE b.session_day >= (current_date - 7)) / greatest(1, count(DISTINCT b.session_day) FILTER (WHERE b.session_day >= (current_date - 7))))
    THEN 1 ELSE 0
  END AS spike_today
FROM public.v_behavior_session_metrics_v3 b
GROUP BY b.student_id;

-- Risk scores view
CREATE OR REPLACE VIEW public.v_student_risk_scores AS
SELECT
  s.id AS student_id,
  s.school_id,
  s.classroom_id,
  round(
    (coalesce(i.freq_7d,0) * 2.0) +
    (coalesce(i.freq_1d,0) * 3.0) +
    (coalesce(i.spike_today,0) * 10.0)
  ,2) AS risk_score,
  CASE
    WHEN ((coalesce(i.freq_7d,0) * 2.0) + (coalesce(i.freq_1d,0) * 3.0) + (coalesce(i.spike_today,0) * 10.0)) >= 80 THEN 'critical'
    WHEN ((coalesce(i.freq_7d,0) * 2.0) + (coalesce(i.freq_1d,0) * 3.0) + (coalesce(i.spike_today,0) * 10.0)) >= 50 THEN 'high'
    WHEN ((coalesce(i.freq_7d,0) * 2.0) + (coalesce(i.freq_1d,0) * 3.0) + (coalesce(i.spike_today,0) * 10.0)) >= 20 THEN 'moderate'
    ELSE 'low'
  END AS risk_level,
  jsonb_build_object(
    'freq_7d', coalesce(i.freq_7d,0),
    'freq_1d', coalesce(i.freq_1d,0),
    'spike_today', coalesce(i.spike_today,0),
    'sessions_last_7d', coalesce(i.sessions_last_7d,0)
  ) AS drivers
FROM public.students s
LEFT JOIN public.v_student_risk_inputs i ON i.student_id = s.id;

-- Classroom control panel view
CREATE OR REPLACE VIEW public.v_classroom_control_panel AS
SELECT
  c.id AS classroom_id,
  c.name AS classroom_name,
  c.grade_level,
  c.classroom_type,
  s.id AS student_id,
  s.first_name,
  s.last_name,
  rs.risk_score,
  rs.risk_level,
  rs.drivers,
  mp.tier AS mtss_tier,
  mp.status AS mtss_status,
  mp.next_review_date
FROM public.classrooms c
JOIN public.students s ON s.classroom_id = c.id
LEFT JOIN public.v_student_risk_scores rs ON rs.student_id = s.id
LEFT JOIN LATERAL (
  SELECT p.*
  FROM public.student_mtss_plans p
  WHERE p.student_id = s.id
  ORDER BY p.created_at DESC
  LIMIT 1
) mp ON true;

-- Incident report view
CREATE OR REPLACE VIEW public.v_incident_report AS
SELECT
  i.id AS incident_id,
  i.student_id,
  i.classroom_id,
  i.school_id,
  i.district_id,
  i.incident_type,
  i.severity,
  i.injuries,
  i.removal_required,
  i.incident_start,
  i.incident_end,
  i.summary,
  jsonb_agg(
    jsonb_build_object(
      'time', e.event_time,
      'type', e.event_type,
      'intensity', e.intensity,
      'details', e.details,
      'metadata', e.metadata
    ) ORDER BY e.event_time ASC
  ) AS timeline
FROM public.incidents i
LEFT JOIN public.incident_events e ON e.incident_id = i.id
GROUP BY i.id;

-- Plan fidelity summary view
CREATE OR REPLACE VIEW public.v_plan_fidelity_summary AS
SELECT
  p.id AS plan_id,
  p.student_id,
  date_trunc('day', l.log_time)::date AS day,
  count(*) AS steps_logged,
  round(avg(CASE WHEN l.completed THEN 1 ELSE 0 END)::numeric * 100, 1) AS fidelity_pct
FROM public.student_behavior_plans p
JOIN public.plan_step_logs l ON l.plan_id = p.id
GROUP BY p.id, p.student_id, date_trunc('day', l.log_time)::date;
