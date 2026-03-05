
-- Add missing columns to lms_badges
ALTER TABLE public.lms_badges ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.lms_badges ADD COLUMN IF NOT EXISTS xp_value integer DEFAULT 0;
ALTER TABLE public.lms_badges ADD COLUMN IF NOT EXISTS criteria jsonb DEFAULT '{}';
ALTER TABLE public.lms_badges ADD COLUMN IF NOT EXISTS title text;
