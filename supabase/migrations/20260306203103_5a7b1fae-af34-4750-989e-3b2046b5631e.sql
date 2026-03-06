
-- Create the missing training_module_content table
CREATE TABLE IF NOT EXISTS public.training_module_content (
  module_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'mixed',
  overview TEXT,
  estimated_minutes INT DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_module_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_module_content_select_auth"
ON public.training_module_content FOR SELECT TO authenticated USING (true);

-- Create the updated_at trigger function if missing
CREATE OR REPLACE FUNCTION public.set_training_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_training_module_content_updated_at ON public.training_module_content;
CREATE TRIGGER trg_training_module_content_updated_at
  BEFORE UPDATE ON public.training_module_content
  FOR EACH ROW EXECUTE FUNCTION public.set_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_workbook_items_updated_at ON public.training_workbook_items;
CREATE TRIGGER trg_training_workbook_items_updated_at
  BEFORE UPDATE ON public.training_workbook_items
  FOR EACH ROW EXECUTE FUNCTION public.set_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_certification_progress_updated_at ON public.training_certification_progress;
CREATE TRIGGER trg_training_certification_progress_updated_at
  BEFORE UPDATE ON public.training_certification_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_assignments_v2_updated_at ON public.training_assignments_v2;
CREATE TRIGGER trg_training_assignments_v2_updated_at
  BEFORE UPDATE ON public.training_assignments_v2
  FOR EACH ROW EXECUTE FUNCTION public.set_training_updated_at();

-- Recreate views
CREATE OR REPLACE VIEW public.v_training_modules_dashboard WITH (security_invoker = on) AS
SELECT
  t.module_key,
  t.title,
  t.audience,
  t.overview,
  t.estimated_minutes,
  t.status,
  count(distinct w.id) AS workbook_item_count,
  count(distinct d.id) AS download_count
FROM public.training_module_content t
LEFT JOIN public.training_workbook_items w ON w.module_key = t.module_key AND w.is_active = true
LEFT JOIN public.training_downloads d ON d.module_key = t.module_key AND d.is_active = true
GROUP BY t.module_key, t.title, t.audience, t.overview, t.estimated_minutes, t.status;

CREATE OR REPLACE VIEW public.v_training_certification_summary WITH (security_invoker = on) AS
SELECT
  p.user_id,
  p.certification_key,
  count(*) AS requirement_count,
  count(*) FILTER (WHERE p.status IN ('completed','approved')) AS completed_count
FROM public.training_certification_progress p
GROUP BY p.user_id, p.certification_key;
