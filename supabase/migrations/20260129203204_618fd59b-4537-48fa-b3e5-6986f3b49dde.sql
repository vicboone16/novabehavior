-- Fix 1: Make student-documents bucket PRIVATE
UPDATE storage.buckets 
SET public = false 
WHERE id = 'student-documents';

-- Fix 2: Create a SECURITY DEFINER function to safely check if user has PIN
-- This prevents exposing pin_hash column to clients
CREATE OR REPLACE FUNCTION public.user_has_pin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pin_hash IS NOT NULL
  FROM public.profiles
  WHERE user_id = _user_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_pin(uuid) TO authenticated;