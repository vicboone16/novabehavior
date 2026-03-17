
-- Age Bands reference table for validation
CREATE TABLE public.vineland3_age_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_band_key TEXT NOT NULL UNIQUE,
  min_age_months INT NOT NULL,
  max_age_months INT NOT NULL,
  display_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vineland3_age_bands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_age_bands_sel" ON public.vineland3_age_bands FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_age_bands_mut" ON public.vineland3_age_bands FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Norm import history table
CREATE TABLE public.vineland3_norm_import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type TEXT NOT NULL, -- 'subdomain', 'domain', 'composite'
  source_version TEXT NOT NULL,
  row_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  imported_by UUID,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vineland3_norm_import_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_import_hist_sel" ON public.vineland3_norm_import_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_import_hist_mut" ON public.vineland3_norm_import_history FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
