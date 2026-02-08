-- Add is_telehealth boolean column to appointments
ALTER TABLE public.appointments ADD COLUMN is_telehealth boolean NOT NULL DEFAULT false;

-- Migrate existing telehealth appointments: set is_telehealth = true, change type to 1on1_session
UPDATE public.appointments 
SET is_telehealth = true, appointment_type = '1on1_session'
WHERE appointment_type = 'telehealth';