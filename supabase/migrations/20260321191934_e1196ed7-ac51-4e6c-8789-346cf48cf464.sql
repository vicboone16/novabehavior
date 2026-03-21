
ALTER TABLE public.staff_presence_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can read presence history"
ON public.staff_presence_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agency_memberships am
    WHERE am.user_id = auth.uid() AND am.agency_id = staff_presence_history.agency_id AND am.status = 'active'
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "System can insert presence history"
ON public.staff_presence_history FOR INSERT TO authenticated
WITH CHECK (changed_by = auth.uid());

DROP POLICY IF EXISTS "Users can manage presence" ON public.staff_presence;

CREATE POLICY "Staff can upsert own presence"
ON public.staff_presence FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agency members can view presence"
ON public.staff_presence FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agency_memberships am
    WHERE am.user_id = auth.uid() AND am.agency_id = staff_presence.agency_id AND am.status = 'active'
  )
);

CREATE POLICY "Admins can manage all presence"
ON public.staff_presence FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

CREATE INDEX IF NOT EXISTS idx_staff_presence_agency ON public.staff_presence(agency_id);
CREATE INDEX IF NOT EXISTS idx_staff_presence_group ON public.staff_presence(classroom_group_id);
CREATE INDEX IF NOT EXISTS idx_staff_presence_history_user ON public.staff_presence_history(user_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_presence_history_agency ON public.staff_presence_history(agency_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_presence_history_group ON public.staff_presence_history(classroom_group_id);

CREATE OR REPLACE FUNCTION public.fn_log_staff_presence_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO staff_presence_history (
    agency_id, user_id, classroom_group_id, location_type, location_label,
    status, availability_status, available_for_support, assigned_student_id,
    note, changed_at, changed_by
  ) VALUES (
    NEW.agency_id, NEW.user_id, NEW.classroom_group_id, NEW.location_type, NEW.location_label,
    NEW.status, NEW.availability_status, NEW.available_for_support, NEW.assigned_student_id,
    NEW.note, now(), auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_staff_presence ON public.staff_presence;
CREATE TRIGGER trg_log_staff_presence
  AFTER UPDATE ON public.staff_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_staff_presence_change();
