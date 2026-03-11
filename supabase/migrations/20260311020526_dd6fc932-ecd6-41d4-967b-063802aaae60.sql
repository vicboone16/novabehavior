
create or replace function public.seed_iep_meeting_checklist(
    p_meeting_session_id uuid
)
returns integer
language plpgsql security definer as $$
declare v_inserted integer;
begin
    insert into public.iep_meeting_checklist_items (meeting_session_id, item_key, item_label, is_complete)
    values
    (p_meeting_session_id, 'teacher_input', 'Teacher Input / Observations', false),
    (p_meeting_session_id, 'parent_input', 'Parent Input', false),
    (p_meeting_session_id, 'assessment_results', 'Assessment Results', false),
    (p_meeting_session_id, 'goal_progress', 'Goal Progress Summary', false),
    (p_meeting_session_id, 'behavior_summary', 'Behavior Summary', false),
    (p_meeting_session_id, 'draft_recommendations', 'Draft Recommendations', false),
    (p_meeting_session_id, 'attendance', 'Attendees Added', false)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    return v_inserted;
end; $$;

create or replace function public.seed_iep_meeting_intelligence_snapshot(
    p_meeting_session_id uuid, p_created_by uuid default null
)
returns uuid
language plpgsql security definer as $$
declare v_meeting record; v_snapshot_id uuid; v_context jsonb; v_goal_summary jsonb; v_behavior_summary jsonb;
begin
    select * into v_meeting from public.iep_meeting_sessions where id = p_meeting_session_id;
    if not found then raise exception 'IEP meeting session not found'; end if;
    select to_jsonb(c) into v_context from public.v_iep_meeting_intelligence_context c where c.student_id = v_meeting.student_id limit 1;
    select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) into v_goal_summary from public.v_iep_goal_progress_summary g where g.student_id = v_meeting.student_id;
    select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) into v_behavior_summary from public.v_iep_behavior_summary b where b.student_id = v_meeting.student_id;
    insert into public.iep_meeting_intelligence_snapshots (meeting_session_id, student_id, client_id, snapshot_json, created_by)
    values (p_meeting_session_id, v_meeting.student_id, v_meeting.client_id,
      jsonb_build_object('context', coalesce(v_context, '{}'::jsonb), 'goal_summary', coalesce(v_goal_summary, '[]'::jsonb), 'behavior_summary', coalesce(v_behavior_summary, '[]'::jsonb)),
      p_created_by)
    returning id into v_snapshot_id;
    return v_snapshot_id;
end; $$;

create or replace function public.seed_iep_meeting_talking_points(
    p_meeting_session_id uuid, p_student_id uuid, p_created_by uuid default null
)
returns integer
language plpgsql security definer as $$
declare v_inserted integer;
begin
    insert into public.iep_meeting_talking_points (meeting_session_id, point_category, point_text, display_order, created_by)
    values
    (p_meeting_session_id, 'strengths', 'Review student strengths and areas of steady progress before discussing concerns or revisions.', 1, p_created_by),
    (p_meeting_session_id, 'goals', 'Discuss goals that appear mastered, goals that are progressing, and any goals that may need revision or benchmark restructuring.', 2, p_created_by),
    (p_meeting_session_id, 'behavior', 'Discuss behavior trends, replacement behavior progress, and any classroom support needs.', 3, p_created_by),
    (p_meeting_session_id, 'supports', 'Review supports that appear effective and identify any additional classroom accommodations or implementation changes needed.', 4, p_created_by),
    (p_meeting_session_id, 'services', 'Discuss whether the current service structure and level of support continue to match the student''s needs.', 5, p_created_by)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    return v_inserted;
end; $$;
