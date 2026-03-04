
-- teacher_messages: matches the schema the Teacher Hub app expects
-- This is the teacher-side messaging table; BCBAs can also read/write to it
CREATE TABLE public.teacher_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id),
  sender_id UUID NOT NULL,
  recipient_id UUID,
  thread_id UUID,
  message_type TEXT NOT NULL DEFAULT 'message',
  subject TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  is_reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES public.teacher_messages(id),
  app_source TEXT DEFAULT 'teacherhub',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.teacher_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.teacher_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  storage_path TEXT,
  attachment_type TEXT DEFAULT 'file',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pending_student_changes: teachers propose edits, BCBAs approve/reject
CREATE TABLE public.pending_student_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id),
  submitted_by UUID NOT NULL,
  field_changes JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_teacher_messages_student ON public.teacher_messages(student_id);
CREATE INDEX idx_teacher_messages_sender ON public.teacher_messages(sender_id);
CREATE INDEX idx_teacher_messages_recipient ON public.teacher_messages(recipient_id);
CREATE INDEX idx_teacher_messages_thread ON public.teacher_messages(thread_id);
CREATE INDEX idx_teacher_messages_unread ON public.teacher_messages(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_teacher_msg_attachments ON public.teacher_message_attachments(message_id);
CREATE INDEX idx_pending_changes_student ON public.pending_student_changes(student_id);
CREATE INDEX idx_pending_changes_status ON public.pending_student_changes(status) WHERE status = 'pending';

-- RLS
ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_student_changes ENABLE ROW LEVEL SECURITY;

-- teacher_messages policies: sender or recipient can view
CREATE POLICY "Users can view own teacher messages"
  ON public.teacher_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send teacher messages"
  ON public.teacher_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can update teacher messages"
  ON public.teacher_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Admins can also view all teacher messages in their agency
CREATE POLICY "Admins view all teacher messages"
  ON public.teacher_messages FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- teacher_message_attachments
CREATE POLICY "View attachments of accessible teacher messages"
  ON public.teacher_message_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teacher_messages m
    WHERE m.id = message_id
    AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid() OR public.is_admin(auth.uid()))
  ));

CREATE POLICY "Add attachments to own teacher messages"
  ON public.teacher_message_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teacher_messages m
    WHERE m.id = message_id AND m.sender_id = auth.uid()
  ));

-- pending_student_changes policies
CREATE POLICY "Teachers can submit pending changes"
  ON public.pending_student_changes FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Submitters can view their pending changes"
  ON public.pending_student_changes FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "Admins can view all pending changes"
  ON public.pending_student_changes FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can review pending changes"
  ON public.pending_student_changes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Enable realtime for teacher_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_messages;
