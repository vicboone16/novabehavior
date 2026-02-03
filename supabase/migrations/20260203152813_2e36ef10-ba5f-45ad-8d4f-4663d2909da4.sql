-- Create client_accommodations table for IEP accommodations/modifications
CREATE TABLE public.client_accommodations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- presentation, response, setting, timing, behavioral, other
  title TEXT NOT NULL,
  description TEXT,
  implementation_notes TEXT,
  settings TEXT[] DEFAULT '{}', -- applicable settings: Classroom, Testing, etc.
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE,
  end_date DATE,
  review_date DATE,
  responsible_staff TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_client_accommodations_client_id ON public.client_accommodations(client_id);
CREATE INDEX idx_client_accommodations_category ON public.client_accommodations(category);
CREATE INDEX idx_client_accommodations_is_active ON public.client_accommodations(is_active);

-- Enable RLS
ALTER TABLE public.client_accommodations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view accommodations for accessible students"
ON public.client_accommodations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = client_accommodations.client_id
    AND (
      s.user_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_student_access usa
        WHERE usa.student_id = s.id
        AND usa.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Admins and owners can insert accommodations"
ON public.client_accommodations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = client_accommodations.client_id
    AND (
      s.user_id = auth.uid()
      OR public.is_admin(auth.uid())
    )
  )
);

CREATE POLICY "Admins and owners can update accommodations"
ON public.client_accommodations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = client_accommodations.client_id
    AND (
      s.user_id = auth.uid()
      OR public.is_admin(auth.uid())
    )
  )
);

CREATE POLICY "Admins and owners can delete accommodations"
ON public.client_accommodations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = client_accommodations.client_id
    AND (
      s.user_id = auth.uid()
      OR public.is_admin(auth.uid())
    )
  )
);

