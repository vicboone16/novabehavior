
DROP FUNCTION IF EXISTS public.redeem_invite_code(text);

CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite invite_codes;
  _user_id uuid;
  _access_id uuid;
  _existing_access uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO _invite FROM public.invite_codes WHERE code = upper(trim(_code));

  IF _invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  IF _invite.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite code is no longer active');
  END IF;

  IF _invite.expires_at IS NOT NULL AND _invite.expires_at < now() THEN
    UPDATE public.invite_codes SET status = 'expired', updated_at = now() WHERE id = _invite.id;
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has expired');
  END IF;

  IF _invite.uses_count >= _invite.max_uses THEN
    UPDATE public.invite_codes SET status = 'used', updated_at = now() WHERE id = _invite.id;
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has reached its usage limit');
  END IF;

  SELECT id INTO _existing_access
  FROM public.user_student_access
  WHERE user_id = _user_id AND student_id = _invite.client_id;

  IF _existing_access IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have access to this learner');
  END IF;

  INSERT INTO public.user_student_access (
    user_id, student_id, permission_level,
    can_collect_data, can_view_notes, can_view_documents,
    granted_by
  ) VALUES (
    _user_id, _invite.client_id, _invite.permission_level,
    _invite.can_collect_data, _invite.can_view_notes, _invite.can_view_documents,
    _invite.created_by
  ) RETURNING id INTO _access_id;

  INSERT INTO public.invite_code_redemptions (
    invite_code_id, redeemed_by, client_id, agency_id, access_record_id
  ) VALUES (
    _invite.id, _user_id, _invite.client_id, _invite.agency_id, _access_id
  );

  UPDATE public.invite_codes
  SET uses_count = uses_count + 1,
      status = CASE WHEN uses_count + 1 >= max_uses THEN 'used' ELSE 'active' END,
      updated_at = now()
  WHERE id = _invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'client_id', _invite.client_id,
    'agency_id', _invite.agency_id,
    'access_id', _access_id
  );
END;
$$;
