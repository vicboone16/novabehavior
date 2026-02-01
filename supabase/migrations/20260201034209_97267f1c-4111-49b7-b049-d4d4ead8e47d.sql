-- =====================================================
-- Security Fix Migration: RLS Policy Hardening
-- =====================================================

-- 1. FIX abas3_assessments: Replace overly permissive policies with proper access controls
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view ABAS-3 assessments" ON public.abas3_assessments;
DROP POLICY IF EXISTS "Authenticated users can create ABAS-3 assessments" ON public.abas3_assessments;
DROP POLICY IF EXISTS "Authenticated users can update ABAS-3 assessments" ON public.abas3_assessments;
DROP POLICY IF EXISTS "Authenticated users can delete ABAS-3 assessments" ON public.abas3_assessments;

-- Create proper access-controlled policies for abas3_assessments
CREATE POLICY "Users can view ABAS-3 assessments for accessible students"
  ON public.abas3_assessments FOR SELECT
  USING (
    is_student_owner(student_id, auth.uid()) OR
    has_student_access(student_id, auth.uid()) OR
    has_tag_based_access(auth.uid(), student_id) OR
    is_admin(auth.uid())
  );

CREATE POLICY "Users can create ABAS-3 assessments for accessible students"
  ON public.abas3_assessments FOR INSERT
  WITH CHECK (
    is_student_owner(student_id, auth.uid()) OR
    has_student_access(student_id, auth.uid()) OR
    has_tag_based_access(auth.uid(), student_id) OR
    is_admin(auth.uid())
  );

CREATE POLICY "Users can update ABAS-3 assessments for accessible students"
  ON public.abas3_assessments FOR UPDATE
  USING (
    is_student_owner(student_id, auth.uid()) OR
    has_student_access(student_id, auth.uid()) OR
    has_tag_based_access(auth.uid(), student_id) OR
    is_admin(auth.uid())
  );

CREATE POLICY "Admins can delete ABAS-3 assessments"
  ON public.abas3_assessments FOR DELETE
  USING (is_admin(auth.uid()));

-- 2. FIX toi_daily_logs: Replace overly permissive policies with proper access controls
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can view TOI daily logs" ON public.toi_daily_logs;
DROP POLICY IF EXISTS "Users can insert TOI daily logs" ON public.toi_daily_logs;
DROP POLICY IF EXISTS "Users can update TOI daily logs" ON public.toi_daily_logs;
DROP POLICY IF EXISTS "Users can delete TOI daily logs" ON public.toi_daily_logs;

-- Create proper access-controlled policies for toi_daily_logs
CREATE POLICY "Users can view TOI logs for accessible students"
  ON public.toi_daily_logs FOR SELECT
  USING (
    is_student_owner(student_id, auth.uid()) OR
    has_student_access(student_id, auth.uid()) OR
    has_tag_based_access(auth.uid(), student_id) OR
    is_admin(auth.uid())
  );

CREATE POLICY "Users can insert TOI logs for accessible students"
  ON public.toi_daily_logs FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user_id AND (
      is_student_owner(student_id, auth.uid()) OR
      has_student_access(student_id, auth.uid()) OR
      has_tag_based_access(auth.uid(), student_id) OR
      is_admin(auth.uid())
    )
  );

CREATE POLICY "Users can update their own TOI logs or with admin access"
  ON public.toi_daily_logs FOR UPDATE
  USING (
    (auth.uid() = created_by_user_id AND (
      is_student_owner(student_id, auth.uid()) OR
      has_student_access(student_id, auth.uid()) OR
      has_tag_based_access(auth.uid(), student_id)
    )) OR
    is_admin(auth.uid())
  );

CREATE POLICY "Admins can delete TOI logs"
  ON public.toi_daily_logs FOR DELETE
  USING (is_admin(auth.uid()));

-- 3. FIX audit_logs: Remove direct INSERT policy and create secure RPC function
-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Create a SECURITY DEFINER function for inserting audit logs
-- This function validates inputs and ensures integrity
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  _action text,
  _resource_type text,
  _resource_id uuid DEFAULT NULL,
  _resource_name text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  valid_actions text[] := ARRAY[
    'login', 'logout', 'session_timeout', 'session_extended',
    'manual_save', 'emergency_save', 'create', 'update', 'delete',
    'view', 'export', 'print', 'share', 'unshare', 'approve',
    'reject', 'archive', 'unarchive', 'role_change', 'permission_change', 'settings_change'
  ];
  valid_resource_types text[] := ARRAY[
    'auth', 'session', 'student', 'behavior', 'abc_entry',
    'frequency_entry', 'duration_entry', 'interval_entry', 'note',
    'file', 'report', 'user', 'role', 'settings', 'access'
  ];
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate action
  IF NOT (_action = ANY(valid_actions)) THEN
    RAISE EXCEPTION 'Invalid action type: %', _action;
  END IF;

  -- Validate resource type
  IF NOT (_resource_type = ANY(valid_resource_types)) THEN
    RAISE EXCEPTION 'Invalid resource type: %', _resource_type;
  END IF;

  -- Insert the audit log with the authenticated user's ID
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, resource_name, details)
  VALUES (auth.uid(), _action, _resource_type, _resource_id, _resource_name, _details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 4. FIX data_access_logs: Also secure with RPC function
DROP POLICY IF EXISTS "Authenticated users can insert data access logs" ON public.data_access_logs;

-- Create a SECURITY DEFINER function for inserting data access logs
CREATE OR REPLACE FUNCTION public.insert_data_access_log(
  _student_id uuid,
  _access_type text,
  _data_category text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  valid_access_types text[] := ARRAY['view', 'edit', 'export', 'print'];
  valid_categories text[] := ARRAY['profile', 'behaviors', 'sessions', 'notes', 'files', 'reports', 'assessments', 'goals'];
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate access type
  IF NOT (_access_type = ANY(valid_access_types)) THEN
    RAISE EXCEPTION 'Invalid access type: %', _access_type;
  END IF;

  -- Validate data category
  IF NOT (_data_category = ANY(valid_categories)) THEN
    RAISE EXCEPTION 'Invalid data category: %', _data_category;
  END IF;

  -- Verify user has access to the student (optional - could be logged even for denied access)
  -- For now, we just log the access attempt
  
  INSERT INTO public.data_access_logs (user_id, student_id, access_type, data_category, details)
  VALUES (auth.uid(), _student_id, _access_type, _data_category, _details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;