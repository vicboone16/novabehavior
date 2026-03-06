
ALTER TABLE public.training_module_content
  ADD COLUMN IF NOT EXISTS learning_objectives JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS talking_points JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS discussion_prompts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS demonstration_steps JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS practice_activities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scenario_prompts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS misconceptions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS key_takeaways JSONB DEFAULT '[]'::jsonb;
