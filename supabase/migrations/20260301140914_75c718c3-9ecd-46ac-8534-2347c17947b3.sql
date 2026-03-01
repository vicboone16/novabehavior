
-- Drop existing policies
DROP POLICY IF EXISTS "psp_agency_staff_select" ON public.parent_summary_packets;
DROP POLICY IF EXISTS "psp_agency_staff_update" ON public.parent_summary_packets;
DROP POLICY IF EXISTS "psp_parent_insert" ON public.parent_summary_packets;
DROP POLICY IF EXISTS "psp_submitter_select" ON public.parent_summary_packets;

-- 1. Parents/Coaches SELECT only rows they submitted
CREATE POLICY "psp_submitter_select"
ON public.parent_summary_packets FOR SELECT TO authenticated
USING (submitted_by = auth.uid());

-- 2. Parents/Coaches INSERT only for learners they have access to via user_client_access with can_collect_data
CREATE POLICY "psp_parent_insert"
ON public.parent_summary_packets FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_client_access uca
    WHERE uca.user_id = auth.uid()
      AND uca.client_id = parent_summary_packets.client_id
      AND uca.can_collect_data = true
  )
);

-- 3. Agency staff SELECT packets in their agency via agency_memberships
CREATE POLICY "psp_agency_staff_select"
ON public.parent_summary_packets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.agency_memberships am ON am.agency_id = s.agency_id
    WHERE s.id = parent_summary_packets.client_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
);

-- 4. Reviewers (agency staff) can UPDATE status/review fields for packets in their agency
CREATE POLICY "psp_reviewer_update"
ON public.parent_summary_packets FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.agency_memberships am ON am.agency_id = s.agency_id
    WHERE s.id = parent_summary_packets.client_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.agency_memberships am ON am.agency_id = s.agency_id
    WHERE s.id = parent_summary_packets.client_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
);
