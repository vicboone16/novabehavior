-- Staff/Clinician Credentials and Professional Info
-- Extends profiles to support practice management features

-- Add professional credential fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credential text,
ADD COLUMN IF NOT EXISTS npi text,
ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS title text DEFAULT 'Staff',
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS hire_date date,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create credential expirations table for tracking certifications
CREATE TABLE IF NOT EXISTS public.staff_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    credential_type text NOT NULL, -- e.g., 'BCBA', 'RBT', 'BCaBA', 'QBA', 'License'
    credential_number text,
    issuing_body text,
    issue_date date,
    expiration_date date,
    is_verified boolean DEFAULT false,
    verified_by uuid,
    verified_at timestamptz,
    document_path text,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create staff caseload assignments for tracking provider-patient relationships
CREATE TABLE IF NOT EXISTS public.staff_caseloads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinician_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    assignment_type text DEFAULT 'primary', -- primary, secondary, supervisor, backup
    assigned_by uuid REFERENCES public.profiles(user_id),
    assigned_at timestamptz DEFAULT now() NOT NULL,
    ended_at timestamptz,
    status text DEFAULT 'active',
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(clinician_user_id, student_id, assignment_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_supervisor ON public.profiles(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_staff_credentials_user ON public.staff_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_credentials_expiration ON public.staff_credentials(expiration_date);
CREATE INDEX IF NOT EXISTS idx_staff_caseloads_clinician ON public.staff_caseloads(clinician_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_caseloads_student ON public.staff_caseloads(student_id);
CREATE INDEX IF NOT EXISTS idx_staff_caseloads_status ON public.staff_caseloads(status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.staff_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_caseloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_credentials
CREATE POLICY "Users can view own credentials"
ON public.staff_credentials FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all credentials"
ON public.staff_credentials FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage credentials"
ON public.staff_credentials FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can add own credentials"
ON public.staff_credentials FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS Policies for staff_caseloads
CREATE POLICY "Users can view own caseloads"
ON public.staff_caseloads FOR SELECT
USING (clinician_user_id = auth.uid());

CREATE POLICY "Admins can view all caseloads"
ON public.staff_caseloads FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage caseloads"
ON public.staff_caseloads FOR ALL
USING (public.is_admin(auth.uid()));

-- Create function to get clinician's patient count
CREATE OR REPLACE FUNCTION public.get_clinician_patient_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT student_id)::integer
  FROM public.staff_caseloads
  WHERE clinician_user_id = _user_id
    AND status = 'active'
$$;

-- Create function to get supervisor's clinician count
CREATE OR REPLACE FUNCTION public.get_supervisor_clinician_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles
  WHERE supervisor_id = _user_id
    AND status = 'active'
$$;

-- Update trigger for staff_credentials
CREATE TRIGGER update_staff_credentials_updated_at
BEFORE UPDATE ON public.staff_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();