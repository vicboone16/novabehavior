-- Add background information column to students table for FBA/BIP reports
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS background_info JSONB DEFAULT '{}'::jsonb;