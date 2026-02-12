
-- Create payer_report_templates table
CREATE TABLE public.payer_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  payer_ids text[] DEFAULT '{}',
  payer_names text[] DEFAULT '{}',
  report_type text NOT NULL CHECK (report_type IN ('initial_assessment', 'progress_report')),
  is_default boolean DEFAULT false,
  sections jsonb NOT NULL DEFAULT '[]',
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payer_report_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read all templates (org-wide), admins can manage
CREATE POLICY "Authenticated users can view templates"
  ON public.payer_report_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert templates"
  ON public.payer_report_templates FOR INSERT
  TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update templates"
  ON public.payer_report_templates FOR UPDATE
  TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete templates"
  ON public.payer_report_templates FOR DELETE
  TO authenticated USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_payer_report_templates_updated_at
  BEFORE UPDATE ON public.payer_report_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed HC General Template (DEFAULT) - Initial Assessment
INSERT INTO public.payer_report_templates (name, payer_ids, payer_names, report_type, is_default, sections) VALUES
('HC General Template', '{}', '{}', 'initial_assessment', true, '[
  {"key":"background_methodology","title":"Background & Methodology","enabled":true,"fields":[{"key":"referral_source","label":"Referral Source","type":"text"},{"key":"assessment_dates","label":"Assessment Dates","type":"text"},{"key":"methodology","label":"Methodology Description","type":"textarea"}]},
  {"key":"developmental_history","title":"Developmental History","enabled":true,"fields":[{"key":"milestones","label":"Developmental Milestones","type":"textarea"},{"key":"concerns","label":"Areas of Concern","type":"textarea"}]},
  {"key":"family_constellation","title":"Family Constellation","enabled":true,"fields":[{"key":"family_members","label":"Family Members","type":"textarea"},{"key":"living_situation","label":"Living Situation","type":"textarea"}]},
  {"key":"birth_medical_history","title":"Birth & Medical History","enabled":true,"fields":[{"key":"birth_history","label":"Birth History","type":"textarea"},{"key":"medical_conditions","label":"Medical Conditions","type":"textarea"},{"key":"medications","label":"Current Medications","type":"textarea"}]},
  {"key":"review_of_records","title":"Review of Records","enabled":true,"fields":[{"key":"records_reviewed","label":"Records Reviewed","type":"textarea"}]},
  {"key":"preference_assessment","title":"Preference Assessment","enabled":true,"fields":[{"key":"preferred_items","label":"Preferred Items/Activities","type":"textarea"},{"key":"assessment_method","label":"Assessment Method","type":"text"}]},
  {"key":"developmental_assessment","title":"Developmental Assessment (Vineland)","enabled":true,"fields":[{"key":"vineland_scores","label":"Vineland Scores","type":"textarea","auto_populate":"vineland"},{"key":"interpretation","label":"Interpretation","type":"textarea"}]},
  {"key":"vbmapp_results","title":"VB-MAPP Results","enabled":true,"fields":[{"key":"vbmapp_milestones","label":"Milestone Scores","type":"textarea","auto_populate":"vbmapp"},{"key":"vbmapp_barriers","label":"Barriers Assessment","type":"textarea"}]},
  {"key":"behavior_reduction_goals","title":"Behavior Reduction Goals","enabled":true,"fields":[{"key":"target_behaviors","label":"Target Behaviors","type":"textarea","auto_populate":"behaviors"},{"key":"functions","label":"Hypothesized Functions","type":"textarea"},{"key":"interventions","label":"Recommended Interventions","type":"textarea"}]},
  {"key":"skill_acquisition_goals","title":"Skill Acquisition Goals","enabled":true,"fields":[{"key":"goals","label":"Proposed Goals","type":"textarea","auto_populate":"skill_goals"}]},
  {"key":"recommendations","title":"Recommendations","enabled":true,"fields":[{"key":"recommended_hours","label":"Recommended Hours","type":"text"},{"key":"service_recommendations","label":"Service Recommendations","type":"textarea"}]},
  {"key":"signatures","title":"Signatures","enabled":true,"fields":[{"key":"clinician_name","label":"Clinician Name","type":"text","auto_populate":"clinician"},{"key":"credentials","label":"Credentials","type":"text"},{"key":"date","label":"Date","type":"date"}]}
]');

