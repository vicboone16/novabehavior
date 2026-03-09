-- RPC: build_parent_training_goal_sheet
CREATE OR REPLACE FUNCTION public.build_parent_training_goal_sheet(
    p_client_id uuid,
    p_caregiver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_goals jsonb;
BEGIN
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'goal_assignment_id', goal_assignment_id,
                'goal_title', effective_goal_title,
                'goal_description', effective_goal_description,
                'measurement_method', effective_measurement_method,
                'baseline_definition', effective_baseline_definition,
                'target_definition', effective_target_definition,
                'mastery_criteria', effective_mastery_criteria,
                'unit', effective_unit,
                'baseline_value', baseline_value,
                'target_value', target_value,
                'current_value', current_value,
                'percent_to_goal', percent_to_goal,
                'mastery_status', mastery_status,
                'target_date', target_date,
                'goal_source', goal_source,
                'notes', notes
            )
        ),
        '[]'::jsonb
    )
    INTO v_goals
    FROM public.v_parent_training_effective_goals
    WHERE client_id = p_client_id
      AND caregiver_id = p_caregiver_id;

    RETURN jsonb_build_object(
        'client_id', p_client_id,
        'caregiver_id', p_caregiver_id,
        'goals', v_goals
    );
END;
$$;

-- RPC: build_parent_training_progress_report
CREATE OR REPLACE FUNCTION public.build_parent_training_progress_report(
    p_client_id uuid,
    p_caregiver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_summary jsonb;
    v_modules jsonb;
    v_goals jsonb;
    v_homework jsonb;
    v_sessions jsonb;
BEGIN
    SELECT to_jsonb(s)
    INTO v_summary
    FROM public.v_parent_training_progress_report_summary s
    WHERE s.client_id = p_client_id
      AND s.caregiver_id = p_caregiver_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'module_assignment_id', module_assignment_id,
        'module_key', module_key,
        'module_title', module_title,
        'status', status,
        'assigned_at', assigned_at,
        'due_date', due_date,
        'assigned_goal_count', assigned_goal_count
    ) ORDER BY assigned_at DESC), '[]'::jsonb)
    INTO v_modules
    FROM public.v_parent_training_module_completion_summary
    WHERE client_id = p_client_id AND caregiver_id = p_caregiver_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
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
    )), '[]'::jsonb)
    INTO v_goals
    FROM public.v_parent_training_goal_engine_summary
    WHERE client_id = p_client_id AND caregiver_id = p_caregiver_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'homework_id', homework_id,
        'module_title', module_title,
        'homework_title', homework_title,
        'submission_type', submission_type,
        'submitted_at', submitted_at,
        'file_url', file_url,
        'notes', notes
    ) ORDER BY submitted_at DESC), '[]'::jsonb)
    INTO v_homework
    FROM public.v_parent_training_homework_summary
    WHERE client_id = p_client_id AND caregiver_id = p_caregiver_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'session_date', session_date,
        'service_code', service_code,
        'duration_minutes', duration_minutes,
        'session_summary', session_summary,
        'caregiver_response', caregiver_response,
        'homework_assigned', homework_assigned,
        'next_steps', next_steps
    ) ORDER BY session_date DESC), '[]'::jsonb)
    INTO v_sessions
    FROM public.parent_training_session_logs
    WHERE client_id = p_client_id AND caregiver_id = p_caregiver_id;

    RETURN jsonb_build_object(
        'client_id', p_client_id,
        'caregiver_id', p_caregiver_id,
        'summary', COALESCE(v_summary, '{}'::jsonb),
        'modules', v_modules,
        'goals', v_goals,
        'homework', v_homework,
        'session_logs', v_sessions
    );
END;
$$;

-- RPC: build_parent_training_homework_summary
CREATE OR REPLACE FUNCTION public.build_parent_training_homework_summary(
    p_client_id uuid,
    p_caregiver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_homework jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'homework_id', homework_id,
        'module_title', module_title,
        'homework_title', homework_title,
        'submission_type', submission_type,
        'file_url', file_url,
        'notes', notes,
        'submitted_at', submitted_at,
        'review_status', review_status,
        'reviewer_notes', reviewer_notes
    ) ORDER BY submitted_at DESC), '[]'::jsonb)
    INTO v_homework
    FROM public.v_parent_training_homework_summary
    WHERE client_id = p_client_id AND caregiver_id = p_caregiver_id;

    RETURN jsonb_build_object(
        'client_id', p_client_id,
        'caregiver_id', p_caregiver_id,
        'homework', v_homework
    );
END;
$$;

-- RPC: save_parent_training_report_snapshot
CREATE OR REPLACE FUNCTION public.save_parent_training_report_snapshot(
    p_client_id uuid,
    p_caregiver_id uuid,
    p_report_type text,
    p_title text,
    p_report_payload jsonb,
    p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_snapshot_id uuid;
BEGIN
    INSERT INTO public.parent_training_report_snapshots (
        client_id, caregiver_id, report_type, title, report_payload, created_by
    ) VALUES (
        p_client_id, p_caregiver_id, p_report_type, p_title,
        COALESCE(p_report_payload, '{}'::jsonb), p_created_by
    )
    RETURNING id INTO v_snapshot_id;
    RETURN v_snapshot_id;
END;
$$;

SELECT pg_notify('pgrst','reload schema');