
-- =========================================================
-- CLINICAL NARRATIVE ENGINE™ + INTERVENTION RECOMMENDATIONS
-- =========================================================

-- 1) Master report template sections (static clinical text templates)
CREATE TABLE IF NOT EXISTS public.clinical_narrative_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  section_title text NOT NULL,
  section_order int NOT NULL DEFAULT 0,
  template_text text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_narrative_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read narrative templates"
  ON public.clinical_narrative_templates FOR SELECT TO authenticated USING (true);

-- 2) Generated recommendations per student
CREATE TABLE IF NOT EXISTS public.clinical_narrative_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  report_id uuid REFERENCES public.bops_reports(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN (
    'child_evaluation', 'classroom_school', 'parent_training',
    'regulation_sensory', 'assessment_followup', 'immediate_priority'
  )),
  source_tool text NOT NULL,
  recommendation_text text NOT NULL,
  priority_order int NOT NULL DEFAULT 0,
  score_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cnr_student ON public.clinical_narrative_recommendations(student_id);
CREATE INDEX IF NOT EXISTS idx_cnr_report ON public.clinical_narrative_recommendations(report_id);

ALTER TABLE public.clinical_narrative_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read recommendations"
  ON public.clinical_narrative_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert recommendations"
  ON public.clinical_narrative_recommendations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete recommendations"
  ON public.clinical_narrative_recommendations FOR DELETE TO authenticated USING (true);

