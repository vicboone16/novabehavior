drop view if exists public.v_caregiver_optimization_candidates;

create view public.v_caregiver_optimization_candidates as
select
    client_id as student_id,
    goal_assignment_id as source_object_id,
    'caregiver_goal' as source_object_type,
    goal_title,
    percent_to_goal,
    mastery_status,
    last_data_date,
    data_points
from public.v_parent_training_goal_engine_summary;