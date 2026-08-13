
CREATE OR REPLACE VIEW public.v_session_note_auto_data
WITH (security_invoker = on) AS
SELECT
  s.id AS session_id,
  s.student_id,
  COALESCE(tt.cnt, 0)::int AS skill_trial_count,
  COALESCE(bsd.cnt, 0)::int AS behavior_data_count,
  COALESCE(abc.cnt, 0)::int AS abc_event_count,
  COALESCE(ste.cnt, 0)::int AS context_event_count,
  jsonb_build_object(
    'session_id', s.id,
    'student_id', s.student_id,
    'started_at', s.started_at,
    'ended_at', s.ended_at,
    'setting', s.setting,
    'skill_trials', COALESCE(tt.cnt, 0),
    'behavior_rows', COALESCE(bsd.cnt, 0),
    'abc_events', COALESCE(abc.cnt, 0),
    'context_events', COALESCE(ste.cnt, 0)
  ) AS session_summary_json
FROM public.sessions s
LEFT JOIN (SELECT session_id, count(*) cnt FROM public.target_trials WHERE session_id IS NOT NULL GROUP BY 1) tt ON tt.session_id = s.id
LEFT JOIN (SELECT session_id, count(*) cnt FROM public.behavior_session_data WHERE session_id IS NOT NULL GROUP BY 1) bsd ON bsd.session_id = s.id
LEFT JOIN (SELECT session_id, count(*) cnt FROM public.abc_logs WHERE session_id IS NOT NULL GROUP BY 1) abc ON abc.session_id = s.id
LEFT JOIN (SELECT session_id::uuid AS session_id, count(*) cnt FROM public.student_timeline_entries WHERE session_id IS NOT NULL GROUP BY 1) ste ON ste.session_id = s.id;

GRANT SELECT ON public.v_session_note_auto_data TO authenticated;

CREATE OR REPLACE VIEW public.v_selected_report_goal_inclusions
WITH (security_invoker = on) AS
SELECT i.id, i.report_id, i.client_id, i.student_id, i.domain,
       i.source_object_type, i.source_object_id, i.item_title,
       i.include_in_report, i.include_summary, i.include_table,
       i.include_graph, i.display_order
FROM public.report_goal_inclusions i
WHERE i.include_in_report IS TRUE;

GRANT SELECT ON public.v_selected_report_goal_inclusions TO authenticated;

CREATE OR REPLACE VIEW public.v_reportable_goal_catalog_detailed
WITH (security_invoker = on) AS
SELECT
  a.learner_id AS student_id,
  a.learner_id AS client_id,
  COALESCE(d.name, 'Skill Acquisition') AS domain,
  COALESCE(d.name, 'Skill Acquisition') AS domain_label,
  'learner_target_assignment'::text AS source_object_type,
  a.id AS source_object_id,
  COALESCE(a.target_name_snapshot, t.name, t.target_text, 'Untitled target') AS item_title,
  a.status AS item_status,
  (SELECT max(tr.recorded_at)::date FROM public.target_trials tr
     WHERE tr.target_id = COALESCE(a.resolved_target_id, a.target_id)) AS last_data_date,
  true AS graph_available,
  true AS table_available,
  true AS summary_available
FROM public.nt_learner_target_assignments a
LEFT JOIN public.nt_targets t ON t.id = COALESCE(a.resolved_target_id, a.target_id)
LEFT JOIN public.nt_objectives o ON o.id = t.objective_id
LEFT JOIN public.nt_programs pr ON pr.id = o.program_id
LEFT JOIN public.nt_program_domains d ON d.id = pr.domain_id;

GRANT SELECT ON public.v_reportable_goal_catalog_detailed TO authenticated;

CREATE OR REPLACE FUNCTION public.seed_report_goal_inclusions(
  p_report_id uuid, p_client_id uuid, p_created_by uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  INSERT INTO public.report_goal_inclusions (
    report_id, client_id, student_id, domain, source_object_type,
    source_object_id, item_title, include_in_report, include_summary,
    include_table, include_graph, display_order, created_by
  )
  SELECT p_report_id, c.client_id, c.student_id, c.domain, c.source_object_type,
         c.source_object_id, c.item_title, true, true, true, true,
         row_number() OVER (ORDER BY c.domain, c.item_title), p_created_by
  FROM public.v_reportable_goal_catalog_detailed c
  WHERE c.client_id = p_client_id
    AND NOT EXISTS (
      SELECT 1 FROM public.report_goal_inclusions e
      WHERE e.report_id = p_report_id
        AND e.source_object_type = c.source_object_type
        AND e.source_object_id = c.source_object_id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.seed_report_goal_inclusions(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_report_goal_inclusions(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_report_goal_inclusion(
  p_inclusion_id uuid,
  p_include_in_report boolean DEFAULT NULL,
  p_include_summary boolean DEFAULT NULL,
  p_include_table boolean DEFAULT NULL,
  p_include_graph boolean DEFAULT NULL,
  p_display_order integer DEFAULT NULL
) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  UPDATE public.report_goal_inclusions SET
    include_in_report = COALESCE(p_include_in_report, include_in_report),
    include_summary   = COALESCE(p_include_summary, include_summary),
    include_table     = COALESCE(p_include_table, include_table),
    include_graph     = COALESCE(p_include_graph, include_graph),
    display_order     = COALESCE(p_display_order, display_order),
    updated_at        = now()
  WHERE id = p_inclusion_id;
$$;

REVOKE ALL ON FUNCTION public.update_report_goal_inclusion(uuid, boolean, boolean, boolean, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_report_goal_inclusion(uuid, boolean, boolean, boolean, boolean, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.deduplicate_behavior_session_data(
  p_student_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  WITH ranked AS (
    SELECT id, row_number() OVER (
      PARTITION BY session_id, student_id, behavior_id, created_at::date
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) rn
    FROM public.behavior_session_data
    WHERE session_id IS NOT NULL AND behavior_id IS NOT NULL
      AND (p_student_id IS NULL OR student_id = p_student_id)
  )
  DELETE FROM public.behavior_session_data b
  USING ranked r
  WHERE b.id = r.id AND r.rn > 1;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.deduplicate_behavior_session_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduplicate_behavior_session_data(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rebuild_behavior_daily_aggregates(
  p_student_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.behavior_daily_aggregates a
  WHERE p_student_id IS NULL OR a.student_id = p_student_id;

  INSERT INTO public.behavior_daily_aggregates (
    student_id, behavior_id, behavior_name, service_date,
    total_count, total_duration_seconds, session_count, rate_per_hour
  )
  SELECT b.student_id,
         b.behavior_id,
         COALESCE(nb.name, 'Unlabeled'),
         b.created_at::date,
         COALESCE(sum(b.frequency), 0),
         COALESCE(sum(b.duration_seconds), 0),
         count(DISTINCT b.session_id),
         CASE WHEN COALESCE(sum(b.observation_minutes), 0) > 0
              THEN round((COALESCE(sum(b.frequency), 0)::numeric / sum(b.observation_minutes)) * 60, 4)
              ELSE NULL END
  FROM public.behavior_session_data b
  LEFT JOIN public.nt_behaviors nb
    ON b.behavior_id ~ '^[0-9a-fA-F-]{36}$' AND nb.id = b.behavior_id::uuid
  WHERE b.behavior_id IS NOT NULL
    AND (p_student_id IS NULL OR b.student_id = p_student_id)
  GROUP BY b.student_id, b.behavior_id, nb.name, b.created_at::date;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.rebuild_behavior_daily_aggregates(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rebuild_behavior_daily_aggregates(uuid) TO authenticated;