-- 3) Seed master report template sections
INSERT INTO public.clinical_narrative_templates (template_key, section_title, section_order, template_text, variables) VALUES
('identifying_info', 'Identifying Information', 1,
 'Child Name: {child_name}
Date of Birth: {dob} (Age: {age})
Date of Report: {report_date}
Assessor: {assessor}
Setting(s): {settings}
Informants: {informants}', '["child_name","dob","age","report_date","assessor","settings","informants"]'::jsonb),

('reason_for_assessment', 'Reason for Assessment', 2,
 'This integrated clinical summary was completed to better understand the child''s neurodevelopmental presentation, potential masking patterns, adult interpretation of behavior, and parent training readiness factors influencing intervention success. Multiple tools were used to examine internal presentation, external behavior, context, and caregiver implementation capacity.', '[]'::jsonb),

('tools_administered', 'Assessment Tools Administered', 3,
 '• Social Behavior & Relational Dynamics Scale™ (SBRDS)
• Executive Functioning & Demand Profile™ (EFDP)
• Adaptive Behavior & Replacement Skills Engine™ (ABRSE)
• Neurodivergent Archetype Profiler™ (NAP)
• Masking & Camouflage Index™
• Behavior Misinterpretation Index™
• Parent Effectiveness Formula™
• BCBA Parent Training Competency Evaluator™', '[]'::jsonb),

('major_findings', 'Summary of Major Findings', 4,
 'Results suggest a presentation characterized by {masking_severity} masking, {distress_level} hidden distress, and a pattern of behavioral misinterpretation across contexts. The child''s profile is most consistent with a {primary_archetype} presentation, with notable features of {secondary_archetype}. Current findings suggest that outward compliance and/or controlled presentation may obscure underlying confusion, fatigue, sensory load, or neurodevelopmental needs. Parent and caregiver findings indicate {parent_readiness} readiness for intervention, with primary barriers related to {parent_barriers}.', '["masking_severity","distress_level","primary_archetype","secondary_archetype","parent_readiness","parent_barriers"]'::jsonb),

('masking_summary', 'Section A: Masking & Camouflage Summary', 5,
 'Results from the Masking & Camouflage Index™ indicate a {severity} masking profile. Elevated scores were noted in {top_domains}, suggesting that the child may rely on compensatory strategies to navigate social, academic, or behavioral demands. This pattern is consistent with a child who may appear more regulated, socially competent, or compliant than they actually feel internally.', '["severity","top_domains"]'::jsonb),

('archetype_summary', 'Section B: Neurodivergent Archetype Summary', 6,
 'The child''s presentation is most consistent with the {primary_archetype}, with secondary features of {secondary_archetype}. This profile suggests a neurodivergent pattern characterized by {core_traits}.', '["primary_archetype","secondary_archetype","core_traits"]'::jsonb),

('misinterpretation_summary', 'Section C: Behavior Misinterpretation Summary', 7,
 'Findings from the Behavior Misinterpretation Index™ indicate a {risk_level} risk that observed behavior is being interpreted in a way that does not fully reflect its likely function or cause. The strongest patterns suggest that behavior currently read as {top_pattern} may more accurately reflect {alternative_explanation}.', '["risk_level","top_pattern","alternative_explanation"]'::jsonb),

('parent_effectiveness_summary', 'Section D: Parent Effectiveness Summary', 8,
 'Parent Effectiveness findings suggest {readiness_level} intervention readiness overall. Relative strengths were identified in {strength_areas}, while primary vulnerabilities were noted in {weakness_areas}. This pattern suggests that intervention success is likely to depend on the degree to which supports account for caregiver capacity, emotional regulation, treatment fit, and real-world implementation demands.', '["readiness_level","strength_areas","weakness_areas"]'::jsonb),

('bcba_ptce_summary', 'Section E: BCBA Parent Training Competency Summary', 9,
 'BCBA-rated parent training findings indicate {overall_readiness}. Caregiver strengths were observed in {strength_domains}, while barriers were most notable in {barrier_domains}. The current pattern is most consistent with {barrier_subtype}.', '["overall_readiness","strength_domains","barrier_domains","barrier_subtype"]'::jsonb),

('integrated_interpretation', 'Integrated Clinical Interpretation', 10,
 'Taken together, current findings suggest that the child''s presentation is likely more complex than a surface-level behavior interpretation alone would indicate. Elevated masking and/or camouflage indicators suggest that support needs may be under-recognized in structured settings. The child''s archetype profile further suggests a pattern of {archetype_language}, while the behavior misinterpretation findings indicate that adult responses may not always be aligned with the likely underlying drivers of behavior. Parent and caregiver findings suggest that treatment success will depend not only on child-focused intervention, but also on caregiver capacity, coaching fit, and the extent to which implementation demands are realistic, culturally aligned, and sustainable.', '["archetype_language"]'::jsonb),

('recommendations', 'Recommendations', 11,
 '{generated_recommendations}', '["generated_recommendations"]'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

-- 4) Archetype interpretation snippets
CREATE TABLE IF NOT EXISTS public.clinical_narrative_archetype_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype_key text NOT NULL UNIQUE,
  archetype_name text NOT NULL,
  interpretation_text text NOT NULL,
  core_traits text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_narrative_archetype_snippets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read archetype snippets"
  ON public.clinical_narrative_archetype_snippets FOR SELECT TO authenticated USING (true);

INSERT INTO public.clinical_narrative_archetype_snippets (archetype_key, archetype_name, interpretation_text, core_traits) VALUES
('masked_observer', 'Masked Observer', 'This archetype reflects a child who studies social environments carefully, often relying on observation and performance rather than intuitive ease.', 'social scripting, delayed processing, performance-based engagement'),
('sensory_seeker', 'Sensory Seeker', 'This archetype reflects a child whose nervous system appears to seek input, movement, or stimulation in ways that may be mistaken for impulsivity or hyperactivity.', 'movement-driven, stimulation-seeking, sensory regulation through action'),
('overwhelmed_reactor', 'Overwhelmed Reactor', 'This archetype reflects a child with meaningful load sensitivity whose distress becomes more visible when demands exceed current regulation capacity.', 'load sensitivity, escalation under demand, delayed recovery'),
('misread_leader', 'Misread Leader', 'This archetype reflects a child whose autonomy, intensity, or assertiveness may be misread as opposition rather than agency.', 'autonomy-driven, assertive, control-seeking for safety'),
('silent_processor', 'Silent Processor', 'This archetype reflects a child whose internal processing style may be overlooked in fast-paced or verbally demanding settings.', 'slow-to-respond, internal processing, quiet engagement'),
('controlled_performer', 'Controlled Performer', 'This archetype reflects a child who performs under structure but struggles without it, masking underlying dysregulation.', 'structure-dependent, performance masking, fragile regulation'),
('dysregulated_reactor', 'Dysregulated Reactor', 'This archetype reflects a child with rapid escalation and low recovery under stress.', 'rapid escalation, low frustration tolerance, delayed recovery')
ON CONFLICT (archetype_key) DO NOTHING;

-- 5) Rule-based recommendation generation function
CREATE OR REPLACE FUNCTION public.generate_clinical_recommendations(
  p_student_id uuid,
  p_report_id uuid DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int := 0;
  v_session_id uuid;
  v_storm numeric;
  v_escalation numeric;
  v_hidden_need numeric;
  v_sensory numeric;
  v_power numeric;
  v_social numeric;
  v_recovery numeric;
  v_primary text;
  v_secondary text;
BEGIN
  -- Clear existing recommendations for this report
  IF p_report_id IS NOT NULL THEN
    DELETE FROM public.clinical_narrative_recommendations WHERE report_id = p_report_id;
  END IF;

  -- Get latest BOPS profile data
  SELECT
    d.latest_scored_session_id,
    d.storm_score, d.escalation_index, d.hidden_need_index,
    d.sensory_load_index, d.power_conflict_index,
    d.social_complexity_index, d.recovery_burden_index,
    d.primary_archetype, d.secondary_archetype
  INTO
    v_session_id, v_storm, v_escalation, v_hidden_need,
    v_sensory, v_power, v_social, v_recovery,
    v_primary, v_secondary
  FROM public.v_student_bops_dashboard d
  WHERE d.student_id = p_student_id;

  IF v_session_id IS NULL THEN RETURN 0; END IF;

  -- ═══ IMMEDIATE PRIORITIES ═══
  IF v_storm > 0.7 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'immediate_priority', 'BOPS_Storm', 'Further evaluate for masked neurodevelopmental presentation given elevated storm index', 1, jsonb_build_object('storm_score', v_storm));
    v_count := v_count + 1;
  END IF;

  IF v_hidden_need > 0.6 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'immediate_priority', 'BOPS_HiddenNeed', 'Monitor emotional suppression and assess for anxiety/internalizing symptoms', 2, jsonb_build_object('hidden_need_index', v_hidden_need));
    v_count := v_count + 1;
  END IF;

  IF v_escalation > 0.7 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'immediate_priority', 'BOPS_Escalation', 'Reduce reliance on behavior-only interpretation; escalation patterns suggest function-based analysis is needed', 1, jsonb_build_object('escalation_index', v_escalation));
    v_count := v_count + 1;
  END IF;

  -- ═══ CLASSROOM / SCHOOL SUPPORTS ═══
  IF v_sensory > 0.5 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'classroom_school', 'BOPS_Sensory', 'Increase movement and sensory regulation supports; distinguish sensory need from impulsivity', 1, jsonb_build_object('sensory_load_index', v_sensory));
    v_count := v_count + 1;
  END IF;

  IF v_recovery > 0.6 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'classroom_school', 'BOPS_Recovery', 'Allow decompression after high-demand periods; do not interpret quiet compliance as absence of need', 2, jsonb_build_object('recovery_burden_index', v_recovery));
    v_count := v_count + 1;
  END IF;

  IF v_power > 0.6 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'classroom_school', 'BOPS_Power', 'Offer choice and autonomy within structure; avoid overpathologizing assertiveness; frame expectations collaboratively', 3, jsonb_build_object('power_conflict_index', v_power));
    v_count := v_count + 1;
  END IF;

  IF v_social > 0.6 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'classroom_school', 'BOPS_Social', 'Check comprehension privately; use low-pressure processing supports; provide permission to ask for help', 4, jsonb_build_object('social_complexity_index', v_social));
    v_count := v_count + 1;
  END IF;

  -- ═══ REGULATION / SENSORY ═══
  IF v_sensory > 0.7 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'regulation_sensory', 'BOPS_Sensory', 'Embed structured sensory input opportunities throughout the day; assess for sensory processing differences', 1, jsonb_build_object('sensory_load_index', v_sensory));
    v_count := v_count + 1;
  END IF;

  IF v_escalation > 0.6 AND v_recovery > 0.5 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'regulation_sensory', 'BOPS_Combined', 'Prioritize co-regulation and pacing; teach recognition of buildup before meltdown; reduce load during escalation risk periods', 2, jsonb_build_object('escalation_index', v_escalation, 'recovery_burden_index', v_recovery));
    v_count := v_count + 1;
  END IF;

  -- ═══ ASSESSMENT FOLLOW-UP ═══
  IF v_hidden_need > 0.7 AND v_storm > 0.6 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'assessment_followup', 'BOPS_Combined', 'Full autism-informed differential evaluation recommended; assess internalized distress/anxiety; review home-school discrepancy', 1, jsonb_build_object('hidden_need_index', v_hidden_need, 'storm_score', v_storm));
    v_count := v_count + 1;
  END IF;

  IF v_sensory > 0.7 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'assessment_followup', 'BOPS_Sensory', 'Sensory/regulation assessment recommended', 2, jsonb_build_object('sensory_load_index', v_sensory));
    v_count := v_count + 1;
  END IF;

  IF v_escalation > 0.7 THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'assessment_followup', 'BOPS_Escalation', 'Executive functioning review recommended', 3, jsonb_build_object('escalation_index', v_escalation));
    v_count := v_count + 1;
  END IF;

  -- ═══ ARCHETYPE-BASED RECOMMENDATIONS ═══
  IF v_primary ILIKE '%sensory%' OR v_secondary ILIKE '%sensory%' THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'child_evaluation', 'NAP_Archetype', 'Increase movement and sensory regulation supports; distinguish sensory need from impulsivity; embed structured input opportunities', 1, jsonb_build_object('archetype', coalesce(v_primary, '')));
    v_count := v_count + 1;
  END IF;

  IF v_primary ILIKE '%withdraw%' OR v_primary ILIKE '%silent%' THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'child_evaluation', 'NAP_Archetype', 'Allow extra wait time; reduce pressure for immediate verbal response; check understanding without assuming nonparticipation', 2, jsonb_build_object('archetype', coalesce(v_primary, '')));
    v_count := v_count + 1;
  END IF;

  IF v_primary ILIKE '%control%' OR v_primary ILIKE '%autonomy%' OR v_primary ILIKE '%authority%' THEN
    INSERT INTO public.clinical_narrative_recommendations (student_id, report_id, category, source_tool, recommendation_text, priority_order, score_context)
    VALUES (p_student_id, p_report_id, 'child_evaluation', 'NAP_Archetype', 'Offer choice and autonomy within structure; avoid overpathologizing assertiveness; frame expectations collaboratively', 3, jsonb_build_object('archetype', coalesce(v_primary, '')));
    v_count := v_count + 1;
  END IF;

  RETURN v_count;
