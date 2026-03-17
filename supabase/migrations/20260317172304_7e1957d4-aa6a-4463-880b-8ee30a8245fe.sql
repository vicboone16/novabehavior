
-- Add missing columns to student_assessments
ALTER TABLE public.student_assessments
  ADD COLUMN IF NOT EXISTS assessment_template_id uuid,
  ADD COLUMN IF NOT EXISTS template_version_snapshot text,
  ADD COLUMN IF NOT EXISTS form_key text DEFAULT 'parent_caregiver',
  ADD COLUMN IF NOT EXISTS assessor_name text,
  ADD COLUMN IF NOT EXISTS respondent_name text,
  ADD COLUMN IF NOT EXISTS respondent_relationship text,
  ADD COLUMN IF NOT EXISTS administration_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS date_started timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS date_completed timestamptz,
  ADD COLUMN IF NOT EXISTS chronological_age_months int,
  ADD COLUMN IF NOT EXISTS chronological_age_display text,
  ADD COLUMN IF NOT EXISTS age_band_key text,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS scored_by uuid,
  ADD COLUMN IF NOT EXISTS scored_at timestamptz,
  ADD COLUMN IF NOT EXISTS rescored_at timestamptz;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_student_assessments_student_id ON public.student_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_assessments_form_key ON public.student_assessments(form_key);
CREATE INDEX IF NOT EXISTS idx_student_assessments_admin_date ON public.student_assessments(administration_date);
CREATE INDEX IF NOT EXISTS idx_student_assessments_student_date ON public.student_assessments(student_id, administration_date);
CREATE INDEX IF NOT EXISTS idx_student_assessments_status ON public.student_assessments(status);
