
CREATE OR REPLACE VIEW public.v_behavior_strategy_library AS
SELECT
  s.id,
  s.strategy_name,
  s.short_description,
  s.full_description,
  s.function_tags,
  s.setting_tags,
  s.tier_tags,
  s.grade_band_tags,
  s.role_tags,
  s.crisis_relevance,
  s.status,
  s.sort_order,
  s.implementation_steps,
  s.data_to_collect,
  s.fidelity_tips,
  s.staff_scripts,
  s.family_version,
  s.teacher_quick_version,
  count(distinct osl.objective_id) AS linked_objective_count
FROM public.bx_strategies s
LEFT JOIN public.bx_objective_strategy_links osl
  ON osl.strategy_id = s.id
GROUP BY
  s.id, s.strategy_name, s.short_description, s.full_description,
  s.function_tags, s.setting_tags, s.tier_tags, s.grade_band_tags, s.role_tags,
  s.crisis_relevance, s.status, s.sort_order,
  s.implementation_steps, s.data_to_collect, s.fidelity_tips, s.staff_scripts,
  s.family_version, s.teacher_quick_version;
