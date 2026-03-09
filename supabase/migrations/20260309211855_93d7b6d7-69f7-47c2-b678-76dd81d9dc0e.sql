drop view if exists public.v_behavior_optimization_candidates;

create view public.v_behavior_optimization_candidates as
select
    student_id,
    plan_link_id as source_object_id,
    'behavior_plan_link' as source_object_type,
    problem_behavior_name,
    problem_behavior_count,
    replacement_behavior_count,
    replacement_to_problem_ratio,
    replacement_strength_score,
    replacement_status,
    last_replacement_analysis_date
from public.v_replacement_behavior_strength_summary;