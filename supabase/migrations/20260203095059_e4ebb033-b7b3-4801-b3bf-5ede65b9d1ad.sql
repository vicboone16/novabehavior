-- Create consent form templates table
CREATE TABLE public.consent_form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  form_type TEXT NOT NULL DEFAULT 'consent' CHECK (form_type IN ('consent', 'intake', 'roi', 'service_agreement')),
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature_zones JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create consent form submissions table
CREATE TABLE public.consent_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.consent_form_templates(id),
  student_id UUID REFERENCES public.students(id),
  referral_id UUID REFERENCES public.referrals(id),
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_relationship TEXT,
  signature_data TEXT,
  signature_ip_address TEXT,
  signature_user_agent TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired', 'voided')),
  access_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  retention_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 years'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create signature audit log table (immutable)
CREATE TABLE public.signature_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.consent_form_submissions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'viewed', 'signed', 'voided', 'expired', 'resent')),
  ip_address TEXT,
  user_agent TEXT,
  performed_by UUID,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_consent_form_templates_active ON public.consent_form_templates(is_active);
CREATE INDEX idx_consent_form_templates_type ON public.consent_form_templates(form_type);
CREATE INDEX idx_consent_form_submissions_student ON public.consent_form_submissions(student_id);
CREATE INDEX idx_consent_form_submissions_referral ON public.consent_form_submissions(referral_id);
CREATE INDEX idx_consent_form_submissions_status ON public.consent_form_submissions(status);
CREATE INDEX idx_consent_form_submissions_token ON public.consent_form_submissions(access_token);
CREATE INDEX idx_signature_audit_log_submission ON public.signature_audit_log(submission_id);

-- Enable RLS
ALTER TABLE public.consent_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consent_form_templates
CREATE POLICY "Authenticated users can view active templates"
ON public.consent_form_templates FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage templates"
ON public.consent_form_templates FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies for consent_form_submissions
CREATE POLICY "Users can view submissions they created or for their students"
ON public.consent_form_submissions FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_admin(auth.uid()) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    student_id IN (SELECT student_id FROM public.user_student_access WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Staff can create submissions"
ON public.consent_form_submissions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update submissions"
ON public.consent_form_submissions FOR UPDATE
USING (is_admin(auth.uid()));

-- Public access for signing via token (no auth required)
CREATE POLICY "Public can view submission by token"
ON public.consent_form_submissions FOR SELECT
USING (status = 'pending' AND expires_at > now());

CREATE POLICY "Public can update submission by token for signing"
ON public.consent_form_submissions FOR UPDATE
USING (status = 'pending' AND expires_at > now());

-- RLS Policies for signature_audit_log
CREATE POLICY "Users can view audit logs for accessible submissions"
ON public.signature_audit_log FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  submission_id IN (SELECT id FROM public.consent_form_submissions)
);

CREATE POLICY "System can insert audit logs"
ON public.signature_audit_log FOR INSERT
WITH CHECK (true);

-- Add updated_at triggers
CREATE TRIGGER update_consent_form_templates_updated_at
BEFORE UPDATE ON public.consent_form_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consent_form_submissions_updated_at
BEFORE UPDATE ON public.consent_form_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for consent forms
INSERT INTO storage.buckets (id, name, public) VALUES ('consent-forms', 'consent-forms', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for consent-forms bucket
CREATE POLICY "Authenticated users can upload consent forms"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'consent-forms' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their consent forms"
ON storage.objects FOR SELECT
USING (bucket_id = 'consent-forms' AND auth.uid() IS NOT NULL);