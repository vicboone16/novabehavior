
-- Behavior Event Intelligence: antecedent/consequence/time-of-day pattern summaries per student
-- Built on top of existing abc_logs, session_data, v_behavior_patterns, and sessions tables

DROP VIEW IF EXISTS public.v_behavior_event_intelligence;

CREATE VIEW public.v_behavior_event_intelligence WITH (security_invoker = on) AS
WITH abc_enriched AS (
  SELECT
    a.client_id AS student_id,
    a.behavior,
    a.antecedent,
    a.consequence,
    a.intensity,
    a.duration_seconds,
    a.logged_at,
    CASE
      WHEN EXTRACT(HOUR FROM a.logged_at::timestamp) < 10 THEN 'morning'
      WHEN EXTRACT(HOUR FROM a.logged_at::timestamp) < 12 THEN 'midday'
      WHEN EXTRACT(HOUR FROM a.logged_at::timestamp) < 14 THEN 'lunch_recess'
      WHEN EXTRACT(HOUR FROM a.logged_at::timestamp) < 15 THEN 'afternoon'
      ELSE 'late_afternoon'
    END AS time_block,
    -- Pattern detection via keyword matching on antecedent
    CASE
      WHEN lower(a.antecedent) ~ '(transition|moving|switch|change|walk)' THEN 'transition'
      WHEN lower(a.antecedent) ~ '(unstructured|free|choice|recess|playground|lunch)' THEN 'unstructured'
      WHEN lower(a.antecedent) ~ '(demand|task|work|instruction|direction|asked)' THEN 'demand'
      WHEN lower(a.antecedent) ~ '(denied|told no|removed|taken|loss|can''t)' THEN 'denial'
      WHEN lower(a.antecedent) ~ '(alone|ignored|no attention|left|waiting)' THEN 'low_attention'
      ELSE 'other'
    END AS trigger_context,
    -- Function hypothesis from consequence
    CASE
      WHEN lower(a.consequence) ~ '(escape|avoid|removed|left|break|stop)' THEN 'escape'
      WHEN lower(a.consequence) ~ '(attention|talk|look|respond|comfort|redirect)' THEN 'attention'
      WHEN lower(a.consequence) ~ '(access|given|got|provide|item|activity)' THEN 'tangible'
      WHEN lower(a.consequence) ~ '(self|sensory|stim|automatic|alone)' THEN 'automatic'
      ELSE 'undetermined'
    END AS function_hypothesis
  FROM public.abc_logs a
  WHERE a.logged_at >= (now() - INTERVAL '90 days')
),
-- Antecedent pattern counts
antecedent_counts AS (
  SELECT
    student_id,
    antecedent,
    count(*) AS ant_count,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY count(*) DESC) AS ant_rank
  FROM abc_enriched
  GROUP BY student_id, antecedent
),
-- Consequence pattern counts
consequence_counts AS (
  SELECT
    student_id,
    consequence,
    count(*) AS con_count,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY count(*) DESC) AS con_rank
  FROM abc_enriched
  GROUP BY student_id, consequence
),
-- Time block risk
time_block_counts AS (
  SELECT
    student_id,
    time_block,
    count(*) AS block_count,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY count(*) DESC) AS block_rank
  FROM abc_enriched
  GROUP BY student_id, time_block
),
-- Trigger context counts
trigger_counts AS (
  SELECT
    student_id,
    trigger_context,
    count(*) AS trig_count,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY count(*) DESC) AS trig_rank
  FROM abc_enriched
  GROUP BY student_id, trigger_context
),
-- Function hypothesis counts
function_counts AS (
  SELECT
    student_id,
    function_hypothesis,
    count(*) AS func_count,
    ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY count(*) DESC) AS func_rank
  FROM abc_enriched
  GROUP BY student_id, function_hypothesis
),
-- Student-level aggregation
student_summary AS (
  SELECT
    e.student_id,
    count(*) AS total_abc_events,
    count(*) FILTER (WHERE e.trigger_context = 'transition') AS transition_events,
    count(*) FILTER (WHERE e.trigger_context = 'unstructured') AS unstructured_events,
    count(*) FILTER (WHERE e.time_block = 'lunch_recess') AS lunch_recess_events,
    count(*) FILTER (WHERE e.trigger_context = 'demand') AS demand_events,
    count(*) FILTER (WHERE e.trigger_context = 'denial') AS denial_events,
    count(*) FILTER (WHERE e.trigger_context = 'low_attention') AS low_attention_events,
    count(*) FILTER (WHERE e.function_hypothesis = 'escape') AS escape_function_count,
    count(*) FILTER (WHERE e.function_hypothesis = 'attention') AS attention_function_count,
    count(*) FILTER (WHERE e.function_hypothesis = 'tangible') AS tangible_function_count,
    count(*) FILTER (WHERE e.function_hypothesis = 'automatic') AS automatic_function_count,
    avg(e.intensity) AS avg_intensity,
    avg(e.duration_seconds) AS avg_duration_seconds
  FROM abc_enriched e
  GROUP BY e.student_id
)
SELECT
  ss.student_id,
  ss.total_abc_events,
  -- Top antecedent patterns (top 3)
  (SELECT ant.antecedent FROM antecedent_counts ant WHERE ant.student_id = ss.student_id AND ant.ant_rank = 1) AS top_antecedent_1,
  (SELECT ant.ant_count FROM antecedent_counts ant WHERE ant.student_id = ss.student_id AND ant.ant_rank = 1) AS top_antecedent_1_count,
  (SELECT ant.antecedent FROM antecedent_counts ant WHERE ant.student_id = ss.student_id AND ant.ant_rank = 2) AS top_antecedent_2,
  (SELECT ant.ant_count FROM antecedent_counts ant WHERE ant.student_id = ss.student_id AND ant.ant_rank = 2) AS top_antecedent_2_count,
  (SELECT ant.antecedent FROM antecedent_counts ant WHERE ant.student_id = ss.student_id AND ant.ant_rank = 3) AS top_antecedent_3,
  (SELECT ant.ant_count FROM antecedent_counts ant WHERE ant.student_id = ss.student_id AND ant.ant_rank = 3) AS top_antecedent_3_count,
  -- Top consequence patterns (top 3)
  (SELECT con.consequence FROM consequence_counts con WHERE con.student_id = ss.student_id AND con.con_rank = 1) AS top_consequence_1,
  (SELECT con.con_count FROM consequence_counts con WHERE con.student_id = ss.student_id AND con.con_rank = 1) AS top_consequence_1_count,
  (SELECT con.consequence FROM consequence_counts con WHERE con.student_id = ss.student_id AND con.con_rank = 2) AS top_consequence_2,
  (SELECT con.con_count FROM consequence_counts con WHERE con.student_id = ss.student_id AND con.con_rank = 2) AS top_consequence_2_count,
  -- High-risk time block
  (SELECT tb.time_block FROM time_block_counts tb WHERE tb.student_id = ss.student_id AND tb.block_rank = 1) AS peak_risk_time_block,
  (SELECT tb.block_count FROM time_block_counts tb WHERE tb.student_id = ss.student_id AND tb.block_rank = 1) AS peak_risk_time_block_count,
  -- Top trigger context
  (SELECT tc.trigger_context FROM trigger_counts tc WHERE tc.student_id = ss.student_id AND tc.trig_rank = 1) AS top_trigger_context,
  (SELECT tc.trig_count FROM trigger_counts tc WHERE tc.student_id = ss.student_id AND tc.trig_rank = 1) AS top_trigger_context_count,
  -- Top function hypothesis
  (SELECT fc.function_hypothesis FROM function_counts fc WHERE fc.student_id = ss.student_id AND fc.func_rank = 1) AS primary_function_hypothesis,
  (SELECT fc.func_count FROM function_counts fc WHERE fc.student_id = ss.student_id AND fc.func_rank = 1) AS primary_function_count,
  -- Context-specific counts
  ss.transition_events,
  ss.unstructured_events,
  ss.lunch_recess_events,
  ss.demand_events,
  ss.denial_events,
  ss.low_attention_events,
  ss.escape_function_count,
  ss.attention_function_count,
  ss.tangible_function_count,
  ss.automatic_function_count,
  ss.avg_intensity,
  ss.avg_duration_seconds,
  -- Risk flags (boolean-like)
  CASE WHEN ss.transition_events::numeric / NULLIF(ss.total_abc_events, 0) >= 0.25 THEN true ELSE false END AS transition_risk_flag,
  CASE WHEN ss.unstructured_events::numeric / NULLIF(ss.total_abc_events, 0) >= 0.25 THEN true ELSE false END AS unstructured_risk_flag,
  CASE WHEN ss.lunch_recess_events::numeric / NULLIF(ss.total_abc_events, 0) >= 0.20 THEN true ELSE false END AS lunch_recess_risk_flag,
  CASE WHEN ss.escape_function_count::numeric / NULLIF(ss.total_abc_events, 0) >= 0.40 THEN true ELSE false END AS escape_pattern_flag,
  CASE WHEN ss.attention_function_count::numeric / NULLIF(ss.total_abc_events, 0) >= 0.40 THEN true ELSE false END AS attention_pattern_flag
FROM student_summary ss;
