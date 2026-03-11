
-- v_reassessment_optimization_recommendations (adapted to actual columns)
drop view if exists public.v_reassessment_optimization_recommendations;
create view public.v_reassessment_optimization_recommendations as
select
    r.id,
    r.student_id,
    r.export_id,
    r.source_type,
    r.title,
    r.domain,
    r.rationale,
    r.recommended_action,
    r.suggested_goal_text,
    r.status,
    r.created_at
from public.reassessment_recommendation_items r;

-- v_programming_optimization_recommendations
drop view if exists public.v_programming_optimization_recommendations;
create view public.v_programming_optimization_recommendations as
select
    o.id,
    o.run_id,
    o.student_id,
    o.client_id,
    o.domain,
    o.recommendation_key,
    o.title,
    o.rationale,
    o.recommended_action,
    o.suggested_goal_text,
    o.suggested_benchmark_text,
    o.suggested_support_text,
    o.severity,
    o.created_at
from public.v_goal_optimization_recommendations o
where o.profile_key = 'clinical_aba_default';

-- v_reassessment_goal_suggestion_drafts (from goal_suggestion_drafts directly since v_goal_suggestion_drafts_review doesn't exist)
drop view if exists public.v_reassessment_goal_suggestion_drafts;
create view public.v_reassessment_goal_suggestion_drafts as
select
    d.id,
    d.student_id,
    d.draft_mode as mode,
    d.domain,
    d.draft_title,
    d.goal_text,
    d.benchmark_text,
    d.support_text,
    d.status,
    d.created_at,
    d.updated_at
from public.goal_suggestion_drafts d
where d.status in ('draft', 'under_review', 'approved', 'promoted');

-- v_iep_goal_suggestion_drafts
drop view if exists public.v_iep_goal_suggestion_drafts;
create view public.v_iep_goal_suggestion_drafts as
select
    d.id,
    d.student_id,
    d.domain,
    d.draft_title,
    d.goal_text,
    d.benchmark_text,
    d.support_text,
    d.status,
    d.created_at,
    d.updated_at
from public.goal_suggestion_drafts d
where d.draft_mode = 'school_iep';

-- v_clinical_goal_suggestion_drafts
drop view if exists public.v_clinical_goal_suggestion_drafts;
create view public.v_clinical_goal_suggestion_drafts as
select
    d.id,
    d.student_id,
    d.domain,
    d.draft_title,
    d.goal_text,
    d.benchmark_text,
    d.support_text,
    d.status,
    d.created_at,
    d.updated_at
from public.goal_suggestion_drafts d
where d.draft_mode = 'clinical_aba';
