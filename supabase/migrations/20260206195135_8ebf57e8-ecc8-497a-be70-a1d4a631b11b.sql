
-- =====================================================
-- FEATURE 1: Payroll Integration & Timesheet Management
-- =====================================================

CREATE TABLE IF NOT EXISTS public.staff_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL,
  agency_id UUID REFERENCES public.agencies(id),
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_hours NUMERIC(8,2) DEFAULT 0,
  billable_hours NUMERIC(8,2) DEFAULT 0,
  non_billable_hours NUMERIC(8,2) DEFAULT 0,
  drive_time_hours NUMERIC(8,2) DEFAULT 0,
  total_mileage NUMERIC(8,2) DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID REFERENCES public.staff_timesheets(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID,
  entry_type TEXT NOT NULL DEFAULT 'session',
  entry_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  duration_minutes NUMERIC(8,2) NOT NULL DEFAULT 0,
  mileage NUMERIC(8,2) DEFAULT 0,
  is_billable BOOLEAN DEFAULT true,
  pay_rate NUMERIC(10,2),
  student_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id),
  export_format TEXT NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  staff_count INTEGER DEFAULT 0,
  total_hours NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  file_url TEXT,
  exported_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_timesheets_staff ON public.staff_timesheets(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_timesheets_period ON public.staff_timesheets(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_staff_timesheets_status ON public.staff_timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_timesheet ON public.timesheet_entries(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_date ON public.timesheet_entries(entry_date);

ALTER TABLE public.staff_timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_exports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_timesheets' AND policyname = 'Authenticated users can view timesheets') THEN
    CREATE POLICY "Authenticated users can view timesheets" ON public.staff_timesheets FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_timesheets' AND policyname = 'Users can manage own timesheets') THEN
    CREATE POLICY "Users can manage own timesheets" ON public.staff_timesheets FOR INSERT TO authenticated WITH CHECK (staff_user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_timesheets' AND policyname = 'Users can update own draft timesheets') THEN
    CREATE POLICY "Users can update own draft timesheets" ON public.staff_timesheets FOR UPDATE TO authenticated USING (staff_user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_timesheets' AND policyname = 'Admins can delete timesheets') THEN
    CREATE POLICY "Admins can delete timesheets" ON public.staff_timesheets FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timesheet_entries' AND policyname = 'Authenticated users can view entries') THEN
    CREATE POLICY "Authenticated users can view entries" ON public.timesheet_entries FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timesheet_entries' AND policyname = 'Users can manage entries') THEN
    CREATE POLICY "Users can manage entries" ON public.timesheet_entries FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timesheet_entries' AND policyname = 'Users can update entries') THEN
    CREATE POLICY "Users can update entries" ON public.timesheet_entries FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timesheet_entries' AND policyname = 'Users can delete entries') THEN
    CREATE POLICY "Users can delete entries" ON public.timesheet_entries FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_exports' AND policyname = 'Admins can view exports') THEN
    CREATE POLICY "Admins can view exports" ON public.payroll_exports FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_exports' AND policyname = 'Admins can create exports') THEN
    CREATE POLICY "Admins can create exports" ON public.payroll_exports FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- =====================================================
-- FEATURE 2: ERA/835 Processing - Expand existing + new tables
-- =====================================================

-- Expand existing era_remittances
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS import_id UUID;
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS payer_id_code TEXT;
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS payee_name TEXT;
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS payee_npi TEXT;
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS total_adjustments NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS total_patient_responsibility NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS claim_count INTEGER DEFAULT 0;
ALTER TABLE public.era_remittances ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.era_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id),
  filename TEXT NOT NULL,
  file_size INTEGER,
  raw_content TEXT,
  parse_status TEXT NOT NULL DEFAULT 'pending',
  parse_error TEXT,
  total_remittances INTEGER DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  unmatched_count INTEGER DEFAULT 0,
  imported_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.era_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remittance_id UUID REFERENCES public.era_remittances(id) ON DELETE CASCADE NOT NULL,
  claim_id UUID,
  claim_line_item_id UUID,
  patient_name TEXT,
  patient_id TEXT,
  claim_number TEXT,
  service_date_from DATE,
  service_date_to DATE,
  cpt_code TEXT,
  modifiers TEXT[],
  billed_amount NUMERIC(10,2) DEFAULT 0,
  allowed_amount NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  patient_responsibility NUMERIC(10,2) DEFAULT 0,
  adjustment_reason_codes TEXT[],
  adjustment_amounts NUMERIC(10,2)[],
  remark_codes TEXT[],
  match_status TEXT NOT NULL DEFAULT 'unmatched',
  match_confidence NUMERIC(5,2),
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_era_imports_agency ON public.era_imports(agency_id);
CREATE INDEX IF NOT EXISTS idx_era_remittances_import ON public.era_remittances(import_id);
CREATE INDEX IF NOT EXISTS idx_era_line_items_remittance ON public.era_line_items(remittance_id);
CREATE INDEX IF NOT EXISTS idx_era_line_items_claim ON public.era_line_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_era_line_items_match ON public.era_line_items(match_status);

ALTER TABLE public.era_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.era_line_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'era_imports' AND policyname = 'Authenticated users can view ERA imports') THEN
    CREATE POLICY "Authenticated users can view ERA imports" ON public.era_imports FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'era_imports' AND policyname = 'Admins can manage ERA imports') THEN
    CREATE POLICY "Admins can manage ERA imports" ON public.era_imports FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'era_imports' AND policyname = 'Admins can update ERA imports') THEN
    CREATE POLICY "Admins can update ERA imports" ON public.era_imports FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'era_line_items' AND policyname = 'Authenticated users can view ERA line items') THEN
    CREATE POLICY "Authenticated users can view ERA line items" ON public.era_line_items FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'era_line_items' AND policyname = 'Admins can manage ERA line items') THEN
    CREATE POLICY "Admins can manage ERA line items" ON public.era_line_items FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'era_line_items' AND policyname = 'Admins can update ERA line items') THEN
    CREATE POLICY "Admins can update ERA line items" ON public.era_line_items FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- =====================================================
