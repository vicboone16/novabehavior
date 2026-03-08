ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS agency_id uuid;
CREATE INDEX IF NOT EXISTS idx_classrooms_agency_id ON public.classrooms(agency_id);