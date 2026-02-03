-- Add date_of_birth column to profiles for staff zodiac tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;