-- FEATURE 3: Office Ally Clearinghouse
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clearinghouse_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id),
  batch_number TEXT NOT NULL,
  submission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  claim_count INTEGER DEFAULT 0,
  total_charges NUMERIC(12,2) DEFAULT 0,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'generated',
  response_data JSONB DEFAULT '{}',
  clearinghouse TEXT DEFAULT 'office_ally',
  submitted_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.claim_submission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  submission_id UUID REFERENCES public.clearinghouse_submissions(id),
  clearinghouse_status TEXT DEFAULT 'pending',
  clearinghouse_claim_id TEXT,
  rejection_reasons TEXT[],
  response_date TIMESTAMPTZ,
  response_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clearinghouse_submissions_agency ON public.clearinghouse_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_clearinghouse_submissions_status ON public.clearinghouse_submissions(status);
CREATE INDEX IF NOT EXISTS idx_claim_submission_history_claim ON public.claim_submission_history(claim_id);

ALTER TABLE public.clearinghouse_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_submission_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clearinghouse_submissions' AND policyname = 'Authenticated users can view submissions') THEN
    CREATE POLICY "Authenticated users can view submissions" ON public.clearinghouse_submissions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clearinghouse_submissions' AND policyname = 'Admins can manage submissions') THEN
    CREATE POLICY "Admins can manage submissions" ON public.clearinghouse_submissions FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clearinghouse_submissions' AND policyname = 'Admins can update submissions') THEN
    CREATE POLICY "Admins can update submissions" ON public.clearinghouse_submissions FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'claim_submission_history' AND policyname = 'Authenticated users can view claim history') THEN
    CREATE POLICY "Authenticated users can view claim history" ON public.claim_submission_history FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'claim_submission_history' AND policyname = 'Admins can manage claim history') THEN
    CREATE POLICY "Admins can manage claim history" ON public.claim_submission_history FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'claim_submission_history' AND policyname = 'Admins can update claim history') THEN
    CREATE POLICY "Admins can update claim history" ON public.claim_submission_history FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- =====================================================
