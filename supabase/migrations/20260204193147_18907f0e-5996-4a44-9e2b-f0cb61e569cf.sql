-- Agency Locations table for hybrid location templates
CREATE TABLE IF NOT EXISTS public.agency_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  location_type TEXT DEFAULT 'office',
  geocode_lat DOUBLE PRECISION,
  geocode_lng DOUBLE PRECISION,
  geocode_status TEXT DEFAULT 'pending',
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agency_locations
CREATE POLICY "Users can view locations of their agencies"
  ON public.agency_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.agency_id = agency_locations.agency_id
        AND am.user_id = auth.uid()
        AND am.status = 'active'
    )
  );

CREATE POLICY "Agency admins can manage locations"
  ON public.agency_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.agency_id = agency_locations.agency_id
        AND am.user_id = auth.uid()
        AND am.status = 'active'
        AND am.role IN ('owner', 'admin')
    )
  );

-- Add index for agency lookup
CREATE INDEX idx_agency_locations_agency_id ON public.agency_locations(agency_id);

-- Trigger for updated_at
CREATE TRIGGER update_agency_locations_updated_at
  BEFORE UPDATE ON public.agency_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();