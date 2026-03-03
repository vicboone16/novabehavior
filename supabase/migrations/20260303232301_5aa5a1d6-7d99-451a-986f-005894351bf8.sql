-- Add email column to user_app_access
ALTER TABLE public.user_app_access ADD COLUMN email text;

-- Create index for email lookups
CREATE INDEX idx_user_app_access_email ON public.user_app_access (email);