END;
$$;

-- 6) Master report narrative generator view
CREATE OR REPLACE VIEW public.v_clinical_narrative_master_report AS
SELECT
  d.student_id,
  s.first_name || ' ' || s.last_name as student_name,
  s.date_of_birth,
  d.calculated_training_name,
  d.calculated_clinical_name,
  d.primary_archetype,
  d.secondary_archetype,
  d.tertiary_archetype,
  d.storm_score,
  d.escalation_index,
  d.hidden_need_index,
  d.sensory_load_index,
  d.power_conflict_index,
  d.social_complexity_index,
  d.recovery_burden_index,
  d.calculated_profile_type,
  d.assessment_date,
  d.latest_scored_session_id,
  -- Nova assessment results if available
  (SELECT jsonb_agg(jsonb_build_object(
    'assessment_code', ar.assessment_code,
    'domain_results', ar.domain_results,
    'profiles', ar.profiles,
    'flags', ar.flags
  )) FROM public.v_nova_assessment_report ar
  WHERE ar.student_id = d.student_id) as nova_assessment_results,
  -- Recommendations
  (SELECT jsonb_agg(jsonb_build_object(
    'category', r.category,
    'source_tool', r.source_tool,
    'recommendation_text', r.recommendation_text,
    'priority_order', r.priority_order,
    'score_context', r.score_context
  ) ORDER BY r.category, r.priority_order)
  FROM public.clinical_narrative_recommendations r
  WHERE r.student_id = d.student_id) as recommendations
