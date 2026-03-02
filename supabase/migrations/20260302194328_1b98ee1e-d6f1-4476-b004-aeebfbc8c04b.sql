
CREATE OR REPLACE FUNCTION public.rpc_join_agency_with_code(p_code text, p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- p_user_id is accepted for compatibility but ignored;
  -- redeem_agency_invite_code uses auth.uid() internally.
  RETURN public.redeem_agency_invite_code(p_code);
END;
$$;
