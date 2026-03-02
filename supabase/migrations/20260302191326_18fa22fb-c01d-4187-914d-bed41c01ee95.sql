
-- Add client_id to teacher_targets (to scope targets per student)
ALTER TABLE public.teacher_targets
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.students(id) ON DELETE CASCADE;

-- Add user_id to teacher_data_sessions (alias for created_by, used by teacher app)
ALTER TABLE public.teacher_data_sessions
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- Backfill user_id from created_by
UPDATE public.teacher_data_sessions
  SET user_id = created_by::uuid
  WHERE user_id IS NULL AND created_by IS NOT NULL;
