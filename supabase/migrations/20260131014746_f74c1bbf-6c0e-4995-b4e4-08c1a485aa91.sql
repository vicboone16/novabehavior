-- Create enum types for TOI events
CREATE TYPE public.toi_event_type AS ENUM (
  'TOI_SLEEPING',
  'TOI_NURSE_OFFICE',
  'TOI_HEALTH_ROOM_REST',
  'TOI_MED_SIDE_EFFECT_FATIGUE',
  'TOI_ILLNESS_LETHARGY',
  'TOI_DECOMPRESSION_BREAK',
  'TOI_WAITING_PICKUP',
  'TOI_OTHER'
);

CREATE TYPE public.toi_location AS ENUM (
  'classroom',
  'nurse',
  'office',
  'sensory_room',
  'outside',
  'other'
);

CREATE TYPE public.toi_contributor AS ENUM (
  'medication_change',
  'missed_dose',
  'illness',
  'poor_sleep_night',
  'unknown',
  'other'
);

-- Create context_barriers_events table
CREATE TABLE public.context_barriers_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  event_group TEXT NOT NULL DEFAULT 'TOI',
  event_type public.toi_event_type NOT NULL,
  display_label TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  location public.toi_location,
  suspected_contributor public.toi_contributor,
  notes TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_context_barriers_student_id ON public.context_barriers_events(student_id);
CREATE INDEX idx_context_barriers_start_time ON public.context_barriers_events(start_time);
CREATE INDEX idx_context_barriers_is_active ON public.context_barriers_events(is_active);
CREATE INDEX idx_context_barriers_event_type ON public.context_barriers_events(event_type);

-- Enable Row Level Security
ALTER TABLE public.context_barriers_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies - using correct app_role values (super_admin, admin, staff, viewer)
CREATE POLICY "Users can view TOI events for accessible students"
ON public.context_barriers_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_student_access usa
    WHERE usa.student_id = context_barriers_events.student_id
    AND usa.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Users can create TOI events for accessible students"
ON public.context_barriers_events
FOR INSERT
WITH CHECK (
  auth.uid() = created_by_user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.user_student_access usa
      WHERE usa.student_id = context_barriers_events.student_id
      AND usa.user_id = auth.uid()
      AND usa.can_collect_data = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'staff')
    )
  )
);

CREATE POLICY "Users can update TOI events they created or with admin roles"
ON public.context_barriers_events
FOR UPDATE
USING (
  created_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Admin roles can delete TOI events"
ON public.context_barriers_events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_context_barriers_events_updated_at
BEFORE UPDATE ON public.context_barriers_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to validate no overlapping active events
CREATE OR REPLACE FUNCTION public.validate_toi_no_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping events for the same student
  IF NEW.end_time IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.context_barriers_events
      WHERE student_id = NEW.student_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (NEW.start_time, NEW.end_time) OVERLAPS (start_time, COALESCE(end_time, now()))
      )
    ) THEN
      RAISE EXCEPTION 'TOI block overlaps an existing entry for this student';
    END IF;
  ELSE
    -- For active events (no end_time), check if there's already an active event
    IF EXISTS (
      SELECT 1 FROM public.context_barriers_events
      WHERE student_id = NEW.student_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'This student already has a TOI block running';
    END IF;
  END IF;
  
  -- Calculate duration if end_time exists
  IF NEW.end_time IS NOT NULL THEN
    NEW.duration_minutes := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60);
    NEW.is_active := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_toi_overlap_trigger
BEFORE INSERT OR UPDATE ON public.context_barriers_events
FOR EACH ROW
EXECUTE FUNCTION public.validate_toi_no_overlap();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.context_barriers_events;