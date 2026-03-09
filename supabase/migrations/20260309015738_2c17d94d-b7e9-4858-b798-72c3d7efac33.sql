
-- Drop existing views in reverse dependency order
DROP VIEW IF EXISTS public.v_replacement_behavior_context_summary;
DROP VIEW IF EXISTS public.v_behavior_event_intelligence_summary;
DROP VIEW IF EXISTS public.v_behavior_event_source_enriched;
DROP VIEW IF EXISTS public.v_behavior_event_source_normalized;

-- ============================================================
-- v_behavior_event_source_normalized
-- Unified event stream across all behavior data sources
-- Column adaptations based on actual schema:
--   session_data: behavior_name (not "behavior"), no value_text
--   abc_logs: client_id (not student_id), no event_date
--   teacher_data_points: client_id (not student_id), no behavior_name/event_type
--   toi_daily_logs: no event_name/log_type
--   context_barriers_events: display_label/event_type/event_group (not event_name/barrier_type)
-- ============================================================
CREATE VIEW public.v_behavior_event_source_normalized WITH (security_invoker = on) AS

-- session_data branch
SELECT
    s.student_id,
    s.created_at AS event_time,
    CAST(s.created_at AS date) AS event_date,
    COALESCE(s.behavior_name, s.event_type, 'behavior_event') AS behavior_name,
    NULL::text AS antecedent,
    NULL::text AS consequence,
    NULL::text AS setting_name,
    NULL::text AS activity_name,
    NULL::text AS routine_name,
    NULL::text AS staff_name,
    NULL::text AS intervention_phase,
    NULL::text AS replacement_behavior_name,
    'session_data' AS source_table,
    NULL::text AS notes
FROM public.session_data s

UNION ALL

-- abc_logs branch
SELECT
    a.client_id AS student_id,
    a.created_at AS event_time,
    CAST(a.logged_at AS date) AS event_date,
    COALESCE(a.behavior, 'behavior_event') AS behavior_name,
    a.antecedent,
    a.consequence,
    NULL::text AS setting_name,
    NULL::text AS activity_name,
    NULL::text AS routine_name,
    NULL::text AS staff_name,
    NULL::text AS intervention_phase,
    NULL::text AS replacement_behavior_name,
    'abc_logs' AS source_table,
    a.notes
FROM public.abc_logs a

UNION ALL

-- teacher_data_points branch
SELECT
    t.client_id AS student_id,
    t.created_at AS event_time,
    CAST(t.occurred_at AS date) AS event_date,
    COALESCE(t.value_text, 'behavior_event') AS behavior_name,
    NULL::text AS antecedent,
    NULL::text AS consequence,
    NULL::text AS setting_name,
    NULL::text AS activity_name,
    NULL::text AS routine_name,
    NULL::text AS staff_name,
    NULL::text AS intervention_phase,
    NULL::text AS replacement_behavior_name,
    'teacher_data_points' AS source_table,
    t.notes
FROM public.teacher_data_points t

UNION ALL

-- toi_daily_logs branch
SELECT
    l.student_id,
    l.created_at AS event_time,
    l.log_date::date AS event_date,
    COALESCE(l.status, 'behavior_event') AS behavior_name,
    NULL::text AS antecedent,
    NULL::text AS consequence,
    NULL::text AS setting_name,
    NULL::text AS activity_name,
    NULL::text AS routine_name,
    NULL::text AS staff_name,
    NULL::text AS intervention_phase,
    NULL::text AS replacement_behavior_name,
    'toi_daily_logs' AS source_table,
    l.notes
FROM public.toi_daily_logs l

UNION ALL

-- context_barriers_events branch
SELECT
    c.student_id,
    c.created_at AS event_time,
    CAST(c.start_time AS date) AS event_date,
    COALESCE(c.display_label, c.event_type::text, 'context_barrier_event') AS behavior_name,
    NULL::text AS antecedent,
    NULL::text AS consequence,
    c.location::text AS setting_name,
    NULL::text AS activity_name,
    NULL::text AS routine_name,
    NULL::text AS staff_name,
    NULL::text AS intervention_phase,
    NULL::text AS replacement_behavior_name,
    'context_barriers_events' AS source_table,
    c.notes
FROM public.context_barriers_events c;

