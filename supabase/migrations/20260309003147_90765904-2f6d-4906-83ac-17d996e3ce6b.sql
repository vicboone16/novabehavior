
create or replace function public.promote_custom_parent_goal_to_library(
    p_custom_goal_id uuid,
    p_goal_key text
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_custom public.parent_training_custom_goals;
    v_library_goal_id uuid;
begin
    select *
    into v_custom
    from public.parent_training_custom_goals
    where id = p_custom_goal_id;

    if not found then
        raise exception 'Custom goal not found';
    end if;

    insert into public.parent_training_goals (
        module_id, goal_key, title, description,
        goal_title, goal_description, measurement_method,
        baseline_definition, target_definition, mastery_criteria,
        unit, is_active
    )
    values (
        v_custom.module_id, p_goal_key,
        v_custom.goal_title, v_custom.goal_description,
        v_custom.goal_title, v_custom.goal_description,
        v_custom.measurement_method, v_custom.baseline_definition,
        v_custom.target_definition, v_custom.mastery_criteria,
        v_custom.unit, true
    )
    returning id into v_library_goal_id;

    update public.parent_training_custom_goals
    set promoted_goal_id = v_library_goal_id,
        add_to_library = true,
        updated_at = now()
    where id = p_custom_goal_id;

    return v_library_goal_id;
end;
$$;

create or replace function public.log_parent_training_goal_data(
    p_goal_assignment_id uuid,
    p_caregiver_id uuid,
    p_data_value numeric default null,
    p_data_text text default null,
    p_notes text default null,
    p_entered_by uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_data_id uuid;
    v_baseline numeric;
    v_target numeric;
    v_percent numeric;
    v_status text;
begin
    insert into public.parent_training_data (
        goal_assignment_id, caregiver_id, data_value,
        data_text, notes, entered_by
    )
    values (
        p_goal_assignment_id, p_caregiver_id,
        p_data_value, p_data_text, p_notes, p_entered_by
    )
    returning id into v_data_id;

    select baseline_value, target_value
    into v_baseline, v_target
    from public.parent_training_goal_assignments
    where id = p_goal_assignment_id;

    if p_data_value is not null and v_target is not null then
        if v_baseline is not null and v_target <> v_baseline then
            v_percent := round(((p_data_value - v_baseline) / nullif((v_target - v_baseline), 0)) * 100, 2);
        else
            v_percent := round((p_data_value / nullif(v_target, 0)) * 100, 2);
        end if;

        if p_data_value >= v_target then
            v_status := 'mastered';
        elsif p_data_value > coalesce(v_baseline, 0) then
            v_status := 'in_progress';
        else
            v_status := 'not_started';
        end if;
    else
        v_percent := null;
        v_status := 'in_progress';
    end if;

    update public.parent_training_goal_assignments
    set
        current_value = coalesce(p_data_value, current_value),
        last_data_date = current_date,
        percent_to_goal = v_percent,
        mastery_status = coalesce(v_status, mastery_status),
        updated_at = now()
    where id = p_goal_assignment_id;

    return v_data_id;
end;
$$;

drop view if exists public.v_parent_training_goal_engine_summary cascade;
create view public.v_parent_training_goal_engine_summary as
select
    ga.id as goal_assignment_id,
    ga.client_id,
    ga.caregiver_id,
    coalesce(ga.custom_goal_title, g.goal_title, g.title) as goal_title,
    coalesce(ga.custom_measurement_method, g.measurement_method) as measurement_method,
    ga.baseline_value,
    ga.target_value,
    ga.current_value,
    ga.percent_to_goal,
    ga.mastery_status,
    ga.last_data_date,
    count(d.id) as data_points
from public.parent_training_goal_assignments ga
left join public.parent_training_goals g
  on g.id = ga.goal_id
left join public.parent_training_data d
  on d.goal_assignment_id = ga.id
group by
    ga.id, ga.client_id, ga.caregiver_id,
    coalesce(ga.custom_goal_title, g.goal_title, g.title),
    coalesce(ga.custom_measurement_method, g.measurement_method),
    ga.baseline_value, ga.target_value, ga.current_value,
    ga.percent_to_goal, ga.mastery_status, ga.last_data_date;

create or replace function public.build_parent_training_insurance_summary(
    p_client_id uuid,
    p_caregiver_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_modules jsonb;
    v_goals jsonb;
    v_sessions jsonb;
begin
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'module_assignment_id', a.id,
                'module_key', m.module_key,
                'module_title', m.title,
                'status', a.status,
                'assigned_at', a.assigned_at,
                'due_date', a.due_date
            )
            order by m.order_index
        ),
        '[]'::jsonb
    )
    into v_modules
    from public.parent_training_assignments a
    join public.parent_training_modules m
      on m.id = a.module_id
    where a.client_id = p_client_id
      and a.caregiver_id = p_caregiver_id;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'goal_assignment_id', eg.goal_assignment_id,
                'goal_title', eg.effective_goal_title,
                'goal_description', eg.effective_goal_description,
                'measurement_method', eg.effective_measurement_method,
                'baseline_definition', eg.effective_baseline_definition,
                'target_definition', eg.effective_target_definition,
                'mastery_criteria', eg.effective_mastery_criteria,
                'unit', eg.effective_unit,
                'baseline_value', eg.baseline_value,
                'target_value', eg.target_value,
                'current_value', eg.current_value,
                'percent_to_goal', eg.percent_to_goal,
                'mastery_status', eg.mastery_status,
                'status', eg.status,
                'insurance_billable', eg.insurance_billable,
                'goal_source', eg.goal_source
            )
        ),
        '[]'::jsonb
    )
    into v_goals
    from public.v_parent_training_effective_goals eg
    where eg.client_id = p_client_id
      and eg.caregiver_id = p_caregiver_id;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'session_date', l.session_date,
                'service_code', l.service_code,
                'duration_minutes', l.duration_minutes,
                'session_summary', l.session_summary,
                'caregiver_response', l.caregiver_response,
                'homework_assigned', l.homework_assigned,
                'next_steps', l.next_steps
            )
            order by l.session_date desc
        ),
        '[]'::jsonb
    )
    into v_sessions
    from public.parent_training_session_logs l
    where l.client_id = p_client_id
      and l.caregiver_id = p_caregiver_id;

    return jsonb_build_object(
        'client_id', p_client_id,
        'caregiver_id', p_caregiver_id,
        'modules', v_modules,
        'goals', v_goals,
        'session_logs', v_sessions
    );
end;
$$;

select pg_notify('pgrst','reload schema');
