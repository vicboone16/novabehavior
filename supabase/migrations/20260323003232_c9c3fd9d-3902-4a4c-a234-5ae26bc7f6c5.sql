-- Add selected_cfi_model to student_bops_config
ALTER TABLE public.student_bops_config
  ADD COLUMN IF NOT EXISTS selected_cfi_model text;

-- CFI Explanations view
CREATE OR REPLACE VIEW public.v_bops_cfi_explanations AS
SELECT
  s.student_id,
  s.session_id,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN s.escalation_index > 0.7 THEN 'High escalation index → requires structured containment and support' END,
    CASE WHEN s.power_conflict_index > 0.7 THEN 'Elevated power conflict → needs controlled authority environment' END,
    CASE WHEN s.sensory_load_index > 0.6 THEN 'Sensory load elevated → benefits from predictable, low-stimulus environment' END,
    CASE WHEN s.recovery_burden_index > 0.6 THEN 'Recovery burden high → requires adult-guided re-entry support' END,
    CASE WHEN s.hidden_need_index > 0.6 THEN 'Hidden need elevated → requires proactive identification of unmet needs' END,
    CASE WHEN s.social_complexity_index > 0.6 THEN 'Social complexity high → benefits from structured social support' END,
    CASE WHEN s.storm_score > 0.7 THEN 'Storm score elevated → multi-domain dysregulation requires intensive placement' END,
    CASE WHEN s.autonomy_score > 0.7 THEN 'High autonomy sensitivity → needs choice-rich, low-demand structure' END,
    CASE WHEN s.authority_score > 0.7 THEN 'Authority reactivity high → benefits from collaborative authority style' END,
    CASE WHEN s.emotion_score > 0.7 THEN 'Emotional regulation impaired → needs co-regulation and recovery support' END,
    CASE WHEN s.threat_score > 0.7 THEN 'Threat hypervigilance → requires safe, predictable environment' END,
    CASE WHEN s.withdrawal_score > 0.7 THEN 'Withdrawal pattern → needs engagement supports and low social pressure' END
  ], NULL) AS explanation_bullets
FROM student_bops_scores s;