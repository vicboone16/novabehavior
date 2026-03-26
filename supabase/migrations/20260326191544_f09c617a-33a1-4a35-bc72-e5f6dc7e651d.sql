
drop view if exists public.v_beacon_rewards_live cascade;
drop view if exists public.v_beacon_rewards_by_classroom cascade;
drop view if exists public.v_beacon_rewards_admin cascade;

create view public.v_beacon_rewards_live
with (security_invoker = on)
as
select r.*
from public.beacon_rewards r
where r.active = true
  and coalesce(r.is_hidden, false) = false
  and coalesce(r.is_archived, false) = false
  and r.deleted_at is null;

create view public.v_beacon_rewards_by_classroom
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

create view public.v_beacon_rewards_admin
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
