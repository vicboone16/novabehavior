
-- Drop all 3 broken/conflicting overloads
DROP FUNCTION IF EXISTS public.redeem_invite_code(text);
DROP FUNCTION IF EXISTS public.redeem_invite_code(text, text);
DROP FUNCTION IF EXISTS public.redeem_invite_code(text, text, uuid);

-- Create a single clean function that works for both apps
CREATE OR REPLACE FUNCTION public.redeem_invite_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.invite_codes%ROWTYPE;
  v_permissions jsonb;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_inv
  FROM public.invite_codes
  WHERE code = upper(trim(_code))
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  IF v_inv.expires_at IS NOT NULL AND v_inv.expires_at < now() THEN
    UPDATE public.invite_codes SET status = 'expired' WHERE invite_id = v_inv.invite_id;
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has expired');
  END IF;

  IF v_inv.uses_count >= v_inv.max_uses THEN
    UPDATE public.invite_codes SET status = 'used' WHERE invite_id = v_inv.invite_id;
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has reached its usage limit');
  END IF;

  v_permissions := coalesce(v_inv.permissions, '{}'::jsonb);

  IF v_inv.invite_scope = 'student' THEN
    IF v_inv.client_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid invite configuration');
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.user_student_access
      WHERE user_id = v_user_id AND student_id = v_inv.client_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'You already have access to this learner');
    END IF;

    INSERT INTO public.user_student_access (
      user_id, student_id, permission_level,
      can_view_notes, can_view_documents, can_collect_data,
      can_edit_profile, can_generate_reports,
      granted_by, created_at, updated_at
    ) VALUES (
      v_user_id, v_inv.client_id,
      coalesce(v_inv.role_slug, 'shared'),
      coalesce((v_permissions->>'can_view_notes')::boolean, true),
      coalesce((v_permissions->>'can_view_documents')::boolean, false),
      coalesce((v_permissions->>'can_collect_data')::boolean, true),
      coalesce((v_permissions->>'can_edit_profile')::boolean, false),
      coalesce((v_permissions->>'can_generate_reports')::boolean, false),
      v_inv.created_by, now(), now()
    )
    ON CONFLICT (user_id, student_id) DO UPDATE SET
      permission_level = EXCLUDED.permission_level,
      can_view_notes = EXCLUDED.can_view_notes,
      can_view_documents = EXCLUDED.can_view_documents,
      can_collect_data = EXCLUDED.can_collect_data,
      can_edit_profile = EXCLUDED.can_edit_profile,
      can_generate_reports = EXCLUDED.can_generate_reports,
      updated_at = now(),
      granted_by = EXCLUDED.granted_by;

  ELSIF v_inv.invite_scope = 'group' THEN
    IF v_inv.group_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid invite configuration');
    END IF;

    INSERT INTO public.classroom_group_members (
      agency_id, group_id, user_id, role_in_group, created_at
    ) VALUES (
      v_inv.agency_id, v_inv.group_id, v_user_id,
      coalesce(v_inv.role_slug, 'teacher'), now()
    ) ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.invite_codes
  SET uses_count = uses_count + 1,
      status = CASE WHEN uses_count + 1 >= max_uses THEN 'used' ELSE 'active' END
  WHERE invite_id = v_inv.invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'client_id', v_inv.client_id,
    'agency_id', v_inv.agency_id,
    'invite_scope', v_inv.invite_scope,
    'role', v_inv.role_slug
  );
END;
$$;
