
-- ========================================================
-- Multi-staff session participation & note delegation
-- ========================================================

-- 1. Track which staff members actively participated in a session
CREATE TABLE IF NOT EXISTS public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,          -- references sessions.id
  user_id UUID NOT NULL,             -- the staff member who participated
  student_ids UUID[] NOT NULL DEFAULT '{}', -- which students this participant collected data for
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  role TEXT NOT NULL DEFAULT 'data_collector',  -- 'data_collector' | 'lead' | 'observer'
  note_delegate BOOLEAN NOT NULL DEFAULT false, -- true = this person writes the clinical note
  note_delegate_assigned_by UUID,    -- who assigned them as the note writer
  note_delegate_assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- Staff can see participants for sessions they are part of (or admins)
CREATE POLICY "Staff can view session participants they belong to"
  ON public.session_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.session_participants sp2
      WHERE sp2.session_id = session_participants.session_id
        AND sp2.user_id = auth.uid()
    )
  );

-- Staff can insert themselves as participants
CREATE POLICY "Staff can join sessions as participants"
  ON public.session_participants FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Staff can update their own participation record; admins can update any
CREATE POLICY "Staff can update their own participation"
  ON public.session_participants FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Only admins can delete participants
CREATE POLICY "Admins can delete session participants"
  ON public.session_participants FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_session_participants_updated_at
  BEFORE UPDATE ON public.session_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add shared_session_id to appointments so multiple per-staff appointments
--    can all reference the same collaborative data-collection session
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS shared_session_id UUID;

-- Index for fast lookup of all appointments sharing the same session
CREATE INDEX IF NOT EXISTS idx_appointments_shared_session_id
  ON public.appointments (shared_session_id)
  WHERE shared_session_id IS NOT NULL;

-- 3. Add note_delegate_user_id to sessions so we record who is responsible for writing the note
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS note_delegate_user_id UUID,
  ADD COLUMN IF NOT EXISTS note_delegate_method TEXT DEFAULT 'starter'; 
  -- 'starter' | 'claimed' | 'bcba_assigned'
