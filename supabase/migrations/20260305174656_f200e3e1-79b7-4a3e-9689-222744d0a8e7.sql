
-- Add slug column to lms_courses
ALTER TABLE public.lms_courses ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create lms_quizzes table
CREATE TABLE IF NOT EXISTS public.lms_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.lms_lessons(id),
  title text,
  created_at timestamptz DEFAULT now()
);

-- Create lms_questions table
CREATE TABLE IF NOT EXISTS public.lms_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.lms_quizzes(id),
  question text,
  options jsonb,
  correct_answer text,
  created_at timestamptz DEFAULT now()
);

-- Create lms_scenarios table
CREATE TABLE IF NOT EXISTS public.lms_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,
  scenario text,
  function_answer text
);
