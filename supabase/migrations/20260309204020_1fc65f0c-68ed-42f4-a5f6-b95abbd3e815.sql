DROP VIEW IF EXISTS public.v_nova_ai_clinical_context_summary;

CREATE VIEW public.v_nova_ai_clinical_context_summary WITH (security_invoker = on) AS
SELECT
    sis.student_id,
    sis.student_id AS client_id,
    sis.skill_alert_count,
    sis.behavior_alert_count,
    sis.caregiver_alert_count,
    sis.programming_alert_count,
    bei.behavior_name,
    bei.top_time_of_day,
    bei.top_antecedent_pattern,
    bei.top_consequence_pattern,
    bei.transition_risk_flag,
    bei.unstructured_time_risk_flag,
    bei.lunch_time_risk_flag,
    bei.escape_pattern_flag,
    bei.attention_pattern_flag,
    bei.total_behavior_events
FROM public.v_student_intelligence_summary sis
LEFT JOIN public.v_behavior_event_intelligence_summary bei
  ON bei.student_id = sis.student_id;