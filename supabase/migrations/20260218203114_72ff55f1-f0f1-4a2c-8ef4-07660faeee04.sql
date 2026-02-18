
-- Create behavior_bank_entries table to persist behavior bank data
CREATE TABLE public.behavior_bank_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('custom', 'override', 'archive')),
  behavior_id TEXT NOT NULL, -- For overrides/archives: the built-in behavior id; for custom: the generated id
  name TEXT,
  operational_definition TEXT,
  category TEXT,
  is_global BOOLEAN NOT NULL DEFAULT true,
  promoted_from_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, entry_type, behavior_id)
);

-- Enable RLS
ALTER TABLE public.behavior_bank_entries ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all behavior bank entries
CREATE POLICY "Authenticated users can read behavior bank entries"
  ON public.behavior_bank_entries FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert behavior bank entries
CREATE POLICY "Authenticated users can insert behavior bank entries"
  ON public.behavior_bank_entries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Authenticated users can update behavior bank entries
CREATE POLICY "Authenticated users can update behavior bank entries"
  ON public.behavior_bank_entries FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete behavior bank entries
CREATE POLICY "Authenticated users can delete behavior bank entries"
  ON public.behavior_bank_entries FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger to update updated_at
CREATE TRIGGER update_behavior_bank_entries_updated_at
  BEFORE UPDATE ON public.behavior_bank_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
