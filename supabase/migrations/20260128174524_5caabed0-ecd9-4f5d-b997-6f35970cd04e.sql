-- Add approval fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Update the handle_new_user function to set proper defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  display text;
  fname text;
  lname text;
BEGIN
  -- Extract first and last name from metadata if provided
  fname := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  lname := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  
  -- Build display name as First Name + Last Initial
  IF fname != '' AND lname != '' THEN
    display := fname || ' ' || LEFT(lname, 1) || '.';
  ELSIF fname != '' THEN
    display := fname;
  ELSE
    display := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, first_name, last_name, is_approved)
  VALUES (
    NEW.id, 
    NEW.email, 
    display,
    NULLIF(fname, ''),
    NULLIF(lname, ''),
    false
  );
  RETURN NEW;
END;
$function$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies for profiles to allow admins to view and manage all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()));

-- Function to get pending approval count
CREATE OR REPLACE FUNCTION public.get_pending_approval_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles
  WHERE is_approved = false
$$;

-- Function to approve user
CREATE OR REPLACE FUNCTION public.approve_user(_user_id uuid, _approved_by uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    is_approved = true,
    approved_at = now(),
    approved_by = _approved_by
  WHERE user_id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to revoke user access
CREATE OR REPLACE FUNCTION public.revoke_user_access(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    is_approved = false,
    approved_at = NULL,
    approved_by = NULL
  WHERE user_id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- Update existing super admin to be approved
UPDATE public.profiles
SET is_approved = true, approved_at = now()
WHERE user_id = '98e3f44c-895e-44bd-b79e-d5c7b85a9f1a';