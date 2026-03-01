
DROP FUNCTION IF EXISTS public.effective_staff_can_review(uuid);

CREATE FUNCTION public.effective_staff_can_review(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.effective_staff_can_review(auth.uid(), _client_id);
$$;

DROP VIEW IF EXISTS public.v_weekly_snapshots_queue;

CREATE VIEW public.v_weekly_snapshots_queue AS
SELECT
  p.id,
  p.agency_id,
  p.client_id,
  p.week_start,
  p.week_end,
  p.abc_count,
  p.frequency_total,
  p.duration_minutes_total,
  p.intensity_avg,
  p.top_functions,
  p.top_triggers,
  p.parent_notes,
  p.status,
  p.submitted_by,
  p.created_at
FROM public.parent_summary_packets p
WHERE coalesce(p.status, 'pending') IN ('pending', 'submitted')
  AND public.effective_staff_can_review(p.client_id) = true;
