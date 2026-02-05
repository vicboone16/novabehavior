-- Add billing_order column for primary/secondary/tertiary insurance ordering
ALTER TABLE public.student_payers 
ADD COLUMN billing_order INTEGER NOT NULL DEFAULT 1;

-- Add constraint to ensure billing order is valid
ALTER TABLE public.student_payers 
ADD CONSTRAINT valid_billing_order CHECK (billing_order >= 1 AND billing_order <= 10);

-- Create unique constraint for billing order per student (no two payers can have same order)
CREATE UNIQUE INDEX idx_student_payer_billing_order 
ON public.student_payers(student_id, billing_order) 
WHERE is_active = true;

-- Add comment for clarity
COMMENT ON COLUMN public.student_payers.billing_order IS 'Billing priority: 1=Primary, 2=Secondary, 3=Tertiary, etc.';