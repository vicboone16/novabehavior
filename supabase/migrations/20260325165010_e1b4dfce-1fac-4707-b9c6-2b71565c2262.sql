
-- Parent messages: scoped student-specific threads between parents and teachers
CREATE TABLE IF NOT EXISTS public.parent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  sender_type text NOT NULL DEFAULT 'parent',
  sender_name text,
  sender_token text,
  sender_user_id uuid,
  message_text text NOT NULL,
  is_quick_reply boolean NOT NULL DEFAULT false,
  quick_reply_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_messages_student
  ON public.parent_messages (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parent_messages_token
  ON public.parent_messages (sender_token);

ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;

-- Staff with student access can read/write
CREATE POLICY "Staff manage parent_messages"
  ON public.parent_messages FOR ALL TO authenticated
  USING (public.has_student_access(auth.uid(), student_id));

-- Add parent_name to access links for display
ALTER TABLE public.parent_access_links
  ADD COLUMN IF NOT EXISTS parent_name text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
