
-- Update the adapter function to use staff_caseloads for assignment-based access,
-- with admin/super_admin bypass via agency membership.
CREATE OR REPLACE FUNCTION public.effective_staff_can_review(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    -- Direct caseload assignment
    EXISTS (
      SELECT 1 FROM public.staff_caseloads
      WHERE clinician_user_id = _user_id
        AND student_id = _client_id
        AND status = 'active'
    )
    OR
    -- Admin/supervisor bypass: active agency member with admin-level role
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.agency_memberships am ON am.agency_id = s.agency_id
      WHERE s.id = _client_id
        AND am.user_id = _user_id
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    )
    OR
    -- Super admin
    public.is_super_admin(_user_id);
$$;

-- Recreate the view (no schema change, just picks up updated function logic)
DROP VIEW IF EXISTS public.v_weekly_snapshots_queue;

CREATE VIEW public.v_weekly_snapshots_queue AS
SELECT
  psp.*,
  s.first_name AS client_first_name,
  s.last_name  AS client_last_name
FROM public.parent_summary_packets psp
JOIN public.students s ON s.id = psp.client_id
WHERE psp.status IN ('pending_review', 'submitted')
  AND public.effective_staff_can_review(auth.uid(), psp.client_id);
