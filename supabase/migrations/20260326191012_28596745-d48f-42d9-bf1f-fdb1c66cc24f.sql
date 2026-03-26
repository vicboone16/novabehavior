
-- Add columns
alter table public.beacon_rewards
add column if not exists classroom_id uuid null,
add column if not exists is_hidden boolean not null default false,
add column if not exists is_archived boolean not null default false,
add column if not exists deleted_at timestamptz null,
add column if not exists created_by uuid null,
add column if not exists updated_at timestamptz not null default now();

-- Indexes
create index if not exists idx_beacon_rewards_classroom
  on public.beacon_rewards (classroom_id);

create index if not exists idx_beacon_rewards_active_visibility
  on public.beacon_rewards (active, is_hidden, is_archived, deleted_at);

-- set_updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_beacon_rewards_updated_at on public.beacon_rewards;

create trigger trg_beacon_rewards_updated_at
before update on public.beacon_rewards
for each row execute function public.set_updated_at();

-- Student-facing view (active, visible, not archived/deleted)
create or replace view public.v_beacon_rewards_live
with (security_invoker = on)
as
select r.*
from public.beacon_rewards r
where r.active = true
  and coalesce(r.is_hidden, false) = false
  and coalesce(r.is_archived, false) = false
  and r.deleted_at is null;

-- Classroom reward view
create or replace view public.v_beacon_rewards_by_classroom
with (security_invoker = on)
as
select
  r.*,
  case when r.classroom_id is null then 'agency' else 'classroom' end as reward_scope
from public.beacon_rewards r
where r.active = true
  and coalesce(r.is_hidden, false) = false
  and coalesce(r.is_archived, false) = false
  and r.deleted_at is null;

-- Admin view (all statuses)
create or replace view public.v_beacon_rewards_admin
with (security_invoker = on)
as
select
  r.*,
  case
    when r.deleted_at is not null then 'deleted'
    when coalesce(r.is_archived, false) = true then 'archived'
    when coalesce(r.is_hidden, false) = true then 'hidden'
    when r.active = true then 'active'
    else 'inactive'
  end as reward_status,
  case when r.classroom_id is null then 'agency' else 'classroom' end as reward_scope
from public.beacon_rewards r;
