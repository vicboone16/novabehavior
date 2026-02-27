
-- ============================================================
-- 1. ci_alert_thresholds: configurable thresholds with scoped precedence
-- ============================================================
CREATE TABLE public.ci_alert_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope / precedence (lower = more specific = higher priority)
  scope text NOT NULL CHECK (scope IN ('global','agency','client','behavior','phase')),
  scope_id uuid,  -- NULL for global, agency_id / client_id / behavior_id / target_id
  
  -- Alert category this threshold applies to
  category text NOT NULL,  -- e.g. risk, stale_data, worsening_trend, low_fidelity, goal_plateau, parent_training_due
  
  -- Optional filters (NULL = match all)
  setting text,            -- home / classroom / community
  behavior_category text,  -- aggression / elopement / noncompliance / etc.
  behavior_function text,  -- attention / escape / tangible / sensory
  data_phase text,         -- baseline / acquisition / generalization / maintenance
  
  -- Tiered thresholds
  watch_threshold numeric NOT NULL,     -- >= this triggers watch
  action_threshold numeric NOT NULL,    -- >= this triggers action
  critical_threshold numeric NOT NULL,  -- >= this triggers critical
  
  -- For categories where LOWER is worse (freshness, fidelity, goal_velocity, parent_impl)
  -- the comparison is inverted: value <= threshold triggers the tier
  comparison_direction text NOT NULL DEFAULT 'gte' CHECK (comparison_direction IN ('gte','lte')),
  
  -- Metadata
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Index for precedence resolution
CREATE INDEX idx_ci_alert_thresholds_lookup 
  ON public.ci_alert_thresholds (category, scope, active) 
  WHERE active = true;

ALTER TABLE public.ci_alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert thresholds"
  ON public.ci_alert_thresholds FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view alert thresholds"
  ON public.ci_alert_thresholds FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 2. Seed global defaults
-- ============================================================
INSERT INTO public.ci_alert_thresholds (scope, scope_id, category, watch_threshold, action_threshold, critical_threshold, comparison_direction) VALUES
  ('global', NULL, 'risk',                25, 50, 75, 'gte'),
  ('global', NULL, 'stale_data',          50, 30, 20, 'lte'),
  ('global', NULL, 'worsening_trend',     20, 30, 40, 'gte'),
  ('global', NULL, 'low_fidelity',        90, 80, 70, 'lte'),
  ('global', NULL, 'goal_plateau',        50, 35, 20, 'lte'),
  ('global', NULL, 'parent_training_due', 70, 60, 40, 'lte');

