
-- Shared staff library items metadata
CREATE TABLE public.shared_library_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT '',
  file_size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_library_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read shared library items
CREATE POLICY "Authenticated users can read shared library items"
  ON public.shared_library_items
  FOR SELECT TO authenticated USING (true);

-- Users can insert their own items
CREATE POLICY "Users can upload shared library items"
  ON public.shared_library_items
  FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());

-- Users can update their own items
CREATE POLICY "Users can update own library items"
  ON public.shared_library_items
  FOR UPDATE TO authenticated USING (uploaded_by = auth.uid());

-- Users can delete their own items
CREATE POLICY "Users can delete own library items"
  ON public.shared_library_items
  FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

-- Create a public storage bucket for shared library files
INSERT INTO storage.buckets (id, name, public) VALUES ('shared-library', 'shared-library', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload to shared library"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shared-library');

CREATE POLICY "Anyone can read shared library files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'shared-library');

CREATE POLICY "Users can delete own shared library files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'shared-library');
