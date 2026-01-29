-- Create appointments table for scheduling
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  staff_user_id uuid,
  created_by uuid NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  is_recurring boolean DEFAULT false,
  recurrence_rule jsonb,
  status text NOT NULL DEFAULT 'scheduled',
  appointment_type text NOT NULL DEFAULT 'scheduled',
  linked_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  notes text,
  color text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_appointments_student_id ON public.appointments(student_id);
CREATE INDEX idx_appointments_staff_user_id ON public.appointments(staff_user_id);
CREATE INDEX idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Admins can manage all appointments
CREATE POLICY "Admins can manage all appointments" 
  ON public.appointments 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Users can view appointments they're assigned to
CREATE POLICY "Users can view their assigned appointments" 
  ON public.appointments 
  FOR SELECT 
  USING (staff_user_id = auth.uid());

-- Enable realtime for appointments
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Create trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();