CREATE OR REPLACE VIEW public.v_lms_modules_with_counts AS
SELECT
  m.id,
  m.course_id,
  m.title,
  null::text AS description,
  count(distinct l.id) AS lesson_count
FROM public.lms_modules m
LEFT JOIN public.lms_lessons l ON l.module_id = m.id
GROUP BY m.id, m.course_id, m.title;