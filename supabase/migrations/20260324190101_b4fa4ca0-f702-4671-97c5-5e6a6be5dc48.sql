drop view if exists public.v_student_reinforcement;

create view public.v_student_reinforcement as
select p.id as profile_id, p.student_id, p.classroom_id,
  p.reinforcement_template_id, t.template_type,
  p.response_cost_enabled, p.bonus_points_enabled,
  p.reinforcement_mode, p.use_template_defaults,
  p.custom_settings, p.is_active
from public.student_reinforcement_profiles p
left join public.reinforcement_templates t on t.id = p.reinforcement_template_id;