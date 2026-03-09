
create or replace function public.resolve_criteria_assignment(
  p_student_id uuid,
  p_program_id uuid,
  p_target_id uuid,
  p_benchmark_id uuid,
  p_criteria_type public.criteria_type
)
returns table (
  criteria_assignment_id uuid,
  criteria_template_id uuid,
  effective_definition jsonb
)
language plpgsql
as $$
declare
  ca record;
  ct record;
begin
  select *
  into ca
  from public.criteria_assignments
  where criteria_type = p_criteria_type
    and is_active = true
    and (
      (scope = 'benchmark' and scope_id = p_benchmark_id) or
      (scope = 'target'    and scope_id = p_target_id) or
      (scope = 'program'   and scope_id = p_program_id) or
      (scope = 'student'   and scope_id = p_student_id) or
      (scope = 'global'    and scope_id is null)
    )
  order by
    case
      when scope = 'benchmark' then 1
      when scope = 'target'    then 2
      when scope = 'program'   then 3
      when scope = 'student'   then 4
      when scope = 'global'    then 5
      else 99
    end
  limit 1;

  if ca.id is null then
    return;
  end if;

  select *
  into ct
  from public.criteria_templates
  where id = ca.criteria_template_id;

  criteria_assignment_id := ca.id;
  criteria_template_id := ca.criteria_template_id;
  effective_definition :=
    coalesce(ct.definition, '{}'::jsonb) || coalesce(ca.override_definition, '{}'::jsonb);

  return next;
end;
$$;

create or replace function public.resolve_automation_settings(
  p_student_id uuid,
  p_program_id uuid,
  p_target_id uuid,
  p_benchmark_id uuid
)
returns table (
  automation_settings_id uuid,
  automation_mode public.automation_mode,
  require_confirmation boolean,
  trigger_next_on public.trigger_next_on,
  next_action_mode public.next_action_mode,
  sequence_mode text,
  sequence_list jsonb,
  pathway_id uuid,
  pathway_rule jsonb,
  benchmark_rule jsonb,
  auto_advance_phase boolean,
  auto_start_phase public.target_phase
)
language plpgsql
as $$
declare
  a record;
begin
  select *
  into a
  from public.automation_settings
  where is_active = true
    and (
      (scope = 'target'  and scope_id = p_target_id) or
      (scope = 'program' and scope_id = p_program_id) or
      (scope = 'student' and scope_id = p_student_id) or
      (scope = 'global'  and scope_id is null)
    )
  order by
    case
      when scope = 'target'  then 1
      when scope = 'program' then 2
      when scope = 'student' then 3
      when scope = 'global'  then 4
      else 99
    end
  limit 1;

  if a.id is null then
    automation_settings_id := null;
    automation_mode := 'queue_for_review';
    require_confirmation := true;
    trigger_next_on := 'maintenance_met';
    next_action_mode := 'none';
    sequence_mode := 'sort_order';
    sequence_list := null;
    pathway_id := null;
    pathway_rule := null;
    benchmark_rule := null;
    auto_advance_phase := false;
    auto_start_phase := null;
    return next;
  end if;

  automation_settings_id := a.id;
  automation_mode := a.automation_mode;
  require_confirmation := a.require_confirmation;
  trigger_next_on := a.trigger_next_on;
  next_action_mode := a.next_action_mode;
  sequence_mode := a.sequence_mode;
  sequence_list := a.sequence_list;
  pathway_id := a.pathway_id;
  pathway_rule := a.pathway_rule;
  benchmark_rule := a.benchmark_rule;
  auto_advance_phase := a.auto_advance_phase;
  auto_start_phase := a.auto_start_phase;
  return next;
end;
$$;
