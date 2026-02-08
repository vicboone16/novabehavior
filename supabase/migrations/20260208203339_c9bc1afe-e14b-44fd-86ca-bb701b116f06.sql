-- Add telehealth provider and meeting link fields to appointments
ALTER TABLE public.appointments ADD COLUMN telehealth_provider text;
ALTER TABLE public.appointments ADD COLUMN meeting_link text;