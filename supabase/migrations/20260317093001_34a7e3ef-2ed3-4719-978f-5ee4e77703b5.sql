-- 1. Add AI-tracking columns to behavior_session_data
ALTER TABLE public.behavior_session_data
  ADD COLUMN IF NOT EXISTS source_request_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS raw_source_text text;

-- 2. Add AI-tracking columns to abc_logs
ALTER TABLE public.abc_logs
  ADD COLUMN IF NOT EXISTS source_request_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS raw_source_text text,
  ADD COLUMN IF NOT EXISTS session_id uuid;

-- 3. Add indexes on new columns
CREATE INDEX IF NOT EXISTS idx_behavior_session_data_source_req ON public.behavior_session_data(source_request_id) WHERE source_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_abc_logs_source_req ON public.abc_logs(source_request_id) WHERE source_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_abc_logs_client_id ON public.abc_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_abc_logs_logged_at ON public.abc_logs(logged_at);

-- 4. Add indexes on client_timeline and graph_update_queue
CREATE INDEX IF NOT EXISTS idx_client_timeline_created_by ON public.client_timeline(created_by);
CREATE INDEX IF NOT EXISTS idx_graph_update_queue_client ON public.graph_update_queue(client_id);

-- 5. Tighten RLS on client_timeline - only users with student access or creators
DROP POLICY IF EXISTS "Authenticated users can view timeline" ON public.client_timeline;
DROP POLICY IF EXISTS "Authenticated users can insert timeline" ON public.client_timeline;

CREATE POLICY "Users can view client timeline"
  ON public.client_timeline FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Users can insert client timeline"
  ON public.client_timeline FOR INSERT TO authenticated
  WITH CHECK (public.has_student_access(client_id, auth.uid()));

-- 6. Tighten RLS on graph_update_queue
DROP POLICY IF EXISTS "Authenticated users can view graph queue" ON public.graph_update_queue;
DROP POLICY IF EXISTS "Authenticated users can insert graph queue" ON public.graph_update_queue;
DROP POLICY IF EXISTS "Authenticated users can update graph queue" ON public.graph_update_queue;

CREATE POLICY "Users can view graph queue for accessible clients"
  ON public.graph_update_queue FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()));

CREATE POLICY "Users can insert graph queue for accessible clients"
  ON public.graph_update_queue FOR INSERT TO authenticated
  WITH CHECK (public.has_student_access(client_id, auth.uid()));

CREATE POLICY "Users can update graph queue for accessible clients"
  ON public.graph_update_queue FOR UPDATE TO authenticated
  USING (public.has_student_access(client_id, auth.uid()));