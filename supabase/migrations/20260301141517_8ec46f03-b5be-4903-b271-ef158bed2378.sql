
DROP VIEW IF EXISTS public.v_weekly_snapshots_queue;

CREATE VIEW public.v_weekly_snapshots_queue AS
SELECT
  psp.*,
  s.first_name AS client_first_name,
  s.last_name AS client_last_name
FROM public.parent_summary_packets psp
JOIN public.students s ON s.id = psp.client_id
WHERE psp.status IN ('pending_review', 'submitted')
  AND public.effective_staff_can_review(auth.uid(), psp.client_id);
