
-- =====================================================
-- VINELAND-3 MODULE: COMPLETE DATABASE SCHEMA
-- =====================================================

-- 1. Form Types
CREATE TABLE public.vineland3_form_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key TEXT NOT NULL UNIQUE,
  form_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Domains
CREATE TABLE public.vineland3_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_key TEXT NOT NULL UNIQUE,
  domain_name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Subdomains
CREATE TABLE public.vineland3_subdomains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES public.vineland3_domains(id) ON DELETE CASCADE,
  subdomain_key TEXT NOT NULL UNIQUE,
  subdomain_name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Items
CREATE TABLE public.vineland3_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES public.vineland3_domains(id) ON DELETE CASCADE,
  subdomain_id UUID NOT NULL REFERENCES public.vineland3_subdomains(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL UNIQUE,
  item_number INT NOT NULL,
  display_label TEXT NOT NULL,
  internal_label TEXT,
  prompt_draft TEXT,
  response_type TEXT NOT NULL DEFAULT 'ordinal_score',
  score_min INT NOT NULL DEFAULT 0,
  score_max INT NOT NULL DEFAULT 2,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version_tag TEXT NOT NULL DEFAULT 'v1_seed',
  applies_to_forms TEXT[] DEFAULT ARRAY['comprehensive_interview','parent_caregiver','teacher'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Student Assessments
CREATE TABLE public.vineland3_student_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  form_key TEXT NOT NULL REFERENCES public.vineland3_form_types(form_key),
  template_version_snapshot TEXT NOT NULL DEFAULT 'v1_seed',
  status TEXT NOT NULL DEFAULT 'draft',
  assessor_name TEXT,
  assessor_user_id UUID,
  respondent_name TEXT,
  respondent_relationship TEXT,
  administration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  date_started TIMESTAMPTZ DEFAULT now(),
  date_completed TIMESTAMPTZ,
  chronological_age_months INT,
  chronological_age_display TEXT,
  age_band_key TEXT,
  notes TEXT,
  locked_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Item Scores
CREATE TABLE public.vineland3_item_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_assessment_id UUID NOT NULL REFERENCES public.vineland3_student_assessments(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.vineland3_items(id),
  item_code_snapshot TEXT NOT NULL,
  item_number_snapshot INT NOT NULL,
  domain_key_snapshot TEXT NOT NULL,
  subdomain_key_snapshot TEXT NOT NULL,
  display_label_snapshot TEXT NOT NULL,
  entered_score INT,
  response_note TEXT,
  entered_by UUID,
  entered_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_assessment_id, item_id)
);

-- 7. Raw Scores
CREATE TABLE public.vineland3_raw_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_assessment_id UUID NOT NULL REFERENCES public.vineland3_student_assessments(id) ON DELETE CASCADE,
  domain_key TEXT NOT NULL,
  subdomain_key TEXT NOT NULL,
  raw_score INT,
  items_scored INT NOT NULL DEFAULT 0,
  items_missing INT NOT NULL DEFAULT 0,
  completion_status TEXT NOT NULL DEFAULT 'incomplete',
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_assessment_id, subdomain_key)
);

-- 8. Norm Lookup - Subdomains
CREATE TABLE public.vineland3_norm_lookup_subdomains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key TEXT NOT NULL,
  age_band_key TEXT NOT NULL,
  subdomain_key TEXT NOT NULL,
  raw_score INT NOT NULL,
  v_scale_score INT,
  age_equivalent TEXT,
  gsv INT,
  adaptive_level TEXT,
  source_version TEXT DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_v3_norm_sub ON public.vineland3_norm_lookup_subdomains(form_key, age_band_key, subdomain_key, raw_score) WHERE is_active = true;

-- 9. Norm Lookup - Domains
CREATE TABLE public.vineland3_norm_lookup_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key TEXT NOT NULL,
  age_band_key TEXT NOT NULL,
  domain_key TEXT NOT NULL,
  vscale_sum INT NOT NULL,
  standard_score INT,
  percentile INT,
  adaptive_level TEXT,
  source_version TEXT DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_v3_norm_dom ON public.vineland3_norm_lookup_domains(form_key, age_band_key, domain_key, vscale_sum) WHERE is_active = true;

-- 10. Norm Lookup - Composites
CREATE TABLE public.vineland3_norm_lookup_composites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key TEXT NOT NULL,
  age_band_key TEXT NOT NULL,
  composite_key TEXT NOT NULL DEFAULT 'adaptive_behavior_composite',
  lookup_key INT NOT NULL,
  standard_score INT,
  percentile INT,
  adaptive_level TEXT,
  source_version TEXT DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_v3_norm_comp ON public.vineland3_norm_lookup_composites(form_key, age_band_key, composite_key, lookup_key) WHERE is_active = true;

