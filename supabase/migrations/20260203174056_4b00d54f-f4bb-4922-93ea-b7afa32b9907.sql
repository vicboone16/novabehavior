-- =============================================
-- PAYMENT INFRASTRUCTURE TABLES
-- =============================================

-- Billing payments table for tracking all payment transactions
CREATE TABLE public.billing_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.payers(id),
  claim_id UUID REFERENCES public.billing_claims(id),
  
  -- Payment details
  amount NUMERIC(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('copay', 'coinsurance', 'deductible', 'self_pay', 'balance', 'prepayment')),
  payment_method TEXT CHECK (payment_method IN ('card', 'ach', 'check', 'cash', 'other')),
  
  -- Stripe integration
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'cancelled')),
  
  -- Metadata
  description TEXT,
  reference_number TEXT,
  receipt_url TEXT,
  failure_reason TEXT,
  refund_amount NUMERIC(10,2),
  refund_reason TEXT,
  
  -- Service dates for payment allocation
  service_date_from DATE,
  service_date_to DATE,
  
  -- Audit
  created_by UUID NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billing_payments
CREATE POLICY "Admins can manage all payments"
ON public.billing_payments FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Staff can view payments for accessible students"
ON public.billing_payments FOR SELECT
USING (
  has_student_access(student_id, auth.uid()) OR
  is_student_owner(student_id, auth.uid())
);

CREATE POLICY "Staff can create payments for accessible students"
ON public.billing_payments FOR INSERT
WITH CHECK (
  has_student_access(student_id, auth.uid()) OR
  is_student_owner(student_id, auth.uid())
);

-- Stored payment methods table
CREATE TABLE public.stored_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Stripe data
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  
  -- Card info (masked/safe to store)
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  
  -- Settings
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  nickname TEXT,
  
  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stored_payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all payment methods"
ON public.stored_payment_methods FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Staff can view payment methods for accessible students"
ON public.stored_payment_methods FOR SELECT
USING (
  has_student_access(student_id, auth.uid()) OR
  is_student_owner(student_id, auth.uid())
);

-- Payment plans table
CREATE TABLE public.payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Plan details
  total_amount NUMERIC(10,2) NOT NULL,
  installment_amount NUMERIC(10,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  total_installments INTEGER NOT NULL,
  completed_installments INTEGER DEFAULT 0,
  
  -- Schedule
  start_date DATE NOT NULL,
  next_payment_date DATE,
  
  -- Auto-charge settings
  auto_charge BOOLEAN DEFAULT false,
  stored_payment_method_id UUID REFERENCES public.stored_payment_methods(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'defaulted')),
  
  -- Linked balance
  original_claim_ids UUID[],
  notes TEXT,
  
  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all payment plans"
ON public.payment_plans FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Staff can view payment plans for accessible students"
ON public.payment_plans FOR SELECT
USING (
  has_student_access(student_id, auth.uid()) OR
  is_student_owner(student_id, auth.uid())
);

-- =============================================
-- PVERIFY ELIGIBILITY TABLES
-- =============================================

