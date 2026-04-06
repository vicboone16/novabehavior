
-- 1. nova_generated_recommendations table
CREATE TABLE IF NOT EXISTS public.nova_generated_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  session_id uuid REFERENCES public.nova_assessment_sessions(id) ON DELETE CASCADE,
  assessment_code text NOT NULL,
  source_result_key text,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('iep_goal','aba_goal','objective','bip_strategy','accommodation','reinforcement','teaching_strategy')),
  setting_type text NOT NULL DEFAULT 'school' CHECK (setting_type IN ('school','aba','home','clinic','hybrid')),
  option_group text,
  option_rank int DEFAULT 1,
  title text NOT NULL,
  generated_text text NOT NULL,
  original_text text,
  rationale_text text,
  status text NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','accepted','edited','rejected','replaced','manual')),
  converted_from text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nova_generated_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recommendations" ON public.nova_generated_recommendations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert recommendations" ON public.nova_generated_recommendations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update recommendations" ON public.nova_generated_recommendations
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete recommendations" ON public.nova_generated_recommendations
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_nova_recs_session ON public.nova_generated_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_nova_recs_student ON public.nova_generated_recommendations(student_id);

-- 2. nova_goal_templates table
CREATE TABLE IF NOT EXISTS public.nova_goal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_code text NOT NULL,
  domain_code text,
  setting_type text NOT NULL DEFAULT 'aba',
  goal_type text NOT NULL DEFAULT 'aba_goal',
  template_text text NOT NULL,
  rationale_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nova_goal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read goal templates" ON public.nova_goal_templates
  FOR SELECT TO authenticated USING (true);

-- 3. Add audience column to snippets
ALTER TABLE public.nova_report_snippets
  ADD COLUMN IF NOT EXISTS audience text DEFAULT 'clinical';

-- 4. Snippet lookup helper
CREATE OR REPLACE FUNCTION public.nova_get_snippets(
  p_session_id uuid,
  p_snippet_type text
)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(string_agg(s.snippet_text, ' '), '')
  FROM public.nova_report_snippets s
  JOIN public.nova_assessment_sessions sess ON sess.assessment_id = s.assessment_id
  WHERE sess.id = p_session_id
    AND s.snippet_type = p_snippet_type;
$$;

-- 5. SBRDS narrative v2
CREATE OR REPLACE FUNCTION public.nova_generate_sbrds_v2(
  p_session_id uuid,
  p_audience text DEFAULT 'clinical'
)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_profile text;
  v_d1 numeric; v_d2 numeric; v_d3 numeric; v_d4 numeric; v_d5 numeric;
  v_text text := '';