-- Seed HC General Template (DEFAULT) - Progress Report
INSERT INTO public.payer_report_templates (name, payer_ids, payer_names, report_type, is_default, sections) VALUES
('HC General Template', '{}', '{}', 'progress_report', true, '[
  {"key":"background_methodology","title":"Background & Methodology","enabled":true,"fields":[{"key":"report_period","label":"Report Period","type":"text"},{"key":"sessions_attended","label":"Sessions Attended","type":"text","auto_populate":"session_count"}]},
  {"key":"review_of_records","title":"Review of Records","enabled":true,"fields":[{"key":"records_reviewed","label":"Records Reviewed","type":"textarea"}]},
  {"key":"developmental_assessment","title":"Developmental Assessment (Vineland)","enabled":true,"fields":[{"key":"vineland_scores","label":"Current Vineland Scores","type":"textarea","auto_populate":"vineland"},{"key":"comparison","label":"Comparison to Baseline","type":"textarea"}]},
  {"key":"vbmapp_results","title":"VB-MAPP Results","enabled":true,"fields":[{"key":"vbmapp_milestones","label":"Current Milestone Scores","type":"textarea","auto_populate":"vbmapp"},{"key":"progress","label":"Progress Summary","type":"textarea"}]},
  {"key":"behavior_reduction_goals","title":"Behavior Reduction Goals","enabled":true,"fields":[{"key":"target_behaviors","label":"Target Behaviors","type":"textarea","auto_populate":"behaviors"},{"key":"data_summary","label":"Data Summary","type":"textarea"},{"key":"progress_status","label":"Progress Status","type":"text"}]},
  {"key":"skill_acquisition_goals","title":"Skill Acquisition Goals","enabled":true,"fields":[{"key":"goals","label":"Current Goals & Progress","type":"textarea","auto_populate":"skill_goals"}]},
  {"key":"recommendations","title":"Recommendations","enabled":true,"fields":[{"key":"continued_services","label":"Continued Services","type":"textarea"},{"key":"modifications","label":"Treatment Modifications","type":"textarea"}]},
  {"key":"signatures","title":"Signatures","enabled":true,"fields":[{"key":"clinician_name","label":"Clinician Name","type":"text","auto_populate":"clinician"},{"key":"credentials","label":"Credentials","type":"text"},{"key":"date","label":"Date","type":"date"}]}
]');

