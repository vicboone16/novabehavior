
-- Recreate 3 views with security_invoker=on

CREATE OR REPLACE VIEW public.abas_item_deficit_candidate_v
WITH (security_invoker=on) AS
SELECT ir.client_id,
    ir.assessment_date,
    p.id AS program_id,
    d.domain_name,
    sa.skill_area_name,
    p.program_name,
    p.objective_goal,
    count(DISTINCT ir.abas_item_id) AS source_item_count,
    round(sum(c.confidence), 3) AS weighted_score,
    string_agg(DISTINCT (('Item '::text || ai.item_number) || ': '::text) || ai.item_text, ' || '::text ORDER BY ((('Item '::text || ai.item_number) || ': '::text) || ai.item_text)) AS supporting_items
   FROM abas_item_results ir
     JOIN abas_items ai ON ai.id = ir.abas_item_id
     JOIN abas_program_item_crosswalk c ON c.abas_item_id = ir.abas_item_id
     JOIN abas_programs p ON p.id = c.program_id
     JOIN abas_skill_areas sa ON sa.id = p.skill_area_id
     JOIN abas_domains d ON d.id = sa.domain_id
  WHERE ir.is_deficit = true
  GROUP BY ir.client_id, ir.assessment_date, p.id, d.domain_name, sa.skill_area_name, p.program_name, p.objective_goal;

CREATE OR REPLACE VIEW public.abas_item_deficit_recommendations_v
WITH (security_invoker=on) AS
SELECT r.client_id,
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

CREATE OR REPLACE VIEW public.default_reminder_scope_rank
WITH (security_invoker=on) AS
SELECT id,
    scope_type,
    owner_user_id,
    organization_id,
    school_id,
    classroom_id,
    role_scope,
    name,
    reminder_key,
    reminder_type,
    timezone,
    is_active,
    allow_user_override,
    local_enabled,
    remote_enabled,
    start_time,
    end_time,
    days_of_week,
    interval_minutes,
    grace_period_minutes,
    message_title,
    message_body,
    app_environment,
    created_by,
    created_at,
    updated_at,
    CASE scope_type
        WHEN 'user'::text THEN 1
        WHEN 'classroom'::text THEN 2
        WHEN 'school'::text THEN 3
        WHEN 'organization'::text THEN 4
        WHEN 'platform'::text THEN 5
        ELSE 100
    END AS scope_rank
   FROM default_reminder_schedules
  WHERE is_active = true;
