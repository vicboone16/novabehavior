-- Add extended student profile fields for FBA workflow, assessment data, and student info

-- Add date of birth column
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add grade column
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS grade TEXT;

-- Add school/site column
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school TEXT;

-- Add case types array
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS case_types JSONB DEFAULT '[]'::jsonb;

-- Add assessment mode toggle
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS assessment_mode_enabled BOOLEAN DEFAULT false;

-- Add FBA workflow progress
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fba_workflow_progress JSONB;

-- Add FBA findings
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fba_findings JSONB;

-- Add BIP data
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS bip_data JSONB;

-- Add narrative notes
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS narrative_notes JSONB DEFAULT '[]'::jsonb;

-- Add indirect assessments
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS indirect_assessments JSONB DEFAULT '[]'::jsonb;

-- Add documents array (metadata - actual files in storage)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Add archived_at timestamp
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;