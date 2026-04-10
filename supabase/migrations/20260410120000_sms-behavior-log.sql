
-- ============================================================
-- SMS Behavior Logging System
-- Enables staff to text shortcodes to log behavior data that
-- enters a supervisor review queue before being committed.
-- ============================================================

-- 1. Student shortcodes (e.g. "KALEL" → student UUID)
CREATE TABLE IF NOT EXISTS public.sms_student_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_student_codes_code_unique UNIQUE (code)
);

-- 2. Behavior shortcodes (e.g. "PA" → behavior UUID)
--    student_id IS NULL → global; student_id SET → student-specific override
CREATE TABLE IF NOT EXISTS public.sms_behavior_shortcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text,
  behavior_id uuid NOT NULL REFERENCES public.behaviors(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_behavior_shortcodes_scoped UNIQUE (code, student_id)
);

-- Separate unique index for globals (student_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS sms_behavior_shortcodes_global_uniq
  ON public.sms_behavior_shortcodes (code)
  WHERE student_id IS NULL;

-- 3. SMS review queue
CREATE TABLE IF NOT EXISTS public.sms_behavior_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Raw SMS data
  raw_body text NOT NULL,
  from_phone text NOT NULL,
  twilio_message_sid text,
  received_at timestamptz NOT NULL DEFAULT now(),

  -- Entry type (determines how approval commits data)
  entry_type text NOT NULL DEFAULT 'frequency'
    CHECK (entry_type IN ('frequency','duration','observed_zero','no_behaviors','abc')),

  -- Parsed tokens
  parsed_student_code text,
  parsed_behavior_code text,
  parsed_count integer,
  parsed_duration_seconds integer,
  parsed_time_text text,

  -- ABC raw fields (for natural-language messages)
  abc_antecedent text,
  abc_behavior_raw text,
  abc_consequence text,

  -- Resolved / editable before approval
  student_id uuid REFERENCES public.students(id),
  behavior_id uuid REFERENCES public.behaviors(id),
  staff_id uuid REFERENCES public.profiles(id),
  count integer,
  duration_seconds integer,
  observation_minutes integer,
  logged_at timestamptz NOT NULL DEFAULT now(),
  notes text,

  -- Review state
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','needs_student','approved','rejected')),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  rejection_reason text,

  -- Post-approval refs
  session_id uuid,
  bsd_row_id uuid,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS sms_behavior_log_sid_uniq
  ON public.sms_behavior_log (twilio_message_sid)
  WHERE twilio_message_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS sms_behavior_log_status_idx
  ON public.sms_behavior_log (status, received_at DESC);

CREATE INDEX IF NOT EXISTS sms_behavior_log_phone_idx
  ON public.sms_behavior_log (from_phone, received_at DESC);

-- RLS
ALTER TABLE public.sms_student_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_behavior_shortcodes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_behavior_log         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_sms_student_codes"
  ON public.sms_student_codes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_sms_behavior_shortcodes"
  ON public.sms_behavior_shortcodes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_sms_behavior_log"
  ON public.sms_behavior_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Service role (edge function) access
GRANT ALL ON public.sms_student_codes        TO service_role;
GRANT ALL ON public.sms_behavior_shortcodes  TO service_role;
GRANT ALL ON public.sms_behavior_log         TO service_role;
GRANT ALL ON public.sms_student_codes        TO authenticated;
GRANT ALL ON public.sms_behavior_shortcodes  TO authenticated;
GRANT ALL ON public.sms_behavior_log         TO authenticated;
