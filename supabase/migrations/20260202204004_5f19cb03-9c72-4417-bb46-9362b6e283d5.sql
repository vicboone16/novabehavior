-- Add data_collection_start_date column to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS data_collection_start_date date;