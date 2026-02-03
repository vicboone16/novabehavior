-- Add insurance tracking state to students
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS insurance_tracking_state TEXT DEFAULT NULL;

COMMENT ON COLUMN public.students.insurance_tracking_state IS 'active, incomplete, or hibernated for insurance mode';

-- Add insurance alerts preference
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS insurance_alerts_background BOOLEAN DEFAULT false;

-- Create authorized_services table for per-service tracking
CREATE TABLE IF NOT EXISTS public.authorized_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  authorization_id UUID NOT NULL REFERENCES public.authorizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  cpt_code TEXT,
  unit_type TEXT NOT NULL DEFAULT '15min', -- 15min, hourly, flat
  units_approved INTEGER NOT NULL DEFAULT 0,
  units_used INTEGER NOT NULL DEFAULT 0,
  units_remaining INTEGER GENERATED ALWAYS AS (units_approved - units_used) STORED,
  rate DECIMAL(10,2),
  modifier TEXT,
  place_of_service TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.authorized_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for authorized_services
CREATE POLICY "Authenticated users can view authorized_services"
  ON public.authorized_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert authorized_services"
  ON public.authorized_services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update authorized_services"
  ON public.authorized_services FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete authorized_services"
  ON public.authorized_services FOR DELETE
  TO authenticated
  USING (true);

-- Create unit_deduction_ledger for immutable tracking
CREATE TABLE IF NOT EXISTS public.unit_deduction_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  authorization_id UUID NOT NULL REFERENCES public.authorizations(id) ON DELETE CASCADE,
  authorized_service_id UUID REFERENCES public.authorized_services(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  units_deducted INTEGER NOT NULL,
  deduction_reason TEXT NOT NULL DEFAULT 'auto', -- auto, manual, default, override
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unit_deduction_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view unit_deduction_ledger"
  ON public.unit_deduction_ledger FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert unit_deduction_ledger"
  ON public.unit_deduction_ledger FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add tracking fields to authorizations
ALTER TABLE public.authorizations
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

ALTER TABLE public.authorizations
ADD COLUMN IF NOT EXISTS matching_rule TEXT DEFAULT 'service_first';

ALTER TABLE public.authorizations
ADD COLUMN IF NOT EXISTS warning_behavior TEXT DEFAULT 'allow_mark_review';

ALTER TABLE public.authorizations
ADD COLUMN IF NOT EXISTS alert_expiring_30_days BOOLEAN DEFAULT true;

ALTER TABLE public.authorizations
ADD COLUMN IF NOT EXISTS alert_low_units_20 BOOLEAN DEFAULT true;

ALTER TABLE public.authorizations
ADD COLUMN IF NOT EXISTS alert_no_match BOOLEAN DEFAULT false;

ALTER TABLE public.authorizations
ADD COLUMN IF NOT EXISTS alert_exhausted BOOLEAN DEFAULT false;

-- Add authorization matching to sessions
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS authorization_id UUID REFERENCES public.authorizations(id);

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS authorized_service_id UUID REFERENCES public.authorized_services(id);

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS authorization_status TEXT DEFAULT 'pending'; -- pending, matched, needs_review, excluded

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'non_billable'; -- non_billable, pending_note, pending_auth_review, pending_approval, billable, exported

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS funding_mode_snapshot TEXT; -- Captures funding mode at session start

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_authorized_services_auth ON public.authorized_services(authorization_id);
CREATE INDEX IF NOT EXISTS idx_authorized_services_student ON public.authorized_services(student_id);
CREATE INDEX IF NOT EXISTS idx_unit_deduction_ledger_session ON public.unit_deduction_ledger(session_id);
CREATE INDEX IF NOT EXISTS idx_unit_deduction_ledger_auth ON public.unit_deduction_ledger(authorization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_auth ON public.sessions(authorization_id);

-- Trigger to update authorized_services updated_at
CREATE TRIGGER update_authorized_services_updated_at
  BEFORE UPDATE ON public.authorized_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();