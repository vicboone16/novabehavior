-- Fix function search path security warning
CREATE OR REPLACE FUNCTION can_schedule_rbt(_staff_user_id UUID, _session_date DATE)
RETURNS TABLE(allowed BOOLEAN, reason TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if staff is an RBT (needs supervision)
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = _staff_user_id
    AND credential = 'RBT'
  ) THEN
    -- Non-RBTs don't need supervision chain check
    RETURN QUERY SELECT true, 'Not an RBT - no supervision required'::TEXT;
    RETURN;
  END IF;

  -- Check for active supervisor link
  IF NOT EXISTS (
    SELECT 1 FROM supervisor_links
    WHERE supervisee_staff_id = _staff_user_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= _session_date)
  ) THEN
    RETURN QUERY SELECT false, 'No active supervisor assigned. RBTs must have an active supervisor to be scheduled.'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$;