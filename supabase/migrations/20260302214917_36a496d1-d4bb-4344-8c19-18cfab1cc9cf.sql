
-- Fix overly permissive INSERT/UPDATE/DELETE on timesheet_entries
-- Currently all use USING(true) or WITH CHECK(true)

-- Drop the permissive policies
DROP POLICY IF EXISTS "Users can manage entries" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Users can update entries" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Users can delete entries" ON public.timesheet_entries;

-- Recreate with proper owner-scoped + admin access

CREATE POLICY "Users can insert own timesheet entries"
ON public.timesheet_entries FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM staff_timesheets st
    WHERE st.id = timesheet_id
    AND st.staff_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own timesheet entries"
ON public.timesheet_entries FOR UPDATE
USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM staff_timesheets st
    WHERE st.id = timesheet_entries.timesheet_id
    AND st.staff_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own timesheet entries"
ON public.timesheet_entries FOR DELETE
USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM staff_timesheets st
    WHERE st.id = timesheet_entries.timesheet_id
    AND st.staff_user_id = auth.uid()
  )
);
