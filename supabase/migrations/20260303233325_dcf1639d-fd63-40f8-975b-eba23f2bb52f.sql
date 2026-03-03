
-- Add email column to user_agency_access for cross-app email lookups
ALTER TABLE public.user_agency_access ADD COLUMN email text;

-- Create index for email lookups
CREATE INDEX idx_user_agency_access_email ON public.user_agency_access (email);

-- Backfill existing rows from profiles
UPDATE public.user_agency_access uaa
SET email = p.email
FROM public.profiles p
WHERE p.user_id = uaa.user_id
AND uaa.email IS NULL;