-- ============================================================
-- 3. resolve_alert_threshold: walks precedence chain
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_alert_threshold(
  _category text,
  _client_id uuid DEFAULT NULL,
  _agency_id uuid DEFAULT NULL,
  _behavior_id uuid DEFAULT NULL,
  _phase text DEFAULT NULL,
  _setting text DEFAULT NULL,
  _behavior_category text DEFAULT NULL,
  _behavior_function text DEFAULT NULL
)
RETURNS TABLE (
  watch_threshold numeric,
  action_threshold numeric,
  critical_threshold numeric,
  comparison_direction text,
  resolved_scope text,
  resolved_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT 
    t.watch_threshold,
    t.action_threshold,
    t.critical_threshold,
    t.comparison_direction,
    t.scope AS resolved_scope,
    t.id AS resolved_id
  FROM public.ci_alert_thresholds t
  WHERE t.category = _category
    AND t.active = true
    -- Filter matching: NULL in the threshold row means "match all"
    AND (t.setting IS NULL OR t.setting = _setting)
    AND (t.behavior_category IS NULL OR t.behavior_category = _behavior_category)
    AND (t.behavior_function IS NULL OR t.behavior_function = _behavior_function)
    AND (t.data_phase IS NULL OR t.data_phase = _phase)
    -- Scope matching with precedence
    AND (
      (t.scope = 'phase' AND t.scope_id IS NOT NULL)
      OR (t.scope = 'behavior' AND t.scope_id = _behavior_id)
      OR (t.scope = 'client' AND t.scope_id = _client_id)
      OR (t.scope = 'agency' AND t.scope_id = _agency_id)
      OR (t.scope = 'global')
    )
  ORDER BY 
    CASE t.scope 
      WHEN 'phase' THEN 1
      WHEN 'behavior' THEN 2
      WHEN 'client' THEN 3
      WHEN 'agency' THEN 4
      WHEN 'global' THEN 5
    END
  LIMIT 1;
$$;

-- ============================================================
-- 4. Helper: classify severity tier from value + thresholds
-- ============================================================
CREATE OR REPLACE FUNCTION public.ci_classify_severity(
  _value numeric,
  _watch numeric,
  _action numeric,
  _critical numeric,
  _direction text  -- 'gte' or 'lte'
)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN _direction = 'gte' THEN
      CASE
        WHEN _value >= _critical THEN 'critical'
        WHEN _value >= _action THEN 'action'
        WHEN _value >= _watch THEN 'watch'
        ELSE NULL
      END
    ELSE -- 'lte': lower value = worse
      CASE
        WHEN _value <= _critical THEN 'critical'
        WHEN _value <= _action THEN 'action'
        WHEN _value <= _watch THEN 'watch'
        ELSE NULL
      END
  END;
$$;

-- ============================================================
-- 5. Updated ci_refresh_alerts using configurable thresholds
-- ============================================================
CREATE OR REPLACE FUNCTION public.ci_refresh_alerts(
  p_agency_id uuid DEFAULT NULL,
  p_data_source_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  -- Upsert tiered alerts using resolved thresholds
  WITH metric_categories AS (
    SELECT 
      cm.agency_id, cm.data_source_id, cm.client_id,
      cat.category, cat.metric_value,
      cat.alert_message
    FROM public.ci_client_metrics cm
    CROSS JOIN LATERAL (
      VALUES
        ('risk', cm.risk_score, 'Risk escalation detected'),
        ('stale_data', cm.data_freshness, 'Data appears stale'),
        ('worsening_trend', cm.trend_score, 'Behavior trend worsening'),
        ('low_fidelity', cm.fidelity_score, 'Fidelity below target'),
        ('goal_plateau', cm.goal_velocity_score, 'Goal progress plateau risk'),
        ('parent_training_due', cm.parent_impl_score, 'Parent implementation below target')
    ) AS cat(category, metric_value, alert_message)
    WHERE (p_agency_id IS NULL OR cm.agency_id = p_agency_id)
      AND (p_data_source_id IS NULL OR cm.data_source_id IS NOT DISTINCT FROM p_data_source_id)
  ),
  resolved AS (
    SELECT
      mc.*,
      COALESCE(th.watch_threshold, 
        CASE mc.category WHEN 'risk' THEN 25 WHEN 'stale_data' THEN 50 WHEN 'worsening_trend' THEN 20 WHEN 'low_fidelity' THEN 90 WHEN 'goal_plateau' THEN 50 WHEN 'parent_training_due' THEN 70 END
      ) AS watch_t,
      COALESCE(th.action_threshold,
        CASE mc.category WHEN 'risk' THEN 50 WHEN 'stale_data' THEN 30 WHEN 'worsening_trend' THEN 30 WHEN 'low_fidelity' THEN 80 WHEN 'goal_plateau' THEN 35 WHEN 'parent_training_due' THEN 60 END
      ) AS action_t,
      COALESCE(th.critical_threshold,
        CASE mc.category WHEN 'risk' THEN 75 WHEN 'stale_data' THEN 20 WHEN 'worsening_trend' THEN 40 WHEN 'low_fidelity' THEN 70 WHEN 'goal_plateau' THEN 20 WHEN 'parent_training_due' THEN 40 END
      ) AS critical_t,
      COALESCE(th.comparison_direction,
        CASE WHEN mc.category IN ('stale_data','low_fidelity','goal_plateau','parent_training_due') THEN 'lte' ELSE 'gte' END
      ) AS direction
    FROM metric_categories mc
    LEFT JOIN LATERAL (
      SELECT * FROM public.resolve_alert_threshold(
        mc.category, mc.client_id, mc.agency_id
      ) LIMIT 1
    ) th ON true
  ),
  desired_alerts AS (
    SELECT
      r.agency_id, r.data_source_id, r.client_id, r.category,
      public.ci_classify_severity(r.metric_value, r.watch_t, r.action_t, r.critical_t, r.direction) AS severity,
      r.alert_message AS message,
      jsonb_build_object(
        'metric_value', r.metric_value,
        'watch_threshold', r.watch_t,
        'action_threshold', r.action_t,
        'critical_threshold', r.critical_t,
        'tier', public.ci_classify_severity(r.metric_value, r.watch_t, r.action_t, r.critical_t, r.direction)
      ) AS explanation_json,
      md5(r.agency_id::text || '|' || coalesce(r.data_source_id::text,'native') || '|' || r.client_id::text || '|' || r.category) AS alert_key
    FROM resolved r
    WHERE public.ci_classify_severity(r.metric_value, r.watch_t, r.action_t, r.critical_t, r.direction) IS NOT NULL
  )
  INSERT INTO public.ci_alerts (alert_key, agency_id, data_source_id, client_id, severity, category, message, explanation_json, created_at, resolved_at, resolved_by)
  SELECT da.alert_key, da.agency_id, da.data_source_id, da.client_id, da.severity, da.category, da.message, da.explanation_json, now(), NULL, NULL
  FROM desired_alerts da
  ON CONFLICT (alert_key) WHERE resolved_at IS NULL
  DO UPDATE SET severity = excluded.severity, message = excluded.message, explanation_json = excluded.explanation_json, resolved_at = NULL, resolved_by = NULL;

  -- Auto-resolve alerts no longer triggered
  WITH current_desired_keys AS (
    SELECT
      md5(cm.agency_id::text || '|' || coalesce(cm.data_source_id::text,'native') || '|' || cm.client_id::text || '|' || cat.category) AS alert_key
    FROM public.ci_client_metrics cm
    CROSS JOIN LATERAL (
      VALUES
        ('risk', cm.risk_score),
        ('stale_data', cm.data_freshness),
        ('worsening_trend', cm.trend_score),
        ('low_fidelity', cm.fidelity_score),
        ('goal_plateau', cm.goal_velocity_score),
        ('parent_training_due', cm.parent_impl_score)
    ) AS cat(category, metric_value)
    LEFT JOIN LATERAL (
      SELECT * FROM public.resolve_alert_threshold(cat.category, cm.client_id, cm.agency_id) LIMIT 1
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
    AND a.alert_key NOT IN (SELECT alert_key FROM current_desired_keys);
END;
$function$;
