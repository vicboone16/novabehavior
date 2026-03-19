
-- Add missing columns to curriculum_source_registry
ALTER TABLE public.curriculum_source_registry
  ADD COLUMN IF NOT EXISTS priority_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS send_to_iep boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS send_to_bip boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS send_to_fba boolean DEFAULT false;
