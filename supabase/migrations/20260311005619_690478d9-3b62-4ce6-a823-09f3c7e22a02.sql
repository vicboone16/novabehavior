
-- IEP documents table for uploaded IEP PDFs
CREATE TABLE IF NOT EXISTS public.iep_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text,
  student_id text,
  uploaded_by uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes integer,
  pipeline_status text NOT NULL DEFAULT 'uploaded',
  ocr_raw_text text,
  cleaned_text text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.iep_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own iep_documents"
  ON public.iep_documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can view own iep_documents"
  ON public.iep_documents FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can update own iep_documents"
  ON public.iep_documents FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR is_admin(auth.uid()));

-- IEP extracted goals
CREATE TABLE IF NOT EXISTS public.iep_extracted_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.iep_documents(id) ON DELETE CASCADE,
  goal_area text,
  goal_text text,
  baseline text,
  target text,
  measurement_method text,
  status text DEFAULT 'active',
  confidence_score numeric,
  raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.iep_extracted_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read goals from own documents" ON public.iep_extracted_goals
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

CREATE POLICY "Users can insert goals for own documents" ON public.iep_extracted_goals
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

CREATE POLICY "Users can update goals for own documents" ON public.iep_extracted_goals
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

-- IEP extracted progress
CREATE TABLE IF NOT EXISTS public.iep_extracted_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.iep_documents(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES public.iep_extracted_goals(id) ON DELETE SET NULL,
  progress_text text,
  date_reported text,
  metric_value text,
  confidence_score numeric,
  raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.iep_extracted_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read progress from own documents" ON public.iep_extracted_progress
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

CREATE POLICY "Users can insert progress for own documents" ON public.iep_extracted_progress
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

CREATE POLICY "Users can update progress for own documents" ON public.iep_extracted_progress
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

-- IEP extracted services
CREATE TABLE IF NOT EXISTS public.iep_extracted_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.iep_documents(id) ON DELETE CASCADE,
  service_type text,
  provider text,
  frequency text,
  duration text,
  location text,
  start_date text,
  end_date text,
  confidence_score numeric,
  raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.iep_extracted_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read services from own documents" ON public.iep_extracted_services
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

CREATE POLICY "Users can insert services for own documents" ON public.iep_extracted_services
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

CREATE POLICY "Users can update services for own documents" ON public.iep_extracted_services
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

-- IEP extracted accommodations
CREATE TABLE IF NOT EXISTS public.iep_extracted_accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.iep_documents(id) ON DELETE CASCADE,
  accommodation_text text,
  category text,
  setting text,
  confidence_score numeric,
  raw_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.iep_extracted_accommodations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read accommodations from own documents" ON public.iep_extracted_accommodations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

CREATE POLICY "Users can insert accommodations for own documents" ON public.iep_extracted_accommodations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

CREATE POLICY "Users can update accommodations for own documents" ON public.iep_extracted_accommodations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.iep_documents d WHERE d.id = document_id AND (d.uploaded_by = auth.uid() OR is_admin(auth.uid())))
  );

-- Storage bucket for IEP uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('iep-uploads', 'iep-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for IEP uploads
CREATE POLICY "Authenticated users can upload IEP files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'iep-uploads');

CREATE POLICY "Users can read IEP files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'iep-uploads');
