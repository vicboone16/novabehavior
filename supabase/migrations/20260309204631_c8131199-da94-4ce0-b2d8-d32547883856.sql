
DROP VIEW IF EXISTS public.v_nova_ai_case_context_summary;
CREATE VIEW public.v_nova_ai_case_context_summary AS
SELECT
    s.student_id,
    s.student_id AS client_id,
    sis.skill_alert_count,
    sis.behavior_alert_count,
    sis.programming_alert_count,
    sis.caregiver_alert_count,
    bei.behavior_name,
    bei.top_time_of_day,
    bei.top_antecedent_pattern,
    bei.top_consequence_pattern,
    bei.transition_risk_flag,
    bei.unstructured_time_risk_flag,
    bei.lunch_time_risk_flag,
    bei.escape_pattern_flag,
    bei.attention_pattern_flag,
    bei.total_behavior_events,
    COALESCE(pta.total_goals, 0) AS caregiver_total_goals,
    COALESCE(pta.mastered_goals, 0) AS caregiver_mastered_goals,
    COALESCE(pta.in_progress_goals, 0) AS caregiver_in_progress_goals,
    COALESCE(pta.not_started_goals, 0) AS caregiver_not_started_goals,
    pta.last_data_submission_at,
    pta.last_homework_submission_at
FROM (
    SELECT DISTINCT student_id FROM public.v_student_intelligence_summary
) s
LEFT JOIN public.v_student_intelligence_summary sis ON sis.student_id = s.student_id
LEFT JOIN public.v_behavior_event_intelligence_summary bei ON bei.student_id = s.student_id
LEFT JOIN (
    SELECT
      client_id,
      sum(total_goals) AS total_goals,
      sum(mastered_goals) AS mastered_goals,
      sum(in_progress_goals) AS in_progress_goals,
      sum(not_started_goals) AS not_started_goals,
      max(last_data_submission_at) AS last_data_submission_at,
      max(last_homework_submission_at) AS last_homework_submission_at
    FROM public.v_parent_training_assignment_intelligence_summary
    GROUP BY client_id
) pta ON pta.client_id = s.student_id;

DROP VIEW IF EXISTS public.v_nova_ai_behavior_context;
CREATE VIEW public.v_nova_ai_behavior_context AS
SELECT
    r.student_id,
    r.problem_behavior_name,
    r.problem_behavior_count,
    r.replacement_behavior_count,
    r.replacement_to_problem_ratio,
    r.replacement_strength_score,
    r.replacement_status
FROM public.v_replacement_behavior_strength_summary r;