BEGIN
  SELECT result_label INTO v_profile
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'profile' AND is_primary = true
  LIMIT 1;

  SELECT
    max(CASE WHEN result_key = 'D1' THEN avg_score END),
    max(CASE WHEN result_key = 'D2' THEN avg_score END),
    max(CASE WHEN result_key = 'D3' THEN avg_score END),
    max(CASE WHEN result_key = 'D4' THEN avg_score END),
    max(CASE WHEN result_key = 'D5' THEN avg_score END)
  INTO v_d1, v_d2, v_d3, v_d4, v_d5
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'domain';

  -- Section 1: Clinical Summary
  v_text := 'CLINICAL SUMMARY' || E'\n';
  v_text := v_text || 'The student presents with a ' || coalesce(v_profile, 'mixed') || ' social profile. ';
  v_text := v_text || public.nova_get_snippets(p_session_id, 'profile_statement');

  -- Section 2: Domain Analysis
  v_text := v_text || E'\n\nDOMAIN ANALYSIS' || E'\n';
  IF v_d1 < 1.5 THEN
    v_text := v_text || 'Social initiation is reduced, suggesting hesitation, avoidance, or low confidence rather than lack of interest. ';
  ELSIF v_d1 >= 2.5 THEN
    v_text := v_text || 'Social initiation is adequate, indicating willingness and capacity to engage. ';
  END IF;
  IF v_d2 < 1.5 THEN
    v_text := v_text || 'Reciprocity is limited, suggesting difficulty sustaining social exchanges. ';
  END IF;
  IF v_d3 < 1.5 THEN
    v_text := v_text || 'Social awareness and interpretation are reduced, which may impact the quality of peer interactions. ';
  END IF;
  IF v_d4 < 1.5 THEN
    v_text := v_text || 'Relational safety is significantly low, suggesting trust and comfort with others may be limiting social access. ';
  END IF;
  IF v_d5 < 1.5 THEN
    v_text := v_text || 'Social energy and regulation appear depleted, indicating social participation may be effortful and unsustainable. ';
  END IF;
  v_text := v_text || public.nova_get_snippets(p_session_id, 'domain_interpretation');

  -- Section 3: Pattern Insights
  v_text := v_text || E'\n\nPATTERN INSIGHTS' || E'\n';
  IF v_d1 < 1.5 AND v_d4 < 1.5 THEN
    v_text := v_text || 'The combination of low initiation and low relational safety suggests trust may be a primary barrier rather than lack of social interest. ';
  END IF;
  IF v_d2 >= 2.0 AND v_d5 < 1.5 THEN
    v_text := v_text || 'Adequate reciprocity paired with low social energy suggests performance may be present but costly, consistent with masking or fatigue patterns. ';
  END IF;
  IF v_d3 < 1.5 AND v_d4 < 1.5 THEN
    v_text := v_text || 'Low awareness combined with low safety may indicate withdrawal as a protective strategy. ';
  END IF;
  v_text := v_text || public.nova_get_snippets(p_session_id, 'pattern_insight');

  -- Section 4: Clinical Recommendations
  v_text := v_text || E'\n\nCLINICAL RECOMMENDATIONS' || E'\n';
  v_text := v_text || 'Intervention should prioritize relational safety, reduce social performance demands, and support sustainable engagement. ';
  IF v_d5 < 1.5 THEN
    v_text := v_text || 'Schedule decompression supports and monitor post-demand behavior. ';
  END IF;
  IF v_d4 < 1.5 THEN
    v_text := v_text || 'Build trust through predictable interactions before increasing social expectations. ';
  END IF;

  RETURN v_text;
END;
$$;

-- 6. EFDP narrative v2
CREATE OR REPLACE FUNCTION public.nova_generate_efdp_v2(
  p_session_id uuid,
  p_audience text DEFAULT 'clinical'
)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_profile text; v_demand_style text;
  v_d1 numeric; v_d2 numeric; v_d3 numeric; v_d4 numeric; v_d5 numeric;
  v_text text := '';
