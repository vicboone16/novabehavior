
-- Recreate normalized behavior data summary view
CREATE OR REPLACE VIEW public.v_student_behavior_data_summary AS
WITH base AS (
  SELECT
    s.student_id,
    coalesce(d.behavior_name, d.definition_name, 'general_behavior_support') AS raw_behavior_name,
    s.session_date,
    i.observed_present,
    coalesce(d.interval_seconds, 0) AS interval_seconds
  FROM public.mts_interval_data i
  JOIN public.mts_sessions s ON s.id = i.mts_session_id
  LEFT JOIN public.mts_definitions d ON d.id = s.definition_id
),
normalized AS (
  SELECT
    b.student_id,
    b.raw_behavior_name,
    b.session_date,
    b.observed_present,
    b.interval_seconds,
    coalesce(
      n.normalized_behavior_category,
      CASE
        WHEN lower(b.raw_behavior_name) LIKE '%noncompliance%' THEN 'noncompliance'
        WHEN lower(b.raw_behavior_name) LIKE '%refusal%' THEN 'noncompliance'
        WHEN lower(b.raw_behavior_name) LIKE '%verbal aggression%' THEN 'verbal_aggression'
        WHEN lower(b.raw_behavior_name) LIKE '%threat%' THEN 'verbal_aggression'
        WHEN lower(b.raw_behavior_name) LIKE '%argu%' THEN 'verbal_aggression'
        WHEN lower(b.raw_behavior_name) LIKE '%profan%' THEN 'verbal_aggression'
        WHEN lower(b.raw_behavior_name) LIKE '%physical aggression%' THEN 'physical_aggression'
        WHEN lower(b.raw_behavior_name) LIKE '%aggression%' THEN 'physical_aggression'
        WHEN lower(b.raw_behavior_name) LIKE '%property destruction%' THEN 'property_destruction'
        WHEN lower(b.raw_behavior_name) LIKE '%throwing%' THEN 'property_destruction'
        WHEN lower(b.raw_behavior_name) LIKE '%disruptive audible%' THEN 'verbal_disruption'
        WHEN lower(b.raw_behavior_name) LIKE '%calling out%' THEN 'verbal_disruption'
        WHEN lower(b.raw_behavior_name) LIKE '%blurting%' THEN 'verbal_disruption'
        WHEN lower(b.raw_behavior_name) LIKE '%screaming%' THEN 'verbal_disruption'
        WHEN lower(b.raw_behavior_name) LIKE '%yelling%' THEN 'verbal_disruption'
        WHEN lower(b.raw_behavior_name) LIKE '%vocal protest%' THEN 'verbal_disruption'
        WHEN lower(b.raw_behavior_name) LIKE '%elopement%' THEN 'elopement'
        WHEN lower(b.raw_behavior_name) LIKE '%leaving area%' THEN 'elopement'
        WHEN lower(b.raw_behavior_name) LIKE '%wandering%' THEN 'elopement'
        WHEN lower(b.raw_behavior_name) LIKE '%unsafe%' THEN 'unsafe_behavior'
        WHEN lower(b.raw_behavior_name) LIKE '%tantrum%' THEN 'unsafe_behavior'
        WHEN lower(b.raw_behavior_name) LIKE '%out of seat%' THEN 'classroom_disruption'
        WHEN lower(b.raw_behavior_name) LIKE '%out-of-seat%' THEN 'classroom_disruption'
        WHEN lower(b.raw_behavior_name) LIKE '%disruption%' THEN 'classroom_disruption'
        WHEN lower(b.raw_behavior_name) LIKE '%sexualized%' THEN 'verbal_disruption'
        ELSE 'general_behavior_support'
      END
    ) AS behavior_category
  FROM base b
  LEFT JOIN public.behavior_category_normalization n
    ON lower(n.raw_behavior_name) = lower(b.raw_behavior_name)
)
SELECT
  student_id,
  behavior_category,
  count(*) FILTER (WHERE observed_present = true)::int AS frequency_observed,
  count(DISTINCT session_date) FILTER (WHERE observed_present = true)::int AS days_observed,
  avg(CASE WHEN observed_present = true THEN interval_seconds / 60.0 ELSE 0 END)::numeric AS avg_duration_minutes,
  0::numeric AS avg_intensity_score,
  max(session_date) FILTER (WHERE observed_present = true) AS last_observed_at
FROM normalized
GROUP BY student_id, behavior_category;

-- Recreate escalation recommendations view using normalized data
CREATE OR REPLACE VIEW public.v_mtss_escalation_recommendations AS
WITH active_behavior_tiers AS (
  SELECT DISTINCT
    sb.student_id, sb.behavior_category, sb.current_tier,
    sb.mtss_intervention_id, sb.mtss_intervention_name
  FROM public.v_student_mtss_behavior_status sb
),
joined AS (
  SELECT
    abt.student_id, abt.behavior_category, abt.current_tier,
    abt.mtss_intervention_id, abt.mtss_intervention_name,
    coalesce(bs.frequency_observed, 0) AS frequency_observed,
    coalesce(bs.days_observed, 0) AS days_observed,
    coalesce(bs.avg_duration_minutes, 0) AS avg_duration_minutes,
    coalesce(bs.avg_intensity_score, 0) AS avg_intensity_score,
    fs.fidelity_status
  FROM active_behavior_tiers abt
  LEFT JOIN public.v_student_behavior_data_summary bs
    ON bs.student_id = abt.student_id AND bs.behavior_category = abt.behavior_category
  LEFT JOIN public.v_student_mtss_fidelity_summary fs
    ON fs.student_id = abt.student_id AND fs.mtss_intervention_id = abt.mtss_intervention_id
),
rule_matches AS (
  SELECT
    j.student_id, j.behavior_category, j.current_tier,
    j.mtss_intervention_id, j.mtss_intervention_name,
    j.frequency_observed, j.days_observed, j.avg_duration_minutes,
    j.avg_intensity_score, j.fidelity_status,
    r.rule_name, r.recommended_action, r.rationale, r.priority,
    row_number() OVER (
      PARTITION BY j.student_id, j.behavior_category
      ORDER BY r.priority ASC, r.rule_name ASC
    ) AS rn
  FROM joined j
  JOIN public.mtss_escalation_rules r
    ON r.is_active = true
   AND r.current_tier = j.current_tier
   AND (r.behavior_category = j.behavior_category OR r.behavior_category = 'general_behavior_support')
   AND j.frequency_observed >= coalesce(r.min_frequency, 0)
   AND j.days_observed >= coalesce(r.min_days_observed, 0)
   AND j.avg_duration_minutes >= coalesce(r.min_duration_minutes, 0)
   AND j.avg_intensity_score >= coalesce(r.min_intensity_score, 0)
   AND (r.requires_fidelity_check = false
        OR j.fidelity_status IN ('met'::fidelity_rating, 'exceeded'::fidelity_rating)
        OR r.safety_override = true)
)
SELECT
  rm.student_id, rm.behavior_category, rm.current_tier,
  rm.mtss_intervention_id, rm.mtss_intervention_name,
  rm.recommended_action, rm.rule_name AS matched_rule_name, rm.rationale,
  rm.frequency_observed, rm.days_observed, rm.avg_duration_minutes,
  rm.avg_intensity_score, rm.fidelity_status
FROM rule_matches rm
WHERE rm.rn = 1;
