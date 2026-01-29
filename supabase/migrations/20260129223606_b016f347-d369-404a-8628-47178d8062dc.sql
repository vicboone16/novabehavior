-- Scheduling-to-Session Workflow Enhancement

-- Add verification and service fields to appointments table
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'direct_therapy',
ADD COLUMN IF NOT EXISTS service_setting text DEFAULT 'school',
ADD COLUMN IF NOT EXISTS location_detail text,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS verification_required boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_by uuid;

-- Update status options (keep existing but ensure full set)
-- Status: scheduled | completed | canceled | rescheduled | no_show | did_not_occur | pending_verification

-- Create attendance_logs table for tracking student attendance
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  
  -- Attendance details
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  outcome TEXT NOT NULL DEFAULT 'occurred',
  reason_code TEXT,
  reason_detail TEXT,
  
  -- Follow-up tracking
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_completed_at TIMESTAMP WITH TIME ZONE,
  follow_up_notes TEXT,
  
  -- Audit
  marked_by_user_id UUID NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_verification ON public.appointments(verification_status);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_service_setting ON public.appointments(service_setting);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_student ON public.attendance_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON public.attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_outcome ON public.attendance_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_appointment ON public.attendance_logs(appointment_id);

-- Add session fields for linking
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'direct_therapy',
ADD COLUMN IF NOT EXISTS service_setting text DEFAULT 'school',
ADD COLUMN IF NOT EXISTS location_detail text,
ADD COLUMN IF NOT EXISTS verification_source text DEFAULT 'manual_entry',
ADD COLUMN IF NOT EXISTS attendance_outcome text DEFAULT 'occurred',
ADD COLUMN IF NOT EXISTS attendance_reason_code text,
ADD COLUMN IF NOT EXISTS attendance_reason_detail text,
ADD COLUMN IF NOT EXISTS has_data boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS provider_id UUID;

CREATE INDEX IF NOT EXISTS idx_sessions_appointment ON public.sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_sessions_attendance ON public.sessions(attendance_outcome);

-- Enable RLS on attendance_logs
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_logs
CREATE POLICY "Users can view attendance for accessible students"
ON public.attendance_logs FOR SELECT
USING (
  is_student_owner(student_id, auth.uid())
  OR has_student_access(student_id, auth.uid())
  OR has_tag_based_access(auth.uid(), student_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can create attendance logs"
ON public.attendance_logs FOR INSERT
WITH CHECK (
  auth.uid() = marked_by_user_id
  AND (
    is_student_owner(student_id, auth.uid())
    OR has_student_access(student_id, auth.uid())
    OR has_tag_based_access(auth.uid(), student_id)
    OR is_admin(auth.uid())
  )
);

CREATE POLICY "Users can update their own attendance logs"
ON public.attendance_logs FOR UPDATE
USING (
  auth.uid() = marked_by_user_id
  OR is_admin(auth.uid())
);

CREATE POLICY "Admins can delete attendance logs"
ON public.attendance_logs FOR DELETE
USING (is_admin(auth.uid()));

-- Add updated_at trigger for attendance_logs
CREATE TRIGGER update_attendance_logs_updated_at
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();