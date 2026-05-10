
-- 1. sms_student_codes
CREATE TABLE public.sms_student_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  student_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code)
);
ALTER TABLE public.sms_student_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view student codes"
  ON public.sms_student_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage student codes"
  ON public.sms_student_codes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2. sms_behavior_shortcodes
CREATE TABLE public.sms_behavior_shortcodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  behavior_id UUID,
  student_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code, student_id)
);
ALTER TABLE public.sms_behavior_shortcodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view behavior shortcodes"
  ON public.sms_behavior_shortcodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage behavior shortcodes"
  ON public.sms_behavior_shortcodes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. sms_behavior_log
CREATE TABLE public.sms_behavior_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_body TEXT NOT NULL,
  from_phone TEXT NOT NULL,
  twilio_message_sid TEXT,
  entry_type TEXT NOT NULL DEFAULT 'frequency',
  parsed_student_code TEXT,
  parsed_behavior_code TEXT,
  parsed_count INTEGER,
  parsed_duration_seconds INTEGER,
  student_id UUID,
  behavior_id UUID,
  staff_id UUID,
  count INTEGER,
  duration_seconds INTEGER,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  session_id UUID,
  bsd_row_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_behavior_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view sms behavior logs"
  ON public.sms_behavior_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sms behavior logs"
  ON public.sms_behavior_log FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));
