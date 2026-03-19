
CREATE TABLE IF NOT EXISTS public.curriculum_library_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL UNIQUE,
  adapter_view_name text NOT NULL,
  refresh_function_name text,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.curriculum_library_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read curriculum_library_registry" ON public.curriculum_library_registry FOR SELECT TO authenticated USING (true);
