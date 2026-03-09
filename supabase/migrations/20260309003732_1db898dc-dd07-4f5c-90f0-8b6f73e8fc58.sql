
create or replace function public.build_parent_training_progress_report(
    p_client_id uuid,
    p_caregiver_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_summary jsonb;
    v_modules jsonb;
    v_goals jsonb;
    v_homework jsonb;
    v_sessions jsonb;
begin
    select to_jsonb(s)
    into v_summary
    from public.v_parent_training_progress_report_summary s
    where s.client_id = p_client_id
      and s.caregiver_id = p_caregiver_id;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'module_assignment_id', module_assignment_id,
                'module_key', module_key,
                'module_title', module_title,
                'status', status,
                'assigned_at', assigned_at,
                'due_date', due_date,
                'assigned_goal_count', assigned_goal_count
            )
            order by assigned_at desc
        ),
        '[]'::jsonb
    )
    into v_modules
    from public.v_parent_training_module_completion_summary
    where client_id = p_client_id
      and caregiver_id = p_caregiver_id;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'goal_assignment_id', goal_assignment_id,
                'goal_title', goal_title,
                'measurement_method', measurement_method,
                'baseline_value', baseline_value,
                'target_value', target_value,
                'current_value', current_value,
                'percent_to_goal', percent_to_goal,
                'mastery_status', mastery_status,
                'last_data_date', last_data_date,
                'data_points', data_points
            )
        ),
        '[]'::jsonb
    )
    into v_goals
    from public.v_parent_training_goal_engine_summary
    where client_id = p_client_id
      and caregiver_id = p_caregiver_id;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'homework_id', homework_id,
                'module_title', module_title,
                'homework_title', homework_title,
                'submission_type', submission_type,
                'submitted_at', submitted_at,
                'file_url', file_url,
                'notes', notes
            )
            order by submitted_at desc
        ),
        '[]'::jsonb
    )
    into v_homework
    from public.v_parent_training_homework_summary
    where client_id = p_client_id
      and caregiver_id = p_caregiver_id;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'session_date', session_date,
                'service_code', service_code,
                'duration_minutes', duration_minutes,
                'session_summary', session_summary,
                'caregiver_response', caregiver_response,
                'homework_assigned', homework_assigned,
                'next_steps', next_steps
            )
            order by session_date desc
        ),
        '[]'::jsonb
    )
    into v_sessions
    from public.parent_training_session_logs
    where client_id = p_client_id
      and caregiver_id = p_caregiver_id;

    return jsonb_build_object(
        'client_id', p_client_id,
        'caregiver_id', p_caregiver_id,
        'summary', coalesce(v_summary, '{}'::jsonb),
        'modules', v_modules,
        'goals', v_goals,
        'homework', v_homework,
        'session_logs', v_sessions
    );
end;
$$;

create or replace function public.build_parent_training_homework_summary(
    p_client_id uuid,
    p_caregiver_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_homework jsonb;
begin
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'homework_id', homework_id,
                'module_title', module_title,
                'homework_title', homework_title,
                'submission_type', submission_type,
                'file_url', file_url,
                'notes', notes,
                'submitted_at', submitted_at
            )
            order by submitted_at desc
        ),
        '[]'::jsonb
    )
    into v_homework
    from public.v_parent_training_homework_summary
    where client_id = p_client_id
      and caregiver_id = p_caregiver_id;

    return jsonb_build_object(
        'client_id', p_client_id,
        'caregiver_id', p_caregiver_id,
        'homework', v_homework
    );
end;
$$;

create or replace function public.save_parent_training_report_snapshot(
    p_client_id uuid,
    p_caregiver_id uuid,
    p_report_type text,
    p_title text,
    p_report_payload jsonb,
    p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_snapshot_id uuid;
begin
    insert into public.parent_training_report_snapshots (
        client_id,
        caregiver_id,
        report_type,
        title,
        report_payload,
        created_by
    )
    values (
        p_client_id,
        p_caregiver_id,
        p_report_type,
        p_title,
        coalesce(p_report_payload, '{}'::jsonb),
        p_created_by
    )
    returning id into v_snapshot_id;

    return v_snapshot_id;
end;
$$;

select pg_notify('pgrst','reload schema');
