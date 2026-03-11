
-- ============================
-- FIX: resolve_criteria_assignment to use rule_json
-- ============================
CREATE OR REPLACE FUNCTION public.resolve_criteria_assignment(
  p_student_id uuid,
  p_program_id uuid,
  p_target_id uuid,
  p_benchmark_id uuid,
  p_criteria_type public.criteria_type
)
RETURNS TABLE(criteria_assignment_id uuid, criteria_template_id uuid, effective_definition jsonb)
LANGUAGE plpgsql
AS $$
DECLARE
  ca record;
  ct record;
BEGIN
  SELECT *
  INTO ca
  FROM public.criteria_assignments
  WHERE criteria_type = p_criteria_type
    AND is_active = true
    AND (
      (scope = 'benchmark' AND scope_id = p_benchmark_id) OR
      (scope = 'target'    AND scope_id = p_target_id) OR
      (scope = 'program'   AND scope_id = p_program_id) OR
      (scope = 'student'   AND scope_id = p_student_id) OR
      (scope = 'global'    AND scope_id IS NULL)
    )
  ORDER BY
    CASE
      WHEN scope = 'benchmark' THEN 1
      WHEN scope = 'target'    THEN 2
      WHEN scope = 'program'   THEN 3
      WHEN scope = 'student'   THEN 4
      WHEN scope = 'global'    THEN 5
      ELSE 99
    END
  LIMIT 1;

  IF ca.id IS NULL THEN
    RETURN;
  END IF;

  SELECT *
  INTO ct
  FROM public.criteria_templates
  WHERE id = ca.criteria_template_id;

  criteria_assignment_id := ca.id;
  criteria_template_id := ca.criteria_template_id;
  effective_definition :=
    coalesce(ct.rule_json, '{}'::jsonb) || coalesce(ca.override_definition, '{}'::jsonb);

  RETURN NEXT;
END;
$$;

-- ============================
-- PROGRAM COMPLETION VIEW
-- ============================
CREATE OR REPLACE VIEW public.program_completion AS
SELECT
  p.id AS program_id,
  count(t.id) FILTER (WHERE t.is_required = true) AS required_total,
  count(t.id) FILTER (WHERE t.is_required = true AND t.status = 'closed') AS required_closed,
  CASE
    WHEN count(t.id) FILTER (WHERE t.is_required = true) = 0 THEN NULL
    ELSE (count(t.id) FILTER (WHERE t.is_required = true AND t.status = 'closed')::decimal /
          count(t.id) FILTER (WHERE t.is_required = true)::decimal) * 100
  END AS percent_complete
FROM public.programs p
LEFT JOIN public.targets t ON t.program_id = p.id
GROUP BY p.id;

-- ============================
-- RESOLVED CRITERIA ASSIGNMENTS VIEW
-- ============================
CREATE OR REPLACE VIEW public.v_resolved_criteria_assignments AS
SELECT
  ca.id AS criteria_assignment_id,
  ca.criteria_type,
  ca.criteria_template_id,
  ca.scope,
  ca.scope_id,
  ca.override_definition,
  ca.is_active,
  ct.name AS template_name,
  ct.rule_json AS template_definition
FROM public.criteria_assignments ca
JOIN public.criteria_templates ct ON ct.id = ca.criteria_template_id
WHERE ca.is_active = true;

