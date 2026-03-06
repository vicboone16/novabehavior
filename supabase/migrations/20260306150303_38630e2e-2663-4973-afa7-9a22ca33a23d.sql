
CREATE OR REPLACE VIEW public.v_staff_assignments AS
SELECT
  sa.id,
  sa.agency_id,
  sa.user_id,
  sa.classroom_id,
  sa.student_id,
  sa.role_slug,
  sa.app_context,
  sa.permission_level,
  sa.can_collect_data,
  sa.can_view_notes,
  sa.can_view_documents,
  sa.can_edit_profile,
  sa.can_generate_reports,
  sa.is_active,
  sa.notes,
  sa.assigned_at,
  sa.updated_at,
  p.email,
  COALESCE(p.display_name, CONCAT(p.first_name, ' ', p.last_name)) AS staff_name,
  s.first_name || ' ' || s.last_name AS student_name
FROM public.staff_assignments sa
LEFT JOIN public.profiles p ON p.id = sa.user_id
LEFT JOIN public.students s ON s.id = sa.student_id;