FROM public.v_student_bops_dashboard d
LEFT JOIN public.students s ON s.id = d.student_id;

-- 7) Function to generate the full master narrative text
CREATE OR REPLACE FUNCTION public.generate_clinical_narrative_text(p_student_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_name text;
  v_primary text;
  v_secondary text;
  v_storm numeric;
  v_escalation numeric;
  v_hidden numeric;
  v_sensory numeric;
  v_power numeric;
  v_recovery numeric;
  v_social numeric;
  v_result text := '';
  v_rec_count int;
  v_rec record;
  v_current_category text := '';
  v_category_labels jsonb := '{
    "immediate_priority": "Immediate Clinical Priorities",
    "classroom_school": "Classroom / School Supports",
    "parent_training": "Parent Training / Caregiver Supports",
    "regulation_sensory": "Regulation / Sensory Supports",
    "child_evaluation": "Child Evaluation Recommendations",
    "assessment_followup": "Further Assessment Recommendations"
  }'::jsonb;
BEGIN
  SELECT
    coalesce(s.first_name || ' ' || s.last_name, 'The student'),
    d.primary_archetype, d.secondary_archetype,
    d.storm_score, d.escalation_index, d.hidden_need_index,
    d.sensory_load_index, d.power_conflict_index,
    d.recovery_burden_index, d.social_complexity_index
  INTO v_name, v_primary, v_secondary, v_storm, v_escalation, v_hidden, v_sensory, v_power, v_recovery, v_social
  FROM public.v_student_bops_dashboard d
  LEFT JOIN public.students s ON s.id = d.student_id
  WHERE d.student_id = p_student_id;

  IF v_name IS NULL THEN RETURN 'No data available for this student.'; END IF;

  -- Generate recommendations first
  PERFORM public.generate_clinical_recommendations(p_student_id);

  -- Build narrative
  v_result := v_result || '# Integrated Clinical Narrative Report' || E'\n\n';
  v_result := v_result || '## Summary of Major Findings' || E'\n\n';
  v_result := v_result || format(
    '%s demonstrates a profile most consistent with a %s presentation, with notable features of %s. ',
    v_name, coalesce(v_primary, 'not yet classified'), coalesce(v_secondary, 'not yet classified')
  );

  IF v_storm > 0.7 THEN
    v_result := v_result || 'Current findings suggest that outward compliance and/or controlled presentation may obscure underlying confusion, fatigue, sensory load, or neurodevelopmental needs. ';
  END IF;

  IF v_hidden > 0.6 THEN
    v_result := v_result || 'Elevated hidden-distress indicators suggest that emotional strain may be expressed internally or delayed until the child is in a safer environment. ';
  END IF;

  v_result := v_result || E'\n\n';

  -- Clinical indices summary
  v_result := v_result || '## Clinical Index Summary' || E'\n\n';
  v_result := v_result || format('• Storm Index: %s', coalesce(round(v_storm::numeric, 2)::text, 'N/A')) || E'\n';
  v_result := v_result || format('• Escalation Index: %s', coalesce(round(v_escalation::numeric, 2)::text, 'N/A')) || E'\n';
  v_result := v_result || format('• Hidden Need Index: %s', coalesce(round(v_hidden::numeric, 2)::text, 'N/A')) || E'\n';
  v_result := v_result || format('• Sensory Load Index: %s', coalesce(round(v_sensory::numeric, 2)::text, 'N/A')) || E'\n';
  v_result := v_result || format('• Power Conflict Index: %s', coalesce(round(v_power::numeric, 2)::text, 'N/A')) || E'\n';
  v_result := v_result || format('• Social Complexity Index: %s', coalesce(round(v_social::numeric, 2)::text, 'N/A')) || E'\n';
  v_result := v_result || format('• Recovery Burden Index: %s', coalesce(round(v_recovery::numeric, 2)::text, 'N/A')) || E'\n\n';

  -- Integrated interpretation
  v_result := v_result || '## Integrated Clinical Interpretation' || E'\n\n';
  v_result := v_result || format(
    'Taken together, current findings suggest that %s''s presentation is likely more complex than a surface-level behavior interpretation alone would indicate. ',
    v_name
  );
  IF v_hidden > 0.5 THEN
    v_result := v_result || 'Elevated masking and/or camouflage indicators suggest that support needs may be under-recognized in structured settings. ';
  END IF;
  v_result := v_result || format(
    'The child''s archetype profile further suggests a pattern of %s, while behavior analysis findings indicate that adult responses may not always be aligned with the likely underlying drivers of behavior. ',
    coalesce(v_primary, 'emerging profile')
  );
  v_result := v_result || 'Treatment success will depend not only on child-focused intervention, but also on caregiver capacity, coaching fit, and the extent to which implementation demands are realistic, culturally aligned, and sustainable.';
  v_result := v_result || E'\n\n';

  -- Recommendations
  v_result := v_result || '## Recommendations' || E'\n\n';
  FOR v_rec IN
    SELECT category, recommendation_text, priority_order
    FROM public.clinical_narrative_recommendations
    WHERE student_id = p_student_id
    ORDER BY
      CASE category
        WHEN 'immediate_priority' THEN 1
        WHEN 'classroom_school' THEN 2
        WHEN 'parent_training' THEN 3
        WHEN 'regulation_sensory' THEN 4
        WHEN 'child_evaluation' THEN 5
        WHEN 'assessment_followup' THEN 6
      END,
      priority_order
  LOOP
    IF v_rec.category != v_current_category THEN
      v_current_category := v_rec.category;
      v_result := v_result || E'\n### ' || coalesce(v_category_labels->>v_rec.category, v_rec.category) || E'\n\n';
    END IF;
    v_result := v_result || '• ' || v_rec.recommendation_text || E'\n';
  END LOOP;

  RETURN v_result;
END;
$$;