BEGIN
  SELECT result_label INTO v_profile
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'profile' AND is_primary = true LIMIT 1;

  SELECT result_label INTO v_demand_style
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'demand_style' LIMIT 1;

  SELECT
    max(CASE WHEN result_key = 'D1' THEN avg_score END),
    max(CASE WHEN result_key = 'D2' THEN avg_score END),
    max(CASE WHEN result_key = 'D3' THEN avg_score END),
    max(CASE WHEN result_key = 'D4' THEN avg_score END),
    max(CASE WHEN result_key = 'D5' THEN avg_score END)
  INTO v_d1, v_d2, v_d3, v_d4, v_d5
  FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain';

  v_text := 'CLINICAL SUMMARY' || E'\n';
  v_text := v_text || 'The student demonstrates a ' || coalesce(v_profile, 'mixed') || ' executive functioning profile';
  IF v_demand_style IS NOT NULL THEN
    v_text := v_text || ' with a ' || v_demand_style || ' demand response style';
  END IF;
  v_text := v_text || '. ';
  v_text := v_text || public.nova_get_snippets(p_session_id, 'profile_statement');

  v_text := v_text || E'\n\nDOMAIN ANALYSIS' || E'\n';
  IF v_d1 < 1.5 THEN v_text := v_text || 'Task initiation is limited, indicating difficulty activating behavior independently. '; END IF;
  IF v_d2 < 1.5 THEN v_text := v_text || 'Sustained attention is reduced, suggesting difficulty maintaining focus across task duration. '; END IF;
  IF v_d3 < 1.5 THEN v_text := v_text || 'Cognitive flexibility is limited, indicating difficulty transitioning or adapting strategies. '; END IF;
  IF v_d4 < 1.5 THEN v_text := v_text || 'Demand sensitivity appears to be a key factor influencing task engagement. '; END IF;
  IF v_d5 < 1.5 THEN v_text := v_text || 'Task performance appears impacted by overwhelm rather than lack of skill alone. '; END IF;
  v_text := v_text || public.nova_get_snippets(p_session_id, 'domain_interpretation');

  v_text := v_text || E'\n\nPATTERN INSIGHTS' || E'\n';
  IF v_d1 < 1.5 AND v_d5 < 1.5 THEN
    v_text := v_text || 'Non-start behavior is likely related to overwhelm rather than refusal. ';
  END IF;
  IF v_d3 < 1.5 AND v_d4 < 1.5 THEN
    v_text := v_text || 'Rigidity combined with demand sensitivity may amplify avoidance behaviors during transitions. ';
  END IF;
  IF v_d2 >= 2.0 AND v_d1 < 1.5 THEN
    v_text := v_text || 'The student can sustain attention once activated but struggles with initial task engagement. ';
  END IF;
  v_text := v_text || public.nova_get_snippets(p_session_id, 'pattern_insight');

  v_text := v_text || E'\n\nCLINICAL RECOMMENDATIONS' || E'\n';
  v_text := v_text || 'Intervention should focus on reducing demand pressure, supporting initiation, and stabilizing task access. ';
  IF v_d1 < 1.5 THEN v_text := v_text || 'Provide initiation supports such as visual cues, task previews, or co-regulation. '; END IF;
  IF v_d5 < 1.5 THEN v_text := v_text || 'Reduce task complexity and provide regulation breaks to prevent overwhelm. '; END IF;

  RETURN v_text;
END;
$$;

-- 7. ABRSE narrative v2
CREATE OR REPLACE FUNCTION public.nova_generate_abrse_v2(
  p_session_id uuid,
  p_audience text DEFAULT 'clinical'
)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_profile text;
  v_d1 numeric; v_d2 numeric; v_d3 numeric; v_d4 numeric; v_d5 numeric;
  v_target_count int;
  v_text text := '';
