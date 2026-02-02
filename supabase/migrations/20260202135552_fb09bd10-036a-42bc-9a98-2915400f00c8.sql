-- Modify questionnaire_invitations to support multiple form types
-- First, add a form_type column to distinguish between template sources
ALTER TABLE public.questionnaire_invitations 
ADD COLUMN IF NOT EXISTS form_type TEXT NOT NULL DEFAULT 'custom';

-- Add a comment explaining the form_type values
COMMENT ON COLUMN public.questionnaire_invitations.form_type IS 'Type of form: custom, abas3, vbmapp, socially_savvy';

-- Drop the existing foreign key constraint
ALTER TABLE public.questionnaire_invitations 
DROP CONSTRAINT IF EXISTS questionnaire_invitations_template_id_fkey;

-- The template_id will now store the ID from the appropriate table based on form_type
-- We won't add a new FK since template_id can reference different tables based on form_type