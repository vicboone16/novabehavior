-- Multi-Agency Foundation Tables

-- 1. Agencies Table - Core agency/practice registry
CREATE TABLE public.agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE, -- for URL-friendly identification
  legal_name TEXT,
  npi TEXT,
  tax_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  
  -- Contact Info
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  
  -- Billing Address (if different)
  billing_address_line1 TEXT,
  billing_address_city TEXT,
  billing_address_state TEXT,
  billing_address_zip TEXT,
  
  -- Settings
  timezone TEXT DEFAULT 'America/New_York',
  coverage_mode TEXT DEFAULT 'SCHOOL_LIGHT' CHECK (coverage_mode IN ('INSURANCE_STRICT', 'SCHOOL_LIGHT', 'HYBRID')),
  settings JSONB DEFAULT '{}',
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create slug generation function
CREATE OR REPLACE FUNCTION public.generate_agency_slug(_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(regexp_replace(_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
$$;

-- Auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION public.auto_generate_agency_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_agency_slug(NEW.name);
    -- Ensure uniqueness by appending random string if needed
    WHILE EXISTS (SELECT 1 FROM agencies WHERE slug = NEW.slug AND id != COALESCE(NEW.id, gen_random_uuid())) LOOP
      NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 4);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_agency_slug
BEFORE INSERT OR UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_agency_slug();

-- 2. Agency User Memberships - Links users to agencies with roles
CREATE TABLE public.agency_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff', 'viewer')),
  is_primary BOOLEAN DEFAULT false, -- User's primary/default agency
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'invited')),
  invited_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(agency_id, user_id)
);

-- 3. User's current active agency selection
CREATE TABLE public.user_agency_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  last_switched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_agencies_status ON public.agencies(status);
CREATE INDEX idx_agencies_slug ON public.agencies(slug);
CREATE INDEX idx_agency_memberships_user_id ON public.agency_memberships(user_id);
CREATE INDEX idx_agency_memberships_agency_id ON public.agency_memberships(agency_id);
CREATE INDEX idx_agency_memberships_role ON public.agency_memberships(role);
CREATE INDEX idx_user_agency_context_user ON public.user_agency_context(user_id);

-- Enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agency_context ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user has access to an agency
CREATE OR REPLACE FUNCTION public.has_agency_access(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_memberships
    WHERE user_id = _user_id
      AND agency_id = _agency_id
      AND status = 'active'
  ) OR public.is_super_admin(_user_id)
$$;

-- Helper function: Get user's current agency
CREATE OR REPLACE FUNCTION public.get_current_agency_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT current_agency_id FROM public.user_agency_context WHERE user_id = _user_id),
    (SELECT agency_id FROM public.agency_memberships WHERE user_id = _user_id AND is_primary = true LIMIT 1),
    (SELECT agency_id FROM public.agency_memberships WHERE user_id = _user_id AND status = 'active' LIMIT 1)
  )
$$;

-- Helper function: Check if user is agency admin
CREATE OR REPLACE FUNCTION public.is_agency_admin(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_memberships
    WHERE user_id = _user_id
      AND agency_id = _agency_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) OR public.is_super_admin(_user_id)
$$;

-- RLS Policies for agencies table
CREATE POLICY "Super admins can manage all agencies"
ON public.agencies FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their agencies"
ON public.agencies FOR SELECT
USING (
  public.has_agency_access(auth.uid(), id)
);

CREATE POLICY "Agency owners/admins can update their agency"
ON public.agencies FOR UPDATE
USING (
  public.is_agency_admin(auth.uid(), id)
);

-- RLS Policies for agency_memberships
CREATE POLICY "Super admins can manage all memberships"
ON public.agency_memberships FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view memberships for their agencies"
ON public.agency_memberships FOR SELECT
USING (
  public.has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can manage memberships"
ON public.agency_memberships FOR INSERT
WITH CHECK (
  public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can update memberships"
ON public.agency_memberships FOR UPDATE
USING (
  public.is_agency_admin(auth.uid(), agency_id)
);

CREATE POLICY "Agency admins can delete memberships"
ON public.agency_memberships FOR DELETE
USING (
  public.is_agency_admin(auth.uid(), agency_id)
);

-- RLS Policies for user_agency_context
CREATE POLICY "Users can view their own context"
ON public.user_agency_context FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own context"
ON public.user_agency_context FOR ALL
USING (user_id = auth.uid());

-- Update triggers
CREATE TRIGGER update_agencies_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_memberships_updated_at
BEFORE UPDATE ON public.agency_memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_agency_context_updated_at
BEFORE UPDATE ON public.user_agency_context
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add agency_id to students table for data isolation
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);
CREATE INDEX IF NOT EXISTS idx_students_agency_id ON public.students(agency_id);

-- Add agency_id to profiles for staff agency association
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_agency_id UUID REFERENCES public.agencies(id);

-- Function to switch user's active agency
CREATE OR REPLACE FUNCTION public.switch_agency(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has access to this agency
  IF NOT public.has_agency_access(_user_id, _agency_id) THEN
    RAISE EXCEPTION 'User does not have access to this agency';
  END IF;
  
  -- Upsert the context
  INSERT INTO public.user_agency_context (user_id, current_agency_id, last_switched_at)
  VALUES (_user_id, _agency_id, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET current_agency_id = _agency_id, last_switched_at = now();
  
  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_agency_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_agency_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.switch_agency(UUID, UUID) TO authenticated;