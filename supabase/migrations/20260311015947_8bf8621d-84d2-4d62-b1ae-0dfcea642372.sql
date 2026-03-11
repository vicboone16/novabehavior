
create or replace function public.launch_nova_ai_from_optimization_recommendation(
    p_recommendation_id uuid,
    p_context_session_id uuid,
    p_user_id uuid,
    p_action_key text default 'explain_recommendation'
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_action record;
    v_rec record;
    v_output_id uuid;
    v_prompt text;
begin
    select *
    into v_action
    from public.v_nova_ai_optimization_quick_actions
    where action_key = p_action_key
      and source_type = 'recommendation';

    if not found then
        raise exception 'Nova AI optimization quick action not found';
    end if;

    select *
    into v_rec
    from public.v_goal_optimization_recommendations
    where id = p_recommendation_id;

    if not found then
        raise exception 'Optimization recommendation not found';
    end if;

    v_prompt := concat(
      v_action.default_prompt_text,
      E'\n\nRecommendation Title: ', coalesce(v_rec.title, ''),
      E'\nRationale: ', coalesce(v_rec.rationale, ''),
      E'\nRecommended Action: ', coalesce(v_rec.recommended_action, ''),
      E'\nDomain: ', coalesce(v_rec.domain, '')
    );

    v_output_id := public.seed_nova_ai_case_reasoning_output(
        p_context_session_id,
        p_user_id,
        v_action.default_reasoning_mode,
        v_prompt
    );

    return v_output_id;
end;
$$;

create or replace function public.launch_nova_ai_from_goal_draft(
    p_draft_id uuid,
    p_context_session_id uuid,
    p_user_id uuid,
    p_action_key text default 'expand_goal_rationale'
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_action record;
    v_draft record;
    v_output_id uuid;
    v_prompt text;
begin
    select *
    into v_action
    from public.v_nova_ai_optimization_quick_actions
    where action_key = p_action_key
      and source_type = 'goal_draft';

    if not found then
        raise exception 'Nova AI optimization quick action not found';
    end if;

    select *
    into v_draft
    from public.goal_suggestion_drafts
    where id = p_draft_id;

    if not found then
        raise exception 'Goal suggestion draft not found';
    end if;

    v_prompt := concat(
      v_action.default_prompt_text,
      E'\n\nDraft Title: ', coalesce(v_draft.draft_title, ''),
      E'\nGoal Text: ', coalesce(v_draft.goal_text, ''),
      E'\nBenchmark Text: ', coalesce(v_draft.benchmark_text, ''),
      E'\nSupport Text: ', coalesce(v_draft.support_text, ''),
      E'\nMode: ', coalesce(v_draft.draft_mode, ''),
      E'\nDomain: ', coalesce(v_draft.domain, '')
    );

    v_output_id := public.seed_nova_ai_case_reasoning_output(
        p_context_session_id,
        p_user_id,
        v_action.default_reasoning_mode,
        v_prompt
    );

    return v_output_id;
end;
$$;

select pg_notify('pgrst', 'reload schema');
