
-- ============================================================
-- 1. Fix is_super_admin() — remove agency_memberships owner check
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  );
$function$;

-- ============================================================
-- 2. Fix staff_assignments — restrict to agency admins only
-- ============================================================
DROP POLICY IF EXISTS "staff_assignments_select_authenticated" ON public.staff_assignments;
DROP POLICY IF EXISTS "staff_assignments_insert_authenticated" ON public.staff_assignments;
DROP POLICY IF EXISTS "staff_assignments_update_authenticated" ON public.staff_assignments;
DROP POLICY IF EXISTS "staff_assignments_delete_authenticated" ON public.staff_assignments;

CREATE POLICY "staff_assignments_select" ON public.staff_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR user_id = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  );

CREATE POLICY "staff_assignments_insert" ON public.staff_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_agency_admin_access(agency_id)
  );

CREATE POLICY "staff_assignments_update" ON public.staff_assignments
  FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_agency_admin_access(agency_id)
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_agency_admin_access(agency_id)
  );

CREATE POLICY "staff_assignments_delete" ON public.staff_assignments
  FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_agency_admin_access(agency_id)
  );

-- ============================================================
-- 3. Fix session_staff_notes SELECT — scope to student access
-- ============================================================
DROP POLICY IF EXISTS "Users can read session staff notes" ON public.session_staff_notes;

CREATE POLICY "Users can read session staff notes" ON public.session_staff_notes
  FOR SELECT TO authenticated
  USING (
    author_user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_student_access(student_id, auth.uid())
  );

-- ============================================================
-- 4. Fix custom_form_submissions — remove overly permissive policies
-- ============================================================
DROP POLICY IF EXISTS "Staff can view all submissions" ON public.custom_form_submissions;
DROP POLICY IF EXISTS "Staff can update submissions" ON public.custom_form_submissions;
DROP POLICY IF EXISTS "Staff can delete submissions" ON public.custom_form_submissions;

CREATE POLICY "Staff can update accessible submissions" ON public.custom_form_submissions
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR (student_id IS NOT NULL AND public.has_student_access(student_id, auth.uid()))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR (student_id IS NOT NULL AND public.has_student_access(student_id, auth.uid()))
  );

CREATE POLICY "Staff can delete accessible submissions" ON public.custom_form_submissions
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- ============================================================
-- 5. Fix student_timeline_entries SELECT — scope to student access
-- ============================================================
DROP POLICY IF EXISTS "Users can read timeline entries for their students" ON public.student_timeline_entries;

CREATE POLICY "Users can read timeline entries for their students" ON public.student_timeline_entries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_student_access(student_id, auth.uid())
  );

-- ============================================================
-- 6. Fix clinical measurement tables with USING(true)
-- ============================================================

-- mts_definitions
DROP POLICY IF EXISTS "Authenticated users can manage mts_definitions" ON public.mts_definitions;
CREATE POLICY "mts_definitions_access" ON public.mts_definitions
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  );

-- mts_sessions
DROP POLICY IF EXISTS "Authenticated users can manage mts_sessions" ON public.mts_sessions;
CREATE POLICY "mts_sessions_access" ON public.mts_sessions
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  );

-- mts_interval_data (child of mts_sessions)
DROP POLICY IF EXISTS "Authenticated users can manage mts_interval_data" ON public.mts_interval_data;
CREATE POLICY "mts_interval_data_access" ON public.mts_interval_data
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.mts_sessions ms
      WHERE ms.id = mts_session_id
      AND (ms.created_by = auth.uid() OR public.has_student_access(ms.student_id, auth.uid()))
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.mts_sessions ms
      WHERE ms.id = mts_session_id
      AND (ms.created_by = auth.uid() OR public.has_student_access(ms.student_id, auth.uid()))
    )
  );

-- interval_definitions
DROP POLICY IF EXISTS "Authenticated users can manage interval_definitions" ON public.interval_definitions;
CREATE POLICY "interval_definitions_access" ON public.interval_definitions
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  );

-- progression_groups
DROP POLICY IF EXISTS "Authenticated users can manage progression_groups" ON public.progression_groups;
CREATE POLICY "progression_groups_access" ON public.progression_groups
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  );

-- progression_steps (child of progression_groups)
DROP POLICY IF EXISTS "Authenticated users can manage progression_steps" ON public.progression_steps;
CREATE POLICY "progression_steps_access" ON public.progression_steps
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.progression_groups pg
      WHERE pg.id = group_id
      AND (pg.created_by = auth.uid() OR public.has_student_access(pg.student_id, auth.uid()))
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.progression_groups pg
      WHERE pg.id = group_id
      AND (pg.created_by = auth.uid() OR public.has_student_access(pg.student_id, auth.uid()))
    )
  );

-- task_analysis_progress_steps
DROP POLICY IF EXISTS "Authenticated users can manage task analysis progress steps" ON public.task_analysis_progress_steps;
CREATE POLICY "task_analysis_progress_steps_access" ON public.task_analysis_progress_steps
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_student_access(student_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_student_access(student_id, auth.uid())
  );

-- student_programs
DROP POLICY IF EXISTS "Authenticated users can manage student_programs" ON public.student_programs;
CREATE POLICY "student_programs_access" ON public.student_programs
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_student_access(student_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_student_access(student_id, auth.uid())
  );

-- teacher_interval_sessions
DROP POLICY IF EXISTS "Authenticated users can manage teacher_interval_sessions" ON public.teacher_interval_sessions;
CREATE POLICY "teacher_interval_sessions_access" ON public.teacher_interval_sessions
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.has_student_access(student_id, auth.uid())
  );

-- teacher_interval_data (child of teacher_interval_sessions)
DROP POLICY IF EXISTS "Authenticated users can manage teacher_interval_data" ON public.teacher_interval_data;
CREATE POLICY "teacher_interval_data_access" ON public.teacher_interval_data
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.teacher_interval_sessions tis
      WHERE tis.id = session_id
      AND (tis.created_by = auth.uid() OR public.has_student_access(tis.student_id, auth.uid()))
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.teacher_interval_sessions tis
      WHERE tis.id = session_id
      AND (tis.created_by = auth.uid() OR public.has_student_access(tis.student_id, auth.uid()))
    )
  );
