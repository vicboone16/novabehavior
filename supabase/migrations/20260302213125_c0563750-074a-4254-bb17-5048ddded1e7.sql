-- 1) Tighten high-risk PII table policies flagged by security scan

-- client_contacts
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view client contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Staff can manage client contacts" ON public.client_contacts;

CREATE POLICY "Users can view client contacts for accessible students"
ON public.client_contacts
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
);

CREATE POLICY "Users can manage client contacts for accessible students"
ON public.client_contacts
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
);

-- client_locations
ALTER TABLE public.client_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.client_locations;
DROP POLICY IF EXISTS "Staff can manage locations" ON public.client_locations;

CREATE POLICY "Users can view client locations for accessible students"
ON public.client_locations
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
);

CREATE POLICY "Users can manage client locations for accessible students"
ON public.client_locations
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
);

-- client_safety_medical
ALTER TABLE public.client_safety_medical ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view safety medical" ON public.client_safety_medical;
DROP POLICY IF EXISTS "Clinical staff can manage safety medical" ON public.client_safety_medical;

CREATE POLICY "Users can view safety medical for accessible students"
ON public.client_safety_medical
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
);

CREATE POLICY "Users can manage safety medical for accessible students"
ON public.client_safety_medical
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
);

-- payer_plans
ALTER TABLE public.payer_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view payer plans" ON public.payer_plans;
DROP POLICY IF EXISTS "Staff can manage payer plans" ON public.payer_plans;

CREATE POLICY "Users can view payer plans for accessible students"
ON public.payer_plans
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
);

CREATE POLICY "Users can manage payer plans for accessible students"
ON public.payer_plans
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
);


-- 2) Enable RLS on all public tables currently flagged as RLS-disabled

ALTER TABLE public.access_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_activity_type_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_handshake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_threshold_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_group_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_training_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_training_module_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_closeouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agency_billing_prefs ENABLE ROW LEVEL SECURITY;


-- 3) Add targeted policies so enabling RLS does not break expected access patterns

-- app_handshake: required by startup backend guard before auth
DROP POLICY IF EXISTS "Public can read app handshake" ON public.app_handshake;
CREATE POLICY "Public can read app handshake"
ON public.app_handshake
FOR SELECT
TO anon, authenticated
USING (true);

-- activity_types: shared reference catalog
DROP POLICY IF EXISTS "Authenticated can read activity types" ON public.activity_types;
CREATE POLICY "Authenticated can read activity types"
ON public.activity_types
FOR SELECT
TO authenticated
USING (true);

-- access_invites
DROP POLICY IF EXISTS "Users can read related access invites" ON public.access_invites;
DROP POLICY IF EXISTS "Users can create access invites" ON public.access_invites;
DROP POLICY IF EXISTS "Users can update related access invites" ON public.access_invites;
DROP POLICY IF EXISTS "Admins can manage access invites" ON public.access_invites;

CREATE POLICY "Users can read related access invites"
ON public.access_invites
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR redeemed_by = auth.uid()
);

CREATE POLICY "Users can create access invites"
ON public.access_invites
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "Users can update related access invites"
ON public.access_invites
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
);

-- invite_code_redemptions
DROP POLICY IF EXISTS "Users can read own invite redemptions" ON public.invite_code_redemptions;
DROP POLICY IF EXISTS "Users can create own invite redemptions" ON public.invite_code_redemptions;
DROP POLICY IF EXISTS "Admins can manage invite redemptions" ON public.invite_code_redemptions;

CREATE POLICY "Users can read own invite redemptions"
ON public.invite_code_redemptions
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR redeemed_by = auth.uid()
);

CREATE POLICY "Users can create own invite redemptions"
ON public.invite_code_redemptions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR redeemed_by = auth.uid()
);

-- agency-scoped billing config tables
DROP POLICY IF EXISTS "Agency members can read agency billing profiles" ON public.agency_billing_profiles;
DROP POLICY IF EXISTS "Agency admins can manage agency billing profiles" ON public.agency_billing_profiles;

