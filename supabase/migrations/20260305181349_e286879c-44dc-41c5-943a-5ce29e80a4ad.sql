
CREATE OR REPLACE VIEW public.v_behavior_patterns WITH (security_invoker = on) AS
WITH recent_data AS (
  SELECT
    sd.student_id,
    sd.behavior_id,
    sd.session_id,
    sd.duration_seconds,
    s.start_time,
    CASE
      WHEN EXTRACT(HOUR FROM s.start_time) < 10 THEN 'morning'
      WHEN EXTRACT(HOUR FROM s.start_time) < 13 THEN 'midday'
      WHEN EXTRACT(HOUR FROM s.start_time) < 15 THEN 'afternoon'
      ELSE 'late_afternoon'
    END AS time_block
  FROM public.session_data sd
  JOIN public.sessions s ON sd.session_id = s.id
  WHERE s.start_time >= (now() - INTERVAL '30 days')
    AND sd.behavior_id IS NOT NULL
),
behavior_stats AS (
  SELECT
    student_id,
    behavior_id,
    time_block,
    COUNT(*) AS event_count,
    SUM(COALESCE(duration_seconds, 0)) AS total_duration,
    AVG(COALESCE(duration_seconds, 0)) AS avg_duration
  FROM recent_data
  GROUP BY student_id, behavior_id, time_block
)
SELECT
  bs.student_id,
  bs.behavior_id,
  bs.time_block AS peak_time_block,
  bs.event_count AS total_events,
  bs.total_duration,
  bs.avg_duration,
  CASE
    WHEN bs.event_count > 20 THEN 'high'
    WHEN bs.event_count > 10 THEN 'moderate'
    ELSE 'low'
  END AS frequency_level
FROM behavior_stats bs;

CREATE OR REPLACE FUNCTION public.calculate_student_risk_score(p_student_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
  v_total_behaviors integer;
  v_recent_sessions integer;
BEGIN
  SELECT COUNT(*) INTO v_total_behaviors
  FROM session_data sd
  JOIN sessions s ON sd.session_id = s.id
  WHERE sd.student_id = p_student_id
    AND s.start_time >= (now() - INTERVAL '14 days')
    AND sd.behavior_id IS NOT NULL;

  IF v_total_behaviors > 50 THEN v_score := v_score + 40;
  ELSIF v_total_behaviors > 25 THEN v_score := v_score + 25;
  ELSIF v_total_behaviors > 10 THEN v_score := v_score + 15;
  ELSIF v_total_behaviors > 0 THEN v_score := v_score + 5;
  END IF;

  SELECT COUNT(DISTINCT s.id) INTO v_recent_sessions
  FROM sessions s
  JOIN session_data sd ON sd.session_id = s.id
  WHERE sd.student_id = p_student_id
    AND s.start_time >= (now() - INTERVAL '14 days');

  IF v_recent_sessions = 0 THEN v_score := v_score + 10; END IF;
  IF v_score > 100 THEN v_score := 100; END IF;

  INSERT INTO student_risk_scores (student_id, risk_score, risk_level, factors, last_calculated_at)
  VALUES (
    p_student_id, v_score,
    CASE WHEN v_score >= 80 THEN 'critical' WHEN v_score >= 50 THEN 'high' WHEN v_score >= 20 THEN 'moderate' ELSE 'low' END,
    jsonb_build_object('total_behaviors_14d', v_total_behaviors, 'recent_sessions', v_recent_sessions),
    now()
  )
  ON CONFLICT (student_id)
  DO UPDATE SET risk_score = EXCLUDED.risk_score, risk_level = EXCLUDED.risk_level, factors = EXCLUDED.factors, last_calculated_at = EXCLUDED.last_calculated_at, updated_at = now();

  RETURN v_score;
END;
$$;
