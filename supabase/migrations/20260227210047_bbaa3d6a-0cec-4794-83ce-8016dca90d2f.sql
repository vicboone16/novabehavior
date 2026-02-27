
-- 1) Add alert_key column + unique constraint for idempotent alerts
ALTER TABLE public.ci_alerts ADD COLUMN IF NOT EXISTS alert_key text;
CREATE UNIQUE INDEX IF NOT EXISTS ci_alerts_alert_key_unresolved_idx
  ON public.ci_alerts (alert_key)
  WHERE resolved_at IS NULL;

-- 2) Performance indexes
CREATE INDEX IF NOT EXISTS idx_session_data_student_ts ON public.session_data (student_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_target_trials_target_ts ON public.target_trials (target_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_ci_metrics_agency_client ON public.ci_client_metrics (agency_id, client_id);
CREATE INDEX IF NOT EXISTS idx_ci_alerts_agency_resolved ON public.ci_alerts (agency_id, resolved_at);

-- 3) ci_refresh_metrics: computes all scores per client, upserts into ci_client_metrics
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
  -- date boundaries
  now_ts timestamptz := now();
  d14_ago timestamptz := now() - interval '14 days';
  d28_ago timestamptz := now() - interval '28 days';
  d30_ago timestamptz := now() - interval '30 days';
  -- temp vars
  last_activity_at timestamptz;
  days_since numeric;
  recent_events bigint;
  prior_events bigint;
  total_targets bigint;
  mastered_targets bigint;
  active_targets bigint;
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
    -- ========== DATA FRESHNESS (0-100) ==========
    SELECT MAX(sd.timestamp) INTO last_activity_at
    FROM session_data sd
    WHERE sd.student_id = rec.client_id;

    IF last_activity_at IS NULL THEN
      v_data_freshness := 0;
    ELSE
      days_since := EXTRACT(EPOCH FROM (now_ts - last_activity_at)) / 86400.0;
      -- 0 days => 100, 30+ days => 0
      v_data_freshness := GREATEST(0, LEAST(100, 100 - (days_since * 100.0 / 30.0)));
    END IF;

    -- ========== TREND SCORE (-100 to +100) ==========
    -- Positive = worsening (more behavior events recently), Negative = improving
    SELECT COUNT(*) INTO recent_events
    FROM session_data sd
    WHERE sd.student_id = rec.client_id
      AND sd.event_type = 'frequency'
      AND sd.timestamp >= d14_ago;

    SELECT COUNT(*) INTO prior_events
    FROM session_data sd
    WHERE sd.student_id = rec.client_id
      AND sd.event_type = 'frequency'
      AND sd.timestamp >= d28_ago
      AND sd.timestamp < d14_ago;

    IF prior_events = 0 AND recent_events = 0 THEN
      v_trend_score := 0;
    ELSIF prior_events = 0 THEN
      v_trend_score := LEAST(100, recent_events * 10); -- new behavior appearing
    ELSE
      -- % change capped at +-100
      v_trend_score := LEAST(100, GREATEST(-100,
        ((recent_events - prior_events)::numeric / prior_events::numeric) * 100
      ));
    END IF;

    -- ========== GOAL VELOCITY (0-100) ==========
    -- Based on skill target mastery rate + recent trial accuracy
    SELECT COUNT(*), COUNT(*) FILTER (WHERE st.status = 'mastered')
    INTO total_targets, mastered_targets
    FROM skill_targets st
    JOIN skill_programs sp ON sp.id = st.program_id
    WHERE sp.student_id = rec.client_id AND st.active = true;

    -- Recent trial accuracy (last 14 days)
    SELECT COALESCE(
      AVG(CASE WHEN tt.outcome IN ('correct', 'independent') THEN 100.0 ELSE 0.0 END),
      50
    ) INTO recent_accuracy
    FROM target_trials tt
    JOIN skill_targets st ON st.id = tt.target_id
    JOIN skill_programs sp ON sp.id = st.program_id
    WHERE sp.student_id = rec.client_id
      AND tt.recorded_at >= d14_ago;

    IF total_targets = 0 THEN
      v_goal_velocity := 50; -- neutral if no goals
    ELSE
      -- Blend: 40% mastery rate + 60% recent accuracy
      v_goal_velocity := LEAST(100, GREATEST(0,
        (mastered_targets::numeric / total_targets::numeric) * 100 * 0.4
        + recent_accuracy * 0.6
      ));
    END IF;

    -- ========== FIDELITY SCORE (0-100) ==========
    -- Based on caregiver competency checks in last 30 days
    SELECT COUNT(*), COUNT(*) FILTER (WHERE cc.passed = true)
    INTO total_checks, passed_checks
    FROM caregiver_competency_checks cc
    WHERE cc.student_id = rec.client_id
      AND cc.check_date >= (now_ts - interval '30 days')::date;

    IF total_checks = 0 THEN
      v_fidelity := 50; -- neutral if no checks
    ELSE
      v_fidelity := (passed_checks::numeric / total_checks::numeric) * 100;
    END IF;

    -- ========== PARENT IMPLEMENTATION SCORE (0-100) ==========
    -- Based on caregiver training sessions competency rating (1-5) in last 14 days
    SELECT AVG(cts.competency_rating)
    INTO avg_competency
    FROM caregiver_training_sessions cts
    WHERE cts.student_id = rec.client_id
      AND cts.session_date >= (now_ts - interval '14 days')::date;

    IF avg_competency IS NULL THEN
      v_parent_impl := 50; -- neutral
    ELSE
      -- Map 1-5 => 0-100
      v_parent_impl := LEAST(100, GREATEST(0, (avg_competency - 1) * 25));
    END IF;

    -- ========== RISK SCORE (0-100) ==========
    -- Weighted blend: higher = more risk
    -- data_freshness inverted (low freshness = high risk)
    -- trend_score positive = worsening = higher risk
    -- goal_velocity inverted (low velocity = higher risk)
    -- fidelity inverted (low fidelity = higher risk)
    -- parent_impl inverted (low parent impl = higher risk)
    v_risk_score := LEAST(100, GREATEST(0,
      (100 - v_data_freshness) * 0.20   -- stale data = risk
      + GREATEST(0, v_trend_score) * 0.25 -- worsening trend = risk
      + (100 - v_goal_velocity) * 0.20   -- slow goals = risk
      + (100 - v_fidelity) * 0.15        -- poor fidelity = risk
      + (100 - v_parent_impl) * 0.20     -- poor parent impl = risk
    ));

    -- ========== UPSERT ==========
    INSERT INTO ci_client_metrics (
      client_id, agency_id, data_source_id,
      data_freshness, trend_score, goal_velocity_score,
      fidelity_score, parent_impl_score, risk_score, updated_at
    ) VALUES (
      rec.client_id, rec.agency_id, _data_source_id,
      ROUND(v_data_freshness, 2), ROUND(v_trend_score, 2), ROUND(v_goal_velocity, 2),
      ROUND(v_fidelity, 2), ROUND(v_parent_impl, 2), ROUND(v_risk_score, 2), now_ts
    )
    ON CONFLICT (id) DO NOTHING; -- fallback; real dedup below

    -- Use a smarter upsert: delete-then-insert to handle composite key
    DELETE FROM ci_client_metrics
    WHERE client_id = rec.client_id
      AND agency_id = rec.agency_id
      AND COALESCE(data_source_id, '00000000-0000-0000-0000-000000000000') = COALESCE(_data_source_id, '00000000-0000-0000-0000-000000000000')
      AND updated_at < now_ts;

    INSERT INTO ci_client_metrics (
      client_id, agency_id, data_source_id,
      data_freshness, trend_score, goal_velocity_score,
      fidelity_score, parent_impl_score, risk_score, updated_at
    ) VALUES (
      rec.client_id, rec.agency_id, _data_source_id,
      ROUND(v_data_freshness, 2), ROUND(v_trend_score, 2), ROUND(v_goal_velocity, 2),
      ROUND(v_fidelity, 2), ROUND(v_parent_impl, 2), ROUND(v_risk_score, 2), now_ts
    )
    ON CONFLICT (id) DO NOTHING;

    upserted := upserted + 1;
  END LOOP;

  RETURN upserted;
END;
$fn$;

-- 4) ci_refresh_alerts: generates/updates alerts idempotently, auto-resolves stale ones
CREATE OR REPLACE FUNCTION public.ci_refresh_alerts(
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
  generated integer := 0;
  v_key text;
  v_severity text;
  v_category text;
  v_message text;
  v_explanation jsonb;
BEGIN
  -- Process each client with metrics
  FOR rec IN
    SELECT m.*, s.name AS client_name, s.first_name, s.last_name
    FROM ci_client_metrics m
    JOIN students s ON s.id = m.client_id
    WHERE (_agency_id IS NULL OR m.agency_id = _agency_id)
      AND COALESCE(m.data_source_id, '00000000-0000-0000-0000-000000000000') = COALESCE(_data_source_id, '00000000-0000-0000-0000-000000000000')
  LOOP
    -- ===== ALERT 1: High Risk =====
    v_key := 'high_risk:' || rec.client_id::text;
    IF rec.risk_score >= 75 THEN
      v_severity := CASE WHEN rec.risk_score >= 90 THEN 'critical' ELSE 'high' END;
      v_category := 'risk';
      v_message := COALESCE(rec.first_name, rec.client_name, 'Client') || ' has a high risk score of ' || ROUND(rec.risk_score)::text;
      v_explanation := jsonb_build_object(
        'risk_score', rec.risk_score,
        'data_freshness', rec.data_freshness,
        'trend_score', rec.trend_score,
        'goal_velocity', rec.goal_velocity_score,
        'fidelity', rec.fidelity_score,
        'parent_impl', rec.parent_impl_score,
        'reason', 'Weighted blend exceeds threshold'
      );

      INSERT INTO ci_alerts (agency_id, client_id, data_source_id, severity, category, message, explanation_json, alert_key, created_at)
      VALUES (rec.agency_id, rec.client_id, rec.data_source_id, v_severity, v_category, v_message, v_explanation, v_key, now())
      ON CONFLICT (alert_key) WHERE resolved_at IS NULL
      DO UPDATE SET
        severity = EXCLUDED.severity,
        message = EXCLUDED.message,
        explanation_json = EXCLUDED.explanation_json;

      generated := generated + 1;
    ELSE
      -- Auto-resolve if condition no longer true
      UPDATE ci_alerts SET resolved_at = now()
      WHERE alert_key = v_key AND resolved_at IS NULL;
    END IF;

    -- ===== ALERT 2: Stale Data =====
    v_key := 'stale_data:' || rec.client_id::text;
    IF rec.data_freshness <= 20 THEN
      v_severity := CASE WHEN rec.data_freshness <= 5 THEN 'high' ELSE 'medium' END;
      v_category := 'data_quality';
      v_message := COALESCE(rec.first_name, rec.client_name, 'Client') || ' has stale data (freshness: ' || ROUND(rec.data_freshness)::text || '%)';
      v_explanation := jsonb_build_object(
        'data_freshness', rec.data_freshness,
        'reason', 'No recent data collection activity'
      );

      INSERT INTO ci_alerts (agency_id, client_id, data_source_id, severity, category, message, explanation_json, alert_key, created_at)
      VALUES (rec.agency_id, rec.client_id, rec.data_source_id, v_severity, v_category, v_message, v_explanation, v_key, now())
      ON CONFLICT (alert_key) WHERE resolved_at IS NULL
      DO UPDATE SET
        severity = EXCLUDED.severity,
        message = EXCLUDED.message,
        explanation_json = EXCLUDED.explanation_json;

      generated := generated + 1;
    ELSE
      UPDATE ci_alerts SET resolved_at = now()
      WHERE alert_key = v_key AND resolved_at IS NULL;
    END IF;

    -- ===== ALERT 3: Worsening Trend =====
    v_key := 'worsening_trend:' || rec.client_id::text;
    IF rec.trend_score >= 50 THEN
      v_severity := CASE WHEN rec.trend_score >= 80 THEN 'high' ELSE 'medium' END;
      v_category := 'trend';
      v_message := COALESCE(rec.first_name, rec.client_name, 'Client') || ' shows worsening behavior trend (+' || ROUND(rec.trend_score)::text || '%)';
      v_explanation := jsonb_build_object(
        'trend_score', rec.trend_score,
        'reason', 'Recent 14-day behavior frequency significantly higher than prior 14 days'
      );

      INSERT INTO ci_alerts (agency_id, client_id, data_source_id, severity, category, message, explanation_json, alert_key, created_at)
      VALUES (rec.agency_id, rec.client_id, rec.data_source_id, v_severity, v_category, v_message, v_explanation, v_key, now())
      ON CONFLICT (alert_key) WHERE resolved_at IS NULL
      DO UPDATE SET
        severity = EXCLUDED.severity,
        message = EXCLUDED.message,
        explanation_json = EXCLUDED.explanation_json;

      generated := generated + 1;
    ELSE
      UPDATE ci_alerts SET resolved_at = now()
      WHERE alert_key = v_key AND resolved_at IS NULL;
    END IF;

    -- ===== ALERT 4: Low Goal Velocity =====
    v_key := 'low_goal_velocity:' || rec.client_id::text;
    IF rec.goal_velocity_score <= 25 THEN
      v_severity := 'medium';
      v_category := 'goals';
      v_message := COALESCE(rec.first_name, rec.client_name, 'Client') || ' has low goal velocity (' || ROUND(rec.goal_velocity_score)::text || '%)';
      v_explanation := jsonb_build_object(
        'goal_velocity', rec.goal_velocity_score,
        'reason', 'Low mastery rate and/or poor recent trial accuracy'
      );

      INSERT INTO ci_alerts (agency_id, client_id, data_source_id, severity, category, message, explanation_json, alert_key, created_at)
      VALUES (rec.agency_id, rec.client_id, rec.data_source_id, v_severity, v_category, v_message, v_explanation, v_key, now())
      ON CONFLICT (alert_key) WHERE resolved_at IS NULL
      DO UPDATE SET
        severity = EXCLUDED.severity,
        message = EXCLUDED.message,
        explanation_json = EXCLUDED.explanation_json;

      generated := generated + 1;
    ELSE
      UPDATE ci_alerts SET resolved_at = now()
      WHERE alert_key = v_key AND resolved_at IS NULL;
    END IF;

    -- ===== ALERT 5: Low Fidelity =====
    v_key := 'low_fidelity:' || rec.client_id::text;
    IF rec.fidelity_score < 50 AND rec.fidelity_score != 50 THEN
      -- 50 is neutral/no-data, only alert on actual low scores
      v_severity := 'medium';
      v_category := 'fidelity';
      v_message := COALESCE(rec.first_name, rec.client_name, 'Client') || ' has low treatment fidelity (' || ROUND(rec.fidelity_score)::text || '%)';
      v_explanation := jsonb_build_object(
        'fidelity_score', rec.fidelity_score,
        'reason', 'Caregiver competency checks show low pass rate in last 30 days'
      );

      INSERT INTO ci_alerts (agency_id, client_id, data_source_id, severity, category, message, explanation_json, alert_key, created_at)
      VALUES (rec.agency_id, rec.client_id, rec.data_source_id, v_severity, v_category, v_message, v_explanation, v_key, now())
      ON CONFLICT (alert_key) WHERE resolved_at IS NULL
      DO UPDATE SET
        severity = EXCLUDED.severity,
        message = EXCLUDED.message,
        explanation_json = EXCLUDED.explanation_json;

      generated := generated + 1;
    ELSE
      UPDATE ci_alerts SET resolved_at = now()
      WHERE alert_key = v_key AND resolved_at IS NULL;
    END IF;

  END LOOP;

  RETURN generated;
END;
$fn$;

-- 5) ci_refresh_all: wrapper that runs metrics then alerts
CREATE OR REPLACE FUNCTION public.ci_refresh_all(
  _agency_id uuid DEFAULT NULL,
  _data_source_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  metrics_count integer;
  alerts_count integer;
BEGIN
  metrics_count := ci_refresh_metrics(_agency_id, _data_source_id);
  alerts_count := ci_refresh_alerts(_agency_id, _data_source_id);
  
  RETURN jsonb_build_object(
    'metrics_refreshed', metrics_count,
    'alerts_generated', alerts_count,
    'completed_at', now()
  );
END;
$fn$;
