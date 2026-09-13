-- Add JSONB columns to students table for ABA-specific data types
-- that previously lived only in localStorage.
-- Using JSONB allows flexible schema evolution without further migrations
-- while still keeping data in the encrypted, auditable Supabase backend.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS skill_targets_data  JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dtt_sessions_data   JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ioa_entries_data    JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fidelity_checks_data JSONB DEFAULT '[]'::jsonb;

-- Indexes for common query patterns (filter by student is already covered by
-- the primary key; these help if we ever query inside the JSON arrays).
CREATE INDEX IF NOT EXISTS students_skill_targets_data_gin
  ON public.students USING GIN (skill_targets_data);

CREATE INDEX IF NOT EXISTS students_dtt_sessions_data_gin
  ON public.students USING GIN (dtt_sessions_data);