CREATE POLICY "Agency members can read agency billing profiles"
ON public.agency_billing_profiles
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_memberships am
    WHERE am.user_id = auth.uid()
      AND am.agency_id = agency_billing_profiles.agency_id
      AND am.status = 'active'
  )
);

CREATE POLICY "Agency admins can manage agency billing profiles"
ON public.agency_billing_profiles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Agency members can read agency activity type rules" ON public.agency_activity_type_rules;
DROP POLICY IF EXISTS "Agency admins can manage agency activity type rules" ON public.agency_activity_type_rules;

CREATE POLICY "Agency members can read agency activity type rules"
ON public.agency_activity_type_rules
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_memberships am
    WHERE am.user_id = auth.uid()
      AND am.agency_id = agency_activity_type_rules.agency_id
      AND am.status = 'active'
  )
);

CREATE POLICY "Agency admins can manage agency activity type rules"
ON public.agency_activity_type_rules
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Agency members can read billing profiles" ON public.billing_profiles;
DROP POLICY IF EXISTS "Agency admins can manage billing profiles" ON public.billing_profiles;

CREATE POLICY "Agency members can read billing profiles"
ON public.billing_profiles
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (
    agency_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = billing_profiles.agency_id
        AND am.status = 'active'
    )
  )
);

CREATE POLICY "Agency admins can manage billing profiles"
ON public.billing_profiles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read own agency billing prefs" ON public.user_agency_billing_prefs;
DROP POLICY IF EXISTS "Users can manage own agency billing prefs" ON public.user_agency_billing_prefs;

CREATE POLICY "Users can read own agency billing prefs"
ON public.user_agency_billing_prefs
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Users can manage own agency billing prefs"
ON public.user_agency_billing_prefs
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR user_id = auth.uid()
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR user_id = auth.uid()
);

-- student/agency-scoped
DROP POLICY IF EXISTS "Users can read allowed locations for accessible students" ON public.allowed_locations;
DROP POLICY IF EXISTS "Users can manage allowed locations for accessible students" ON public.allowed_locations;

CREATE POLICY "Users can read allowed locations for accessible students"
ON public.allowed_locations
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (student_id IS NOT NULL AND (
    public.has_student_access(student_id, auth.uid())
    OR public.has_agency_student_access(auth.uid(), student_id)
  ))
  OR (
    student_id IS NULL
    AND agency_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = allowed_locations.agency_id
        AND am.status = 'active'
    )
  )
);

CREATE POLICY "Users can manage allowed locations for accessible students"
ON public.allowed_locations
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (student_id IS NOT NULL AND (
    public.has_student_access(student_id, auth.uid())
    OR public.has_agency_student_access(auth.uid(), student_id)
  ))
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR (student_id IS NOT NULL AND (
    public.has_student_access(student_id, auth.uid())
    OR public.has_agency_student_access(auth.uid(), student_id)
  ))
);

DROP POLICY IF EXISTS "Users can read ci threshold rules" ON public.ci_threshold_rules;
DROP POLICY IF EXISTS "Users can manage ci threshold rules" ON public.ci_threshold_rules;

CREATE POLICY "Users can read ci threshold rules"
ON public.ci_threshold_rules
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (client_id IS NOT NULL AND (
    public.has_student_access(client_id, auth.uid())
    OR public.has_agency_student_access(auth.uid(), client_id)
  ))
  OR (
    client_id IS NULL
    AND agency_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = ci_threshold_rules.agency_id
        AND am.status = 'active'
    )
  )
);

CREATE POLICY "Users can manage ci threshold rules"
ON public.ci_threshold_rules
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (client_id IS NOT NULL AND (
    public.has_student_access(client_id, auth.uid())
    OR public.has_agency_student_access(auth.uid(), client_id)
  ))
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR (client_id IS NOT NULL AND (
    public.has_student_access(client_id, auth.uid())
    OR public.has_agency_student_access(auth.uid(), client_id)
  ))
);

-- classroom tables
DROP POLICY IF EXISTS "Agency members can read classroom groups" ON public.classroom_groups;
DROP POLICY IF EXISTS "Agency members can manage classroom groups" ON public.classroom_groups;

