
-- Create table for per-student, per-user inline session notes
CREATE TABLE IF NOT EXISTS public.session_staff_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  student_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  author_name TEXT,
  note_format TEXT NOT NULL DEFAULT 'regular' CHECK (note_format IN ('regular', 'soap')),
  -- Regular note
  note_text TEXT,
  -- SOAP fields
  soap_subjective TEXT,
  soap_objective TEXT,
  soap_assessment TEXT,
  soap_plan TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_staff_notes ENABLE ROW LEVEL SECURITY;

-- Users can read notes for sessions they are part of
CREATE POLICY "Users can read session staff notes"
  ON public.session_staff_notes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can insert their own notes
CREATE POLICY "Users can insert their own session staff notes"
  ON public.session_staff_notes
  FOR INSERT
  WITH CHECK (auth.uid() = author_user_id);

-- Users can update only their own notes
CREATE POLICY "Users can update their own session staff notes"
  ON public.session_staff_notes
  FOR UPDATE
  USING (auth.uid() = author_user_id);

-- Users can delete only their own draft notes
CREATE POLICY "Users can delete their own draft session staff notes"
  ON public.session_staff_notes
  FOR DELETE
  USING (auth.uid() = author_user_id AND status = 'draft');

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_session_staff_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_session_staff_notes_updated_at
  BEFORE UPDATE ON public.session_staff_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_staff_notes_updated_at();
