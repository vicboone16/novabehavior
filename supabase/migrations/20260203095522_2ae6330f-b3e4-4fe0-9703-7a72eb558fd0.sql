-- Create document inbox table for fax/email receiving
CREATE TABLE public.document_inbox (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_type TEXT NOT NULL CHECK (source_type IN ('fax', 'email', 'manual_upload')),
  sender_info TEXT,
  subject_line TEXT,
  raw_content_url TEXT,
  extracted_text TEXT,
  ai_suggested_student_id UUID REFERENCES public.students(id),
  ai_confidence_score NUMERIC(3,2),
  ai_suggested_document_type TEXT,
  assigned_student_id UUID REFERENCES public.students(id),
  assigned_referral_id UUID REFERENCES public.referrals(id),
  document_type TEXT CHECK (document_type IN ('authorization', 'medical_record', 'consent', 'eval', 'prescription', 'lab_results', 'correspondence', 'other')),
  status TEXT NOT NULL DEFAULT 'unprocessed' CHECK (status IN ('unprocessed', 'processing', 'matched', 'filed', 'archived', 'rejected')),
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  retention_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 years'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_document_inbox_status ON public.document_inbox(status);
CREATE INDEX idx_document_inbox_source ON public.document_inbox(source_type);
CREATE INDEX idx_document_inbox_assigned_student ON public.document_inbox(assigned_student_id);
CREATE INDEX idx_document_inbox_received ON public.document_inbox(received_at DESC);

-- Enable RLS
ALTER TABLE public.document_inbox ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view inbox documents"
ON public.document_inbox FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert inbox documents"
ON public.document_inbox FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update inbox documents"
ON public.document_inbox FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete inbox documents"
ON public.document_inbox FOR DELETE
USING (is_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_document_inbox_updated_at
BEFORE UPDATE ON public.document_inbox
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for inbox documents
INSERT INTO storage.buckets (id, name, public) VALUES ('inbox-documents', 'inbox-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for inbox-documents bucket
CREATE POLICY "Staff can upload inbox documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inbox-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Staff can view inbox documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'inbox-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Staff can delete inbox documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'inbox-documents' AND auth.uid() IS NOT NULL);