-- FEATURE 4: Curriculum & Protocol Library
-- =====================================================

CREATE TABLE IF NOT EXISTS public.protocol_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_item_id UUID,
  agency_id UUID REFERENCES public.agencies(id),
  title TEXT NOT NULL,
  description TEXT,
  curriculum_system TEXT,
  domain TEXT,
  level TEXT,
  steps JSONB DEFAULT '[]',
  materials_needed TEXT[],
  prompt_hierarchy JSONB DEFAULT '[]',
  error_correction_procedure TEXT,
  mastery_criteria JSONB DEFAULT '{}',
  generalization_guidelines TEXT,
  data_collection_method TEXT DEFAULT 'dtt',
  estimated_duration_minutes INTEGER,
  tags TEXT[],
  is_template BOOLEAN DEFAULT true,
  created_by UUID,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.protocol_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  protocol_template_id UUID REFERENCES public.protocol_templates(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID,
  assigned_staff UUID[],
  status TEXT NOT NULL DEFAULT 'active',
  customizations JSONB DEFAULT '{}',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protocol_templates_curriculum ON public.protocol_templates(curriculum_system);
CREATE INDEX IF NOT EXISTS idx_protocol_templates_agency ON public.protocol_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_protocol_assignments_student ON public.protocol_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_protocol_assignments_template ON public.protocol_assignments(protocol_template_id);

ALTER TABLE public.protocol_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocol_templates' AND policyname = 'Authenticated users can view protocol templates') THEN
    CREATE POLICY "Authenticated users can view protocol templates" ON public.protocol_templates FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocol_templates' AND policyname = 'Staff can create protocol templates') THEN
    CREATE POLICY "Staff can create protocol templates" ON public.protocol_templates FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocol_templates' AND policyname = 'Staff can update protocol templates') THEN
    CREATE POLICY "Staff can update protocol templates" ON public.protocol_templates FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocol_templates' AND policyname = 'Admins can delete protocol templates') THEN
    CREATE POLICY "Admins can delete protocol templates" ON public.protocol_templates FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocol_assignments' AND policyname = 'Authenticated users can view protocol assignments') THEN
    CREATE POLICY "Authenticated users can view protocol assignments" ON public.protocol_assignments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocol_assignments' AND policyname = 'Staff can create protocol assignments') THEN
    CREATE POLICY "Staff can create protocol assignments" ON public.protocol_assignments FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocol_assignments' AND policyname = 'Staff can update protocol assignments') THEN
    CREATE POLICY "Staff can update protocol assignments" ON public.protocol_assignments FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'protocol_assignments' AND policyname = 'Staff can delete protocol assignments') THEN
    CREATE POLICY "Staff can delete protocol assignments" ON public.protocol_assignments FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- =====================================================
-- FEATURE 5: Advanced Graphing
-- =====================================================

CREATE TABLE IF NOT EXISTS public.graph_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  behavior_id TEXT,
  target_id UUID,
  annotation_type TEXT NOT NULL,
  position_date DATE,
  position_value NUMERIC(10,2),
  end_date DATE,
  end_value NUMERIC(10,2),
  label_text TEXT,
  description TEXT,
  style JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.graph_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  name TEXT NOT NULL,
  chart_type TEXT NOT NULL DEFAULT 'line',
  data_sources JSONB DEFAULT '[]',
  display_options JSONB DEFAULT '{}',
  date_range_start DATE,
  date_range_end DATE,
  annotation_ids UUID[],
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graph_annotations_student ON public.graph_annotations(student_id);
CREATE INDEX IF NOT EXISTS idx_graph_annotations_type ON public.graph_annotations(annotation_type);
CREATE INDEX IF NOT EXISTS idx_graph_configurations_student ON public.graph_configurations(student_id);