BEGIN
  SELECT result_label INTO v_profile
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'profile' AND is_primary = true LIMIT 1;

  SELECT
    max(CASE WHEN result_key = 'D1' THEN avg_score END),
    max(CASE WHEN result_key = 'D2' THEN avg_score END),
    max(CASE WHEN result_key = 'D3' THEN avg_score END),
    max(CASE WHEN result_key = 'D4' THEN avg_score END),
    max(CASE WHEN result_key = 'D5' THEN avg_score END)
  INTO v_d1, v_d2, v_d3, v_d4, v_d5
  FROM public.nova_assessment_results WHERE session_id = p_session_id AND result_scope = 'domain';

  SELECT count(*) INTO v_target_count
  FROM public.v_nova_abrse_recommendations WHERE session_id = p_session_id;

  v_text := 'CLINICAL SUMMARY' || E'\n';
  v_text := v_text || 'The student demonstrates a ' || coalesce(v_profile, 'mixed') || ' skill deficit profile. ';
  v_text := v_text || 'Observed behaviors are likely linked to gaps in adaptive skill development rather than solely behavioral excess. ';
  v_text := v_text || public.nova_get_snippets(p_session_id, 'profile_statement');

  v_text := v_text || E'\n\nDOMAIN ANALYSIS' || E'\n';
  IF v_d1 < 1.5 THEN v_text := v_text || 'Functional communication skills are significantly limited, suggesting behavior may serve a communicative function. '; END IF;
  IF v_d2 < 1.5 THEN v_text := v_text || 'Emotional regulation and coping skills are reduced, likely contributing to escalation patterns. '; END IF;
  IF v_d3 < 1.5 THEN v_text := v_text || 'Task engagement and compliance skills are limited, indicating escape-maintained patterns may be present. '; END IF;
  IF v_d4 < 1.5 THEN v_text := v_text || 'Social replacement behaviors are underdeveloped, limiting prosocial alternatives. '; END IF;
  IF v_d5 < 1.5 THEN v_text := v_text || 'Flexibility and tolerance for limits are low, contributing to escalation when denied or redirected. '; END IF;
  v_text := v_text || public.nova_get_snippets(p_session_id, 'domain_interpretation');

  v_text := v_text || E'\n\nPATTERN INSIGHTS' || E'\n';
  IF v_d1 < 1.5 AND v_d2 < 1.5 THEN
    v_text := v_text || 'Combined communication and regulation deficits suggest behavior is likely driven by inability to express needs during distress. ';
  END IF;
  IF v_d3 < 1.5 AND v_d5 < 1.5 THEN
    v_text := v_text || 'Task avoidance paired with low flexibility suggests demand sensitivity as a core feature. ';
  END IF;

  v_text := v_text || E'\n\nREPLACEMENT SKILL PRIORITIES' || E'\n';
  IF v_target_count > 0 THEN
    v_text := v_text || v_target_count || ' replacement skill targets have been identified based on low-scoring items. ';
  ELSE
    v_text := v_text || 'No critical replacement targets identified at this time. ';
  END IF;
  v_text := v_text || 'Skill acquisition should be sequenced to address regulation, communication, and task engagement.';

  RETURN v_text;
END;
$$;

-- 8. NAP narrative v2
CREATE OR REPLACE FUNCTION public.nova_generate_nap_v2(
  p_session_id uuid,
  p_audience text DEFAULT 'clinical'
)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_primary text; v_secondary text;
  v_flags text;
  v_text text := '';
BEGIN
  SELECT result_label INTO v_primary
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'archetype'
  ORDER BY avg_score DESC NULLS LAST LIMIT 1;

  SELECT string_agg(result_label, ', ' ORDER BY avg_score DESC)
  INTO v_secondary
  FROM (
    SELECT result_label, avg_score
    FROM public.nova_assessment_results
    WHERE session_id = p_session_id AND result_scope = 'archetype'
    ORDER BY avg_score DESC NULLS LAST
    OFFSET 1 LIMIT 2
  ) s;

  SELECT string_agg(result_label, ', ') INTO v_flags
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'flag';

  v_text := 'CLINICAL SUMMARY' || E'\n';
  v_text := v_text || 'The student most closely aligns with the ' || coalesce(v_primary, 'mixed') || ' archetype. ';
  IF v_secondary IS NOT NULL THEN
    v_text := v_text || 'Secondary features include: ' || v_secondary || '. ';
  END IF;
  v_text := v_text || public.nova_get_snippets(p_session_id, 'profile_statement');

  v_text := v_text || E'\n\nARCHETYPE ANALYSIS' || E'\n';
  IF v_primary ILIKE '%Masker%' THEN
    v_text := v_text || 'Behavior may appear appropriate externally while requiring significant internal effort. This pattern increases risk for delayed collapse and burnout. ';
  END IF;
  IF v_primary ILIKE '%Externalizer%' THEN
    v_text := v_text || 'Distress is expressed through observable behavior, which may be misinterpreted as willful non-compliance. ';
  END IF;
  IF v_primary ILIKE '%Internalizer%' THEN
    v_text := v_text || 'Distress is managed internally through withdrawal and reduced visibility, which may result in under-identification of need. ';
  END IF;
  IF v_primary ILIKE '%Demand%' THEN
    v_text := v_text || 'Demand sensitivity and autonomy needs appear central to presentation. Direct instruction approaches may increase resistance. ';
  END IF;
  IF v_primary ILIKE '%Sensory%' THEN
    v_text := v_text || 'Sensory regulation drives much of the behavioral presentation. Environmental modifications may be as important as skill teaching. ';
  END IF;
  IF v_primary ILIKE '%Controlled%' THEN
    v_text := v_text || 'Performance appears structure-dependent, with skills that may not generalize without support scaffolding. ';
  END IF;
  IF v_primary ILIKE '%Dysregulated%' THEN
    v_text := v_text || 'Low regulation capacity and rapid escalation are central features. Regulation supports must precede skill demands. ';
  END IF;

  v_text := v_text || E'\n\nCLINICAL FLAGS' || E'\n';
  IF v_flags IS NOT NULL THEN
    v_text := v_text || 'Active flags: ' || v_flags || '. ';
  ELSE
    v_text := v_text || 'No clinical flags triggered at this time. ';
  END IF;
  v_text := v_text || public.nova_get_snippets(p_session_id, 'pattern_insight');

  v_text := v_text || E'\n\nCLINICAL RECOMMENDATIONS' || E'\n';
  v_text := v_text || 'Interpretation should consider internal experience in addition to observable behavior. ';
  IF v_primary ILIKE '%Masker%' OR v_primary ILIKE '%Internalizer%' THEN
    v_text := v_text || 'Reduce performance demands and monitor for post-demand collapse. ';
  END IF;
  IF v_primary ILIKE '%Dysregulated%' THEN
    v_text := v_text || 'Prioritize co-regulation and environmental supports before increasing behavioral expectations. ';
  END IF;

  RETURN v_text;
