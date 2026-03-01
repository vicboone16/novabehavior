
CREATE OR REPLACE FUNCTION public.effective_staff_can_review(_user_id uuid, _client_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_team_assignments cta
    WHERE cta.staff_user_id = _user_id
      AND cta.client_id = _client_id
      AND cta.is_active = true
      AND (cta.start_date IS NULL OR cta.start_date <= current_date)
      AND (cta.end_date IS NULL OR cta.end_date >= current_date)
  );
$$;
