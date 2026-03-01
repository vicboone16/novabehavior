
-- Placeholder adapter: returns true if the staff user can review packets for a given client.
-- For now, checks agency_memberships (staff in same agency as client).
-- Will be refined later to check caseload assignment, supervisor links, etc.
CREATE OR REPLACE FUNCTION public.effective_staff_can_review(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.agency_memberships am ON am.agency_id = s.agency_id
    WHERE s.id = _client_id
      AND am.user_id = _user_id
      AND am.status = 'active'
  );
$$;
