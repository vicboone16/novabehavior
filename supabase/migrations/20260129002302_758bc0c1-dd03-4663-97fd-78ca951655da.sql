-- Make student_id nullable to allow staff-only appointments
ALTER TABLE public.appointments ALTER COLUMN student_id DROP NOT NULL;