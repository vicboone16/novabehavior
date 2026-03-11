
create table if not exists public.nova_ai_optimization_quick_actions (
    id uuid primary key default gen_random_uuid(),
    action_key text not null unique,
    action_title text not null,
    source_type text not null,
    default_reasoning_mode text not null,
    default_prompt_text text not null,
    sort_order integer default 0,
    is_active boolean default true,
    created_at timestamptz default now()
);

alter table public.nova_ai_optimization_quick_actions enable row level security;

create policy "Authenticated users can read optimization quick actions"
on public.nova_ai_optimization_quick_actions
for select
to authenticated
using (true);
