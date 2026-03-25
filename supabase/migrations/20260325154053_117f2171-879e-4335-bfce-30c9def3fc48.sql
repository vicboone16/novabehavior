
-- behavior_translations table was not created due to syntax error. parent_insights was created successfully.
-- Recreate behavior_translations with a simple unique constraint
CREATE TABLE public.behavior_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_category TEXT NOT NULL,
  clinical_term TEXT NOT NULL,
  parent_friendly TEXT NOT NULL,
  learning_frame TEXT NOT NULL,
  home_strategies JSONB DEFAULT '[]'::jsonb,
  tone TEXT NOT NULL DEFAULT 'supportive',
  agency_id UUID REFERENCES public.agencies(id),
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index that handles nullable agency_id
CREATE UNIQUE INDEX idx_behavior_translations_unique 
  ON public.behavior_translations(function_category, clinical_term, (COALESCE(agency_id, '00000000-0000-0000-0000-000000000000'::uuid)));

ALTER TABLE public.behavior_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_translations" ON public.behavior_translations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_translations" ON public.behavior_translations
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_behavior_translations_function ON public.behavior_translations(function_category, clinical_term);
