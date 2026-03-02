
-- Table: user_app_access
-- Tracks which apps a user can access, per agency (nullable for independent mode)
CREATE TABLE public.user_app_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_slug text NOT NULL CHECK (app_slug IN ('novatrack', 'student_connect', 'behavior_decoded', 'teacher_hub')),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff', 'viewer')),
  is_active boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, app_slug, agency_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_app_access_user ON public.user_app_access(user_id);
CREATE INDEX idx_user_app_access_app ON public.user_app_access(app_slug);
CREATE INDEX idx_user_app_access_agency ON public.user_app_access(agency_id);

-- RLS
ALTER TABLE public.user_app_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own app access"
  ON public.user_app_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage app access"
  ON public.user_app_access FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Add app_scope to user_student_access for per-app client permissions
ALTER TABLE public.user_student_access 
  ADD COLUMN IF NOT EXISTS app_scope text NOT NULL DEFAULT 'novatrack' 
  CHECK (app_scope IN ('novatrack', 'student_connect', 'behavior_decoded', 'teacher_hub'));

-- Drop old unique constraint and add new one that includes app_scope
ALTER TABLE public.user_student_access DROP CONSTRAINT IF EXISTS user_student_access_user_id_student_id_key;
ALTER TABLE public.user_student_access ADD CONSTRAINT user_student_access_user_student_app_key UNIQUE (user_id, student_id, app_scope);

-- Security definer function to check app access
CREATE OR REPLACE FUNCTION public.has_app_access(
  _user_id uuid,
  _app_slug text,
  _agency_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_app_access
    WHERE user_id = _user_id
      AND app_slug = _app_slug
      AND is_active = true
      AND (agency_id = _agency_id OR _agency_id IS NULL)
  )
$$;

-- Function to get all app access for a user
CREATE OR REPLACE FUNCTION public.get_user_app_access(_user_id uuid)
RETURNS SETOF public.user_app_access
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.user_app_access
  WHERE user_id = _user_id AND is_active = true
$$;
