
-- Phase 2a: Create caregiver_notes table
CREATE TABLE public.caregiver_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  tags text[] DEFAULT '{}',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'nova_ai')),
  ai_raw_input text,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'final')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.caregiver_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view caregiver notes for accessible students"
  ON public.caregiver_notes FOR SELECT TO authenticated
  USING (public.has_student_access(student_id, auth.uid()));

CREATE POLICY "Users can insert caregiver notes for accessible students"
  ON public.caregiver_notes FOR INSERT TO authenticated
  WITH CHECK (public.has_student_access(student_id, auth.uid()) AND author_user_id = auth.uid());

CREATE POLICY "Authors can update their own caregiver notes"
  ON public.caregiver_notes FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Authors can delete their own caregiver notes"
  ON public.caregiver_notes FOR DELETE TO authenticated
  USING (author_user_id = auth.uid());

CREATE INDEX idx_caregiver_notes_student_id ON public.caregiver_notes(student_id);
CREATE INDEX idx_caregiver_notes_author ON public.caregiver_notes(author_user_id);

-- Phase 2b: Enhance ai_chat_logs with new columns
ALTER TABLE public.ai_chat_logs
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intent_detected text,
  ADD COLUMN IF NOT EXISTS actions_taken jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS structured_output jsonb;

CREATE INDEX idx_ai_chat_logs_client_id ON public.ai_chat_logs(client_id);
