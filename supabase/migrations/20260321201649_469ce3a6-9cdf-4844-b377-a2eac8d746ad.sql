
CREATE TABLE public.bops_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id text UNIQUE NOT NULL,
  display_name text NOT NULL,
  aka_archetype text,
  clinical_description text,
  sort_order int DEFAULT 0,
  is_meta boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_archetypes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype text UNIQUE NOT NULL,
  clinical_name text NOT NULL,
  linked_domain text REFERENCES public.bops_domains(domain_id),
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_constellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  constellation_id text UNIQUE NOT NULL,
  domain_a text NOT NULL REFERENCES public.bops_domains(domain_id),
  domain_b text NOT NULL REFERENCES public.bops_domains(domain_id),
  archetype_a text NOT NULL,
  archetype_b text NOT NULL,
  training_name text,
  clinical_name text NOT NULL,
  nickname text,
  driver_description text,
  expression_description text,
  escalation_multiplier numeric DEFAULT 1.0,
  hidden_need_multiplier numeric DEFAULT 1.0,
  recovery_multiplier numeric DEFAULT 1.0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_naming_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL,
  rule_description text,
  template_string text,
  example_output text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id text UNIQUE NOT NULL,
  item_number int NOT NULL,
  item_text text NOT NULL,
  domain text NOT NULL REFERENCES public.bops_domains(domain_id),
  reverse_scored boolean DEFAULT false,
  response_scale text DEFAULT '0-4',
  teacher_friendly_wording text,
  clinical_wording text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_classroom_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_type_id text UNIQUE NOT NULL,
  classroom_name text NOT NULL,
  support_level text,
  flexibility_level text,
  demand_level text,
  authority_intensity text,
  default_modifier numeric DEFAULT 1.0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.student_bops_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE,
  bops_enabled boolean DEFAULT true,
  bops_assessment_status text DEFAULT 'not_started',
  profile_type text,
  primary_archetype text,
  secondary_archetype text,
  tertiary_archetype text,
  clinical_name text,
  training_name text,
  constellation_id text REFERENCES public.bops_constellations(constellation_id),
  supporting_drivers jsonb DEFAULT '[]',
  primary_functions jsonb DEFAULT '[]',
  safety_flags jsonb DEFAULT '[]',
  active_domains jsonb DEFAULT '[]',
  storm_score numeric,
  cfi_summary text,
  recommended_cfi text,
  profile_notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  assessment_date date DEFAULT CURRENT_DATE,
  rater_name text,
  rater_role text,
  status text DEFAULT 'in_progress',
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_assessment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.bops_assessment_responses(id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES public.bops_question_bank(item_id),
  response_value int,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_domain_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  assessment_id uuid REFERENCES public.bops_assessment_responses(id),
  threat_score numeric DEFAULT 0, withdrawal_score numeric DEFAULT 0,
  sensory_score numeric DEFAULT 0, emotion_score numeric DEFAULT 0,
  impulse_score numeric DEFAULT 0, autonomy_score numeric DEFAULT 0,
  authority_score numeric DEFAULT 0, rigidity_score numeric DEFAULT 0,
  social_score numeric DEFAULT 0, context_score numeric DEFAULT 0,
  navigator_score numeric DEFAULT 0, storm_score numeric DEFAULT 0,
  escalation_index numeric DEFAULT 0, hidden_need_index numeric DEFAULT 0,
  sensory_load_index numeric DEFAULT 0, power_conflict_index numeric DEFAULT 0,
  social_complexity_index numeric DEFAULT 0, recovery_burden_index numeric DEFAULT 0,
  calculated_profile_type text, calculated_primary text,
  calculated_secondary text, calculated_clinical_name text,
  scored_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_cfi_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  assessment_id uuid REFERENCES public.bops_assessment_responses(id),
  classroom_type_id text REFERENCES public.bops_classroom_types(classroom_type_id),
  fit_score numeric, fit_band text, risk_notes text, recommended_rank int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_program_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  profile_template text,
  linked_domain text REFERENCES public.bops_domains(domain_id),
  linked_archetype text,
  linked_constellation_id text REFERENCES public.bops_constellations(constellation_id),
  problem_area text,
  program_name text NOT NULL,
  day_state text NOT NULL,
  goal_title text, goal_description text,
  target_options jsonb DEFAULT '[]', benchmark_ladder jsonb DEFAULT '[]',
  mastery_criteria text,
  antecedent_strategies jsonb DEFAULT '[]', teaching_strategies jsonb DEFAULT '[]',
  reactive_strategies jsonb DEFAULT '[]',
  reinforcement_plan text, data_collection_type text,
  teacher_friendly_summary text, clinician_summary text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.bops_student_day_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL, date date NOT NULL DEFAULT CURRENT_DATE,
  day_state text NOT NULL DEFAULT 'yellow',
  selected_problem_areas jsonb DEFAULT '[]', selected_support_level text,
  teacher_note text, clinician_note text, generated_plan_id uuid,
  set_by_app text DEFAULT 'nova_core', set_by_user uuid,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TABLE public.bops_daily_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL, date date NOT NULL DEFAULT CURRENT_DATE,
  day_state text NOT NULL,
  active_program_ids jsonb DEFAULT '[]', active_targets jsonb DEFAULT '[]',
  benchmark_level text, antecedent_plan text, reactive_plan text,
  reinforcement_plan text, teacher_summary_view text, clinician_summary_view text,
  status text DEFAULT 'draft', published_at timestamptz,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TABLE public.bops_sync_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid, item_type text NOT NULL, item_name text NOT NULL,
  item_id uuid, shared_to_beacon boolean DEFAULT false,
  beacon_tracking_allowed boolean DEFAULT false,
  beacon_teacher_edit_allowed boolean DEFAULT false,
  return_to_nova_mode text DEFAULT 'none',
  teacher_local_additions_allowed boolean DEFAULT false,
  required_in_teacher_view boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.beacon_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL, submission_type text NOT NULL,
  date_range_start date, date_range_end date,
  summary_text text, behavior_summary jsonb DEFAULT '{}',
  skill_summary jsonb DEFAULT '{}', teacher_created_items jsonb DEFAULT '[]',
  submitted_by uuid, submission_status text DEFAULT 'pending',
  reviewed_by uuid, reviewed_at timestamptz, review_notes text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.beacon_local_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL, created_by_teacher uuid,
  item_name text NOT NULL, item_type text NOT NULL, description text,
  linked_core_program_id uuid REFERENCES public.bops_program_bank(id),
  local_only boolean DEFAULT true, submitted_for_review boolean DEFAULT false,
  submission_id uuid REFERENCES public.beacon_submissions(id),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.bops_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_constellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_naming_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_classroom_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bops_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_domain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_cfi_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_program_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_student_day_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_daily_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_sync_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacon_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacon_local_items ENABLE ROW LEVEL SECURITY;

-- Reference tables: authenticated read
CREATE POLICY "auth_read_bops_domains" ON public.bops_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_bops_archetypes" ON public.bops_archetypes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_bops_constellations" ON public.bops_constellations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_bops_naming_rules" ON public.bops_naming_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_bops_question_bank" ON public.bops_question_bank FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_bops_classroom_types" ON public.bops_classroom_types FOR SELECT TO authenticated USING (true);

-- Admin write on reference tables
CREATE POLICY "admin_write_bops_domains" ON public.bops_domains FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin_write_bops_archetypes" ON public.bops_archetypes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin_write_bops_constellations" ON public.bops_constellations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin_write_bops_naming_rules" ON public.bops_naming_rules FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin_write_bops_question_bank" ON public.bops_question_bank FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin_write_bops_classroom_types" ON public.bops_classroom_types FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Student-scoped tables: all authenticated (admin-level access assumed via app logic)
CREATE POLICY "access_student_bops_profiles" ON public.student_bops_profiles FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid())) WITH CHECK (public.has_student_access(student_id, auth.uid()));
CREATE POLICY "access_bops_assessment_responses" ON public.bops_assessment_responses FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid())) WITH CHECK (public.has_student_access(student_id, auth.uid()));
CREATE POLICY "access_bops_assessment_items" ON public.bops_assessment_items FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.bops_assessment_responses r WHERE r.id = assessment_id AND public.has_student_access(r.student_id, auth.uid())))
  WITH CHECK (EXISTS(SELECT 1 FROM public.bops_assessment_responses r WHERE r.id = assessment_id AND public.has_student_access(r.student_id, auth.uid())));
