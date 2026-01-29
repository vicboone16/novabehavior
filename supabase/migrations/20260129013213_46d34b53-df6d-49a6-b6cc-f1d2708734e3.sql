-- Create audit_logs table for comprehensive activity tracking
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_name TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Anyone authenticated can insert their own audit logs
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create data_access_logs table for tracking who viewed what student data
CREATE TABLE public.data_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL, -- 'view', 'edit', 'export', 'print'
  data_category TEXT NOT NULL, -- 'profile', 'behaviors', 'sessions', 'notes', 'files', 'reports'
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_data_access_logs_user_id ON public.data_access_logs(user_id);
CREATE INDEX idx_data_access_logs_student_id ON public.data_access_logs(student_id);
CREATE INDEX idx_data_access_logs_created_at ON public.data_access_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view data access logs
CREATE POLICY "Admins can view all data access logs"
  ON public.data_access_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Anyone authenticated can insert their own access logs
CREATE POLICY "Authenticated users can insert data access logs"
  ON public.data_access_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create security_settings table for configurable security options
CREATE TABLE public.security_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read security settings
CREATE POLICY "Authenticated users can read security settings"
  ON public.security_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify security settings
CREATE POLICY "Admins can update security settings"
  ON public.security_settings FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert security settings"
  ON public.security_settings FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Insert default security settings
INSERT INTO public.security_settings (setting_key, setting_value, description) VALUES
  ('session_timeout_minutes', '15', 'Minutes of inactivity before automatic logout'),
  ('auto_save_interval_seconds', '120', 'Seconds between automatic data saves'),
  ('require_pin_for_sensitive_actions', 'false', 'Require PIN verification for sensitive actions'),
  ('max_failed_login_attempts', '5', 'Maximum failed login attempts before lockout'),
  ('password_min_length', '8', 'Minimum password length'),
  ('audit_log_retention_days', '365', 'Days to retain audit logs');

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _resource_type TEXT,
  _resource_id UUID DEFAULT NULL,
  _resource_name TEXT DEFAULT NULL,
  _details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, resource_name, details)
  VALUES (auth.uid(), _action, _resource_type, _resource_id, _resource_name, _details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create function to log data access
CREATE OR REPLACE FUNCTION public.log_data_access(
  _student_id UUID,
  _access_type TEXT,
  _data_category TEXT,
  _details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.data_access_logs (user_id, student_id, access_type, data_category, details)
  VALUES (auth.uid(), _student_id, _access_type, _data_category, _details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;