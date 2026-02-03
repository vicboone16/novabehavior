
-- =====================================================
-- Phase 1: Database Foundation for Practice Management Expansion
-- =====================================================

-- Helper function for billing access
CREATE OR REPLACE FUNCTION public.has_billing_access(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND role IN ('super_admin', 'admin')
  );
END;
$$;

-- Helper function for intake coordinator access
CREATE OR REPLACE FUNCTION public.is_intake_coordinator(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND role IN ('super_admin', 'admin', 'staff')
  );
END;
$$;

-- Helper function for supervision access (BCBAs and admins)
CREATE OR REPLACE FUNCTION public.has_supervision_access(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id
    AND role IN ('super_admin', 'admin', 'staff')
  );
END;
$$;

-- =====================================================
-- MODULE 1: SUPERVISION TRACKING TABLES
-- =====================================================

-- Supervision logs table
CREATE TABLE public.supervision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_user_id uuid NOT NULL REFERENCES auth.users(id),
  supervisee_user_id uuid NOT NULL REFERENCES auth.users(id),
  student_id uuid REFERENCES public.students(id),
  session_id uuid REFERENCES public.sessions(id),
  supervision_type text NOT NULL DEFAULT 'direct',
  supervision_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NOT NULL,
  activities jsonb DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_supervision_type CHECK (supervision_type IN ('direct', 'indirect', 'group')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Fieldwork hours table for BCBA candidates
CREATE TABLE public.fieldwork_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_user_id uuid NOT NULL REFERENCES auth.users(id),
  supervisor_user_id uuid NOT NULL REFERENCES auth.users(id),
  hours_type text NOT NULL DEFAULT 'supervised',
  hours numeric(5,2) NOT NULL,
  fieldwork_date date NOT NULL DEFAULT CURRENT_DATE,
  experience_type text NOT NULL DEFAULT 'unrestricted',
  task_list_items jsonb DEFAULT '[]'::jsonb,
  notes text,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_hours_type CHECK (hours_type IN ('supervised', 'independent')),
  CONSTRAINT valid_experience_type CHECK (experience_type IN ('unrestricted', 'restricted', 'concentrated'))
);

-- Supervision requirements table
CREATE TABLE public.supervision_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisee_user_id uuid NOT NULL REFERENCES auth.users(id),
  supervisor_user_id uuid NOT NULL REFERENCES auth.users(id),
  requirement_type text NOT NULL DEFAULT 'rbt_5pct',
  target_percentage numeric(5,2) NOT NULL DEFAULT 5.00,
  billing_period_start date NOT NULL,
  billing_period_end date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_requirement_type CHECK (requirement_type IN ('rbt_5pct', 'rbt_10pct', 'fieldwork'))
);

-- Enable RLS on supervision tables
ALTER TABLE public.supervision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fieldwork_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervision_requirements ENABLE ROW LEVEL SECURITY;

