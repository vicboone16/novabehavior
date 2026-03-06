
-- ============================================================
-- 1) Auto-compute intervention outcomes from behavior_events
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_intervention_outcomes(
  p_run_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run record;
  v_baseline_start date;
  v_baseline_end date;
  v_comparison_start date;
  v_comparison_end date;
  v_baseline_val numeric;
  v_comparison_val numeric;
  v_delta numeric;
  v_pct_change numeric;
  v_outcome_label text;
  v_fidelity numeric;
  v_freshness numeric;
  v_confidence numeric;
  v_count int := 0;
  v_metric record;
BEGIN
  SELECT * INTO v_run FROM public.client_intervention_runs WHERE run_id = p_run_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run not found'; END IF;

  -- Define windows: baseline = 14 days before start, comparison = start to end (or now)
  v_baseline_end := v_run.start_date;
  v_baseline_start := v_run.start_date - interval '14 days';
  v_comparison_start := v_run.start_date;
  v_comparison_end := COALESCE(v_run.end_date, current_date);

  -- Skip if comparison window too short
  IF (v_comparison_end - v_comparison_start) < 3 THEN RETURN 0; END IF;

  -- Delete existing auto-computed outcomes for this run
  DELETE FROM public.client_intervention_outcomes
  WHERE run_id = p_run_id AND notes = 'auto-computed';

  -- Compute behavior frequency (if target_behavior_id set)
  IF v_run.target_behavior_id IS NOT NULL THEN
    -- Baseline avg daily frequency
    SELECT COALESCE(COUNT(*)::numeric / GREATEST((v_baseline_end - v_baseline_start), 1), 0)
    INTO v_baseline_val
    FROM public.behavior_events
    WHERE client_id = v_run.client_id
      AND behavior_id = v_run.target_behavior_id
      AND occurred_at >= v_baseline_start
      AND occurred_at < v_baseline_end;

    -- Comparison avg daily frequency
    SELECT COALESCE(COUNT(*)::numeric / GREATEST((v_comparison_end - v_comparison_start), 1), 0)
    INTO v_comparison_val
    FROM public.behavior_events
    WHERE client_id = v_run.client_id
      AND behavior_id = v_run.target_behavior_id
      AND occurred_at >= v_comparison_start
      AND occurred_at <= v_comparison_end;

    v_delta := v_comparison_val - v_baseline_val;
    v_pct_change := CASE WHEN v_baseline_val > 0 THEN ROUND((v_delta / v_baseline_val) * 100, 2) ELSE 0 END;

    -- For behavior reduction, negative change = improved
    IF v_run.expected_outcome_type = 'behavior_reduction' THEN
      v_outcome_label := CASE
        WHEN v_pct_change <= -20 THEN 'improved'
        WHEN v_pct_change >= 20 THEN 'worsened'
        ELSE 'unchanged'
      END;
    ELSE
      -- For replacement behavior increase
      v_outcome_label := CASE
        WHEN v_pct_change >= 20 THEN 'improved'
        WHEN v_pct_change <= -20 THEN 'worsened'
        ELSE 'unchanged'
      END;
    END IF;

    -- Confidence based on data volume and window length
    v_confidence := LEAST(100, (
      CASE WHEN (v_comparison_end - v_comparison_start) >= 14 THEN 30 ELSE ((v_comparison_end - v_comparison_start)::numeric / 14) * 30 END
      + CASE WHEN v_baseline_val > 0 THEN 30 ELSE 10 END
      + LEAST(40, (SELECT COUNT(*) FROM public.behavior_events
                    WHERE client_id = v_run.client_id
                      AND behavior_id = v_run.target_behavior_id
                      AND occurred_at >= v_comparison_start
                      AND occurred_at <= v_comparison_end) * 4)
    ));

    INSERT INTO public.client_intervention_outcomes (
      run_id, agency_id, client_id, metric_key, metric_direction,
      baseline_window_start, baseline_window_end,
      comparison_window_start, comparison_window_end,
      baseline_value, comparison_value, delta_value, percent_change,
      confidence_score, outcome_label, notes
    ) VALUES (
      p_run_id, v_run.agency_id, v_run.client_id,
      'behavior_frequency', 
      CASE WHEN v_run.expected_outcome_type = 'behavior_reduction' THEN 'decrease' ELSE 'increase' END,
      v_baseline_start, v_baseline_end,
      v_comparison_start, v_comparison_end,
      ROUND(v_baseline_val, 2), ROUND(v_comparison_val, 2), ROUND(v_delta, 2), v_pct_change,
      ROUND(v_confidence, 0), v_outcome_label, 'auto-computed'
    );
    v_count := v_count + 1;

    -- Also compute avg duration if available
    SELECT COALESCE(AVG(duration_seconds), 0) INTO v_baseline_val
    FROM public.behavior_events
    WHERE client_id = v_run.client_id
      AND behavior_id = v_run.target_behavior_id
      AND occurred_at >= v_baseline_start AND occurred_at < v_baseline_end
      AND duration_seconds IS NOT NULL AND duration_seconds > 0;

    IF v_baseline_val > 0 THEN
      SELECT COALESCE(AVG(duration_seconds), 0) INTO v_comparison_val
      FROM public.behavior_events
      WHERE client_id = v_run.client_id
        AND behavior_id = v_run.target_behavior_id
        AND occurred_at >= v_comparison_start AND occurred_at <= v_comparison_end
        AND duration_seconds IS NOT NULL AND duration_seconds > 0;

      v_delta := v_comparison_val - v_baseline_val;
      v_pct_change := CASE WHEN v_baseline_val > 0 THEN ROUND((v_delta / v_baseline_val) * 100, 2) ELSE 0 END;
      v_outcome_label := CASE
        WHEN v_run.expected_outcome_type = 'behavior_reduction' AND v_pct_change <= -20 THEN 'improved'
        WHEN v_run.expected_outcome_type = 'behavior_reduction' AND v_pct_change >= 20 THEN 'worsened'
        WHEN v_run.expected_outcome_type != 'behavior_reduction' AND v_pct_change >= 20 THEN 'improved'
        WHEN v_run.expected_outcome_type != 'behavior_reduction' AND v_pct_change <= -20 THEN 'worsened'
        ELSE 'unchanged'
      END;

      INSERT INTO public.client_intervention_outcomes (
        run_id, agency_id, client_id, metric_key, metric_direction,
        baseline_window_start, baseline_window_end,
        comparison_window_start, comparison_window_end,
        baseline_value, comparison_value, delta_value, percent_change,
        confidence_score, outcome_label, notes
      ) VALUES (
        p_run_id, v_run.agency_id, v_run.client_id,
        'behavior_duration', 'decrease',
        v_baseline_start, v_baseline_end,
        v_comparison_start, v_comparison_end,
        ROUND(v_baseline_val, 2), ROUND(v_comparison_val, 2), ROUND(v_delta, 2), v_pct_change,
        ROUND(v_confidence * 0.8, 0), v_outcome_label, 'auto-computed'
      );
      v_count := v_count + 1;
    END IF;
  END IF;

  RETURN v_count;
END;
$$;

-- ============================================================
-- 2) Batch compute outcomes for all active runs in an agency
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_all_intervention_outcomes(
  p_agency_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run record;
  v_total int := 0;
  v_count int;
BEGIN
  FOR v_run IN
    SELECT run_id FROM public.client_intervention_runs
    WHERE agency_id = p_agency_id
      AND implementation_status IN ('active','monitoring')
      AND (end_date IS NULL OR end_date >= current_date - interval '7 days')
  LOOP
    SELECT public.compute_intervention_outcomes(v_run.run_id) INTO v_count;
    v_total := v_total + v_count;
  END LOOP;
  RETURN v_total;
END;
$$;

-- ============================================================
-- 3) Profile-aware pattern summary view
--    Groups effectiveness by function, topography, setting,
--    communication level, age band, diagnosis cluster
-- ============================================================
CREATE OR REPLACE VIEW public.v_intervention_profile_patterns AS
WITH run_profile AS (
  SELECT
    r.run_id,
    r.intervention_id,
    i.title AS intervention_title,
    r.setting,
    r.expected_outcome_type,
    s.communication_level,
    s.diagnosis_cluster,
    CASE
      WHEN EXTRACT(YEAR FROM age(COALESCE(s.dob, s.date_of_birth))) < 6 THEN 'early_childhood'
      WHEN EXTRACT(YEAR FROM age(COALESCE(s.dob, s.date_of_birth))) < 13 THEN 'school_age'
      WHEN EXTRACT(YEAR FROM age(COALESCE(s.dob, s.date_of_birth))) < 18 THEN 'adolescent'
      ELSE 'adult'
    END AS age_band,
    h.function_primary,
    -- Get topography tags for this intervention
    (SELECT array_agg(t.tag_key)
     FROM public.aba_library_intervention_tags it
     JOIN public.aba_library_tags t ON t.tag_id = it.tag_id
     WHERE it.intervention_id = r.intervention_id AND t.tag_type = 'topography'
    ) AS topography_tags,
    o.outcome_label,
    o.confidence_score,
    o.percent_change,
    CASE
      WHEN o.outcome_label = 'improved' AND COALESCE(o.confidence_score, 0) >= 70 THEN 'effective'
      WHEN o.outcome_label = 'worsened' AND COALESCE(o.confidence_score, 0) >= 70 THEN 'ineffective'
      WHEN o.outcome_label = 'unchanged' AND COALESCE(o.confidence_score, 0) >= 70 THEN 'neutral'
      ELSE 'low_confidence'
    END AS effectiveness_status
  FROM public.client_intervention_runs r
  JOIN public.students s ON s.id = r.client_id
  LEFT JOIN public.aba_library_interventions i ON i.intervention_id = r.intervention_id
  LEFT JOIN public.client_intervention_outcomes o ON o.run_id = r.run_id
  LEFT JOIN LATERAL (
    SELECT fh.function_primary
    FROM public.fba_hypotheses fh
    WHERE fh.client_id = r.client_id
      AND (fh.end_date IS NULL OR fh.end_date >= current_date)
    ORDER BY fh.effective_date DESC, fh.created_at DESC
    LIMIT 1
  ) h ON true
)
SELECT
  intervention_id,
  intervention_title,
  function_primary,
  setting,
  communication_level,
  age_band,
  diagnosis_cluster,
  expected_outcome_type,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE effectiveness_status = 'effective') AS effective_runs,
  COUNT(*) FILTER (WHERE effectiveness_status = 'ineffective') AS ineffective_runs,
  COUNT(*) FILTER (WHERE effectiveness_status = 'neutral') AS neutral_runs,
  COUNT(*) FILTER (WHERE effectiveness_status = 'low_confidence') AS low_confidence_runs,
  ROUND(AVG(percent_change), 2) AS avg_percent_change,
  ROUND(AVG(confidence_score), 2) AS avg_confidence,
  ROUND(
    CASE WHEN COUNT(*) > 0
      THEN COUNT(*) FILTER (WHERE effectiveness_status = 'effective')::numeric / COUNT(*)::numeric * 100
      ELSE 0
    END, 2
  ) AS effectiveness_rate_percent
