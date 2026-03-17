
ALTER TABLE public.client_library_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments"
ON public.client_library_assignments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert assignments"
ON public.client_library_assignments FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update assignments"
ON public.client_library_assignments FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assignments"
ON public.client_library_assignments FOR DELETE TO authenticated
USING (true);

ALTER TABLE public.client_goal_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view drafts"
ON public.client_goal_drafts FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert drafts"
ON public.client_goal_drafts FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update drafts"
ON public.client_goal_drafts FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete drafts"
ON public.client_goal_drafts FOR DELETE TO authenticated
USING (true);