-- 11. Derived Scores
CREATE TABLE public.vineland3_derived_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_assessment_id UUID NOT NULL REFERENCES public.vineland3_student_assessments(id) ON DELETE CASCADE,
  score_level TEXT NOT NULL,
  domain_key TEXT NOT NULL DEFAULT '',
  subdomain_key TEXT NOT NULL DEFAULT '',
  composite_key TEXT NOT NULL DEFAULT '',
  raw_score INT,
  v_scale_score INT,
  standard_score INT,
  percentile INT,
  adaptive_level TEXT,
  age_equivalent TEXT,
  gsv INT,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_assessment_id, score_level, domain_key, subdomain_key, composite_key)
);

-- 12. Report Outputs
CREATE TABLE public.vineland3_report_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_assessment_id UUID NOT NULL REFERENCES public.vineland3_student_assessments(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'standard',
  summary_text TEXT,
  strengths_text TEXT,
  needs_text TEXT,
  recommendations_text TEXT,
  functional_implications_text TEXT,
  score_summary_json JSONB,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID
);

-- 13. Goal Crosswalks
CREATE TABLE public.vineland3_goal_crosswalks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_key TEXT NOT NULL,
  subdomain_key TEXT,
  score_band TEXT NOT NULL,
  recommendation_type TEXT DEFAULT 'programming',
  recommended_library TEXT,
  recommended_program_area TEXT,
  recommended_tags TEXT[],
  recommendation_text TEXT,
  priority_level INT DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Exports
CREATE TABLE public.vineland3_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_assessment_id UUID NOT NULL REFERENCES public.vineland3_student_assessments(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL DEFAULT 'pdf',
  export_status TEXT NOT NULL DEFAULT 'pending',
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS on ALL tables
ALTER TABLE public.vineland3_form_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_subdomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_student_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_item_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_raw_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_norm_lookup_subdomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_norm_lookup_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_norm_lookup_composites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_derived_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_report_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_goal_crosswalks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_exports ENABLE ROW LEVEL SECURITY;

-- RLS: Reference tables - authenticated SELECT, admin mutations
CREATE POLICY "v3_form_types_sel" ON public.vineland3_form_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_form_types_mut" ON public.vineland3_form_types FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "v3_domains_sel" ON public.vineland3_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_domains_mut" ON public.vineland3_domains FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "v3_subdomains_sel" ON public.vineland3_subdomains FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_subdomains_mut" ON public.vineland3_subdomains FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "v3_items_sel" ON public.vineland3_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_items_mut" ON public.vineland3_items FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS: Student-scoped tables
CREATE POLICY "v3_assessments_access" ON public.vineland3_student_assessments FOR ALL TO authenticated USING (public.has_student_access(student_id, auth.uid()));
CREATE POLICY "v3_item_scores_access" ON public.vineland3_item_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vineland3_student_assessments sa WHERE sa.id = student_assessment_id AND public.has_student_access(sa.student_id, auth.uid())));
CREATE POLICY "v3_raw_scores_access" ON public.vineland3_raw_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vineland3_student_assessments sa WHERE sa.id = student_assessment_id AND public.has_student_access(sa.student_id, auth.uid())));
CREATE POLICY "v3_derived_access" ON public.vineland3_derived_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vineland3_student_assessments sa WHERE sa.id = student_assessment_id AND public.has_student_access(sa.student_id, auth.uid())));
CREATE POLICY "v3_reports_access" ON public.vineland3_report_outputs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vineland3_student_assessments sa WHERE sa.id = student_assessment_id AND public.has_student_access(sa.student_id, auth.uid())));
CREATE POLICY "v3_exports_access" ON public.vineland3_exports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vineland3_student_assessments sa WHERE sa.id = student_assessment_id AND public.has_student_access(sa.student_id, auth.uid())));

-- RLS: Norm/crosswalk tables
CREATE POLICY "v3_norm_sub_sel" ON public.vineland3_norm_lookup_subdomains FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_norm_sub_mut" ON public.vineland3_norm_lookup_subdomains FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "v3_norm_dom_sel" ON public.vineland3_norm_lookup_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_norm_dom_mut" ON public.vineland3_norm_lookup_domains FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "v3_norm_comp_sel" ON public.vineland3_norm_lookup_composites FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_norm_comp_mut" ON public.vineland3_norm_lookup_composites FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "v3_crosswalks_sel" ON public.vineland3_goal_crosswalks FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_crosswalks_mut" ON public.vineland3_goal_crosswalks FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