-- RLS policies for supervision_logs
CREATE POLICY "Supervisors can view their supervision logs"
  ON public.supervision_logs FOR SELECT
  USING (supervisor_user_id = auth.uid() OR supervisee_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Supervisors can create supervision logs"
  ON public.supervision_logs FOR INSERT
  WITH CHECK (supervisor_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Supervisors can update their logs"
  ON public.supervision_logs FOR UPDATE
  USING (supervisor_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can delete supervision logs"
  ON public.supervision_logs FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS policies for fieldwork_hours
CREATE POLICY "Users can view their fieldwork hours"
  ON public.fieldwork_hours FOR SELECT
  USING (trainee_user_id = auth.uid() OR supervisor_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Trainees can create fieldwork hours"
  ON public.fieldwork_hours FOR INSERT
  WITH CHECK (trainee_user_id = auth.uid() OR supervisor_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can update fieldwork hours"
  ON public.fieldwork_hours FOR UPDATE
  USING (trainee_user_id = auth.uid() OR supervisor_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can delete fieldwork hours"
  ON public.fieldwork_hours FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS policies for supervision_requirements
CREATE POLICY "Users can view their supervision requirements"
  ON public.supervision_requirements FOR SELECT
  USING (supervisee_user_id = auth.uid() OR supervisor_user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage supervision requirements"
  ON public.supervision_requirements FOR ALL
  USING (is_admin(auth.uid()));

-- =====================================================
-- MODULE 2: REFERRAL & INTAKE PIPELINE TABLES
-- =====================================================

-- Intake checklist templates
CREATE TABLE public.intake_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  funding_source text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'other',
  source_contact_name text,
  source_contact_email text,
  source_contact_phone text,
  client_first_name text NOT NULL,
  client_last_name text NOT NULL,
  client_dob date,
  client_diagnosis text,
  client_address text,
  client_city text,
  client_state text,
  client_zip text,
  parent_guardian_name text,
  parent_guardian_email text,
  parent_guardian_phone text,
  funding_source text,
  insurance_info jsonb DEFAULT '{}'::jsonb,
  priority_level text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'received',
  assigned_to_user_id uuid REFERENCES auth.users(id),
  waitlist_position integer,
  waitlist_added_date date,
  estimated_start_date date,
  converted_student_id uuid REFERENCES public.students(id),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_source CHECK (source IN ('school', 'physician', 'parent', 'insurance', 'self', 'other')),
  CONSTRAINT valid_priority CHECK (priority_level IN ('urgent', 'high', 'normal', 'low')),
  CONSTRAINT valid_status CHECK (status IN ('received', 'screening', 'assessment', 'accepted', 'waitlist', 'declined', 'converted'))
);

-- Intake checklists (instances per referral)
CREATE TABLE public.intake_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  checklist_template_id uuid REFERENCES public.intake_checklist_templates(id),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_items jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_checklist_status CHECK (status IN ('pending', 'in_progress', 'complete'))
);

-- Intake documents
CREATE TABLE public.intake_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on referral tables
ALTER TABLE public.intake_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for intake_checklist_templates
CREATE POLICY "Authenticated users can view templates"
  ON public.intake_checklist_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage templates"
  ON public.intake_checklist_templates FOR ALL
  USING (is_admin(auth.uid()));

-- RLS policies for referrals
CREATE POLICY "Staff can view referrals"
  ON public.referrals FOR SELECT
  USING (is_intake_coordinator(auth.uid()));

CREATE POLICY "Staff can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (is_intake_coordinator(auth.uid()));

CREATE POLICY "Staff can update referrals"
  ON public.referrals FOR UPDATE
  USING (is_intake_coordinator(auth.uid()));

CREATE POLICY "Admins can delete referrals"
  ON public.referrals FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS policies for intake_checklists
CREATE POLICY "Staff can view intake checklists"
  ON public.intake_checklists FOR SELECT
  USING (is_intake_coordinator(auth.uid()));

CREATE POLICY "Staff can manage intake checklists"
  ON public.intake_checklists FOR ALL
  USING (is_intake_coordinator(auth.uid()));

-- RLS policies for intake_documents
CREATE POLICY "Staff can view intake documents"
  ON public.intake_documents FOR SELECT
  USING (is_intake_coordinator(auth.uid()));

CREATE POLICY "Staff can upload intake documents"
  ON public.intake_documents FOR INSERT
  WITH CHECK (is_intake_coordinator(auth.uid()));

CREATE POLICY "Admins can delete intake documents"
  ON public.intake_documents FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- MODULE 3: BILLING & CLAIMS TABLES
-- =====================================================

-- Billing claims table
CREATE TABLE public.billing_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text NOT NULL UNIQUE,
  student_id uuid NOT NULL REFERENCES public.students(id),
  payer_id uuid NOT NULL REFERENCES public.payers(id),
  authorization_id uuid REFERENCES public.authorizations(id),
  service_date_from date NOT NULL,
  service_date_to date NOT NULL,
  place_of_service text NOT NULL DEFAULT '11',
  diagnosis_codes jsonb DEFAULT '[]'::jsonb,
  total_charges numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  submitted_date date,
  paid_date date,
  paid_amount numeric(10,2),
  adjustment_amount numeric(10,2),
  adjustment_codes jsonb DEFAULT '[]'::jsonb,
  denial_reason text,
  denial_code text,
  appeal_deadline date,
  appeal_submitted_date date,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_claim_status CHECK (status IN ('draft', 'ready', 'submitted', 'paid', 'partial', 'denied', 'appealed', 'void'))
);

-- Claim line items
CREATE TABLE public.claim_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.billing_claims(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id),
  line_number integer NOT NULL,
  service_date date NOT NULL,
  cpt_code text NOT NULL,
  modifiers jsonb DEFAULT '[]'::jsonb,
  units numeric(5,2) NOT NULL,
  unit_charge numeric(10,2) NOT NULL,
  total_charge numeric(10,2) NOT NULL,
  rendering_provider_npi text,
  rendering_provider_name text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ERA remittances (for payment reconciliation)
CREATE TABLE public.era_remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid REFERENCES public.billing_claims(id),
  remittance_date date NOT NULL,
  payer_claim_number text,
  check_number text,
  paid_amount numeric(10,2) NOT NULL,
  adjustment_codes jsonb DEFAULT '[]'::jsonb,
  remark_codes jsonb DEFAULT '[]'::jsonb,
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on billing tables
ALTER TABLE public.billing_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.era_remittances ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_claims
CREATE POLICY "Billing users can view claims"
  ON public.billing_claims FOR SELECT
  USING (has_billing_access(auth.uid()));

CREATE POLICY "Billing users can create claims"
  ON public.billing_claims FOR INSERT
  WITH CHECK (has_billing_access(auth.uid()));

CREATE POLICY "Billing users can update claims"
  ON public.billing_claims FOR UPDATE
  USING (has_billing_access(auth.uid()));

CREATE POLICY "Admins can delete claims"
  ON public.billing_claims FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS policies for claim_line_items
CREATE POLICY "Billing users can view line items"
  ON public.claim_line_items FOR SELECT
  USING (has_billing_access(auth.uid()));

CREATE POLICY "Billing users can manage line items"
  ON public.claim_line_items FOR ALL
  USING (has_billing_access(auth.uid()));

-- RLS policies for era_remittances
CREATE POLICY "Billing users can view remittances"
  ON public.era_remittances FOR SELECT
  USING (has_billing_access(auth.uid()));

CREATE POLICY "Billing users can manage remittances"
  ON public.era_remittances FOR ALL
  USING (has_billing_access(auth.uid()));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Supervision indexes
CREATE INDEX idx_supervision_logs_supervisor ON public.supervision_logs(supervisor_user_id);
CREATE INDEX idx_supervision_logs_supervisee ON public.supervision_logs(supervisee_user_id);
CREATE INDEX idx_supervision_logs_date ON public.supervision_logs(supervision_date);
CREATE INDEX idx_fieldwork_hours_trainee ON public.fieldwork_hours(trainee_user_id);
CREATE INDEX idx_fieldwork_hours_date ON public.fieldwork_hours(fieldwork_date);

-- Referral indexes
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referrals_assigned ON public.referrals(assigned_to_user_id);
CREATE INDEX idx_referrals_created_at ON public.referrals(created_at);

-- Billing indexes
CREATE INDEX idx_billing_claims_student ON public.billing_claims(student_id);
CREATE INDEX idx_billing_claims_payer ON public.billing_claims(payer_id);
CREATE INDEX idx_billing_claims_status ON public.billing_claims(status);
CREATE INDEX idx_billing_claims_dates ON public.billing_claims(service_date_from, service_date_to);
CREATE INDEX idx_claim_line_items_claim ON public.claim_line_items(claim_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_supervision_logs_updated_at
  BEFORE UPDATE ON public.supervision_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fieldwork_hours_updated_at
  BEFORE UPDATE ON public.fieldwork_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supervision_requirements_updated_at
  BEFORE UPDATE ON public.supervision_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intake_checklists_updated_at
  BEFORE UPDATE ON public.intake_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intake_checklist_templates_updated_at
  BEFORE UPDATE ON public.intake_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_claims_updated_at
  BEFORE UPDATE ON public.billing_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- CLAIM NUMBER SEQUENCE
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS claim_number_seq START WITH 1000;

CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'CLM-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(nextval('claim_number_seq')::text, 6, '0');
END;
$$;
