
DROP VIEW IF EXISTS public.v_goal_optimization_context;
CREATE VIEW public.v_goal_optimization_context AS
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
    coalesce(pta.total_goals, 0) AS caregiver_total_goals,
    coalesce(pta.mastered_goals, 0) AS caregiver_mastered_goals,
    coalesce(pta.in_progress_goals, 0) AS caregiver_in_progress_goals,
    coalesce(pta.not_started_goals, 0) AS caregiver_not_started_goals,
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

DROP VIEW IF EXISTS public.v_skill_optimization_candidates;
CREATE VIEW public.v_skill_optimization_candidates AS
SELECT
    student_id,
    student_target_id AS source_object_id,
    'student_target' AS source_object_type,
    mastery_rule_type,
    mastery_threshold,
    current_accuracy,
    current_prompt_independence,
    percent_to_mastery,
    mastery_status,
    consecutive_sessions_at_criterion,
    last_mastery_check_date
FROM public.v_student_target_mastery_engine_summary;

DROP VIEW IF EXISTS public.v_behavior_optimization_candidates;
CREATE VIEW public.v_behavior_optimization_candidates AS
SELECT
    student_id,
    plan_link_id AS source_object_id,
    'behavior_plan_link' AS source_object_type,
    problem_behavior_name,
    problem_behavior_count,
    replacement_behavior_count,
    replacement_to_problem_ratio,
    replacement_strength_score,
    replacement_status
FROM public.v_replacement_behavior_strength_summary;

DROP VIEW IF EXISTS public.v_caregiver_optimization_candidates;
CREATE VIEW public.v_caregiver_optimization_candidates AS
SELECT
    client_id AS student_id,
    goal_assignment_id AS source_object_id,
    'caregiver_goal' AS source_object_type,
    goal_title,
    percent_to_goal,
    mastery_status,
    last_data_date,
    data_points
FROM public.v_parent_training_goal_engine_summary;

CREATE TABLE IF NOT EXISTS public.goal_optimization_exports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL,
    output_id uuid NOT NULL,
    export_target text NOT NULL,
    destination_key text,
    exported_text text,
    context_json jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.goal_optimization_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own optimization exports"
    ON public.goal_optimization_exports FOR ALL TO authenticated
    USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.goal_suggestion_drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid,
    run_id uuid,
    output_id uuid,
    draft_title text NOT NULL,
    draft_mode text DEFAULT 'clinical',
    goal_text text,
    benchmark_text text,
    support_text text,
    domain text,
    status text DEFAULT 'draft',
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.goal_suggestion_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own goal suggestion drafts"
    ON public.goal_suggestion_drafts FOR ALL TO authenticated
    USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