ALTER TABLE public.graph_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_configurations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'graph_annotations' AND policyname = 'Authenticated users can view annotations') THEN
    CREATE POLICY "Authenticated users can view annotations" ON public.graph_annotations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'graph_annotations' AND policyname = 'Staff can manage annotations') THEN
    CREATE POLICY "Staff can manage annotations" ON public.graph_annotations FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'graph_annotations' AND policyname = 'Staff can update annotations') THEN
    CREATE POLICY "Staff can update annotations" ON public.graph_annotations FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'graph_annotations' AND policyname = 'Staff can delete annotations') THEN
    CREATE POLICY "Staff can delete annotations" ON public.graph_annotations FOR DELETE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'graph_configurations' AND policyname = 'Authenticated users can view graph configs') THEN
    CREATE POLICY "Authenticated users can view graph configs" ON public.graph_configurations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'graph_configurations' AND policyname = 'Staff can manage graph configs') THEN
    CREATE POLICY "Staff can manage graph configs" ON public.graph_configurations FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'graph_configurations' AND policyname = 'Staff can update graph configs') THEN
    CREATE POLICY "Staff can update graph configs" ON public.graph_configurations FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'graph_configurations' AND policyname = 'Staff can delete graph configs') THEN
    CREATE POLICY "Staff can delete graph configs" ON public.graph_configurations FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- =====================================================
