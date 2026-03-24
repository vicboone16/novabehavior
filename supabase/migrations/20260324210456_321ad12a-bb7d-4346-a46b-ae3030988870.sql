
ALTER TABLE public.skill_targets
  ADD COLUMN IF NOT EXISTS sd_instructions text,
  ADD COLUMN IF NOT EXISTS prompt_hierarchy jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS error_correction text;
