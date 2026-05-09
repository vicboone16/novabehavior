-- Drop both old constraints (they are duplicates of each other)
ALTER TABLE public.behavior_session_data DROP CONSTRAINT IF EXISTS behavior_session_data_session_id_behavior_id_key;
ALTER TABLE public.behavior_session_data DROP CONSTRAINT IF EXISTS behavior_session_unique;

-- Add the correct uniqueness: one row per (session, student, behavior)
ALTER TABLE public.behavior_session_data
  ADD CONSTRAINT behavior_session_data_session_student_behavior_key
  UNIQUE (session_id, student_id, behavior_id);