-- ============================
-- EVALUATE TARGET CRITERIA FUNCTION
-- ============================
CREATE OR REPLACE FUNCTION public.evaluate_target_criteria(
  p_student_id uuid,
  p_target_id uuid,
  p_criteria_type public.criteria_type,
  p_benchmark_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  t_program_id uuid;
  resolved record;
  def jsonb;
  metric text;
  threshold numeric;
  window_type text;
  n_sessions int;
  min_trials int;
  sessions_found int;
  sessions_passing int;
  result_status text;
  evidence jsonb := '{}'::jsonb;
  eval_id uuid;
  last_metric_value numeric;
BEGIN
  SELECT program_id INTO t_program_id
  FROM public.targets
  WHERE id = p_target_id;

  SELECT * INTO resolved
  FROM public.resolve_criteria_assignment(
    p_student_id, t_program_id, p_target_id, p_benchmark_id, p_criteria_type
  )
  LIMIT 1;

  IF resolved.criteria_template_id IS NULL THEN
    INSERT INTO public.criteria_evaluations (
      client_id, target_id, criteria_type, met_status, evidence
    ) VALUES (
      p_student_id, p_target_id, p_criteria_type, 'insufficient_data',
      jsonb_build_object('reason','no_criteria_assignment')
    )
    RETURNING id INTO eval_id;
    RETURN eval_id;
  END IF;

  def := resolved.effective_definition;
  metric := coalesce(def->>'metric', 'pct_correct');
  threshold := coalesce((def->>'threshold')::numeric, 80);
  window_type := coalesce(def->>'window_type', 'consecutive_sessions');
  n_sessions := coalesce((def->>'n_sessions')::int, 3);
  min_trials := coalesce((def->>'min_trials_per_session')::int, 1);

  IF window_type <> 'consecutive_sessions' THEN
    INSERT INTO public.criteria_evaluations (
      client_id, target_id, criteria_type, met_status, evidence
    ) VALUES (
      p_student_id, p_target_id, p_criteria_type, 'insufficient_data',
      jsonb_build_object('reason','unsupported_window_type','window_type',window_type)
    )
    RETURNING id INTO eval_id;
    RETURN eval_id;
  END IF;

  SELECT count(*) INTO sessions_found
  FROM (
    SELECT session_id
    FROM public.v_skill_target_session_metrics_v2
    WHERE student_id = p_student_id AND target_id = p_target_id
    ORDER BY session_time DESC
    LIMIT n_sessions
  ) sub;

  SELECT count(*) INTO sessions_passing
  FROM (
    SELECT *
    FROM public.v_skill_target_session_metrics_v2
    WHERE student_id = p_student_id AND target_id = p_target_id
    ORDER BY session_time DESC
    LIMIT n_sessions
  ) last_n
  WHERE last_n.trials_total >= min_trials
    AND (CASE metric
      WHEN 'pct_correct' THEN last_n.pct_correct
      WHEN 'pct_independent' THEN last_n.pct_independent
      WHEN 'correct_total' THEN last_n.correct_total::numeric
      WHEN 'trials_total' THEN last_n.trials_total::numeric
      ELSE last_n.pct_correct
    END) >= threshold;

  SELECT (CASE metric
    WHEN 'pct_correct' THEN pct_correct
    WHEN 'pct_independent' THEN pct_independent
    WHEN 'correct_total' THEN correct_total::numeric
    WHEN 'trials_total' THEN trials_total::numeric
    ELSE pct_correct
  END) INTO last_metric_value
  FROM public.v_skill_target_session_metrics_v2
  WHERE student_id = p_student_id AND target_id = p_target_id
  ORDER BY session_time DESC
  LIMIT 1;

  IF sessions_found < n_sessions THEN
    result_status := 'insufficient_data';
  ELSIF sessions_passing = n_sessions THEN
    result_status := 'met';
  ELSE
    result_status := 'not_met';
  END IF;

  evidence := jsonb_build_object(
    'metric', metric,
    'threshold', threshold,
    'window_type', window_type,
    'n_sessions', n_sessions,
    'min_trials_per_session', min_trials,
    'sessions_found', sessions_found,
    'sessions_passing', sessions_passing,
    'definition', def
  );

  INSERT INTO public.criteria_evaluations (
    client_id, target_id, criteria_type,
    met_status, metric_value, window_used, evidence,
    met_at
  ) VALUES (
    p_student_id, p_target_id, p_criteria_type,
    result_status, last_metric_value,
    jsonb_build_object('type', window_type, 'n', n_sessions),
    evidence,
    CASE WHEN result_status = 'met' THEN now() ELSE NULL END
  )
  RETURNING id INTO eval_id;

  RETURN eval_id;
END;
$$;

-- ============================
-- UPDATED-AT TRIGGER HELPER
-- ============================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================
-- SAFE UPDATED-AT TRIGGERS
-- ============================
SELECT public.create_trigger_if_missing(
  'set_updated_at_programs', 'public.programs', 'public.set_updated_at()'
);
SELECT public.create_trigger_if_missing(
  'set_updated_at_targets', 'public.targets', 'public.set_updated_at()'
);
SELECT public.create_trigger_if_missing(
  'set_updated_at_sessions', 'public.sessions', 'public.set_updated_at()'
);
SELECT public.create_trigger_if_missing(
  'set_updated_at_skill_trials', 'public.skill_trials', 'public.set_updated_at()'
);
SELECT public.create_trigger_if_missing(
  'set_updated_at_behavior_session_data', 'public.behavior_session_data', 'public.set_updated_at()'
);
