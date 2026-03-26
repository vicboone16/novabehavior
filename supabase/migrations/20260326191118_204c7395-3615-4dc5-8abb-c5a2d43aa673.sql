
-- Add agency_id column if missing
alter table public.beacon_rewards
add column if not exists agency_id uuid null;

-- Create the composite index
create index if not exists idx_beacon_rewards_agency_classroom
  on public.beacon_rewards (agency_id, classroom_id);