FROM run_profile
GROUP BY intervention_id, intervention_title, function_primary, setting,
         communication_level, age_band, diagnosis_cluster, expected_outcome_type;

-- ============================================================
-- 4) Enrich CID recommendations with effectiveness data
-- ============================================================
CREATE OR REPLACE FUNCTION public.enrich_intervention_recs_with_effectiveness(
  p_client_id uuid
)
RETURNS TABLE (
  intervention_id uuid,
  title text,
  match_score numeric,
  effectiveness_rate numeric,
  avg_confidence numeric,
  similar_client_runs int,
  enriched_reasons jsonb
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH client_profile AS (
    SELECT
      s.id AS client_id,
      s.agency_id,
      s.communication_level,
      s.diagnosis_cluster,
      s.primary_setting,
      CASE
        WHEN EXTRACT(YEAR FROM age(COALESCE(s.dob, s.date_of_birth))) < 6 THEN 'early_childhood'
        WHEN EXTRACT(YEAR FROM age(COALESCE(s.dob, s.date_of_birth))) < 13 THEN 'school_age'
        WHEN EXTRACT(YEAR FROM age(COALESCE(s.dob, s.date_of_birth))) < 18 THEN 'adolescent'
        ELSE 'adult'
      END AS age_band,
      h.function_primary
    FROM public.students s
    LEFT JOIN LATERAL (
      SELECT fh.function_primary
      FROM public.fba_hypotheses fh
      WHERE fh.client_id = s.id
        AND (fh.end_date IS NULL OR fh.end_date >= current_date)
      ORDER BY fh.effective_date DESC, fh.created_at DESC
      LIMIT 1
    ) h ON true
    WHERE s.id = p_client_id
  ),
  similar_effectiveness AS (
    SELECT
      pp.intervention_id,
      pp.effectiveness_rate_percent,
      pp.avg_confidence,
      pp.total_runs
    FROM public.v_intervention_profile_patterns pp
    CROSS JOIN client_profile cp
    WHERE (pp.function_primary = cp.function_primary OR pp.function_primary IS NULL)
      AND (pp.communication_level = cp.communication_level OR pp.communication_level IS NULL)
      AND (pp.age_band = cp.age_band OR pp.age_band IS NULL)
      AND pp.total_runs >= 2
  ),
  agg_eff AS (
    SELECT
      se.intervention_id,
      ROUND(AVG(se.effectiveness_rate_percent), 2) AS effectiveness_rate,
      ROUND(AVG(se.avg_confidence), 2) AS avg_confidence,
      SUM(se.total_runs)::int AS similar_runs
    FROM similar_effectiveness se
    GROUP BY se.intervention_id
  )
  SELECT
    rec.intervention_id,
    i.title,
    rec.score AS match_score,
    COALESCE(ae.effectiveness_rate, 0) AS effectiveness_rate,
    COALESCE(ae.avg_confidence, 0) AS avg_confidence,
    COALESCE(ae.similar_runs, 0) AS similar_client_runs,
    rec.reasons_json || jsonb_build_object(
      'effectiveness_rate_percent', COALESCE(ae.effectiveness_rate, 0),
      'avg_confidence_score', COALESCE(ae.avg_confidence, 0),
      'similar_client_runs', COALESCE(ae.similar_runs, 0),
      'low_confidence_flag', COALESCE(ae.similar_runs, 0) < 5,
      'similar_criteria', jsonb_build_object(
        'function', cp.function_primary,
        'communication_level', cp.communication_level,
        'age_band', cp.age_band
      )
    ) AS enriched_reasons
  FROM public.ci_intervention_recs rec
  JOIN public.aba_library_interventions i ON i.intervention_id = rec.intervention_id
  CROSS JOIN client_profile cp
  LEFT JOIN agg_eff ae ON ae.intervention_id = rec.intervention_id
  WHERE rec.client_id = p_client_id
  ORDER BY rec.score DESC;
$$;
