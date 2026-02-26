
-- Add behavior_name to session_data for name persistence
ALTER TABLE public.session_data ADD COLUMN IF NOT EXISTS behavior_name TEXT;

-- Backfill existing entries where we can infer behavior_name from abc_data
UPDATE public.session_data 
SET behavior_name = (abc_data->>'behavior')
WHERE behavior_name IS NULL 
  AND event_type = 'abc' 
  AND abc_data->>'behavior' IS NOT NULL 
  AND abc_data->>'behavior' != '';
