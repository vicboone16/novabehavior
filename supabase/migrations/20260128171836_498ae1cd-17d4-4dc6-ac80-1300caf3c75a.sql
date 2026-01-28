-- Add PIN hash column to profiles for secondary authentication
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_hash text;

-- Create app_role enum for role-based access control
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'staff', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for role assignments
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Create tags table for organizing users and students
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag_type text NOT NULL CHECK (tag_type IN ('school', 'site', 'team', 'custom')),
  color text DEFAULT '#3B82F6',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user_tags junction table
CREATE TABLE IF NOT EXISTS public.user_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id, tag_id)
);

-- Create student_tags junction table
CREATE TABLE IF NOT EXISTS public.student_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (student_id, tag_id)
);

-- Create user_student_access table for granular per-student permissions
CREATE TABLE IF NOT EXISTS public.user_student_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  permission_level text NOT NULL CHECK (permission_level IN ('none', 'view', 'edit', 'full')),
  can_view_notes boolean DEFAULT true,
  can_view_documents boolean DEFAULT true,
  can_collect_data boolean DEFAULT true,
  can_edit_profile boolean DEFAULT false,
  can_generate_reports boolean DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id, student_id)
);

-- Create admin_permissions table to track what admins can do
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  can_manage_users boolean DEFAULT false,
  can_manage_roles boolean DEFAULT false,
  can_manage_students boolean DEFAULT false,
  can_manage_tags boolean DEFAULT false,
  can_view_all_users boolean DEFAULT false,
  can_assign_admin boolean DEFAULT false,
  scope_tag_ids uuid[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on all new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_student_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is super_admin or admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin')
  )
$$;

-- Function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view roles"
ON public.user_roles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for tags
CREATE POLICY "Admins can manage tags"
ON public.tags FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view tags"
ON public.tags FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for user_tags
CREATE POLICY "Admins can manage user tags"
ON public.user_tags FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own tags"
ON public.user_tags FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for student_tags
CREATE POLICY "Admins can manage student tags"
ON public.student_tags FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view student tags for their students"
ON public.student_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_id AND s.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

-- RLS Policies for user_student_access
CREATE POLICY "Admins can manage student access"
ON public.user_student_access FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own access"
ON public.user_student_access FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Student owners can manage access to their students"
ON public.user_student_access FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_id AND s.user_id = auth.uid()
  )
);

-- RLS Policies for admin_permissions
CREATE POLICY "Super admins can manage admin permissions"
ON public.admin_permissions FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view their own permissions"
ON public.admin_permissions FOR SELECT
USING (auth.uid() = user_id);

-- Function to verify PIN (security definer to access pin_hash)
CREATE OR REPLACE FUNCTION public.verify_pin(_user_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT pin_hash INTO stored_hash
  FROM public.profiles
  WHERE user_id = _user_id;
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Simple hash comparison (PIN is stored as SHA256 hash)
  RETURN stored_hash = encode(sha256(_pin::bytea), 'hex');
END;
$$;

-- Function to set PIN (security definer)
CREATE OR REPLACE FUNCTION public.set_user_pin(_user_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate PIN is 6 digits
  IF _pin !~ '^\d{6}$' THEN
    RETURN false;
  END IF;
  
  UPDATE public.profiles
  SET pin_hash = encode(sha256(_pin::bytea), 'hex')
  WHERE user_id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- Update students table RLS to include shared access
DROP POLICY IF EXISTS "Users can view their own students " ON public.students;
CREATE POLICY "Users can view accessible students"
ON public.students FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_student_access usa
    WHERE usa.student_id = id
      AND usa.user_id = auth.uid()
      AND usa.permission_level != 'none'
  )
  OR public.is_admin(auth.uid())
);

-- Trigger for updated_at on new tables
CREATE TRIGGER update_user_student_access_updated_at
BEFORE UPDATE ON public.user_student_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_permissions_updated_at
BEFORE UPDATE ON public.admin_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();