END;
$$;

-- 9. MCI narrative
CREATE OR REPLACE FUNCTION public.nova_generate_mci_v2(
  p_session_id uuid,
  p_audience text DEFAULT 'clinical'
)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_profile text; v_total numeric;
  v_flags text; v_text text := '';
BEGIN
  SELECT result_label INTO v_profile
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'profile' AND is_primary = true LIMIT 1;

  SELECT avg_score INTO v_total
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'total' LIMIT 1;

  SELECT string_agg(result_label, ', ') INTO v_flags
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'flag';

  v_text := 'CLINICAL SUMMARY' || E'\n';
  v_text := v_text || 'The student presents with a ' || coalesce(v_profile, 'mixed masking') || ' profile';
  IF v_total IS NOT NULL THEN
    v_text := v_text || ' (total score: ' || round(v_total, 0) || '/144)';
  END IF;
  v_text := v_text || '. ';

  IF v_total >= 96 THEN
    v_text := v_text || 'Results indicate a high masking profile with clinically significant compensatory behavior across multiple domains. ';
  ELSIF v_total >= 72 THEN
    v_text := v_text || 'Results indicate significant masking behavior that warrants clinical attention. ';
  ELSIF v_total >= 48 THEN
    v_text := v_text || 'Results indicate moderate masking patterns. ';
  END IF;

  v_text := v_text || E'\n\nCLINICAL FLAGS' || E'\n';
  IF v_flags IS NOT NULL THEN
    v_text := v_text || 'Active flags: ' || v_flags || '. ';
    IF v_flags ILIKE '%internalized%' THEN
      v_text := v_text || 'Elevated internal-external discrepancy and identity strain suggest clinically meaningful internalized distress that may not be readily observable. ';
    END IF;
    IF v_flags ILIKE '%burnout%' OR v_flags ILIKE '%exhausted%' THEN
      v_text := v_text || 'The pattern is consistent with an Exhausted Masker presentation characterized by high effort followed by post-demand fatigue. ';
    END IF;
  ELSE
    v_text := v_text || 'No clinical flags triggered. ';
  END IF;

  v_text := v_text || E'\n\nCLINICAL RECOMMENDATIONS' || E'\n';
  v_text := v_text || 'Assessment should consider the gap between observed performance and internal experience. ';
  IF v_total >= 72 THEN
    v_text := v_text || 'Reduce reliance on implied social expectations and confirm comprehension directly. Schedule decompression supports. ';
  END IF;

  RETURN v_text;