-- FEATURE 6: Caregiver Training Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.caregiver_training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id),
  title TEXT NOT NULL,
  description TEXT,
  target_skills JSONB DEFAULT '[]',
  bst_steps JSONB DEFAULT '[]',
  competency_criteria JSONB DEFAULT '{}',
  estimated_duration_hours NUMERIC(6,2),
  category TEXT DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.caregiver_training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.caregiver_training_programs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  caregiver_name TEXT NOT NULL,
  caregiver_relationship TEXT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  bst_phase TEXT NOT NULL DEFAULT 'instruction',
  competency_rating INTEGER,
  skills_addressed JSONB DEFAULT '[]',
  notes TEXT,
  staff_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.caregiver_competency_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.caregiver_training_programs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  caregiver_name TEXT NOT NULL,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checklist_items JSONB DEFAULT '[]',
  percent_correct NUMERIC(5,2) DEFAULT 0,
  setting TEXT,
  passed BOOLEAN DEFAULT false,
  evaluator_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.caregiver_generalization_probes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.caregiver_training_programs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  caregiver_name TEXT NOT NULL,
  probe_date DATE NOT NULL DEFAULT CURRENT_DATE,
  setting TEXT NOT NULL,
  observer_id UUID NOT NULL,
  items_observed JSONB DEFAULT '[]',
  fidelity_percentage NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caregiver_programs_agency ON public.caregiver_training_programs(agency_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_sessions_student ON public.caregiver_training_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_sessions_program ON public.caregiver_training_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_competency_program ON public.caregiver_competency_checks(program_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_probes_program ON public.caregiver_generalization_probes(program_id);

ALTER TABLE public.caregiver_training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_competency_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_generalization_probes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_training_programs' AND policyname = 'Authenticated users can view caregiver programs') THEN
    CREATE POLICY "Authenticated users can view caregiver programs" ON public.caregiver_training_programs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_training_programs' AND policyname = 'Staff can manage caregiver programs') THEN
    CREATE POLICY "Staff can manage caregiver programs" ON public.caregiver_training_programs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_training_programs' AND policyname = 'Staff can update caregiver programs') THEN
    CREATE POLICY "Staff can update caregiver programs" ON public.caregiver_training_programs FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_training_sessions' AND policyname = 'Authenticated users can view caregiver sessions') THEN
    CREATE POLICY "Authenticated users can view caregiver sessions" ON public.caregiver_training_sessions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_training_sessions' AND policyname = 'Staff can create caregiver sessions') THEN
    CREATE POLICY "Staff can create caregiver sessions" ON public.caregiver_training_sessions FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_training_sessions' AND policyname = 'Staff can update caregiver sessions') THEN
    CREATE POLICY "Staff can update caregiver sessions" ON public.caregiver_training_sessions FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_competency_checks' AND policyname = 'Authenticated users can view competency checks') THEN
    CREATE POLICY "Authenticated users can view competency checks" ON public.caregiver_competency_checks FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_competency_checks' AND policyname = 'Staff can manage competency checks') THEN
    CREATE POLICY "Staff can manage competency checks" ON public.caregiver_competency_checks FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_generalization_probes' AND policyname = 'Authenticated users can view probes') THEN
    CREATE POLICY "Authenticated users can view probes" ON public.caregiver_generalization_probes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_generalization_probes' AND policyname = 'Staff can manage probes') THEN
    CREATE POLICY "Staff can manage probes" ON public.caregiver_generalization_probes FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- FEATURE 7: Staff Recruiting & Onboarding Pipeline
-- =====================================================

CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id),
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  credential_required TEXT,
  location TEXT,
  employment_type TEXT DEFAULT 'full_time',
  salary_range_min NUMERIC(10,2),
  salary_range_max NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'open',
  posted_date DATE DEFAULT CURRENT_DATE,
  closing_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES public.agencies(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resume_url TEXT,
  cover_letter TEXT,
  source TEXT DEFAULT 'website',
  pipeline_status TEXT NOT NULL DEFAULT 'applied',
  rating INTEGER,
  notes TEXT,
  interview_date TIMESTAMPTZ,
  offer_date DATE,
  hire_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id),
  name TEXT NOT NULL,
  role_type TEXT NOT NULL DEFAULT 'RBT',
  items JSONB DEFAULT '[]',
  estimated_days INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.onboarding_templates(id),
  new_hire_user_id UUID,
  applicant_id UUID REFERENCES public.job_applicants(id),
  task_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'orientation',
  description TEXT,
  due_date DATE,
  completed_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  document_url TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  new_hire_user_id UUID,
  applicant_id UUID REFERENCES public.job_applicants(id),
  mentor_user_id UUID NOT NULL,
  agency_id UUID REFERENCES public.agencies(id),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_agency ON public.job_postings(agency_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON public.job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_applicants_posting ON public.job_applicants(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applicants_status ON public.job_applicants(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_hire ON public.onboarding_tasks(new_hire_user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_status ON public.onboarding_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_hire ON public.mentor_assignments(new_hire_user_id);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_postings' AND policyname = 'Admins can view job postings') THEN
    CREATE POLICY "Admins can view job postings" ON public.job_postings FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_postings' AND policyname = 'Admins can manage job postings') THEN
    CREATE POLICY "Admins can manage job postings" ON public.job_postings FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_postings' AND policyname = 'Admins can update job postings') THEN
    CREATE POLICY "Admins can update job postings" ON public.job_postings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_postings' AND policyname = 'Admins can delete job postings') THEN
    CREATE POLICY "Admins can delete job postings" ON public.job_postings FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applicants' AND policyname = 'Admins can view applicants') THEN
    CREATE POLICY "Admins can view applicants" ON public.job_applicants FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applicants' AND policyname = 'Admins can manage applicants') THEN
    CREATE POLICY "Admins can manage applicants" ON public.job_applicants FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applicants' AND policyname = 'Admins can update applicants') THEN
    CREATE POLICY "Admins can update applicants" ON public.job_applicants FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_applicants' AND policyname = 'Admins can delete applicants') THEN
    CREATE POLICY "Admins can delete applicants" ON public.job_applicants FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_templates' AND policyname = 'Admins can view onboarding templates') THEN
    CREATE POLICY "Admins can view onboarding templates" ON public.onboarding_templates FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_templates' AND policyname = 'Admins can manage onboarding templates') THEN
    CREATE POLICY "Admins can manage onboarding templates" ON public.onboarding_templates FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_templates' AND policyname = 'Admins can update onboarding templates') THEN
    CREATE POLICY "Admins can update onboarding templates" ON public.onboarding_templates FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_tasks' AND policyname = 'Users can view onboarding tasks') THEN
    CREATE POLICY "Users can view onboarding tasks" ON public.onboarding_tasks FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_tasks' AND policyname = 'Admins can manage onboarding tasks') THEN
    CREATE POLICY "Admins can manage onboarding tasks" ON public.onboarding_tasks FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_tasks' AND policyname = 'Users can update onboarding tasks') THEN
    CREATE POLICY "Users can update onboarding tasks" ON public.onboarding_tasks FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentor_assignments' AND policyname = 'Users can view mentor assignments') THEN
    CREATE POLICY "Users can view mentor assignments" ON public.mentor_assignments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentor_assignments' AND policyname = 'Admins can manage mentor assignments') THEN
    CREATE POLICY "Admins can manage mentor assignments" ON public.mentor_assignments FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mentor_assignments' AND policyname = 'Admins can update mentor assignments') THEN
    CREATE POLICY "Admins can update mentor assignments" ON public.mentor_assignments FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- =====================================================
-- FEATURE 8: LMS & Custom Form Builder
-- =====================================================

CREATE TABLE IF NOT EXISTS public.training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id),
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'document',
  content_url TEXT,
  content_data JSONB DEFAULT '{}',
  duration_estimate_minutes INTEGER,
  ceu_credits NUMERIC(4,2) DEFAULT 0,
  category TEXT DEFAULT 'general',
  required_roles TEXT[],
  pass_criteria JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.training_modules(id) ON DELETE CASCADE NOT NULL,
  staff_user_id UUID NOT NULL,
  assigned_by UUID,
  assigned_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'assigned',
  completed_date DATE,
  score NUMERIC(5,2),
  attempts INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ceu_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL,
  agency_id UUID REFERENCES public.agencies(id),
  activity_type TEXT NOT NULL DEFAULT 'training',
  title TEXT NOT NULL,
  provider TEXT,
  credits_earned NUMERIC(6,2) NOT NULL DEFAULT 0,
  date_completed DATE NOT NULL,
  expiration_date DATE,
  certificate_url TEXT,
  bacb_requirement_category TEXT,
  verification_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id),
  title TEXT NOT NULL,
  description TEXT,
  form_schema JSONB DEFAULT '[]',
  version INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  category TEXT DEFAULT 'general',
  requires_signature BOOLEAN DEFAULT false,
  auto_populate_fields JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.custom_forms(id) ON DELETE CASCADE NOT NULL,
  student_id UUID,
  respondent_name TEXT,
  respondent_email TEXT,
  respondent_relationship TEXT,
  responses JSONB DEFAULT '{}',
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_modules_agency ON public.training_modules(agency_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_status ON public.training_modules(status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_staff ON public.training_assignments(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_module ON public.training_assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON public.training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_ceu_records_staff ON public.ceu_records(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_ceu_records_expiration ON public.ceu_records(expiration_date);
CREATE INDEX IF NOT EXISTS idx_custom_forms_agency ON public.custom_forms(agency_id);
CREATE INDEX IF NOT EXISTS idx_custom_forms_status ON public.custom_forms(status);
CREATE INDEX IF NOT EXISTS idx_custom_form_submissions_form ON public.custom_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_custom_form_submissions_student ON public.custom_form_submissions(student_id);

ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceu_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_form_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_modules' AND policyname = 'Authenticated users can view training modules') THEN
    CREATE POLICY "Authenticated users can view training modules" ON public.training_modules FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_modules' AND policyname = 'Admins can manage training modules') THEN
    CREATE POLICY "Admins can manage training modules" ON public.training_modules FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_modules' AND policyname = 'Admins can update training modules') THEN
    CREATE POLICY "Admins can update training modules" ON public.training_modules FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_assignments' AND policyname = 'Users can view own training assignments') THEN
    CREATE POLICY "Users can view own training assignments" ON public.training_assignments FOR SELECT TO authenticated USING (staff_user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_assignments' AND policyname = 'Admins can create training assignments') THEN
    CREATE POLICY "Admins can create training assignments" ON public.training_assignments FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_assignments' AND policyname = 'Users can update own training assignments') THEN
    CREATE POLICY "Users can update own training assignments" ON public.training_assignments FOR UPDATE TO authenticated USING (staff_user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ceu_records' AND policyname = 'Users can view own CEU records') THEN
    CREATE POLICY "Users can view own CEU records" ON public.ceu_records FOR SELECT TO authenticated USING (staff_user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ceu_records' AND policyname = 'Users can manage own CEU records') THEN
    CREATE POLICY "Users can manage own CEU records" ON public.ceu_records FOR INSERT TO authenticated WITH CHECK (staff_user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ceu_records' AND policyname = 'Users can update own CEU records') THEN
    CREATE POLICY "Users can update own CEU records" ON public.ceu_records FOR UPDATE TO authenticated USING (staff_user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_forms' AND policyname = 'Authenticated users can view custom forms') THEN
    CREATE POLICY "Authenticated users can view custom forms" ON public.custom_forms FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_forms' AND policyname = 'Staff can create custom forms') THEN
    CREATE POLICY "Staff can create custom forms" ON public.custom_forms FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_forms' AND policyname = 'Staff can update custom forms') THEN
    CREATE POLICY "Staff can update custom forms" ON public.custom_forms FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_forms' AND policyname = 'Admins can delete custom forms') THEN
    CREATE POLICY "Admins can delete custom forms" ON public.custom_forms FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_form_submissions' AND policyname = 'Authenticated users can view form submissions') THEN
    CREATE POLICY "Authenticated users can view form submissions" ON public.custom_form_submissions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_form_submissions' AND policyname = 'Anyone can submit custom forms') THEN
    CREATE POLICY "Anyone can submit custom forms" ON public.custom_form_submissions FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_form_submissions' AND policyname = 'Staff can update form submissions') THEN
    CREATE POLICY "Staff can update form submissions" ON public.custom_form_submissions FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- =====================================================
-- Triggers for updated_at
-- =====================================================
CREATE OR REPLACE TRIGGER update_staff_timesheets_updated_at BEFORE UPDATE ON public.staff_timesheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_timesheet_entries_updated_at BEFORE UPDATE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_era_imports_updated_at BEFORE UPDATE ON public.era_imports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_clearinghouse_submissions_updated_at BEFORE UPDATE ON public.clearinghouse_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_protocol_templates_updated_at BEFORE UPDATE ON public.protocol_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_protocol_assignments_updated_at BEFORE UPDATE ON public.protocol_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_graph_annotations_updated_at BEFORE UPDATE ON public.graph_annotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_graph_configurations_updated_at BEFORE UPDATE ON public.graph_configurations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_caregiver_programs_updated_at BEFORE UPDATE ON public.caregiver_training_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_caregiver_sessions_updated_at BEFORE UPDATE ON public.caregiver_training_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_job_applicants_updated_at BEFORE UPDATE ON public.job_applicants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_onboarding_templates_updated_at BEFORE UPDATE ON public.onboarding_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_onboarding_tasks_updated_at BEFORE UPDATE ON public.onboarding_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_mentor_assignments_updated_at BEFORE UPDATE ON public.mentor_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_training_modules_updated_at BEFORE UPDATE ON public.training_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_training_assignments_updated_at BEFORE UPDATE ON public.training_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_ceu_records_updated_at BEFORE UPDATE ON public.ceu_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_custom_forms_updated_at BEFORE UPDATE ON public.custom_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_custom_form_submissions_updated_at BEFORE UPDATE ON public.custom_form_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Batch number sequence for clearinghouse
CREATE SEQUENCE IF NOT EXISTS clearinghouse_batch_seq START WITH 1;
