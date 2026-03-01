
-- Add agency_prefix and prefix_required to agencies table
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS agency_prefix text,
  ADD COLUMN IF NOT EXISTS prefix_required boolean NOT NULL DEFAULT false;

-- Unique prefix per agency
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_prefix_unique
  ON public.agencies (agency_prefix) WHERE agency_prefix IS NOT NULL;

-- Agency user aliases table
CREATE TABLE IF NOT EXISTS public.agency_user_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, user_id),
  UNIQUE (agency_id, agency_username)
);

ALTER TABLE public.agency_user_aliases ENABLE ROW LEVEL SECURITY;

-- Users can view aliases in their agencies
CREATE POLICY "aua_agency_select"
ON public.agency_user_aliases FOR SELECT TO authenticated
USING (
  agency_id IN (
    SELECT am.agency_id FROM public.agency_memberships am
    WHERE am.user_id = auth.uid() AND am.status = 'active'
  )
  OR public.is_super_admin(auth.uid())
);

-- Users can insert/update their own alias
CREATE POLICY "aua_own_insert"
ON public.agency_user_aliases FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "aua_own_update"
ON public.agency_user_aliases FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Agency admins can manage aliases in their agency
CREATE POLICY "aua_admin_insert"
ON public.agency_user_aliases FOR INSERT TO authenticated
WITH CHECK (
  public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "aua_admin_update"
ON public.agency_user_aliases FOR UPDATE TO authenticated
USING (
  public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "aua_admin_delete"
ON public.agency_user_aliases FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_agency_admin(auth.uid(), agency_id)
);

-- Helper function to set/validate agency alias
CREATE OR REPLACE FUNCTION public.set_agency_alias(
  _agency_id uuid,
  _suffix text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _prefix text;
  _prefix_req boolean;
  _full_username text;
  _existing uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Verify user is a member of this agency
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_memberships
    WHERE user_id = _user_id AND agency_id = _agency_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this agency');
  END IF;

  -- Get agency prefix
  SELECT agency_prefix, prefix_required INTO _prefix, _prefix_req
  FROM public.agencies WHERE id = _agency_id;

  -- Build full username
  IF _prefix IS NOT NULL AND _prefix != '' THEN
    -- If suffix already starts with prefix, use as-is
    IF upper(_suffix) LIKE upper(_prefix) || '.%' THEN
      _full_username := upper(_prefix) || '.' || substr(_suffix, length(_prefix) + 2);
    ELSE
      _full_username := upper(_prefix) || '.' || _suffix;
    END IF;
  ELSE
    IF _prefix_req THEN
      RETURN jsonb_build_object('success', false, 'error', 'Agency has no prefix configured but requires one');
    END IF;
    _full_username := _suffix;
  END IF;

  -- Validate not empty
  IF length(trim(_full_username)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Alias must be at least 3 characters');
  END IF;

  -- Upsert
  INSERT INTO public.agency_user_aliases (agency_id, user_id, agency_username)
  VALUES (_agency_id, _user_id, _full_username)
  ON CONFLICT (agency_id, user_id)
  DO UPDATE SET agency_username = _full_username, updated_at = now();

  RETURN jsonb_build_object('success', true, 'agency_username', _full_username);
END;
$$;