END;
$$;

-- 10. PTCE narrative
CREATE OR REPLACE FUNCTION public.nova_generate_ptce_v2(
  p_session_id uuid,
  p_audience text DEFAULT 'clinical'
)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_barrier text; v_tier text; v_fidelity text;
  v_total numeric; v_text text := '';
BEGIN
  SELECT result_label INTO v_barrier
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'profile' AND is_primary = true LIMIT 1;

  SELECT result_label INTO v_tier
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'tier' LIMIT 1;

  SELECT result_label INTO v_fidelity
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'fidelity_risk' LIMIT 1;

  SELECT avg_score INTO v_total
  FROM public.nova_assessment_results
  WHERE session_id = p_session_id AND result_scope = 'total' LIMIT 1;

  v_text := 'CLINICAL SUMMARY' || E'\n';
  v_text := v_text || 'Caregiver competency assessment indicates ';
  IF v_tier IS NOT NULL THEN v_text := v_text || 'a ' || v_tier || ' support level'; END IF;
  IF v_barrier IS NOT NULL THEN v_text := v_text || ' with a primary ' || v_barrier || ' barrier pattern'; END IF;
  v_text := v_text || '. ';

  IF v_total <= 60 THEN
    v_text := v_text || 'Findings indicate a barrier-first profile, suggesting intervention success depends on first addressing caregiver regulation, capacity, and feasibility before increasing procedural demands. ';
  ELSIF v_total <= 120 THEN
    v_text := v_text || 'Moderate support needs identified across multiple domains. Structured coaching with regular feedback is recommended. ';
  END IF;

  v_text := v_text || E'\n\nFIDELITY RISK' || E'\n';
  IF v_fidelity IS NOT NULL THEN
    v_text := v_text || 'Current fidelity risk level: ' || v_fidelity || '. ';
  END IF;

  IF v_barrier ILIKE '%cultural%' THEN
    v_text := v_text || E'\n\nCULTURAL CONTEXT' || E'\n';
    v_text := v_text || 'Implementation challenges appear to be influenced by partial misalignment between intervention style and caregiver values or discipline framework, rather than simple unwillingness. ';
  END IF;

  v_text := v_text || E'\n\nCLINICAL RECOMMENDATIONS' || E'\n';
  IF v_barrier ILIKE '%skill%' THEN
    v_text := v_text || 'Direct instruction with model-rehearse-feedback cycle. Simplify implementation steps. ';
  ELSIF v_barrier ILIKE '%capacity%' THEN
    v_text := v_text || 'Reduce number of active targets. Align goals to naturally occurring routines. Lower between-session demand load. ';
  ELSIF v_barrier ILIKE '%regulation%' THEN
    v_text := v_text || 'Address caregiver emotional regulation before increasing procedural expectations. ';
  END IF;

  RETURN v_text;
END;
$$;

-- 11. Master narrative dispatcher
CREATE OR REPLACE FUNCTION public.nova_generate_full_narrative(
  p_session_id uuid,
  p_audience text DEFAULT 'clinical'
)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE v_code text;
BEGIN
  SELECT a.code INTO v_code
  FROM public.nova_assessment_sessions s
  JOIN public.nova_assessments a ON a.id = s.assessment_id
  WHERE s.id = p_session_id;

  RETURN CASE v_code
    WHEN 'SBRDS' THEN public.nova_generate_sbrds_v2(p_session_id, p_audience)
    WHEN 'EFDP'  THEN public.nova_generate_efdp_v2(p_session_id, p_audience)
    WHEN 'ABRSE' THEN public.nova_generate_abrse_v2(p_session_id, p_audience)
    WHEN 'NAP'   THEN public.nova_generate_nap_v2(p_session_id, p_audience)
    WHEN 'MCI'   THEN public.nova_generate_mci_v2(p_session_id, p_audience)
    WHEN 'PTCE'  THEN public.nova_generate_ptce_v2(p_session_id, p_audience)
    ELSE 'No narrative available.'
  END;
