
CREATE OR REPLACE VIEW public.v_supervisor_classroom_access
WITH (security_invoker = on) AS
SELECT
  cm.user_id AS supervisor_id,
  cm.classroom_id,
  c.name AS classroom_name,
  c.agency_id,
  CASE
    WHEN svr.id IS NOT NULL AND svr.active = false THEN false
    ELSE true
  END AS is_visible,
  COALESCE(svr.access_mode, 'full_detail') AS access_mode
FROM public.classroom_members cm
JOIN public.classrooms c ON c.id = cm.classroom_id
LEFT JOIN public.supervisor_visibility_rules svr
  ON svr.supervisor_user_id = cm.user_id 
  AND svr.scope_type = 'classroom' 
  AND svr.scope_id = cm.classroom_id
WHERE cm.role IN ('bcba', 'supervisor', 'admin', 'lead_teacher');
