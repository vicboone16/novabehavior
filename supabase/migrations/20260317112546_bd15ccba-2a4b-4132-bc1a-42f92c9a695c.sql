
-- =====================================================
-- FIX 1: Profiles policy - restrict agency admin to same-agency members
-- =====================================================
DROP POLICY IF EXISTS "profiles_select_safe" ON public.profiles;

CREATE POLICY "profiles_select_safe" ON public.profiles FOR SELECT
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_agency_admin_for(public.current_agency_id())
    AND EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = profiles.user_id
        AND am.agency_id = public.current_agency_id()
        AND am.status = 'active'
    )
  )
);

-- =====================================================
-- FIX 2: IEP meeting tables - replace USING(true) with student access checks
-- =====================================================

-- iep_meeting_sessions (has student_id directly)
DROP POLICY IF EXISTS "Authenticated users can manage iep_meeting_sessions" ON public.iep_meeting_sessions;
CREATE POLICY "Staff can manage iep_meeting_sessions" ON public.iep_meeting_sessions FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
);

-- iep_meeting_attendees (linked via meeting_session_id)
DROP POLICY IF EXISTS "Authenticated users can manage iep_meeting_attendees" ON public.iep_meeting_attendees;
CREATE POLICY "Staff can manage iep_meeting_attendees" ON public.iep_meeting_attendees FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.iep_meeting_sessions ms
    WHERE ms.id = iep_meeting_attendees.meeting_session_id
      AND (
        public.is_admin(auth.uid())
        OR public.has_student_access(ms.student_id, auth.uid())
        OR public.is_student_owner(ms.student_id, auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.iep_meeting_sessions ms
    WHERE ms.id = iep_meeting_attendees.meeting_session_id
      AND (
        public.is_admin(auth.uid())
        OR public.has_student_access(ms.student_id, auth.uid())
        OR public.is_student_owner(ms.student_id, auth.uid())
      )
  )
);

-- iep_meeting_checklist_items (linked via meeting_session_id)
DROP POLICY IF EXISTS "Authenticated users can manage iep_meeting_checklist_items" ON public.iep_meeting_checklist_items;
CREATE POLICY "Staff can manage iep_meeting_checklist_items" ON public.iep_meeting_checklist_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.iep_meeting_sessions ms
    WHERE ms.id = iep_meeting_checklist_items.meeting_session_id
      AND (
        public.is_admin(auth.uid())
        OR public.has_student_access(ms.student_id, auth.uid())
        OR public.is_student_owner(ms.student_id, auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.iep_meeting_sessions ms
    WHERE ms.id = iep_meeting_checklist_items.meeting_session_id
      AND (
        public.is_admin(auth.uid())
        OR public.has_student_access(ms.student_id, auth.uid())
        OR public.is_student_owner(ms.student_id, auth.uid())
      )
  )
);

-- iep_meeting_intelligence_snapshots (has student_id directly)
DROP POLICY IF EXISTS "Authenticated users can manage iep_meeting_intelligence_snapshots" ON public.iep_meeting_intelligence_snapshots;
CREATE POLICY "Staff can manage iep_meeting_intelligence_snapshots" ON public.iep_meeting_intelligence_snapshots FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
);

-- iep_meeting_talking_points (linked via meeting_session_id)
DROP POLICY IF EXISTS "Authenticated users can manage iep_meeting_talking_points" ON public.iep_meeting_talking_points;
CREATE POLICY "Staff can manage iep_meeting_talking_points" ON public.iep_meeting_talking_points FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.iep_meeting_sessions ms
    WHERE ms.id = iep_meeting_talking_points.meeting_session_id
      AND (
        public.is_admin(auth.uid())
        OR public.has_student_access(ms.student_id, auth.uid())
        OR public.is_student_owner(ms.student_id, auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.iep_meeting_sessions ms
    WHERE ms.id = iep_meeting_talking_points.meeting_session_id
      AND (
        public.is_admin(auth.uid())
        OR public.has_student_access(ms.student_id, auth.uid())
        OR public.is_student_owner(ms.student_id, auth.uid())
      )
  )
);

-- iep_meeting_recommendation_items (has student_id directly)
DROP POLICY IF EXISTS "Authenticated users can manage iep_meeting_recommendation_items" ON public.iep_meeting_recommendation_items;
CREATE POLICY "Staff can manage iep_meeting_recommendation_items" ON public.iep_meeting_recommendation_items FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
);

-- iep_meeting_goal_draft_items (has student_id directly)
DROP POLICY IF EXISTS "Authenticated users can manage iep_meeting_goal_draft_items" ON public.iep_meeting_goal_draft_items;
CREATE POLICY "Staff can manage iep_meeting_goal_draft_items" ON public.iep_meeting_goal_draft_items FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
);

-- iep_parent_friendly_summaries (has student_id directly)
DROP POLICY IF EXISTS "Authenticated users can manage iep_parent_friendly_summaries" ON public.iep_parent_friendly_summaries;
CREATE POLICY "Staff can manage iep_parent_friendly_summaries" ON public.iep_parent_friendly_summaries FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
);

-- =====================================================
-- FIX 3: student_bx_plan_links - replace USING(true) SELECT with student access
-- =====================================================
DROP POLICY IF EXISTS "Users can view student plan links" ON public.student_bx_plan_links;
DROP POLICY IF EXISTS "Staff can manage student plan links" ON public.student_bx_plan_links;

CREATE POLICY "Staff can view student plan links" ON public.student_bx_plan_links
FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
);

CREATE POLICY "Staff can manage student plan links" ON public.student_bx_plan_links
FOR ALL USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
);
