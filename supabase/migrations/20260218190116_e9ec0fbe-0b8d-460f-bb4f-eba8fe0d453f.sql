
-- Custom roles table for organization-defined roles beyond the built-in app_role enum
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_role app_role NOT NULL DEFAULT 'staff', -- inherits base permissions from this built-in role
  color TEXT DEFAULT '#6366f1',
  is_system BOOLEAN DEFAULT FALSE, -- true for built-in roles shown here for editing
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, name)
);

-- Role feature permissions override table (per custom role)
CREATE TABLE IF NOT EXISTS public.custom_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL, -- matches keys in feature_permissions table
  permission_value BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(custom_role_id, permission_key)
);

-- Map users to custom roles (in addition to their base app_role)
CREATE TABLE IF NOT EXISTS public.user_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  custom_role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, custom_role_id)
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: admins can manage, everyone can read
CREATE POLICY "Admins can manage custom_roles"
  ON public.custom_roles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view custom_roles"
  ON public.custom_roles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Admins can manage custom_role_permissions"
  ON public.custom_role_permissions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view custom_role_permissions"
  ON public.custom_role_permissions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Admins can manage user_custom_roles"
  ON public.user_custom_roles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own custom roles"
  ON public.user_custom_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