-- ============================================================
-- v_behavior_event_source_enriched
-- Adds time-of-day buckets and risk flags via keyword matching
-- ============================================================
CREATE VIEW public.v_behavior_event_source_enriched WITH (security_invoker = on) AS
SELECT
    e.*,
    CASE
        WHEN EXTRACT(HOUR FROM e.event_time) BETWEEN 6 AND 9 THEN 'arrival_morning'
        WHEN EXTRACT(HOUR FROM e.event_time) BETWEEN 10 AND 11 THEN 'mid_morning'
        WHEN EXTRACT(HOUR FROM e.event_time) BETWEEN 12 AND 13 THEN 'lunch_window'
        WHEN EXTRACT(HOUR FROM e.event_time) BETWEEN 14 AND 15 THEN 'afternoon'
        ELSE 'other'
    END AS time_of_day_bucket,
    CASE
        WHEN COALESCE(e.antecedent,'') ILIKE '%transition%' THEN true
        WHEN COALESCE(e.activity_name,'') ILIKE '%transition%' THEN true
        WHEN COALESCE(e.routine_name,'') ILIKE '%transition%' THEN true
        ELSE false
    END AS transition_risk_flag,
    CASE
        WHEN COALESCE(e.antecedent,'') ILIKE '%unstructured%' THEN true
        WHEN COALESCE(e.activity_name,'') ILIKE '%unstructured%' THEN true
        WHEN COALESCE(e.routine_name,'') ILIKE '%recess%' THEN true
        WHEN COALESCE(e.routine_name,'') ILIKE '%free%' THEN true
        ELSE false
    END AS unstructured_time_risk_flag,
    CASE
        WHEN COALESCE(e.antecedent,'') ILIKE '%lunch%' THEN true
        WHEN COALESCE(e.routine_name,'') ILIKE '%lunch%' THEN true
        WHEN COALESCE(e.activity_name,'') ILIKE '%lunch%' THEN true
        ELSE false
    END AS lunch_time_risk_flag,
    CASE
        WHEN COALESCE(e.consequence,'') ILIKE '%escape%' THEN true
        WHEN COALESCE(e.antecedent,'') ILIKE '%demand%' THEN true
        WHEN COALESCE(e.antecedent,'') ILIKE '%task%' THEN true
        ELSE false
    END AS escape_pattern_flag,
    CASE
        WHEN COALESCE(e.consequence,'') ILIKE '%attention%' THEN true
        WHEN COALESCE(e.consequence,'') ILIKE '%redirect%' THEN true
        WHEN COALESCE(e.consequence,'') ILIKE '%talk%' THEN true
        ELSE false
    END AS attention_pattern_flag
FROM public.v_behavior_event_source_normalized e;

-- ============================================================
-- v_behavior_event_intelligence_summary
-- Per-student aggregation with top patterns
-- ============================================================
CREATE VIEW public.v_behavior_event_intelligence_summary WITH (security_invoker = on) AS
WITH base AS (
    SELECT * FROM public.v_behavior_event_source_enriched
),
top_time AS (
    SELECT DISTINCT ON (student_id)
        student_id,
        time_of_day_bucket AS top_time_of_day,
        COUNT(*) OVER (PARTITION BY student_id, time_of_day_bucket) AS bucket_count
    FROM base
    ORDER BY student_id, COUNT(*) OVER (PARTITION BY student_id, time_of_day_bucket) DESC, time_of_day_bucket
),
top_antecedent AS (
    SELECT DISTINCT ON (student_id)
        student_id,
        antecedent AS top_antecedent_pattern
    FROM base
    WHERE antecedent IS NOT NULL AND TRIM(antecedent) <> ''
    ORDER BY student_id, COUNT(*) OVER (PARTITION BY student_id, antecedent) DESC, antecedent
),
top_consequence AS (
    SELECT DISTINCT ON (student_id)
        student_id,
        consequence AS top_consequence_pattern
    FROM base
    WHERE consequence IS NOT NULL AND TRIM(consequence) <> ''
    ORDER BY student_id, COUNT(*) OVER (PARTITION BY student_id, consequence) DESC, consequence
),
top_behavior AS (
    SELECT DISTINCT ON (student_id)
        student_id,
        behavior_name AS top_behavior_name
    FROM base
    ORDER BY student_id, COUNT(*) OVER (PARTITION BY student_id, behavior_name) DESC, behavior_name
)
SELECT
    b.student_id,
    tb.top_behavior_name AS behavior_name,
    tt.top_time_of_day,
    ta.top_antecedent_pattern,
    tc.top_consequence_pattern,
    MAX(CASE WHEN b.transition_risk_flag THEN 1 ELSE 0 END)::boolean AS transition_risk_flag,
    MAX(CASE WHEN b.unstructured_time_risk_flag THEN 1 ELSE 0 END)::boolean AS unstructured_time_risk_flag,
    MAX(CASE WHEN b.lunch_time_risk_flag THEN 1 ELSE 0 END)::boolean AS lunch_time_risk_flag,
    MAX(CASE WHEN b.escape_pattern_flag THEN 1 ELSE 0 END)::boolean AS escape_pattern_flag,
    MAX(CASE WHEN b.attention_pattern_flag THEN 1 ELSE 0 END)::boolean AS attention_pattern_flag,
    COUNT(*) AS total_behavior_events,
    MIN(b.event_date) AS first_event_date,
    MAX(b.event_date) AS last_event_date
FROM base b
LEFT JOIN top_time tt ON tt.student_id = b.student_id
LEFT JOIN top_antecedent ta ON ta.student_id = b.student_id
LEFT JOIN top_consequence tc ON tc.student_id = b.student_id
LEFT JOIN top_behavior tb ON tb.student_id = b.student_id
GROUP BY
    b.student_id,
    tb.top_behavior_name,
    tt.top_time_of_day,
    ta.top_antecedent_pattern,
    tc.top_consequence_pattern;

-- ============================================================
-- v_replacement_behavior_context_summary
-- Replacement behavior strength by context/time bucket
-- ============================================================
CREATE VIEW public.v_replacement_behavior_context_summary WITH (security_invoker = on) AS
SELECT
    e.student_id,
    e.time_of_day_bucket,
    e.transition_risk_flag,
    e.unstructured_time_risk_flag,
    e.lunch_time_risk_flag,
    COUNT(*) FILTER (WHERE COALESCE(e.replacement_behavior_name,'') <> '') AS replacement_behavior_events,
    COUNT(*) AS total_events
FROM public.v_behavior_event_source_enriched e
GROUP BY
    e.student_id,
    e.time_of_day_bucket,
    e.transition_risk_flag,
    e.unstructured_time_risk_flag,
    e.lunch_time_risk_flag;
