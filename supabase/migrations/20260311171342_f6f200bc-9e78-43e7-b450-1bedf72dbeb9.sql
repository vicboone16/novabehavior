
-- Student timeline manual entries (not behavioral data, narrative/event notes)
CREATE TABLE public.student_timeline_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT DEFAULT NULL,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  content TEXT NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'note',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_timeline_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own timeline entries"
  ON public.student_timeline_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read timeline entries for their students"
  ON public.student_timeline_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Personal notes and to-do items
CREATE TABLE public.user_personal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  note_type TEXT NOT NULL DEFAULT 'note',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_personal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own personal notes"
  ON public.user_personal_notes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
