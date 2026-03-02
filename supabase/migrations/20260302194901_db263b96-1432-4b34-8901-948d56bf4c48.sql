
-- Create a universal master invite code: AGY-ADMIN-MASTER
INSERT INTO public.agency_invite_codes (agency_id, code, role, max_uses, uses, is_active, created_by)
VALUES 
  ('c922c9c9-de4a-48e5-bf23-566a7de8de20', 'AGY-ADMIN-MASTER', 'owner', 100, 0, true, null),
  ('4381cacb-507c-4ab1-9c4c-e9383a4b757b', 'AGY-ADMIN-MASTER', 'owner', 100, 0, true, null),
  ('8c64165c-bb56-465b-b981-a165f356a870', 'AGY-ADMIN-MASTER', 'owner', 100, 0, true, null)
ON CONFLICT DO NOTHING;

-- Override redeem to handle universal codes (same code across multiple agencies)
CREATE OR REPLACE FUNCTION public.rpc_join_agency_with_code(p_code text, p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invite record;
  v_count int := 0;
  v_first_agency_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if this code exists across multiple agencies (universal code)
  FOR v_invite IN
    SELECT id, agency_id, role, max_uses, uses
    FROM public.agency_invite_codes
    WHERE code = p_code AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND uses < max_uses
  LOOP
    -- Upsert membership for each agency
    INSERT INTO public.agency_memberships (user_id, agency_id, role, status, is_primary, joined_at)
    VALUES (v_user_id, v_invite.agency_id, v_invite.role, 'active', false, now())
    ON CONFLICT (user_id, agency_id)
    DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = now();

    -- Increment uses
    UPDATE public.agency_invite_codes SET uses = uses + 1, updated_at = now() WHERE id = v_invite.id;

    IF v_count = 0 THEN
      v_first_agency_id := v_invite.agency_id;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    -- Fall back to single-agency redeem
    RETURN public.redeem_agency_invite_code(p_code);
  END IF;

  -- Ensure one membership is primary
  IF NOT EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = v_user_id AND is_primary = true AND status = 'active') THEN
    UPDATE public.agency_memberships SET is_primary = true WHERE user_id = v_user_id AND agency_id = v_first_agency_id;
  END IF;

  -- Set agency context
  INSERT INTO public.user_agency_context (user_id, current_agency_id, last_switched_at)
  VALUES (v_user_id, v_first_agency_id, now())
  ON CONFLICT (user_id) DO UPDATE SET current_agency_id = v_first_agency_id, last_switched_at = now();

  RETURN jsonb_build_object('success', true, 'agencies_joined', v_count);
END;
$$;
