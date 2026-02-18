
-- 1. Ensure session_participants has a data_intervals column for precise
--    per-user collection windows (joined_at / left_at already exist as top-level,
--    but we want a full array so a user can join/leave multiple times).
ALTER TABLE public.session_participants
  ADD COLUMN IF NOT EXISTS collection_intervals jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS data_entry_count integer DEFAULT 0;

-- 2. Add staff attribution fields to the sessions table's stored data payloads.
--    Sessions store data as JSON blobs (in the sessions table) and are also
--    synced via the store. We create a dedicated lightweight table that acts
--    as the authoritative cross-device sync channel for multi-staff sessions.

CREATE TABLE IF NOT EXISTS public.shared_session_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,          -- matches sessions.id
  entry_type text NOT NULL,          -- 'frequency' | 'abc' | 'duration' | 'interval' | 'skill' | 'cold_probe' | 'bx_reduction'
  entry_id text NOT NULL,            -- client-side UUID so updates can be idempotent
  student_id uuid NOT NULL,
  behavior_id text,
  collected_by_user_id uuid NOT NULL,
  collected_by_display_name text,
  collected_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,  -- full entry snapshot
  is_deleted boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, entry_id)
);

-- RLS
ALTER TABLE public.shared_session_data ENABLE ROW LEVEL SECURITY;

-- Participants of the session (via session_participants) can read/write
CREATE POLICY "Session participants can read shared data"
  ON public.shared_session_data FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- User is a participant of the session
      EXISTS (
        SELECT 1 FROM public.session_participants sp
        WHERE sp.session_id = shared_session_data.session_id
          AND sp.user_id = auth.uid()
      )
      OR
      -- Or user collected this entry themselves
      collected_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Session participants can insert shared data"
  ON public.shared_session_data FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    collected_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = shared_session_data.session_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Collectors can update own entries"
  ON public.shared_session_data FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    collected_by_user_id = auth.uid()
  );

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_shared_session_data_session_id 
  ON public.shared_session_data(session_id);
CREATE INDEX IF NOT EXISTS idx_shared_session_data_student_id 
  ON public.shared_session_data(student_id);
CREATE INDEX IF NOT EXISTS idx_shared_session_data_collected_by 
  ON public.shared_session_data(collected_by_user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_shared_session_data_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shared_session_data_updated_at
  BEFORE UPDATE ON public.shared_session_data
  FOR EACH ROW EXECUTE FUNCTION public.update_shared_session_data_updated_at();

-- 3. Enable realtime on the tables that need cross-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_session_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
