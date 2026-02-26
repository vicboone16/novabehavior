
-- Add prompt_counts_as_correct setting at multiple levels
-- null = inherit from parent level; true = prompted responses count as correct; false = they don't

-- Student-level default
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS prompt_counts_as_correct boolean DEFAULT null;

-- Program-level override
ALTER TABLE public.skill_programs 
ADD COLUMN IF NOT EXISTS prompt_counts_as_correct boolean DEFAULT null;

-- Target-level override (most specific)
ALTER TABLE public.skill_targets 
ADD COLUMN IF NOT EXISTS prompt_counts_as_correct boolean DEFAULT null;

-- Add comment for clarity
COMMENT ON COLUMN public.students.prompt_counts_as_correct IS 'Student-level default: whether prompted responses count as correct. null = system default (false)';
COMMENT ON COLUMN public.skill_programs.prompt_counts_as_correct IS 'Program-level override: whether prompted responses count as correct. null = inherit from student';
COMMENT ON COLUMN public.skill_targets.prompt_counts_as_correct IS 'Target-level override: whether prompted responses count as correct. null = inherit from program';
