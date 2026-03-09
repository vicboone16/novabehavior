-- 1. Export targets table
create table if not exists public.goal_optimization_export_targets (
    id uuid primary key default gen_random_uuid(),
    target_key text not null unique,
    target_name text not null,
    description text,
    is_active boolean default true,
    created_at timestamptz default now()
);
alter table public.goal_optimization_export_targets enable row level security;
create policy "Authenticated users can read export targets" on public.goal_optimization_export_targets for select to authenticated using (true);

-- 2. IEP prep recommendation items
create table if not exists public.iep_prep_recommendation_items (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null,
    export_id uuid references public.goal_optimization_exports(id) on delete set null,
    source_type text not null default 'optimization',
    title text not null,
    domain text,
    rationale text,
    recommended_action text,
    suggested_goal_text text,
    suggested_benchmark_text text,
    suggested_support_text text,
    status text not null default 'pending',
    created_by uuid,
    created_at timestamptz default now()
);
alter table public.iep_prep_recommendation_items enable row level security;
create policy "Auth users manage iep prep items" on public.iep_prep_recommendation_items for all to authenticated using (true) with check (true);

-- 3. Reassessment recommendation items
create table if not exists public.reassessment_recommendation_items (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null,
    export_id uuid references public.goal_optimization_exports(id) on delete set null,
    source_type text not null default 'optimization',
    title text not null,
    domain text,
    rationale text,
    recommended_action text,
    suggested_goal_text text,
    status text not null default 'pending',
    created_by uuid,
    created_at timestamptz default now()
);
alter table public.reassessment_recommendation_items enable row level security;
create policy "Auth users manage reassessment items" on public.reassessment_recommendation_items for all to authenticated using (true) with check (true);

-- 4. Programming recommendation items
create table if not exists public.programming_recommendation_items (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null,
    export_id uuid references public.goal_optimization_exports(id) on delete set null,
    source_type text not null default 'optimization',
    title text not null,
    domain text,
    rationale text,
    recommended_action text,
    status text not null default 'pending',
    created_by uuid,
    created_at timestamptz default now()
);
alter table public.programming_recommendation_items enable row level security;
create policy "Auth users manage programming items" on public.programming_recommendation_items for all to authenticated using (true) with check (true);

-- 5. Treatment intelligence export targets
create table if not exists public.treatment_intelligence_export_targets (
    id uuid primary key default gen_random_uuid(),
    target_key text not null unique,
    target_name text not null,
    description text,
    is_active boolean default true,
    created_at timestamptz default now()
);
alter table public.treatment_intelligence_export_targets enable row level security;
create policy "Auth read treatment export targets" on public.treatment_intelligence_export_targets for select to authenticated using (true);

-- 6. Treatment intelligence exports
create table if not exists public.treatment_intelligence_exports (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null,
    source_section text not null,
    source_object_id text,
    export_target text not null,
    exported_text text,
    context_json jsonb default '{}'::jsonb,
    created_by uuid,
    created_at timestamptz default now()
);
alter table public.treatment_intelligence_exports enable row level security;
create policy "Auth users manage treatment exports" on public.treatment_intelligence_exports for all to authenticated using (true) with check (true);

-- 7. Export history view
create or replace view public.v_goal_optimization_export_history as
select
    e.id as export_id,
    e.run_id,
    e.output_id,
    e.export_target,
    e.destination_key,
    e.exported_text,
    e.context_json,
    e.created_by,
    e.created_at,
    o.title as recommendation_title,
    o.domain,
    o.severity,
    o.student_id
from public.goal_optimization_exports e
left join public.goal_optimization_outputs o on o.id = e.output_id
order by e.created_at desc;

-- 8. Treatment intelligence export history view
create or replace view public.v_treatment_intelligence_export_history as
select
    e.id as export_id,
    e.student_id,
    e.source_section,
    e.source_object_id,
    e.export_target,
    e.exported_text,
    e.context_json,
    e.created_by,
    e.created_at
from public.treatment_intelligence_exports e
order by e.created_at desc;

-- 9. Treatment intelligence contextual entry points view
create or replace view public.v_treatment_intelligence_contextual_entry_points as
select
    'behavior_intelligence' as section_key,
    'Behavior Intelligence' as section_name,
    jsonb_build_array(
        'Ask Nova AI', 'Explain This Behavior Trend', 'Draft FBA Summary',
        'Send to FBA Builder', 'Send to BIP Builder', 'Add to Session Note', 'Save to Clinical Drafts'
    ) as available_actions
union all select
    'skill_program_progress', 'Skill / Program Progress',
    jsonb_build_array(
        'Ask Nova AI', 'Summarize Progress', 'Draft Reassessment Summary',
        'Send to Reassessment', 'Save to Clinical Drafts'
    )
