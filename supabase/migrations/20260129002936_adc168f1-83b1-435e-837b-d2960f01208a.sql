-- Add support for multiple staff members on an appointment
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS staff_user_ids uuid[] DEFAULT '{}';

-- Migrate existing single staff to array
UPDATE public.appointments 
SET staff_user_ids = ARRAY[staff_user_id]
WHERE staff_user_id IS NOT NULL AND (staff_user_ids IS NULL OR staff_user_ids = '{}');

-- Add index for array searching
CREATE INDEX IF NOT EXISTS idx_appointments_staff_user_ids ON public.appointments USING GIN(staff_user_ids);

-- Update RLS policy to check array membership
DROP POLICY IF EXISTS "Users can view their assigned appointments" ON public.appointments;
CREATE POLICY "Users can view their assigned appointments" 
ON public.appointments 
FOR SELECT 
USING (
  staff_user_id = auth.uid() 
  OR auth.uid() = ANY(staff_user_ids)
);

-- Keep existing admin policy
-- Admins can manage all appointments (already exists)