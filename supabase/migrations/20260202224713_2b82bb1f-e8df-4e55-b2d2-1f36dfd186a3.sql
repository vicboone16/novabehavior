-- Add columns to track questionnaire progress
ALTER TABLE public.questionnaire_invitations 
ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;