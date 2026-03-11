
create or replace function public.push_school_optimization_to_iep_meeting(
    p_meeting_session_id uuid, p_student_id uuid, p_created_by uuid default null
)
returns integer
language plpgsql security definer as $$
declare v_inserted integer;
begin
    insert into public.iep_meeting_recommendation_items (
        meeting_session_id, student_id, client_id, source_type, source_object_id,
        recommendation_category, title, rationale, recommended_action,
        suggested_goal_text, suggested_benchmark_text, suggested_support_text, severity, created_by
    )
    select p_meeting_session_id, r.student_id, r.client_id, 'optimization', r.id,
        r.domain, r.title, r.rationale, r.recommended_action,
        r.suggested_goal_text, r.suggested_benchmark_text, r.suggested_support_text, r.severity, p_created_by
    from public.v_iep_prep_optimization_recommendations r
    where r.student_id = p_student_id
      and not exists (
        select 1 from public.iep_meeting_recommendation_items x
        where x.meeting_session_id = p_meeting_session_id and x.source_type = 'optimization' and x.source_object_id = r.id
      );
    get diagnostics v_inserted = row_count;
    return v_inserted;
end; $$;

create or replace function public.push_approved_goal_drafts_to_iep_meeting(
    p_meeting_session_id uuid, p_student_id uuid, p_created_by uuid default null
)
returns integer
language plpgsql security definer as $$
declare v_inserted integer;
begin
    insert into public.iep_meeting_goal_draft_items (
        meeting_session_id, student_id, client_id, source_goal_draft_id,
        draft_title, goal_text, benchmark_text, support_text, rationale, status, created_by
    )
    select p_meeting_session_id, d.student_id, d.student_id, d.id,
        d.draft_title, d.goal_text, d.benchmark_text, d.support_text, d.rationale,
        case when lower(coalesce(d.status,'')) = 'approved' then 'approved' else 'draft' end,
        p_created_by
    from public.v_iep_goal_suggestion_drafts d
    where d.student_id = p_student_id
      and d.status in ('draft','under_review','approved','promoted')
      and not exists (
        select 1 from public.iep_meeting_goal_draft_items x
        where x.meeting_session_id = p_meeting_session_id and x.source_goal_draft_id = d.id
      );
    get diagnostics v_inserted = row_count;
    return v_inserted;
end; $$;
