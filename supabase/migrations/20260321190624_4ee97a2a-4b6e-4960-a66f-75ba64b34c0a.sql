
-- Add INSERT/UPDATE policies for staff_presence_status
CREATE POLICY "Staff can update own presence"
ON public.staff_presence_status
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can insert own presence"
ON public.staff_presence_status
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all staff presence"
ON public.staff_presence_status
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')
  )
);

-- Enable RLS on classroom_presence_log and add policies
ALTER TABLE public.classroom_presence_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert presence log"
ON public.classroom_presence_log
FOR INSERT TO authenticated
WITH CHECK (changed_by = auth.uid());

CREATE POLICY "Agency members can read presence log"
ON public.classroom_presence_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classroom_group_members cgm
    WHERE cgm.group_id = classroom_presence_log.classroom_id AND cgm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')
  )
);

-- Add group_id column to staff_presence_status for classroom_groups compatibility
ALTER TABLE public.staff_presence_status
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES classroom_groups(group_id),
  ADD COLUMN IF NOT EXISTS assigned_student_id uuid REFERENCES students(id),
  ADD COLUMN IF NOT EXISTS available_for_support boolean DEFAULT true;
