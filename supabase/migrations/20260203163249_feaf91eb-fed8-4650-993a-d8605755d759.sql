-- Create student_iep_support_links table based on the exact schema provided
CREATE TABLE IF NOT EXISTS public.student_iep_support_links (
  link_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.iep_library_items(id) ON DELETE CASCADE,
  link_status TEXT NOT NULL DEFAULT 'considering' CHECK (link_status IN ('existing', 'considering', 'recommended', 'rejected', 'archived')),
  owner TEXT DEFAULT 'bcba' CHECK (owner IN ('bcba', 'teacher', 'admin')),
  notes TEXT,
  evidence JSONB DEFAULT '{"data_points": [], "assessments": [], "observations": []}'::jsonb,
  date_added DATE NOT NULL DEFAULT CURRENT_DATE,
  date_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  review_due DATE,
  approved_by UUID REFERENCES auth.users(id),
  implementation_plan JSONB DEFAULT '{"start_date": null, "frequency": null, "who_implements": [], "how_measured": null}'::jsonb,
  -- Additional useful fields
  confirmation_required BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  recommendation_score NUMERIC(5,2),
  recommendation_confidence TEXT CHECK (recommendation_confidence IN ('low', 'medium', 'high')),
  rationale_bullets JSONB DEFAULT '[]'::jsonb,
  risk_flags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint: one link per student-item pair
  UNIQUE(student_id, item_id)
);

-- Create index for faster queries
CREATE INDEX idx_student_iep_support_links_student ON public.student_iep_support_links(student_id);
CREATE INDEX idx_student_iep_support_links_status ON public.student_iep_support_links(link_status);
CREATE INDEX idx_student_iep_support_links_item ON public.student_iep_support_links(item_id);

-- Enable RLS
ALTER TABLE public.student_iep_support_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view student support links"
  ON public.student_iep_support_links
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert support links"
  ON public.student_iep_support_links
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update support links"
  ON public.student_iep_support_links
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete support links"
  ON public.student_iep_support_links
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_student_iep_support_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.date_updated = CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_iep_support_links_timestamp
  BEFORE UPDATE ON public.student_iep_support_links
  FOR EACH ROW
  EXECUTE FUNCTION update_student_iep_support_links_updated_at();

-- Add source fields to iep_library_items if they don't exist
ALTER TABLE public.iep_library_items 
  ADD COLUMN IF NOT EXISTS source_origin TEXT DEFAULT 'internal' CHECK (source_origin IN ('internal', 'uploaded', 'district_library', 'user_custom')),
  ADD COLUMN IF NOT EXISTS source_doc TEXT,
  ADD COLUMN IF NOT EXISTS source_page INTEGER;