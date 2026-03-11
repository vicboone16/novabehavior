
create table if not exists public.iep_meeting_sessions (
    id uuid primary key default gen_random_uuid(),
    student_id uuid,
    client_id uuid,
    meeting_date date,
    meeting_type text default 'annual_review',
    meeting_title text,
    school_name text,
    grade_level text,
    case_manager_name text,
    status text default 'draft',
    include_behavior_summary boolean default true,
    include_goal_progress boolean default true,
    include_recommendations boolean default true,
    include_talking_points boolean default true,
    include_parent_friendly_summary boolean default false,
    include_caregiver_training boolean default false,
    created_by uuid,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.iep_meeting_sessions enable row level security;
create policy "Authenticated users can manage iep_meeting_sessions"
on public.iep_meeting_sessions for all to authenticated
using (true) with check (true);

create or replace function public.set_iep_meeting_sessions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_iep_meeting_sessions_updated_at on public.iep_meeting_sessions;
create trigger trg_iep_meeting_sessions_updated_at
before update on public.iep_meeting_sessions
for each row execute function public.set_iep_meeting_sessions_updated_at();

create table if not exists public.iep_meeting_attendees (
    id uuid primary key default gen_random_uuid(),
    meeting_session_id uuid not null,
    attendee_name text,
    attendee_role text,
    attendee_email text,
    is_confirmed boolean default false,
    created_at timestamptz default now()
);
alter table public.iep_meeting_attendees enable row level security;
create policy "Authenticated users can manage iep_meeting_attendees"
on public.iep_meeting_attendees for all to authenticated
using (true) with check (true);

create table if not exists public.iep_meeting_checklist_items (
    id uuid primary key default gen_random_uuid(),
    meeting_session_id uuid not null,
    item_key text,
    item_label text not null,
    is_complete boolean default false,
    notes text,
    created_at timestamptz default now()
);
alter table public.iep_meeting_checklist_items enable row level security;
create policy "Authenticated users can manage iep_meeting_checklist_items"
on public.iep_meeting_checklist_items for all to authenticated
using (true) with check (true);

create table if not exists public.iep_meeting_intelligence_snapshots (
    id uuid primary key default gen_random_uuid(),
    meeting_session_id uuid not null,
    student_id uuid,
    client_id uuid,
    snapshot_json jsonb default '{}'::jsonb,
    created_by uuid,
    created_at timestamptz default now()
);
alter table public.iep_meeting_intelligence_snapshots enable row level security;
create policy "Authenticated users can manage iep_meeting_intelligence_snapshots"
on public.iep_meeting_intelligence_snapshots for all to authenticated
using (true) with check (true);

create table if not exists public.iep_meeting_talking_points (
    id uuid primary key default gen_random_uuid(),
    meeting_session_id uuid not null,
    point_category text,
    point_text text not null,
    display_order integer default 0,
    created_by uuid,
    created_at timestamptz default now()
);
alter table public.iep_meeting_talking_points enable row level security;
create policy "Authenticated users can manage iep_meeting_talking_points"
on public.iep_meeting_talking_points for all to authenticated
using (true) with check (true);

create table if not exists public.iep_meeting_recommendation_items (
    id uuid primary key default gen_random_uuid(),
    meeting_session_id uuid not null,
    student_id uuid,
    client_id uuid,
    source_type text,
    source_object_id uuid,
    recommendation_category text,
    title text,
    rationale text,
    recommended_action text,
    suggested_goal_text text,
    suggested_benchmark_text text,
    suggested_support_text text,
    severity text default 'medium',
    created_by uuid,
    created_at timestamptz default now()
);
alter table public.iep_meeting_recommendation_items enable row level security;
create policy "Authenticated users can manage iep_meeting_recommendation_items"
on public.iep_meeting_recommendation_items for all to authenticated
using (true) with check (true);

create table if not exists public.iep_meeting_goal_draft_items (
    id uuid primary key default gen_random_uuid(),
    meeting_session_id uuid not null,
    student_id uuid,
    client_id uuid,
    source_goal_draft_id uuid,
    draft_title text,
    goal_text text,
    benchmark_text text,
    support_text text,
    rationale text,
    status text default 'draft',
    created_by uuid,
    created_at timestamptz default now()
);
alter table public.iep_meeting_goal_draft_items enable row level security;
create policy "Authenticated users can manage iep_meeting_goal_draft_items"
on public.iep_meeting_goal_draft_items for all to authenticated
using (true) with check (true);

create table if not exists public.iep_parent_friendly_summaries (
    id uuid primary key default gen_random_uuid(),
    meeting_session_id uuid not null,
    student_id uuid,
    client_id uuid,
    summary_text text,
    created_by uuid,
    created_at timestamptz default now()
);
alter table public.iep_parent_friendly_summaries enable row level security;
create policy "Authenticated users can manage iep_parent_friendly_summaries"
on public.iep_parent_friendly_summaries for all to authenticated
using (true) with check (true);
