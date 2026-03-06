
-- Recreate helper functions that failed to persist
CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_agency_id FROM public.user_agency_context WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_agency_admin_for(_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_memberships
    WHERE user_id = auth.uid()
      AND agency_id = _agency_id
      AND role IN ('admin', 'owner')
      AND status = 'active'
  );
$$;

-- Drop any existing CI policies to avoid conflicts
DROP POLICY IF EXISTS "ci_metrics_select" ON public.ci_client_metrics;
DROP POLICY IF EXISTS "ci_alerts_select" ON public.ci_alerts;
DROP POLICY IF EXISTS "ci_recs_select" ON public.ci_intervention_recs;

-- Also drop the policies from the first migration that may have partially applied
DROP POLICY IF EXISTS "agencies_read" ON public.agencies;
DROP POLICY IF EXISTS "profiles_select_safe" ON public.profiles;
DROP POLICY IF EXISTS "agency_flags_select" ON public.agency_feature_flags;
DROP POLICY IF EXISTS "agency_flags_insert" ON public.agency_feature_flags;
DROP POLICY IF EXISTS "agency_flags_update" ON public.agency_feature_flags;
DROP POLICY IF EXISTS "user_flags_select" ON public.user_feature_flags;
DROP POLICY IF EXISTS "user_flags_update" ON public.user_feature_flags;

-- Recreate all policies
CREATE POLICY "agencies_read" ON public.agencies FOR SELECT
USING (public.is_super_admin() OR id = public.current_agency_id());

CREATE POLICY "profiles_select_safe" ON public.profiles FOR SELECT
USING (public.is_super_admin() OR user_id = auth.uid() OR public.is_agency_admin_for(public.current_agency_id()));

CREATE POLICY "agency_flags_select" ON public.agency_feature_flags FOR SELECT
USING (public.is_super_admin() OR agency_id = public.current_agency_id());

CREATE POLICY "agency_flags_insert" ON public.agency_feature_flags FOR INSERT
WITH CHECK (public.is_super_admin() OR (public.is_agency_admin_for(agency_id) AND agency_id = public.current_agency_id()));

CREATE POLICY "agency_flags_update" ON public.agency_feature_flags FOR UPDATE
USING (public.is_super_admin() OR (public.is_agency_admin_for(agency_id) AND agency_id = public.current_agency_id()));

CREATE POLICY "user_flags_select" ON public.user_feature_flags FOR SELECT
USING (public.is_super_admin() OR user_id = auth.uid());

CREATE POLICY "user_flags_update" ON public.user_feature_flags FOR UPDATE
USING (public.is_super_admin() OR user_id = auth.uid());

CREATE POLICY "ci_metrics_select" ON public.ci_client_metrics FOR SELECT
USING (public.is_super_admin() OR agency_id = public.current_agency_id());

CREATE POLICY "ci_alerts_select" ON public.ci_alerts FOR SELECT
USING (public.is_super_admin() OR agency_id = public.current_agency_id());

CREATE POLICY "ci_recs_select" ON public.ci_intervention_recs FOR SELECT
USING (public.is_super_admin() OR agency_id = public.current_agency_id());