-- Seed L.A. Care Template - Initial Assessment
INSERT INTO public.payer_report_templates (name, payer_ids, payer_names, report_type, is_default, sections) VALUES
('L.A. Care Template', '{}', '{"L.A. Care Health Plan"}', 'initial_assessment', false, '[
  {"key":"identifying_info","title":"I. IDENTIFYING INFORMATION","enabled":true,"fields":[{"key":"patient_name","label":"Patient Last/First Name","type":"text","required":true,"auto_populate":"student_name"},{"key":"dob","label":"Date of Birth","type":"date","required":true,"auto_populate":"student_dob"},{"key":"medical_id","label":"Medical ID #","type":"text"},{"key":"health_plan","label":"Health Plan Name","type":"text","prefill":"L.A. Care Health Plan"},{"key":"pcp","label":"Primary Care Physician","type":"text"},{"key":"referring_physician","label":"Referring Physician","type":"text"},{"key":"referral_date","label":"Date of Referral","type":"date"},{"key":"initial_contact_date","label":"Date of Initial Contact","type":"date"},{"key":"assessment_date","label":"Date of Assessment","type":"date"},{"key":"timeline_compliance","label":"10-Day Timeline Met","type":"text"}]},
  {"key":"reason_for_referral","title":"II. REASON FOR REFERRAL","enabled":true,"fields":[{"key":"referral_reason","label":"Reason for Referral","type":"textarea"},{"key":"diagnosis","label":"Diagnosis","type":"text","auto_populate":"diagnosis"},{"key":"referral_concerns","label":"Specific Concerns","type":"textarea"}]},
  {"key":"background_info","title":"III. BACKGROUND INFORMATION","enabled":true,"fields":[{"key":"family_structure","label":"Family Structure","type":"textarea"},{"key":"availability","label":"Family Availability","type":"textarea"},{"key":"health_history","label":"Health History","type":"textarea"},{"key":"school_history","label":"School History","type":"textarea"},{"key":"care_coordination","label":"Care Coordination","type":"textarea"}]},
  {"key":"clinical_interview","title":"IV. CLINICAL INTERVIEW","enabled":true,"fields":[{"key":"interview_summary","label":"Interview Summary","type":"textarea"},{"key":"caregiver_concerns","label":"Caregiver Concerns","type":"textarea"}]},
  {"key":"direct_assessment","title":"V. DIRECT ASSESSMENT PROCEDURES","enabled":true,"fields":[{"key":"assessment_tools","label":"Assessment Tools Used","type":"textarea"},{"key":"observations","label":"Direct Observations","type":"textarea"}]},
  {"key":"preference_assessment","title":"VI. PREFERENCE ASSESSMENT","enabled":true,"fields":[{"key":"preferred_items","label":"Preferred Items/Activities","type":"textarea"},{"key":"method","label":"Assessment Method","type":"text"}]},
  {"key":"outcome_measurements","title":"VII. OUTCOME MEASUREMENTS","enabled":true,"fields":[{"key":"vineland_scores","label":"Vineland Scores","type":"textarea","auto_populate":"vineland"},{"key":"vbmapp_scores","label":"VB-MAPP Scores","type":"textarea","auto_populate":"vbmapp"},{"key":"other_assessments","label":"Other Assessment Results","type":"textarea"}]},
  {"key":"measurable_goals","title":"VIII. MEASURABLE GOALS BY DOMAIN","enabled":true,"fields":[{"key":"communication_goals","label":"Communication Goals","type":"textarea"},{"key":"learning_skills_goals","label":"Learning Skills Goals","type":"textarea"},{"key":"daily_living_goals","label":"Daily Living Goals","type":"textarea"},{"key":"social_play_goals","label":"Social/Community/Play Goals","type":"textarea"}]},
  {"key":"problem_behaviors","title":"IX. PROBLEM BEHAVIORS","enabled":true,"fields":[{"key":"target_behaviors","label":"Target Behaviors","type":"textarea","auto_populate":"behaviors"},{"key":"operational_definitions","label":"Operational Definitions","type":"textarea"},{"key":"functions","label":"Functions of Behavior","type":"textarea"},{"key":"intervention_strategies","label":"Intervention Strategies","type":"textarea"}]},
  {"key":"treatment_recommendations","title":"X. TREATMENT RECOMMENDATIONS","enabled":true,"fields":[{"key":"recommended_hours","label":"Recommended Weekly Hours","type":"text"},{"key":"service_type","label":"Service Type","type":"text"},{"key":"treatment_plan","label":"Treatment Plan Summary","type":"textarea"}]},
  {"key":"signatures","title":"XI. SIGNATURES","enabled":true,"fields":[{"key":"clinician_name","label":"Clinician Name","type":"text","auto_populate":"clinician"},{"key":"credentials","label":"Credentials","type":"text"},{"key":"license_number","label":"License/Certification #","type":"text"},{"key":"date","label":"Date","type":"date"}]}
]');

-- Seed L.A. Care Template - Progress Report
INSERT INTO public.payer_report_templates (name, payer_ids, payer_names, report_type, is_default, sections) VALUES
('L.A. Care Template', '{}', '{"L.A. Care Health Plan"}', 'progress_report', false, '[
  {"key":"identifying_info","title":"I. IDENTIFYING INFORMATION","enabled":true,"fields":[{"key":"patient_name","label":"Patient Last/First Name","type":"text","required":true,"auto_populate":"student_name"},{"key":"dob","label":"Date of Birth","type":"date","required":true,"auto_populate":"student_dob"},{"key":"medical_id","label":"Medical ID #","type":"text"},{"key":"health_plan","label":"Health Plan Name","type":"text","prefill":"L.A. Care Health Plan"},{"key":"report_period","label":"Report Period","type":"text"}]},
  {"key":"treatment_summary","title":"II. TREATMENT SUMMARY","enabled":true,"fields":[{"key":"sessions_attended","label":"Sessions Attended","type":"text","auto_populate":"session_count"},{"key":"treatment_hours","label":"Total Treatment Hours","type":"text"},{"key":"progress_overview","label":"Progress Overview","type":"textarea"}]},
  {"key":"outcome_measurements","title":"III. OUTCOME MEASUREMENTS","enabled":true,"fields":[{"key":"vineland_scores","label":"Current Vineland Scores","type":"textarea","auto_populate":"vineland"},{"key":"vbmapp_scores","label":"Current VB-MAPP Scores","type":"textarea","auto_populate":"vbmapp"}]},
  {"key":"goal_progress","title":"IV. GOAL PROGRESS BY DOMAIN","enabled":true,"fields":[{"key":"communication_progress","label":"Communication Goals Progress","type":"textarea"},{"key":"learning_progress","label":"Learning Skills Progress","type":"textarea"},{"key":"daily_living_progress","label":"Daily Living Progress","type":"textarea"},{"key":"social_progress","label":"Social/Play Progress","type":"textarea"}]},
  {"key":"behavior_progress","title":"V. BEHAVIOR REDUCTION PROGRESS","enabled":true,"fields":[{"key":"behavior_data","label":"Behavior Data Summary","type":"textarea","auto_populate":"behaviors"},{"key":"trends","label":"Trends","type":"textarea"}]},
  {"key":"recommendations","title":"VI. RECOMMENDATIONS","enabled":true,"fields":[{"key":"continued_services","label":"Continued Services","type":"textarea"},{"key":"modifications","label":"Treatment Modifications","type":"textarea"}]},
  {"key":"signatures","title":"VII. SIGNATURES","enabled":true,"fields":[{"key":"clinician_name","label":"Clinician Name","type":"text","auto_populate":"clinician"},{"key":"credentials","label":"Credentials","type":"text"},{"key":"date","label":"Date","type":"date"}]}
]');

