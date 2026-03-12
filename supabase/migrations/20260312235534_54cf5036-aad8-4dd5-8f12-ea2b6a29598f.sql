CREATE OR REPLACE VIEW public.abas_item_deficit_candidate_v AS
SELECT
  ir.client_id,
  ir.assessment_date,
  p.id AS program_id,
  d.domain_name,
  sa.skill_area_name,
  p.program_name,
  p.objective_goal,
  count(DISTINCT ir.abas_item_id) AS source_item_count,
  round(sum(c.confidence)::numeric, 3) AS weighted_score,
  string_agg(
    DISTINCT ('Item ' || ai.item_number || ': ' || ai.item_text),
    ' || '
    ORDER BY ('Item ' || ai.item_number || ': ' || ai.item_text)
  ) AS supporting_items
FROM abas_item_results ir
JOIN abas_items ai ON ai.id = ir.abas_item_id
JOIN abas_program_item_crosswalk c ON c.abas_item_id = ir.abas_item_id
JOIN abas_programs p ON p.id = c.program_id
JOIN abas_skill_areas sa ON sa.id = p.skill_area_id
JOIN abas_domains d ON d.id = sa.domain_id
WHERE ir.is_deficit = true
GROUP BY
  ir.client_id, ir.assessment_date, p.id,
  d.domain_name, sa.skill_area_name, p.program_name, p.objective_goal;

CREATE OR REPLACE VIEW public.abas_item_deficit_recommendations_v AS
SELECT
  r.client_id,
  r.assessment_date,
  d.domain_name,
  sa.skill_area_name,
  p.program_name,
  p.objective_goal,
  r.source_item_count,
  r.weighted_score,
  r.recommendation_rank,
  r.recommendation_reason
FROM abas_item_deficit_recommendations r
JOIN abas_programs p ON p.id = r.program_id
JOIN abas_skill_areas sa ON sa.id = p.skill_area_id
JOIN abas_domains d ON d.id = sa.domain_id
ORDER BY r.client_id, r.assessment_date DESC, r.recommendation_rank;