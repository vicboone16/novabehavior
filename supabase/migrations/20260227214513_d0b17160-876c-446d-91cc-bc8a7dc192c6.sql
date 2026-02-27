
-- Replace ci_refresh_alerts with the clean tiered version using ci_alert_thresholds
CREATE OR REPLACE FUNCTION public.ci_refresh_alerts(
  p_agency_id uuid DEFAULT NULL,
  p_data_source_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  -- Upsert tiered alerts using resolved thresholds from ci_alert_thresholds
  WITH metric_categories AS (
    SELECT 
      cm.agency_id, cm.data_source_id, cm.client_id,
      cat.category, cat.metric_value, cat.alert_message
    FROM public.ci_client_metrics cm
    CROSS JOIN LATERAL (
      VALUES
        ('risk',                cm.risk_score,          'Risk escalation detected'),
        ('stale_data',          cm.data_freshness,      'Data appears stale'),
        ('worsening_trend',     cm.trend_score,         'Behavior trend worsening'),
        ('low_fidelity',        cm.fidelity_score,      'Fidelity below target'),
        ('goal_plateau',        cm.goal_velocity_score, 'Goal progress plateau risk'),
        ('parent_training_due', cm.parent_impl_score,   'Parent implementation below target')
    ) AS cat(category, metric_value, alert_message)
    WHERE (p_agency_id IS NULL OR cm.agency_id = p_agency_id)
      AND (p_data_source_id IS NULL OR cm.data_source_id IS NOT DISTINCT FROM p_data_source_id)
  ),
  with_thresholds AS (
    SELECT
      mc.*,
      COALESCE(th.watch_threshold,
        CASE mc.category WHEN 'risk' THEN 25 WHEN 'stale_data' THEN 50 WHEN 'worsening_trend' THEN 20 WHEN 'low_fidelity' THEN 90 WHEN 'goal_plateau' THEN 50 WHEN 'parent_training_due' THEN 70 END
      ) AS w_t,
      COALESCE(th.action_threshold,
        CASE mc.category WHEN 'risk' THEN 50 WHEN 'stale_data' THEN 30 WHEN 'worsening_trend' THEN 30 WHEN 'low_fidelity' THEN 80 WHEN 'goal_plateau' THEN 35 WHEN 'parent_training_due' THEN 60 END
      ) AS a_t,
      COALESCE(th.critical_threshold,
        CASE mc.category WHEN 'risk' THEN 75 WHEN 'stale_data' THEN 20 WHEN 'worsening_trend' THEN 40 WHEN 'low_fidelity' THEN 70 WHEN 'goal_plateau' THEN 20 WHEN 'parent_training_due' THEN 40 END
      ) AS c_t,
      COALESCE(th.comparison_direction,
        CASE WHEN mc.category IN ('stale_data','low_fidelity','goal_plateau','parent_training_due') THEN 'lte' ELSE 'gte' END
      ) AS dir
    FROM metric_categories mc
    LEFT JOIN LATERAL (
      SELECT rt.watch_threshold, rt.action_threshold, rt.critical_threshold, rt.comparison_direction
      FROM public.resolve_alert_threshold(mc.category, mc.client_id, mc.agency_id) rt
      LIMIT 1
    ) th ON true
  ),
  desired_alerts AS (
    SELECT
      wt.agency_id, wt.data_source_id, wt.client_id, wt.category,
      public.ci_classify_severity(wt.metric_value, wt.w_t, wt.a_t, wt.c_t, wt.dir) AS severity,
      wt.alert_message AS message,
      jsonb_build_object(
        'metric_value', wt.metric_value,
        'watch_threshold', wt.w_t,
        'action_threshold', wt.a_t,
        'critical_threshold', wt.c_t,
        'tier', public.ci_classify_severity(wt.metric_value, wt.w_t, wt.a_t, wt.c_t, wt.dir)
      ) AS explanation_json,
      md5(wt.agency_id::text || '|' || coalesce(wt.data_source_id::text,'native') || '|' || wt.client_id::text || '|' || wt.category) AS alert_key
    FROM with_thresholds wt
    WHERE public.ci_classify_severity(wt.metric_value, wt.w_t, wt.a_t, wt.c_t, wt.dir) IS NOT NULL
  )
  INSERT INTO public.ci_alerts (alert_key, agency_id, data_source_id, client_id, severity, category, message, explanation_json, created_at, resolved_at, resolved_by)
  SELECT da.alert_key, da.agency_id, da.data_source_id, da.client_id, da.severity, da.category, da.message, da.explanation_json, now(), NULL, NULL
  FROM desired_alerts da
  ON CONFLICT (alert_key) WHERE resolved_at IS NULL
  DO UPDATE SET severity = excluded.severity, message = excluded.message, explanation_json = excluded.explanation_json, resolved_at = NULL, resolved_by = NULL;

  -- Auto-resolve alerts no longer triggered
  WITH current_keys AS (
    SELECT
      md5(cm.agency_id::text || '|' || coalesce(cm.data_source_id::text,'native') || '|' || cm.client_id::text || '|' || cat.category) AS alert_key
    FROM public.ci_client_metrics cm
    CROSS JOIN LATERAL (
      VALUES
        ('risk',                cm.risk_score),
        ('stale_data',          cm.data_freshness),
        ('worsening_trend',     cm.trend_score),
        ('low_fidelity',        cm.fidelity_score),
        ('goal_plateau',        cm.goal_velocity_score),
        ('parent_training_due', cm.parent_impl_score)
    ) AS cat(category, metric_value)
    LEFT JOIN LATERAL (
      SELECT rt.watch_threshold, rt.action_threshold, rt.critical_threshold, rt.comparison_direction
      FROM public.resolve_alert_threshold(cat.category, cm.client_id, cm.agency_id) rt
      LIMIT 1
    ) th ON true
    WHERE (p_agency_id IS NULL OR cm.agency_id = p_agency_id)
      AND (p_data_source_id IS NULL OR cm.data_source_id IS NOT DISTINCT FROM p_data_source_id)
      AND public.ci_classify_severity(
        cat.metric_value,
        COALESCE(th.watch_threshold, CASE cat.category WHEN 'risk' THEN 25 WHEN 'stale_data' THEN 50 WHEN 'worsening_trend' THEN 20 WHEN 'low_fidelity' THEN 90 WHEN 'goal_plateau' THEN 50 WHEN 'parent_training_due' THEN 70 END),
        COALESCE(th.action_threshold, CASE cat.category WHEN 'risk' THEN 50 WHEN 'stale_data' THEN 30 WHEN 'worsening_trend' THEN 30 WHEN 'low_fidelity' THEN 80 WHEN 'goal_plateau' THEN 35 WHEN 'parent_training_due' THEN 60 END),
        COALESCE(th.critical_threshold, CASE cat.category WHEN 'risk' THEN 75 WHEN 'stale_data' THEN 20 WHEN 'worsening_trend' THEN 40 WHEN 'low_fidelity' THEN 70 WHEN 'goal_plateau' THEN 20 WHEN 'parent_training_due' THEN 40 END),
        COALESCE(th.comparison_direction, CASE WHEN cat.category IN ('stale_data','low_fidelity','goal_plateau','parent_training_due') THEN 'lte' ELSE 'gte' END)
      ) IS NOT NULL
  )
  UPDATE public.ci_alerts a
  SET resolved_at = now(), resolved_by = NULL
  WHERE a.resolved_at IS NULL
    AND (p_agency_id IS NULL OR a.agency_id = p_agency_id)
    AND (p_data_source_id IS NULL OR a.data_source_id IS NOT DISTINCT FROM p_data_source_id)
    AND a.alert_key NOT IN (SELECT alert_key FROM current_keys);
END;
$function$;
