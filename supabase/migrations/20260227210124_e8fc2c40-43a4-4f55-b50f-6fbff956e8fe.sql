
-- Add a proper unique constraint on ci_client_metrics for upsert
CREATE UNIQUE INDEX IF NOT EXISTS ci_client_metrics_client_agency_source_idx
  ON public.ci_client_metrics (client_id, agency_id, COALESCE(data_source_id, '00000000-0000-0000-0000-000000000000'));

-- Replace ci_refresh_metrics with proper upsert using the new constraint
CREATE OR REPLACE FUNCTION public.ci_refresh_metrics(
  _agency_id uuid DEFAULT NULL,
  _data_source_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  rec RECORD;
  upserted integer := 0;
  v_data_freshness numeric;
  v_trend_score numeric;
  v_goal_velocity numeric;
  v_fidelity numeric;
  v_parent_impl numeric;
  v_risk_score numeric;
  now_ts timestamptz := now();
  d14_ago timestamptz := now() - interval '14 days';
  d28_ago timestamptz := now() - interval '28 days';
  last_activity_at timestamptz;
  days_since numeric;
  recent_events bigint;
  prior_events bigint;
  total_targets bigint;
  mastered_targets bigint;
  recent_accuracy numeric;
  total_checks bigint;
  passed_checks bigint;
  avg_competency numeric;
BEGIN
  FOR rec IN
    SELECT s.id AS client_id, s.agency_id
    FROM students s
    WHERE s.is_archived = false
      AND (_agency_id IS NULL OR s.agency_id = _agency_id)
      AND s.agency_id IS NOT NULL
  LOOP
    -- DATA FRESHNESS (0-100)
    SELECT MAX(sd.timestamp) INTO last_activity_at
    FROM session_data sd WHERE sd.student_id = rec.client_id;

    IF last_activity_at IS NULL THEN
      v_data_freshness := 0;
    ELSE
      days_since := EXTRACT(EPOCH FROM (now_ts - last_activity_at)) / 86400.0;
      v_data_freshness := GREATEST(0, LEAST(100, 100 - (days_since * 100.0 / 30.0)));
    END IF;

    -- TREND SCORE (-100 to +100)
    SELECT COUNT(*) INTO recent_events FROM session_data sd
    WHERE sd.student_id = rec.client_id AND sd.event_type = 'frequency' AND sd.timestamp >= d14_ago;
    SELECT COUNT(*) INTO prior_events FROM session_data sd
    WHERE sd.student_id = rec.client_id AND sd.event_type = 'frequency' AND sd.timestamp >= d28_ago AND sd.timestamp < d14_ago;

    IF prior_events = 0 AND recent_events = 0 THEN v_trend_score := 0;
    ELSIF prior_events = 0 THEN v_trend_score := LEAST(100, recent_events * 10);
    ELSE v_trend_score := LEAST(100, GREATEST(-100, ((recent_events - prior_events)::numeric / prior_events::numeric) * 100));
    END IF;

    -- GOAL VELOCITY (0-100)
    SELECT COUNT(*), COUNT(*) FILTER (WHERE st.status = 'mastered')
    INTO total_targets, mastered_targets
    FROM skill_targets st JOIN skill_programs sp ON sp.id = st.program_id
    WHERE sp.student_id = rec.client_id AND st.active = true;

    SELECT COALESCE(AVG(CASE WHEN tt.outcome IN ('correct','independent') THEN 100.0 ELSE 0.0 END), 50)
    INTO recent_accuracy
    FROM target_trials tt JOIN skill_targets st ON st.id = tt.target_id JOIN skill_programs sp ON sp.id = st.program_id
    WHERE sp.student_id = rec.client_id AND tt.recorded_at >= d14_ago;

    IF total_targets = 0 THEN v_goal_velocity := 50;
    ELSE v_goal_velocity := LEAST(100, GREATEST(0, (mastered_targets::numeric / total_targets::numeric) * 100 * 0.4 + recent_accuracy * 0.6));
    END IF;

    -- FIDELITY (0-100)
    SELECT COUNT(*), COUNT(*) FILTER (WHERE cc.passed = true)
    INTO total_checks, passed_checks
    FROM caregiver_competency_checks cc
    WHERE cc.student_id = rec.client_id AND cc.check_date >= (now_ts - interval '30 days')::date;

    IF total_checks = 0 THEN v_fidelity := 50;
    ELSE v_fidelity := (passed_checks::numeric / total_checks::numeric) * 100;
    END IF;

    -- PARENT IMPLEMENTATION (0-100)
    SELECT AVG(cts.competency_rating) INTO avg_competency
    FROM caregiver_training_sessions cts
    WHERE cts.student_id = rec.client_id AND cts.session_date >= (now_ts - interval '14 days')::date;

    IF avg_competency IS NULL THEN v_parent_impl := 50;
    ELSE v_parent_impl := LEAST(100, GREATEST(0, (avg_competency - 1) * 25));
    END IF;

    -- RISK SCORE (0-100)
    v_risk_score := LEAST(100, GREATEST(0,
      (100 - v_data_freshness) * 0.20
      + GREATEST(0, v_trend_score) * 0.25
      + (100 - v_goal_velocity) * 0.20
      + (100 - v_fidelity) * 0.15
      + (100 - v_parent_impl) * 0.20
    ));

    -- UPSERT using composite key
    INSERT INTO ci_client_metrics (client_id, agency_id, data_source_id, data_freshness, trend_score, goal_velocity_score, fidelity_score, parent_impl_score, risk_score, updated_at)
    VALUES (rec.client_id, rec.agency_id, _data_source_id, ROUND(v_data_freshness,2), ROUND(v_trend_score,2), ROUND(v_goal_velocity,2), ROUND(v_fidelity,2), ROUND(v_parent_impl,2), ROUND(v_risk_score,2), now_ts)
    ON CONFLICT (client_id, agency_id, COALESCE(data_source_id, '00000000-0000-0000-0000-000000000000'))
    DO UPDATE SET
      data_freshness = EXCLUDED.data_freshness,
      trend_score = EXCLUDED.trend_score,
      goal_velocity_score = EXCLUDED.goal_velocity_score,
      fidelity_score = EXCLUDED.fidelity_score,
      parent_impl_score = EXCLUDED.parent_impl_score,
      risk_score = EXCLUDED.risk_score,
      updated_at = EXCLUDED.updated_at;

    upserted := upserted + 1;
  END LOOP;

  RETURN upserted;
END;
$fn$;
