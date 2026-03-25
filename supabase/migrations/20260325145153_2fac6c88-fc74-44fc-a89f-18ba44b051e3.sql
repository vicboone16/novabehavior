
-- 1) ADD ZONES + CHECKPOINTS TO game_tracks
ALTER TABLE public.game_tracks
  ADD COLUMN IF NOT EXISTS zones_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS checkpoints_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_id uuid NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS description text NULL;

-- 2) ADD MOMENTUM + COMEBACK CONFIG TO game_modes
ALTER TABLE public.game_modes
  ADD COLUMN IF NOT EXISTS momentum_config_json jsonb NOT NULL DEFAULT '{"enabled":true,"streak_thresholds":[{"streak":3,"multiplier":1.5,"label":"On Fire","animation":"flame"},{"streak":5,"multiplier":2.0,"label":"Unstoppable","animation":"rocket"},{"streak":10,"multiplier":3.0,"label":"Legendary","animation":"explosion"}]}'::jsonb,
  ADD COLUMN IF NOT EXISTS comeback_config_json jsonb NOT NULL DEFAULT '{"enabled":true,"behind_rank_threshold":3,"bonus_multiplier":0.5,"label":"Comeback Boost"}'::jsonb,
  ADD COLUMN IF NOT EXISTS checkpoint_rewards_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_daily_points integer NULL,
  ADD COLUMN IF NOT EXISTS game_speed numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS difficulty_scaling text NOT NULL DEFAULT 'adaptive';

-- 3) ADD CONTEXT FIELDS TO game_events
ALTER TABLE public.game_events
  ADD COLUMN IF NOT EXISTS zone_type text NULL,
  ADD COLUMN IF NOT EXISTS multiplier_applied numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS streak_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_checkpoint boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS processed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_game_events_student_created ON public.game_events(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_events_classroom ON public.game_events(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_events_unprocessed ON public.game_events(processed) WHERE processed = false;