CREATE POLICY "Agency members can read classroom groups"
ON public.classroom_groups
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_memberships am
    WHERE am.user_id = auth.uid()
      AND am.agency_id = classroom_groups.agency_id
      AND am.status = 'active'
  )
);

CREATE POLICY "Agency members can manage classroom groups"
ON public.classroom_groups
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Agency members can read classroom group members" ON public.classroom_group_members;
DROP POLICY IF EXISTS "Agency members can manage classroom group members" ON public.classroom_group_members;

CREATE POLICY "Agency members can read classroom group members"
ON public.classroom_group_members
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_memberships am
    WHERE am.user_id = auth.uid()
      AND am.agency_id = classroom_group_members.agency_id
      AND am.status = 'active'
  )
);

CREATE POLICY "Agency members can manage classroom group members"
ON public.classroom_group_members
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.classroom_groups cg
    WHERE cg.group_id = classroom_group_members.group_id
      AND cg.created_by = auth.uid()
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.classroom_groups cg
    WHERE cg.group_id = classroom_group_members.group_id
      AND cg.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Agency members can read classroom group students" ON public.classroom_group_students;
DROP POLICY IF EXISTS "Agency members can manage classroom group students" ON public.classroom_group_students;

CREATE POLICY "Agency members can read classroom group students"
ON public.classroom_group_students
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_memberships am
    WHERE am.user_id = auth.uid()
      AND am.agency_id = classroom_group_students.agency_id
      AND am.status = 'active'
  )
);

CREATE POLICY "Agency members can manage classroom group students"
ON public.classroom_group_students
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.classroom_groups cg
    WHERE cg.group_id = classroom_group_students.group_id
      AND cg.created_by = auth.uid()
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.classroom_groups cg
    WHERE cg.group_id = classroom_group_students.group_id
      AND cg.created_by = auth.uid()
  )
);

-- parent training tables
DROP POLICY IF EXISTS "Authenticated can read parent training library" ON public.parent_training_library;
CREATE POLICY "Authenticated can read parent training library"
ON public.parent_training_library
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can read parent training modules" ON public.parent_training_modules;
DROP POLICY IF EXISTS "Admins can manage parent training modules" ON public.parent_training_modules;
CREATE POLICY "Authenticated can read parent training modules"
ON public.parent_training_modules
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Admins can manage parent training modules"
ON public.parent_training_modules
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read parent training module versions" ON public.parent_training_module_versions;
DROP POLICY IF EXISTS "Admins can manage parent training module versions" ON public.parent_training_module_versions;
CREATE POLICY "Authenticated can read parent training module versions"
ON public.parent_training_module_versions
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Admins can manage parent training module versions"
ON public.parent_training_module_versions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can access related parent training assignments" ON public.parent_training_assignments;
DROP POLICY IF EXISTS "Users can manage related parent training assignments" ON public.parent_training_assignments;
CREATE POLICY "Users can access related parent training assignments"
ON public.parent_training_assignments
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR parent_user_id = auth.uid()
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
);
CREATE POLICY "Users can manage related parent training assignments"
ON public.parent_training_assignments
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR parent_user_id = auth.uid()
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR parent_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can access related parent training progress" ON public.parent_training_progress;
DROP POLICY IF EXISTS "Users can manage related parent training progress" ON public.parent_training_progress;
CREATE POLICY "Users can access related parent training progress"
ON public.parent_training_progress
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR parent_user_id = auth.uid()
  OR public.has_student_access(client_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), client_id)
);
CREATE POLICY "Users can manage related parent training progress"
ON public.parent_training_progress
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR parent_user_id = auth.uid()
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR parent_user_id = auth.uid()
);

-- document_links/session_closeouts: admin-only by default (sensitive linkage/closeout data)
DROP POLICY IF EXISTS "Admins can manage document links" ON public.document_links;
CREATE POLICY "Admins can manage document links"
ON public.document_links
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage session closeouts" ON public.session_closeouts;
CREATE POLICY "Admins can manage session closeouts"
ON public.session_closeouts
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));