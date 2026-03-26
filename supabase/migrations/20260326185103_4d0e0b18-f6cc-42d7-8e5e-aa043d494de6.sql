-- Add missing indexes for reward scoping/visibility
CREATE INDEX IF NOT EXISTS idx_beacon_rewards_classroom
  ON public.beacon_rewards (classroom_id);

CREATE INDEX IF NOT EXISTS idx_beacon_rewards_active_visibility
  ON public.beacon_rewards (active, is_hidden, is_archived, deleted_at);

-- Ensure updated_at trigger exists
DROP TRIGGER IF EXISTS trg_beacon_rewards_updated_at ON public.beacon_rewards;
CREATE TRIGGER trg_beacon_rewards_updated_at
  BEFORE UPDATE ON public.beacon_rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();