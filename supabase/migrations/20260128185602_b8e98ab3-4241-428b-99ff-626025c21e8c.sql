-- Fix SECURITY DEFINER functions with proper authorization checks

-- 1. Fix set_user_pin to verify caller is authorized
CREATE OR REPLACE FUNCTION public.set_user_pin(_user_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_hash text;
  existing_user_id uuid;
BEGIN
  -- Authorization check: Only allow user to set their own PIN or admin to set any PIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF auth.uid() != _user_id AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: You can only set your own PIN';
  END IF;

  -- Validate PIN is 6 digits
  IF _pin !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 6 digits';
  END IF;
  
  -- Compute the hash
  new_hash := encode(sha256(_pin::bytea), 'hex');
  
  -- Check if this PIN is already in use by another user
  SELECT user_id INTO existing_user_id
  FROM public.profiles
  WHERE pin_hash = new_hash
    AND user_id != _user_id
  LIMIT 1;
  
  IF existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'This PIN is already in use. Please choose a different PIN.';
  END IF;
  
  -- Set the PIN
  UPDATE public.profiles
  SET pin_hash = new_hash
  WHERE user_id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- 2. Fix approve_user to use auth.uid() instead of trusting parameter
CREATE OR REPLACE FUNCTION public.approve_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Verify caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve users';
  END IF;

  UPDATE public.profiles
  SET 
    is_approved = true,
    approved_at = now(),
    approved_by = auth.uid()  -- Use authenticated user, not a parameter
  WHERE user_id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- 3. Fix revoke_user_access to add authorization check
CREATE OR REPLACE FUNCTION public.revoke_user_access(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Only super admins can revoke access
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can revoke user access';
  END IF;

  UPDATE public.profiles
  SET 
    is_approved = false,
    approved_at = NULL,
    approved_by = NULL
  WHERE user_id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- 4. Create a table to track failed PIN attempts for rate limiting
CREATE TABLE IF NOT EXISTS public.pin_auth_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  ip_address text,
  email text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

-- Enable RLS on the attempts table
ALTER TABLE public.pin_auth_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view attempts (for auditing)
CREATE POLICY "Admins can view PIN auth attempts"
  ON public.pin_auth_attempts
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Service role can insert attempts (from edge function)
-- Note: Edge functions use service role key which bypasses RLS

-- Create function to check rate limiting
CREATE OR REPLACE FUNCTION public.check_pin_rate_limit(_email text, _ip_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_attempts integer;
  lockout_attempts integer;
BEGIN
  -- Count failed attempts in last 5 minutes for this email
  SELECT COUNT(*) INTO recent_attempts
  FROM public.pin_auth_attempts
  WHERE (email = _email OR ip_address = _ip_address)
    AND attempted_at > (now() - interval '5 minutes')
    AND success = false;
  
  -- If more than 5 failed attempts in 5 minutes, deny
  IF recent_attempts >= 5 THEN
    RETURN false;
  END IF;
  
  -- Check for lockout (10 failed attempts in 1 hour)
  SELECT COUNT(*) INTO lockout_attempts
  FROM public.pin_auth_attempts
  WHERE (email = _email OR ip_address = _ip_address)
    AND attempted_at > (now() - interval '1 hour')
    AND success = false;
  
  IF lockout_attempts >= 10 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create function to record PIN attempt
CREATE OR REPLACE FUNCTION public.record_pin_attempt(_user_id uuid, _email text, _ip_address text, _success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pin_auth_attempts (user_id, email, ip_address, success)
  VALUES (_user_id, _email, _ip_address, _success);
END;
$$;

-- Create index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_pin_auth_attempts_lookup 
  ON public.pin_auth_attempts (email, ip_address, attempted_at)
  WHERE success = false;

-- Cleanup old attempts (optional: run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_pin_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pin_auth_attempts
  WHERE attempted_at < (now() - interval '24 hours');
END;
$$;