END;
$$;

-- 12. Update assessment summary to use v2
CREATE OR REPLACE FUNCTION public.nova_generate_assessment_summary(p_session_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN public.nova_generate_full_narrative(p_session_id, 'clinical');
END;
$$;

-- 13. Upgraded recommendation generator
CREATE OR REPLACE FUNCTION public.nova_generate_recommendations_for_session(
  p_session_id uuid,
  p_setting_type text DEFAULT 'school'
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_student_id uuid;
  v_assessment_code text;
BEGIN
  SELECT s.student_id, a.code
  INTO v_student_id, v_assessment_code
  FROM public.nova_assessment_sessions s
  JOIN public.nova_assessments a ON a.id = s.assessment_id
  WHERE s.id = p_session_id;

  -- Clear previous suggestions (preserve accepted/edited/manual)
  DELETE FROM public.nova_generated_recommendations
  WHERE session_id = p_session_id AND status = 'suggested';

  -- ABRSE: generate from replacement targets
  IF v_assessment_code = 'ABRSE' THEN
    INSERT INTO public.nova_generated_recommendations (
      student_id, session_id, assessment_code, source_result_key,
      recommendation_type, setting_type, option_group, option_rank,
      title, generated_text, original_text, rationale_text
    )
    SELECT
      v_student_id, p_session_id, 'ABRSE', r.item_code,
      CASE WHEN p_setting_type = 'school' THEN 'iep_goal' ELSE 'aba_goal' END,
      p_setting_type, r.target_code, 1,
      r.target_label,
      CASE WHEN p_setting_type = 'school' THEN r.goal_template
           WHEN p_setting_type = 'aba' THEN
             'Given instruction and relevant establishing conditions, the student will demonstrate ' || lower(r.target_label) || ' in 80% of opportunities across 3 consecutive sessions.'
           ELSE r.goal_template
      END,
      r.goal_template,
      r.replacement_behavior
    FROM public.v_nova_abrse_recommendations r
    WHERE r.session_id = p_session_id;

    -- Also add strategy recommendations
    INSERT INTO public.nova_generated_recommendations (
      student_id, session_id, assessment_code, source_result_key,
      recommendation_type, setting_type, option_group, option_rank,
      title, generated_text, original_text, rationale_text
    )
    SELECT
      v_student_id, p_session_id, 'ABRSE', r.item_code,
      'teaching_strategy', p_setting_type, r.target_code, 2,
      r.target_label || ' - Strategy',
      r.strategy_template,
      r.strategy_template,
      r.replacement_behavior
    FROM public.v_nova_abrse_recommendations r
    WHERE r.session_id = p_session_id
      AND r.strategy_template IS NOT NULL;
  END IF;

  -- For other assessments: generate from low-scoring domains
  IF v_assessment_code IN ('SBRDS', 'EFDP', 'NAP', 'MCI', 'PTCE') THEN
    INSERT INTO public.nova_generated_recommendations (
      student_id, session_id, assessment_code, source_result_key,
      recommendation_type, setting_type, option_group, option_rank,
      title, generated_text, original_text, rationale_text
    )
    SELECT
      v_student_id, p_session_id, v_assessment_code, r.result_key,
      CASE WHEN p_setting_type = 'school' THEN 'accommodation' ELSE 'teaching_strategy' END,
      p_setting_type, r.result_key, 1,
      r.result_label || ' Support',
      'Address ' || lower(r.result_label) || ' through targeted intervention aligned with the ' || coalesce(r.band_label, 'identified') || ' support level.',
      'Address ' || lower(r.result_label) || ' through targeted intervention.',
      'Domain score of ' || round(coalesce(r.avg_score, 0), 2) || ' indicates ' || coalesce(r.band_label, 'area of need') || '.'
    FROM public.nova_assessment_results r
    WHERE r.session_id = p_session_id
      AND r.result_scope = 'domain'
      AND r.avg_score < 1.75;
  END IF;
END;
$$;
