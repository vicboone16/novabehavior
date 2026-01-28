-- Create session notes table with full audit trail
CREATE TABLE public.session_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('quick', 'aba_session', 'soap', 'consultation')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending_review', 'approved', 'needs_revision', 'rejected')),
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  -- Supervisor review fields (for later)
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_status TEXT CHECK (review_status IN ('pending', 'approved', 'needs_revision', 'rejected')),
  reviewer_comments TEXT,
  fidelity_met BOOLEAN,
  
  -- Edit tracking
  last_edited_at TIMESTAMP WITH TIME ZONE,
  last_edited_by UUID
);

-- Create note requirements config table (role + student based)
CREATE TABLE public.note_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  role TEXT,
  setting TEXT,
  notes_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  -- Allow either student-level or role-level requirements
  CONSTRAINT valid_requirement CHECK (student_id IS NOT NULL OR role IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_requirements ENABLE ROW LEVEL SECURITY;

-- RLS policies for session_notes
CREATE POLICY "Users can create their own session notes"
ON public.session_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own session notes"
ON public.session_notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft notes"
ON public.session_notes
FOR UPDATE
USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Admins can view all session notes"
ON public.session_notes
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all session notes"
ON public.session_notes
FOR UPDATE
USING (is_admin(auth.uid()));

-- RLS policies for note_requirements
CREATE POLICY "Admins can manage note requirements"
ON public.note_requirements
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view note requirements"
ON public.note_requirements
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add student-level note requirement field
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS notes_required BOOLEAN DEFAULT false;

-- Add session status tracking
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended'));

-- Add per-student session status tracking table
CREATE TABLE public.student_session_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paused_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  total_active_duration_seconds INTEGER DEFAULT 0,
  notes_submitted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(session_id, student_id)
);

-- Enable RLS for student_session_status
ALTER TABLE public.student_session_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own student session status"
ON public.student_session_status
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = student_session_status.session_id
    AND s.user_id = auth.uid()
  )
);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_session_status;