-- Seed CalOptima Template - Initial Assessment
INSERT INTO public.payer_report_templates (name, payer_ids, payer_names, report_type, is_default, sections) VALUES
('CalOptima Template', '{}', '{"CalOptima","Regional Center"}', 'initial_assessment', false, '[
  {"key":"identification","title":"IDENTIFICATION","enabled":true,"fields":[{"key":"patient_name","label":"Patient Name","type":"text","required":true,"auto_populate":"student_name"},{"key":"dob","label":"Date of Birth","type":"date","auto_populate":"student_dob"},{"key":"cin","label":"CIN #","type":"text"},{"key":"tax_id","label":"Tax ID","type":"text"},{"key":"npi","label":"NPI","type":"text"},{"key":"diagnosis","label":"Diagnosis","type":"text","auto_populate":"diagnosis"}]},
  {"key":"session_info","title":"SESSION INFORMATION","enabled":true,"fields":[{"key":"cpt_utilization","label":"CPT Code Utilization","type":"textarea"},{"key":"session_frequency","label":"Session Frequency","type":"text"}]},
  {"key":"school_info","title":"SCHOOL INFORMATION","enabled":true,"fields":[{"key":"school_name","label":"School Name","type":"text"},{"key":"grade","label":"Grade","type":"text"},{"key":"teacher","label":"Teacher","type":"text"},{"key":"iep_status","label":"IEP Status","type":"text"}]},
  {"key":"medical_info","title":"MEDICAL INFORMATION","enabled":true,"fields":[{"key":"medical_conditions","label":"Medical Conditions","type":"textarea"},{"key":"medications","label":"Medications","type":"textarea"}]},
  {"key":"coordination_of_care","title":"COORDINATION OF CARE","enabled":true,"fields":[{"key":"other_providers","label":"Other Providers","type":"textarea"},{"key":"coordination_notes","label":"Coordination Notes","type":"textarea"}]},
  {"key":"adaptive_testing","title":"ADAPTIVE TESTING (VINELAND-3)","enabled":true,"fields":[{"key":"vineland_scores","label":"Vineland-3 Scores","type":"textarea","auto_populate":"vineland"},{"key":"interpretation","label":"Interpretation","type":"textarea"}]},
  {"key":"dsm_v","title":"DSM-V","enabled":true,"fields":[{"key":"diagnosis_code","label":"Diagnosis Code","type":"text","auto_populate":"diagnosis"},{"key":"diagnostic_criteria","label":"Diagnostic Criteria Met","type":"textarea"}]},
  {"key":"target_behavior_goals","title":"TARGET BEHAVIOR GOALS","enabled":true,"fields":[{"key":"behaviors","label":"Target Behaviors & Data","type":"textarea","auto_populate":"behaviors"},{"key":"graphs","label":"Behavior Graphs","type":"textarea"}]},
  {"key":"skill_acquisition_goals","title":"SKILL ACQUISITION GOALS BY INTERVENTION AREA","enabled":true,"fields":[{"key":"goals","label":"Goals by Area","type":"textarea","auto_populate":"skill_goals"}]},
  {"key":"parent_caregiver_goals","title":"PARENT/CAREGIVER GOALS","enabled":true,"fields":[{"key":"caregiver_goals","label":"Caregiver Training Goals","type":"textarea"}]},
  {"key":"report_summary","title":"REPORT SUMMARY","enabled":true,"fields":[{"key":"summary","label":"Summary","type":"textarea"}]},
  {"key":"treatment_recommendations","title":"TREATMENT RECOMMENDATIONS","enabled":true,"fields":[{"key":"recommended_hours","label":"Recommended Hours","type":"text"},{"key":"recommendations","label":"Recommendations","type":"textarea"}]}
]');