CREATE POLICY "access_bops_domain_scores" ON public.bops_domain_scores FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid())) WITH CHECK (public.has_student_access(student_id, auth.uid()));
CREATE POLICY "access_bops_cfi_results" ON public.bops_cfi_results FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid())) WITH CHECK (public.has_student_access(student_id, auth.uid()));
CREATE POLICY "access_bops_program_bank" ON public.bops_program_bank FOR ALL TO authenticated
  USING (student_id IS NULL OR public.has_student_access(student_id, auth.uid()))
  WITH CHECK (student_id IS NULL OR public.has_student_access(student_id, auth.uid()));
CREATE POLICY "access_bops_student_day_state" ON public.bops_student_day_state FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid())) WITH CHECK (public.has_student_access(student_id, auth.uid()));
CREATE POLICY "access_bops_daily_plan" ON public.bops_daily_plan FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid())) WITH CHECK (public.has_student_access(student_id, auth.uid()));
CREATE POLICY "access_bops_sync_controls" ON public.bops_sync_controls FOR ALL TO authenticated
  USING (student_id IS NULL OR public.has_student_access(student_id, auth.uid()))
  WITH CHECK (student_id IS NULL OR public.has_student_access(student_id, auth.uid()));
CREATE POLICY "access_beacon_submissions" ON public.beacon_submissions FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid())) WITH CHECK (public.has_student_access(student_id, auth.uid()));
CREATE POLICY "access_beacon_local_items" ON public.beacon_local_items FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid())) WITH CHECK (public.has_student_access(student_id, auth.uid()));

-- Indexes
CREATE INDEX idx_student_bops_profiles_student ON public.student_bops_profiles(student_id);
CREATE INDEX idx_bops_program_bank_student ON public.bops_program_bank(student_id);
CREATE INDEX idx_bops_program_bank_day_state ON public.bops_program_bank(day_state);
CREATE INDEX idx_bops_student_day_state_lookup ON public.bops_student_day_state(student_id, date);
CREATE INDEX idx_bops_daily_plan_lookup ON public.bops_daily_plan(student_id, date);
CREATE INDEX idx_bops_domain_scores_student ON public.bops_domain_scores(student_id);
CREATE INDEX idx_beacon_submissions_student ON public.beacon_submissions(student_id);
CREATE INDEX idx_beacon_local_items_student ON public.beacon_local_items(student_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bops_student_day_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bops_daily_plan;
