-- Add columns for Brief Record Review and Brief Teacher Inputs
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS brief_record_review JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS brief_teacher_inputs JSONB DEFAULT '[]'::jsonb;