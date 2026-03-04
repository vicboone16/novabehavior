
-- Staff messaging system for cross-app communication (Nova Track, Teacher Hub, Student Connect)
-- Threaded per-student between BCBAs and Teachers

CREATE TABLE public.staff_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id),
  sender_id UUID NOT NULL,
  recipient_id UUID,
  message_type TEXT NOT NULL DEFAULT 'message' CHECK (message_type IN ('message', 'task_assignment', 'data_share', 'pdf_share', 'summary')),
  subject TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES public.staff_messages(id),
  app_source TEXT DEFAULT 'novatrack',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.staff_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  storage_path TEXT,
  attachment_type TEXT DEFAULT 'file' CHECK (attachment_type IN ('file', 'pdf_report', 'data_snapshot', 'assessment_result')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_staff_messages_student ON public.staff_messages(student_id);
CREATE INDEX idx_staff_messages_sender ON public.staff_messages(sender_id);
CREATE INDEX idx_staff_messages_recipient ON public.staff_messages(recipient_id);
CREATE INDEX idx_staff_messages_unread ON public.staff_messages(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_staff_messages_thread ON public.staff_messages(student_id, parent_message_id);
CREATE INDEX idx_staff_message_attachments_msg ON public.staff_message_attachments(message_id);

-- Enable RLS
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS: users can see messages they sent or received
CREATE POLICY "Users can view own messages"
  ON public.staff_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can insert messages"
  ON public.staff_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can update read status"
  ON public.staff_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Attachment policies follow message access
CREATE POLICY "Users can view attachments of accessible messages"
  ON public.staff_message_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff_messages m
    WHERE m.id = message_id
    AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
  ));

CREATE POLICY "Users can add attachments to own messages"
  ON public.staff_message_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.staff_messages m
    WHERE m.id = message_id AND m.sender_id = auth.uid()
  ));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