-- Seed CalOptima Template - Progress Report
INSERT INTO public.payer_report_templates (name, payer_ids, payer_names, report_type, is_default, sections) VALUES
('CalOptima Template', '{}', '{"CalOptima","Regional Center"}', 'progress_report', false, '[
  {"key":"identification","title":"IDENTIFICATION","enabled":true,"fields":[{"key":"patient_name","label":"Patient Name","type":"text","required":true,"auto_populate":"student_name"},{"key":"dob","label":"Date of Birth","type":"date","auto_populate":"student_dob"},{"key":"cin","label":"CIN #","type":"text"},{"key":"report_period","label":"Report Period","type":"text"}]},
  {"key":"session_info","title":"SESSION INFORMATION","enabled":true,"fields":[{"key":"cpt_utilization","label":"CPT Code Utilization Table","type":"textarea"},{"key":"sessions_attended","label":"Sessions Attended","type":"text","auto_populate":"session_count"}]},
  {"key":"barriers_to_progress","title":"BARRIERS TO PROGRESS","enabled":true,"fields":[{"key":"barriers","label":"Barriers Identified","type":"textarea"}]},
  {"key":"adaptive_testing","title":"ADAPTIVE TESTING (VINELAND-3)","enabled":true,"fields":[{"key":"vineland_scores","label":"Current Vineland-3 Scores","type":"textarea","auto_populate":"vineland"},{"key":"comparison","label":"Comparison to Baseline","type":"textarea"}]},
  {"key":"target_behavior_goals","title":"TARGET BEHAVIOR GOALS","enabled":true,"fields":[{"key":"behavior_data","label":"Behavior Data & Trends","type":"textarea","auto_populate":"behaviors"},{"key":"graphs","label":"Behavior Graphs","type":"textarea"}]},
  {"key":"skill_acquisition_goals","title":"SKILL ACQUISITION GOALS BY INTERVENTION AREA","enabled":true,"fields":[{"key":"goals_progress","label":"Goals Progress","type":"textarea","auto_populate":"skill_goals"}]},
  {"key":"parent_caregiver_goals","title":"PARENT/CAREGIVER GOALS","enabled":true,"fields":[{"key":"caregiver_progress","label":"Caregiver Training Progress","type":"textarea"}]},
  {"key":"report_summary","title":"REPORT SUMMARY","enabled":true,"fields":[{"key":"summary","label":"Summary","type":"textarea"}]},
  {"key":"treatment_recommendations","title":"TREATMENT RECOMMENDATIONS","enabled":true,"fields":[{"key":"continued_hours","label":"Continued Hours","type":"text"},{"key":"recommendations","label":"Recommendations","type":"textarea"}]}
]');

