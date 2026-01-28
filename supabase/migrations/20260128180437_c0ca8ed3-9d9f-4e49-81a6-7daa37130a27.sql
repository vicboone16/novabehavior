-- Create a unique index on pin_hash (excluding NULLs, so users without PINs are fine)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_pin_hash_unique 
ON public.profiles (pin_hash) 
WHERE pin_hash IS NOT NULL;

-- Update set_user_pin to check for uniqueness before setting
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