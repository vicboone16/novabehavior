
drop view if exists public.v_parent_training_effective_goals cascade;

create view public.v_parent_training_effective_goals as
select
    ga.id as goal_assignment_id,
    ga.client_id,
    ga.caregiver_id,
    ga.module_assignment_id,
    ga.goal_id,
    ga.goal_source,
    coalesce(ga.custom_goal_title, g.goal_title, g.title) as effective_goal_title,
    coalesce(ga.custom_goal_description, g.goal_description, g.description) as effective_goal_description,
    coalesce(ga.custom_measurement_method, g.measurement_method) as effective_measurement_method,
    coalesce(ga.custom_baseline_definition, g.baseline_definition) as effective_baseline_definition,
    coalesce(ga.custom_target_definition, g.target_definition) as effective_target_definition,
    coalesce(ga.custom_mastery_criteria, g.mastery_criteria) as effective_mastery_criteria,
    coalesce(ga.custom_unit, g.unit) as effective_unit,
    coalesce(ga.custom_target_direction, g.target_direction, 'increase') as effective_target_direction,
    coalesce(ga.custom_mastery_rule_type, g.mastery_rule_type, 'threshold') as effective_mastery_rule_type,
    coalesce(ga.custom_mastery_threshold, g.mastery_threshold, ga.target_value) as effective_mastery_threshold,
    coalesce(ga.custom_required_consecutive_sessions, g.required_consecutive_sessions, 1) as effective_required_consecutive_sessions,
    coalesce(ga.custom_lower_is_better, g.lower_is_better, false) as effective_lower_is_better,
    ga.baseline_value,
    ga.target_value,
    ga.current_value,
    ga.status,
    ga.mastery_status,
    ga.percent_to_goal,
    ga.insurance_billable,
    ga.start_date,
    ga.target_date,
    ga.last_data_date,
    ga.last_mastery_check_date,
    ga.consecutive_sessions_met,
    ga.notes,
    ga.save_as_library_candidate
from public.parent_training_goal_assignments ga
left join public.parent_training_goals g
  on g.id = ga.goal_id;

select pg_notify('pgrst','reload schema');
