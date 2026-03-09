drop view if exists public.v_skill_optimization_candidates;

create view public.v_skill_optimization_candidates as
select
    student_id,
    student_target_id as source_object_id,
    'student_target' as source_object_type,
    mastery_rule_type,
    mastery_threshold,
    current_accuracy,
    current_prompt_independence,
    percent_to_mastery,
    mastery_status,
    consecutive_sessions_at_criterion,
    last_mastery_check_date
from public.v_student_target_mastery_engine_summary;