-- Eligibility checks table
CREATE TABLE public.eligibility_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.payers(id),
  client_payer_id UUID REFERENCES public.client_payers(id),
  
  -- Request info
  check_type TEXT NOT NULL CHECK (check_type IN ('realtime', 'batch', 'manual')),
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- pVerify response data
  pverify_request_id TEXT,
  pverify_response JSONB,
  
  -- Parsed eligibility info
  is_eligible BOOLEAN,
  eligibility_status TEXT,
  plan_name TEXT,
  plan_number TEXT,
  group_number TEXT,
  
  -- Benefit details
  copay_amount NUMERIC(10,2),
  coinsurance_percent INTEGER,
  deductible_total NUMERIC(10,2),
  deductible_remaining NUMERIC(10,2),
  out_of_pocket_max NUMERIC(10,2),
  out_of_pocket_remaining NUMERIC(10,2),
  
  -- ABA-specific benefits
  aba_covered BOOLEAN,
  aba_auth_required BOOLEAN,
  aba_visit_limit INTEGER,
  aba_visits_used INTEGER,
  aba_dollar_limit NUMERIC(10,2),
  aba_dollars_used NUMERIC(10,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error', 'no_response', 'manual')),
  error_message TEXT,
  
  -- Audit
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.eligibility_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all eligibility checks"
ON public.eligibility_checks FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Staff can view eligibility for accessible students"
ON public.eligibility_checks FOR SELECT
USING (
  has_student_access(student_id, auth.uid()) OR
  is_student_owner(student_id, auth.uid())
);

CREATE POLICY "Staff can create eligibility checks for accessible students"
ON public.eligibility_checks FOR INSERT
WITH CHECK (
  has_student_access(student_id, auth.uid()) OR
  is_student_owner(student_id, auth.uid())
);

-- Prior authorization requests table
CREATE TABLE public.prior_auth_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.payers(id),
  authorization_id UUID REFERENCES public.authorizations(id),
  
  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN ('initial', 'continuation', 'modification', 'expedited')),
  service_codes TEXT[] NOT NULL,
  units_requested INTEGER NOT NULL,
  service_start_date DATE NOT NULL,
  service_end_date DATE NOT NULL,
  
  -- Clinical justification (AI-generated)
  diagnosis_codes TEXT[],
  clinical_summary TEXT,
  medical_necessity TEXT,
  treatment_goals TEXT[],
  supporting_documentation JSONB,
  ai_generated_justification TEXT,
  
  -- Submission tracking
  submission_method TEXT CHECK (submission_method IN ('portal', 'fax', 'phone', 'electronic')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  
  -- Payer response
  payer_reference_number TEXT,
  decision TEXT CHECK (decision IN ('pending', 'approved', 'denied', 'partial', 'additional_info_needed')),
  decision_date DATE,
  approved_units INTEGER,
  denial_reason TEXT,
  appeal_deadline DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'submitted', 'in_review', 'completed', 'cancelled')),
  
  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prior_auth_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all prior auth requests"
ON public.prior_auth_requests FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Staff can view prior auth for accessible students"
ON public.prior_auth_requests FOR SELECT
USING (
  has_student_access(student_id, auth.uid()) OR
  is_student_owner(student_id, auth.uid())
);

CREATE POLICY "Staff can create prior auth for accessible students"
ON public.prior_auth_requests FOR INSERT
WITH CHECK (
  has_student_access(student_id, auth.uid()) OR
  is_student_owner(student_id, auth.uid())
);

CREATE POLICY "Staff can update their own prior auth requests"
ON public.prior_auth_requests FOR UPDATE
USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_billing_payments_student ON public.billing_payments(student_id);
CREATE INDEX idx_billing_payments_status ON public.billing_payments(status);
CREATE INDEX idx_billing_payments_created ON public.billing_payments(created_at DESC);
CREATE INDEX idx_stored_payment_methods_student ON public.stored_payment_methods(student_id);
CREATE INDEX idx_payment_plans_student ON public.payment_plans(student_id);
CREATE INDEX idx_payment_plans_next_payment ON public.payment_plans(next_payment_date) WHERE status = 'active';
CREATE INDEX idx_eligibility_checks_student ON public.eligibility_checks(student_id);
CREATE INDEX idx_eligibility_checks_date ON public.eligibility_checks(performed_at DESC);
CREATE INDEX idx_prior_auth_student ON public.prior_auth_requests(student_id);
CREATE INDEX idx_prior_auth_status ON public.prior_auth_requests(status);

-- Update trigger for all new tables
CREATE TRIGGER update_billing_payments_updated_at
  BEFORE UPDATE ON public.billing_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stored_payment_methods_updated_at
  BEFORE UPDATE ON public.stored_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prior_auth_requests_updated_at
  BEFORE UPDATE ON public.prior_auth_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();