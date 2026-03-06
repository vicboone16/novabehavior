
-- Drop existing user_feature_flags policies to replace with enhanced versions
DROP POLICY IF EXISTS "user_flags_select" ON public.user_feature_flags;
DROP POLICY IF EXISTS "user_flags_update" ON public.user_feature_flags;
DROP POLICY IF EXISTS "user_flags_insert" ON public.user_feature_flags;

-- Security definer: check if a user belongs to the caller's current agency
CREATE OR REPLACE FUNCTION public.is_same_agency_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_memberships am1
    JOIN public.agency_memberships am2 ON am1.agency_id = am2.agency_id
    WHERE am1.user_id = auth.uid()
      AND am2.user_id = _target_user_id
      AND am1.status = 'active'
      AND am2.status = 'active'
      AND am1.agency_id = (SELECT current_agency_id FROM public.user_agency_context WHERE user_id = auth.uid())
  );
$$;

-- SELECT: own flags, super_admin, or agency admin viewing agency members
CREATE POLICY "user_flags_select" ON public.user_feature_flags FOR SELECT
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (public.is_agency_admin_for(public.current_agency_id()) AND public.is_same_agency_user(user_id))
);

-- UPDATE: super_admin or agency admin for agency members
CREATE POLICY "user_flags_update" ON public.user_feature_flags FOR UPDATE
USING (
  public.is_super_admin()
  OR (public.is_agency_admin_for(public.current_agency_id()) AND public.is_same_agency_user(user_id))
);

-- INSERT: super_admin or agency admin for agency members
CREATE POLICY "user_flags_insert" ON public.user_feature_flags FOR INSERT
WITH CHECK (
  public.is_super_admin()
  OR (public.is_agency_admin_for(public.current_agency_id()) AND public.is_same_agency_user(user_id))
);