union all select
    'replacement_behavior_bip', 'Replacement Behavior & BIP',
    jsonb_build_array(
        'Ask Nova AI', 'Suggest BIP Changes', 'Suggest Replacement Behaviors',
        'Send to BIP Builder', 'Save to Clinical Drafts'
    )
union all select
    'caregiver_training', 'Caregiver / Parent Training',
    jsonb_build_array(
        'Ask Nova AI', 'Review Caregiver Progress', 'Draft Caregiver Summary',
        'Send to Reassessment', 'Save to Clinical Drafts'
    )
union all select
    'clinical_recommendations', 'Clinical Recommendations',
    jsonb_build_array(
        'Ask Nova AI', 'Send to FBA', 'Send to BIP',
        'Send to Reassessment', 'Send to Session Note', 'Save to Clinical Drafts'
    )
union all select
    'goal_suggestions', 'Goal Suggestions',
    jsonb_build_array(
        'Ask Nova AI', 'Rewrite / Expand Goal', 'Send to Reassessment',
        'Promote to Clinical Program', 'Save to Clinical Drafts'
    )
union all select
    'report_reassessment_prep', 'Report / Reassessment Prep',
    jsonb_build_array(
        'Ask Nova AI', 'Draft Clinical Review Summary', 'Send to Report Generator',
        'Send to Reassessment', 'Save to Clinical Drafts'
    );

