
DROP FUNCTION IF EXISTS public.accept_recommended_programs_by_day_state(uuid, uuid);
DROP FUNCTION IF EXISTS public.accept_by_day_state_and_activate(uuid, uuid);

CREATE OR REPLACE FUNCTION public.accept_recommended_programs_by_day_state(
  p_student uuid,
  p_session_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  rec record;
BEGIN
  FOR rec IN
    SELECT *
    FROM v_bops_student_program_recommendations r
    WHERE r.student_id = p_student
      AND r.session_id = p_session_id
      AND NOT EXISTS (
        SELECT 1 FROM bops_program_bank bp
        WHERE bp.student_id = p_student
          AND bp.source_program_key = r.program_key
          AND bp.day_state = r.day_state
      )
  LOOP
    INSERT INTO bops_program_bank (
      student_id, program_name, linked_domain, linked_archetype,
      problem_area, goal_title, goal_description, day_state,
      target_options, benchmark_ladder, mastery_criteria,
      antecedent_strategies, teaching_strategies, reactive_strategies,
      reinforcement_plan, teacher_friendly_summary, clinician_summary,
      source_program_key, source_profile_key, active
    ) VALUES (
      p_student, rec.program_name, rec.linked_domain, rec.linked_archetype,
      rec.problem_area, rec.goal_title, rec.goal_description, rec.day_state,
      rec.target_options, rec.benchmark_ladder, rec.mastery_criteria,
      rec.antecedent_strategies, rec.teaching_strategies, rec.reactive_strategies,
      rec.reinforcement_plan, rec.teacher_friendly_summary, rec.clinician_summary,
      rec.program_key, rec.profile_key, true
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_by_day_state_and_activate(
  p_student uuid,
  p_session_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT accept_recommended_programs_by_day_state(p_student, p_session_id)
  INTO v_count;

  PERFORM activate_bops_programming(p_student);

  RETURN v_count;
END;
$$;
