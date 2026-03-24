
-- 1) Sync function: BOPS program bank → student_targets (student-scoped only)
CREATE OR REPLACE FUNCTION public.assign_bops_student_programs_to_student_targets(
  p_student uuid,
  p_added_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO student_targets (
    student_id, domain_id, title, description, mastery_criteria,
    data_collection_type, priority, status, source_type, source_id,
    customized, linked_prerequisite_ids, baseline_data, current_performance,
    date_added, added_by, notes_for_staff, created_at, updated_at,
    mastery_rule_type, mastery_threshold, required_sessions,
    required_consecutive_sessions, required_prompt_level, lower_is_better,
    generalization_required, generalization_context_count, mastery_status,
    current_accuracy, current_prompt_independence, current_latency,
    current_duration, sessions_at_criterion, consecutive_sessions_at_criterion,
    percent_to_mastery, last_mastery_check_date, target_id
  )
  SELECT
    b.student_id,
    NULL::uuid,
    coalesce(b.goal_title, b.program_name),
    b.goal_description,
    b.mastery_criteria,
    coalesce(nullif(b.data_collection_type, ''), 'probe'),
    'medium', 'active', 'bops', b.id,
    false, '{}'::uuid[], '{}'::jsonb, '{}'::jsonb,
    now(), p_added_by,
    concat_ws(' | ',
      'BOPS Program: ' || coalesce(b.program_name, ''),
      'Problem Area: ' || coalesce(b.problem_area, ''),
      'Day State Source: ' || coalesce(b.day_state, ''),
      'Teacher Summary: ' || coalesce(b.teacher_friendly_summary, ''),
      'Collect data across day states; support level shifts by state, target remains active.'
    ),
    now(), now(),
    'threshold', NULL::numeric, 2, 2, NULL::text, false, false, 1,
    'not_started', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric,
    0, 0, NULL::numeric, NULL::date, NULL::uuid
  FROM bops_program_bank b
  WHERE b.student_id = p_student
    AND b.active = true
    AND NOT EXISTS (
      SELECT 1 FROM student_targets st
      WHERE st.student_id = b.student_id
        AND st.source_type = 'bops'
        AND st.source_id = b.id
    );

  -- Deactivate targets whose BOPS source is no longer active
  UPDATE student_targets st
  SET status = 'inactive', updated_at = now(),
      notes_for_staff = concat_ws(' | ', coalesce(st.notes_for_staff, ''),
        'Auto-inactivated because source BOPS program is no longer active.')
  WHERE st.student_id = p_student
    AND st.source_type = 'bops'
    AND NOT EXISTS (
      SELECT 1 FROM bops_program_bank b
      WHERE b.id = st.source_id AND b.student_id = p_student AND b.active = true
    );
END;
$$;

-- 2) Trigger: auto-sync on bops_program_bank changes
CREATE OR REPLACE FUNCTION public.trg_assign_bops_to_student_targets()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assign_bops_student_programs_to_student_targets(NEW.student_id, NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bops_to_student_targets_assign_trigger ON bops_program_bank;

CREATE TRIGGER bops_to_student_targets_assign_trigger
AFTER INSERT OR UPDATE ON bops_program_bank
FOR EACH ROW
EXECUTE FUNCTION trg_assign_bops_to_student_targets();

-- 3) Effective BOPS targets view with day-state support levels
CREATE OR REPLACE VIEW public.v_student_targets_bops_effective AS
SELECT
  st.id AS student_target_id,
  st.student_id,
  st.title,
  st.description,
  st.mastery_criteria,
  st.data_collection_type,
  st.status,
  st.source_type,
  st.source_id AS bops_program_bank_id,
  b.program_name,
  b.problem_area,
  b.day_state AS source_day_state,
  b.target_options,
  b.benchmark_ladder,
  b.teacher_friendly_summary,
  b.clinician_summary,
  cds.current_day_state,
  CASE coalesce(cds.current_day_state, 'green')
    WHEN 'red' THEN 'full support / regulation-first'
    WHEN 'yellow' THEN 'partial support / scaffolded performance'
    WHEN 'green' THEN 'lower support / stronger independence'
    WHEN 'blue' THEN 'maintenance / generalization / extension'
    ELSE 'lower support / stronger independence'
  END AS effective_support_level,
  CASE coalesce(cds.current_day_state, 'green')
    WHEN 'red' THEN 'collect data with highest prompting/support'
    WHEN 'yellow' THEN 'collect data with moderate prompting/support'
    WHEN 'green' THEN 'collect data with lower prompting/support'
    WHEN 'blue' THEN 'collect maintenance/generalization data'
    ELSE 'collect data with lower prompting/support'
  END AS effective_data_rule
FROM student_targets st
JOIN bops_program_bank b ON b.id = st.source_id
LEFT JOIN (
  SELECT student_id, day_state AS current_day_state
  FROM v_student_bops_current_day_state
) cds ON cds.student_id = st.student_id
WHERE st.source_type = 'bops';