-- 10. Export RPCs
create or replace function public.export_optimization_to_iep_prep(
    p_output_id uuid, p_run_id uuid, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_export_id uuid; v_item_id uuid; v_rec record;
begin
    select * into v_rec from public.goal_optimization_outputs where id = p_output_id;
    insert into public.goal_optimization_exports (run_id, output_id, export_target, exported_text, context_json, created_by)
    values (p_run_id, p_output_id, 'iep_prep',
        concat_ws(E'\n\n', v_rec.title, v_rec.rationale, v_rec.recommended_action, v_rec.suggested_goal_text),
        jsonb_build_object('domain', v_rec.domain, 'severity', v_rec.severity), p_created_by)
    returning id into v_export_id;
    insert into public.iep_prep_recommendation_items (student_id, export_id, title, domain, rationale, recommended_action, suggested_goal_text, suggested_benchmark_text, suggested_support_text, created_by)
    values (v_rec.student_id, v_export_id, v_rec.title, v_rec.domain, v_rec.rationale, v_rec.recommended_action, v_rec.suggested_goal_text, v_rec.suggested_benchmark_text, v_rec.suggested_support_text, p_created_by);
    return v_export_id;
end;$$;

create or replace function public.export_optimization_to_reassessment(
    p_output_id uuid, p_run_id uuid, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_export_id uuid; v_rec record;
begin
    select * into v_rec from public.goal_optimization_outputs where id = p_output_id;
    insert into public.goal_optimization_exports (run_id, output_id, export_target, exported_text, context_json, created_by)
    values (p_run_id, p_output_id, 'reassessment',
        concat_ws(E'\n\n', v_rec.title, v_rec.rationale, v_rec.recommended_action, v_rec.suggested_goal_text),
        jsonb_build_object('domain', v_rec.domain, 'severity', v_rec.severity), p_created_by)
    returning id into v_export_id;
    insert into public.reassessment_recommendation_items (student_id, export_id, title, domain, rationale, recommended_action, suggested_goal_text, created_by)
    values (v_rec.student_id, v_export_id, v_rec.title, v_rec.domain, v_rec.rationale, v_rec.recommended_action, v_rec.suggested_goal_text, p_created_by);
    return v_export_id;
end;$$;

create or replace function public.export_optimization_to_programming_dashboard(
    p_output_id uuid, p_run_id uuid, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_export_id uuid; v_rec record;
begin
    select * into v_rec from public.goal_optimization_outputs where id = p_output_id;
    insert into public.goal_optimization_exports (run_id, output_id, export_target, exported_text, context_json, created_by)
    values (p_run_id, p_output_id, 'programming_dashboard',
        concat_ws(E'\n\n', v_rec.title, v_rec.rationale, v_rec.recommended_action),
        jsonb_build_object('domain', v_rec.domain, 'severity', v_rec.severity), p_created_by)
    returning id into v_export_id;
    insert into public.programming_recommendation_items (student_id, export_id, title, domain, rationale, recommended_action, created_by)
    values (v_rec.student_id, v_export_id, v_rec.title, v_rec.domain, v_rec.rationale, v_rec.recommended_action, p_created_by);
    return v_export_id;
end;$$;

create or replace function public.export_optimization_to_nova_ai(
    p_output_id uuid, p_run_id uuid, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_export_id uuid; v_rec record;
begin
    select * into v_rec from public.goal_optimization_outputs where id = p_output_id;
    insert into public.goal_optimization_exports (run_id, output_id, export_target, exported_text, context_json, created_by)
    values (p_run_id, p_output_id, 'nova_ai',
        concat_ws(E'\n\n', v_rec.title, v_rec.rationale, v_rec.recommended_action, v_rec.suggested_goal_text),
        jsonb_build_object('domain', v_rec.domain, 'severity', v_rec.severity, 'recommendation_key', v_rec.recommendation_key), p_created_by)
    returning id into v_export_id;
    return v_export_id;
end;$$;

create or replace function public.export_optimization_to_goal_draft(
    p_output_id uuid, p_run_id uuid, p_draft_title text, p_draft_mode text, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_draft_id uuid; v_rec record; v_export_id uuid;
begin
    select * into v_rec from public.goal_optimization_outputs where id = p_output_id;
    insert into public.goal_optimization_exports (run_id, output_id, export_target, exported_text, context_json, created_by)
    values (p_run_id, p_output_id, 'suggested_goal_draft',
        concat_ws(E'\n\n', v_rec.suggested_goal_text, v_rec.suggested_benchmark_text, v_rec.suggested_support_text),
        jsonb_build_object('domain', v_rec.domain), p_created_by)
    returning id into v_export_id;
    insert into public.goal_suggestion_drafts (student_id, run_id, output_id, draft_title, draft_mode, goal_text, benchmark_text, support_text, domain, created_by)
    values (v_rec.student_id, p_run_id, p_output_id, coalesce(p_draft_title, v_rec.title), p_draft_mode, v_rec.suggested_goal_text, v_rec.suggested_benchmark_text, v_rec.suggested_support_text, v_rec.domain, p_created_by)
    returning id into v_draft_id;
    return v_draft_id;
end;$$;

-- Treatment intelligence export RPCs
create or replace function public.export_treatment_recommendation_to_fba(
    p_student_id uuid, p_source_section text, p_source_object_id text, p_text text, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
    insert into public.treatment_intelligence_exports (student_id, source_section, source_object_id, export_target, exported_text, created_by)
    values (p_student_id, p_source_section, p_source_object_id, 'fba', p_text, p_created_by) returning id into v_id;
    return v_id;
end;$$;

create or replace function public.export_treatment_recommendation_to_bip(
    p_student_id uuid, p_source_section text, p_source_object_id text, p_text text, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
    insert into public.treatment_intelligence_exports (student_id, source_section, source_object_id, export_target, exported_text, created_by)
    values (p_student_id, p_source_section, p_source_object_id, 'bip', p_text, p_created_by) returning id into v_id;
    return v_id;
end;$$;

create or replace function public.export_treatment_goal_draft_to_reassessment(
    p_student_id uuid, p_source_section text, p_source_object_id text, p_text text, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
    insert into public.treatment_intelligence_exports (student_id, source_section, source_object_id, export_target, exported_text, created_by)
    values (p_student_id, p_source_section, p_source_object_id, 'reassessment', p_text, p_created_by) returning id into v_id;
    return v_id;
end;$$;

create or replace function public.export_treatment_recommendation_to_session_note(
    p_student_id uuid, p_source_section text, p_source_object_id text, p_text text, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
    insert into public.treatment_intelligence_exports (student_id, source_section, source_object_id, export_target, exported_text, created_by)
    values (p_student_id, p_source_section, p_source_object_id, 'session_note', p_text, p_created_by) returning id into v_id;
    return v_id;
end;$$;

create or replace function public.export_treatment_recommendation_to_clinical_draft(
    p_student_id uuid, p_source_section text, p_source_object_id text, p_text text, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
    insert into public.treatment_intelligence_exports (student_id, source_section, source_object_id, export_target, exported_text, created_by)
    values (p_student_id, p_source_section, p_source_object_id, 'clinical_draft', p_text, p_created_by) returning id into v_id;
    return v_id;
end;$$;

create or replace function public.launch_nova_ai_from_treatment_intelligence(
    p_student_id uuid, p_source_section text, p_source_object_id text, p_prompt_text text, p_created_by uuid
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
    insert into public.treatment_intelligence_exports (student_id, source_section, source_object_id, export_target, exported_text, context_json, created_by)
    values (p_student_id, p_source_section, p_source_object_id, 'nova_ai', p_prompt_text,
        jsonb_build_object('launch_type', 'contextual', 'section', p_source_section), p_created_by) returning id into v_id;
    return v_id;
end;$$;