-- Update trigger for updated_at
CREATE TRIGGER update_client_accommodations_updated_at
BEFORE UPDATE ON public.client_accommodations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create feature_permissions table for granular user permissions
CREATE TABLE public.feature_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Menu/Navigation Access
  menu_staff BOOLEAN DEFAULT false,
  menu_client BOOLEAN DEFAULT true,
  menu_payer BOOLEAN DEFAULT false,
  menu_schedule BOOLEAN DEFAULT true,
  menu_billing BOOLEAN DEFAULT false,
  menu_payroll BOOLEAN DEFAULT false,
  menu_reports BOOLEAN DEFAULT true,
  menu_settings BOOLEAN DEFAULT false,
  menu_forms BOOLEAN DEFAULT true,
  
  -- General Access
  billing_financials BOOLEAN DEFAULT false,
  payroll_financials BOOLEAN DEFAULT false,
  all_staff BOOLEAN DEFAULT false,
  all_clients BOOLEAN DEFAULT false,
  activity_tracking BOOLEAN DEFAULT false,
  notifications BOOLEAN DEFAULT true,
  
  -- Staff Permissions
  staff_list BOOLEAN DEFAULT false,
  staff_info BOOLEAN DEFAULT false,
  staff_profile BOOLEAN DEFAULT false,
  staff_personal_info BOOLEAN DEFAULT false,
  staff_custom_fields BOOLEAN DEFAULT false,
  staff_supervisor BOOLEAN DEFAULT false,
  staff_qualifications BOOLEAN DEFAULT false,
  staff_pay_rates BOOLEAN DEFAULT false,
  staff_cabinet BOOLEAN DEFAULT false,
  add_new_staff BOOLEAN DEFAULT false,
  manage_clinical_teams BOOLEAN DEFAULT false,
  
  -- Client Permissions
  client_list BOOLEAN DEFAULT true,
  client_info BOOLEAN DEFAULT true,
  client_profile BOOLEAN DEFAULT true,
  client_personal_info BOOLEAN DEFAULT true,
  client_custom_fields BOOLEAN DEFAULT true,
  client_contacts BOOLEAN DEFAULT true,
  client_assignments BOOLEAN DEFAULT true,
  client_authorization BOOLEAN DEFAULT false,
  client_cabinet BOOLEAN DEFAULT true,
  add_new_client BOOLEAN DEFAULT false,
  
  -- Payer Permissions
  payer_list BOOLEAN DEFAULT false,
  payer_info BOOLEAN DEFAULT false,
  payer_profile BOOLEAN DEFAULT false,
  payer_services BOOLEAN DEFAULT false,
  payer_cabinet BOOLEAN DEFAULT false,
  add_new_payer BOOLEAN DEFAULT false,
  
  -- Schedule Permissions
  my_schedule BOOLEAN DEFAULT true,
  create_appointment BOOLEAN DEFAULT true,
  appointment_info BOOLEAN DEFAULT true,
  cancel_appointment BOOLEAN DEFAULT true,
  delete_appointment BOOLEAN DEFAULT false,
  schedule_verification BOOLEAN DEFAULT false,
  schedule_billing BOOLEAN DEFAULT false,
  master_availability BOOLEAN DEFAULT false,
  schedule_documents BOOLEAN DEFAULT true,
  other_schedule BOOLEAN DEFAULT false,
  
  -- Billing Permissions (Accounts Receivable)
  ar_manager BOOLEAN DEFAULT false,
  ar_post_payment BOOLEAN DEFAULT false,
  ar_fix_claims BOOLEAN DEFAULT false,
  ar_reports BOOLEAN DEFAULT false,
  ar_rebill BOOLEAN DEFAULT false,
  ar_readiness BOOLEAN DEFAULT false,
  
  -- Billing Manager
  billing_generate_invoice BOOLEAN DEFAULT false,
  billing_provider_identifier BOOLEAN DEFAULT false,
  billing_verification_forms BOOLEAN DEFAULT false,
  billing_payment_source BOOLEAN DEFAULT false,
  billing_billed_files BOOLEAN DEFAULT false,
  
  -- Reports Permissions
  reports_staff_list BOOLEAN DEFAULT false,
  reports_client_list BOOLEAN DEFAULT true,
  reports_payer_list BOOLEAN DEFAULT false,
  reports_appointment_list BOOLEAN DEFAULT true,
  reports_authorization_summary BOOLEAN DEFAULT false,
  reports_profit_loss BOOLEAN DEFAULT false,
  reports_staff_productivity BOOLEAN DEFAULT false,
  reports_user_login_history BOOLEAN DEFAULT false,
  reports_expiring_authorization BOOLEAN DEFAULT false,
  reports_appointment_billing BOOLEAN DEFAULT false,
  reports_payroll BOOLEAN DEFAULT false,
  reports_payer_aging BOOLEAN DEFAULT false,
  reports_client_aging BOOLEAN DEFAULT false,
  reports_billing_ledger BOOLEAN DEFAULT false,
  
  -- Settings Permissions
  settings_cancellation_types BOOLEAN DEFAULT false,
  settings_custom_lists BOOLEAN DEFAULT false,
  settings_custom_fields BOOLEAN DEFAULT false,
  settings_organization BOOLEAN DEFAULT false,
  settings_payroll BOOLEAN DEFAULT false,
  settings_qualifications BOOLEAN DEFAULT false,
  settings_services BOOLEAN DEFAULT false,
  settings_security BOOLEAN DEFAULT false,
  settings_system BOOLEAN DEFAULT false,
  settings_subscription BOOLEAN DEFAULT false,
  settings_text_reminders BOOLEAN DEFAULT false,
  
  -- Dashboard Widgets
  dashboard_active_staff BOOLEAN DEFAULT false,
  dashboard_active_clients BOOLEAN DEFAULT true,
  dashboard_active_auths BOOLEAN DEFAULT false,
  dashboard_expiring_quals BOOLEAN DEFAULT false,
  dashboard_incomplete_appts BOOLEAN DEFAULT true,
  dashboard_unbilled_appts BOOLEAN DEFAULT false,
  dashboard_staff_summary BOOLEAN DEFAULT false,
  dashboard_aging_report BOOLEAN DEFAULT false,
  dashboard_billing_summary BOOLEAN DEFAULT false,
  dashboard_scheduled_vs_completed BOOLEAN DEFAULT true,
  dashboard_daily_appointments BOOLEAN DEFAULT true,
  dashboard_cancelled_summary BOOLEAN DEFAULT false,
  dashboard_weekly_hours BOOLEAN DEFAULT true,
  dashboard_miles_driven BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_feature_permissions_user_id ON public.feature_permissions(user_id);

-- Enable RLS
ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own permissions"
ON public.feature_permissions FOR SELECT
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage permissions"
ON public.feature_permissions FOR ALL
USING (public.is_admin(auth.uid()));

-- Update trigger
CREATE TRIGGER update_feature_permissions_updated_at
BEFORE UPDATE ON public.feature_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user permissions with defaults
CREATE OR REPLACE FUNCTION public.get_user_feature_permissions(_user_id UUID)
RETURNS public.feature_permissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perms public.feature_permissions;
BEGIN
  SELECT * INTO perms FROM public.feature_permissions WHERE user_id = _user_id;
  
  IF perms IS NULL THEN
    -- Return default permissions based on role
    SELECT fp.* INTO perms 
    FROM public.feature_permissions fp
    WHERE fp.user_id = _user_id;
  END IF;
  
  RETURN perms;
END;
$$;