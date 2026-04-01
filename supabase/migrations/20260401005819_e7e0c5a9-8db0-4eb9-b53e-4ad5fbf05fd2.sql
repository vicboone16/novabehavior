
-- NYDOE CR Report Templates table
CREATE TABLE IF NOT EXISTS public.nydoe_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE DEFAULT 'nydoe_cr_initial',
  name TEXT NOT NULL DEFAULT 'NYDOE CR Report - Initial Assessment',
  description TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  agency_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NYDOE Report instances (filled reports per student)
CREATE TABLE IF NOT EXISTS public.nydoe_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.nydoe_report_templates(id),
  student_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'NYDOE CR Report',
  report_type TEXT NOT NULL DEFAULT 'initial',
  status TEXT NOT NULL DEFAULT 'draft',
  header_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sections_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  last_edited_by UUID,
  agency_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.nydoe_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nydoe_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read NYDOE templates"
  ON public.nydoe_report_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage NYDOE reports"
  ON public.nydoe_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_nydoe_reports_student ON public.nydoe_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_nydoe_reports_status ON public.nydoe_reports(status);
