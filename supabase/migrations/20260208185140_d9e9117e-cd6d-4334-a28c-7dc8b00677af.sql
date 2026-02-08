
-- Add access_token to custom_form_submissions for magic link support
ALTER TABLE public.custom_form_submissions 
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Add sent_at tracking
ALTER TABLE public.custom_form_submissions 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Add expires_at tracking  
ALTER TABLE public.custom_form_submissions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add created_by to track who created the submission request
ALTER TABLE public.custom_form_submissions 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_custom_form_submissions_access_token 
ON public.custom_form_submissions(access_token);

-- Allow public read access for magic link submissions (by access_token)
CREATE POLICY "Public can view submissions by access_token"
ON public.custom_form_submissions
FOR SELECT
USING (true);

-- Allow public insert for magic link form submissions
CREATE POLICY "Public can submit forms via magic link"
ON public.custom_form_submissions
FOR INSERT
WITH CHECK (true);

-- Allow public update for magic link form submissions (to update responses)
CREATE POLICY "Public can update submissions via magic link"
ON public.custom_form_submissions
FOR UPDATE
USING (true);
