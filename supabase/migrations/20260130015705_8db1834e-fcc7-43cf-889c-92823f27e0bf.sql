-- Add first name, last name, and display name columns to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS display_name text;

-- Add comment to explain display name purpose
COMMENT ON COLUMN public.students.display_name IS 'Preferred name or nickname shown during data collection';