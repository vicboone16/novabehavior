-- Add clinical milestone date columns to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS iep_date DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS iep_end_date DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS next_iep_review_date DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fba_date DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS bip_date DATE;

-- Add index for quick filtering of upcoming reviews
CREATE INDEX IF NOT EXISTS idx_students_next_iep_review ON public.students(next_iep_review_date) WHERE next_iep_review_date IS NOT NULL;