-- Seed Cigna/Commercial Template - Initial Assessment
INSERT INTO public.payer_report_templates (name, payer_ids, payer_names, report_type, is_default, sections) VALUES
('Cigna/Commercial Template', '{}', '{"Cigna","Commercial Plans"}', 'initial_assessment', false, '[
  {"key":"reason_for_referral","title":"Reason for Referral","enabled":true,"fields":[{"key":"referral_reason","label":"Reason for Referral","type":"textarea"},{"key":"diagnosis","label":"Diagnosis","type":"text","auto_populate":"diagnosis"}]},
  {"key":"background_methodology","title":"Background & Methodology","enabled":true,"fields":[{"key":"background","label":"Background","type":"textarea"},{"key":"methodology","label":"Assessment Methodology","type":"textarea"}]},
  {"key":"developmental_history","title":"Developmental History","enabled":true,"fields":[{"key":"milestones","label":"Developmental Milestones","type":"textarea"},{"key":"concerns","label":"Areas of Concern","type":"textarea"}]},
  {"key":"birth_medical","title":"Birth & Medical History","enabled":true,"fields":[{"key":"birth_history","label":"Birth History","type":"textarea"},{"key":"medical_history","label":"Medical History","type":"textarea"},{"key":"medications","label":"Medications","type":"textarea"}]},
  {"key":"aba_treatment_history","title":"ABA Treatment History","enabled":true,"fields":[{"key":"previous_aba","label":"Previous ABA Services","type":"textarea"},{"key":"duration","label":"Duration of Services","type":"text"}]},
  {"key":"other_services","title":"Other Services","enabled":true,"fields":[{"key":"services","label":"Other Therapeutic Services","type":"textarea"}]},
  {"key":"review_of_records","title":"Review of Records","enabled":true,"fields":[{"key":"records","label":"Records Reviewed","type":"textarea"}]},
  {"key":"preference_assessment","title":"Preference Assessment","enabled":true,"fields":[{"key":"preferred_items","label":"Preferred Items/Activities","type":"textarea"},{"key":"method","label":"Method","type":"text"}]},
  {"key":"developmental_assessment","title":"Developmental Assessment","enabled":true,"fields":[{"key":"vineland_scores","label":"Vineland Scores","type":"textarea","auto_populate":"vineland"},{"key":"pddbi_scores","label":"PDD-BI Scores","type":"textarea"},{"key":"srs2_scores","label":"SRS-2 Scores","type":"textarea"}]},
  {"key":"vbmapp_milestones","title":"VB-MAPP Milestones","enabled":true,"fields":[{"key":"milestone_grid","label":"Milestone Grid Scores","type":"textarea","auto_populate":"vbmapp"},{"key":"barriers","label":"Barriers Assessment","type":"textarea"}]},
  {"key":"behavior_reduction_goals","title":"Behavior Reduction Goals","enabled":true,"fields":[{"key":"behaviors","label":"Target Behaviors","type":"textarea","auto_populate":"behaviors"},{"key":"definitions","label":"Operational Definitions","type":"textarea"},{"key":"baselines","label":"Baseline Data","type":"textarea"},{"key":"functions","label":"Functions","type":"textarea"},{"key":"interventions","label":"Interventions","type":"textarea"}]},
  {"key":"skill_acquisition_goals","title":"Skill Acquisition Goals","enabled":true,"fields":[{"key":"goals","label":"Proposed Goals","type":"textarea","auto_populate":"skill_goals"}]},
  {"key":"recommendations","title":"Recommendations","enabled":true,"fields":[{"key":"recommended_hours","label":"Recommended Hours","type":"text"},{"key":"service_recommendations","label":"Service Recommendations","type":"textarea"}]}
]');

-- Seed Cigna/Commercial Template - Progress Report
INSERT INTO public.payer_report_templates (name, payer_ids, payer_names, report_type, is_default, sections) VALUES
('Cigna/Commercial Template', '{}', '{"Cigna","Commercial Plans"}', 'progress_report', false, '[
  {"key":"treatment_summary","title":"Treatment Summary","enabled":true,"fields":[{"key":"report_period","label":"Report Period","type":"text"},{"key":"sessions_attended","label":"Sessions Attended","type":"text","auto_populate":"session_count"},{"key":"treatment_hours","label":"Treatment Hours","type":"text"}]},
  {"key":"developmental_assessment","title":"Developmental Assessment Update","enabled":true,"fields":[{"key":"vineland_scores","label":"Current Vineland Scores","type":"textarea","auto_populate":"vineland"},{"key":"comparison","label":"Comparison to Baseline","type":"textarea"}]},
  {"key":"vbmapp_progress","title":"VB-MAPP Progress","enabled":true,"fields":[{"key":"current_scores","label":"Current Scores","type":"textarea","auto_populate":"vbmapp"},{"key":"progress","label":"Progress Summary","type":"textarea"}]},
  {"key":"behavior_reduction_progress","title":"Behavior Reduction Progress","enabled":true,"fields":[{"key":"behavior_data","label":"Current Behavior Data","type":"textarea","auto_populate":"behaviors"},{"key":"trends","label":"Trends & Analysis","type":"textarea"},{"key":"intervention_updates","label":"Intervention Updates","type":"textarea"}]},
  {"key":"skill_acquisition_progress","title":"Skill Acquisition Progress","enabled":true,"fields":[{"key":"goals_progress","label":"Goals Progress","type":"textarea","auto_populate":"skill_goals"}]},
  {"key":"recommendations","title":"Recommendations","enabled":true,"fields":[{"key":"continued_services","label":"Continued Services","type":"textarea"},{"key":"modifications","label":"Treatment Modifications","type":"textarea"},{"key":"recommended_hours","label":"Recommended Hours","type":"text"}]}
]');
