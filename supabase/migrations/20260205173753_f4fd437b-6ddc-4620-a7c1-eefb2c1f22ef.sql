-- Create student_payers table for insurance payer assignments
CREATE TABLE public.student_payers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.payers(id) ON DELETE CASCADE,
  member_id TEXT,
  group_number TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE,
  termination_date DATE,
  subscriber_name TEXT,
  subscriber_relationship TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_student_payer UNIQUE (student_id, payer_id)
);

-- Enable RLS
ALTER TABLE public.student_payers ENABLE ROW LEVEL SECURITY;

-- RLS policies - admins and staff can manage
CREATE POLICY "Users can view student payers for accessible students"
ON public.student_payers
FOR SELECT
USING (
  public.is_admin(auth.uid()) 
  OR public.has_student_access(student_id, auth.uid())
  OR public.is_student_owner(student_id, auth.uid())
  OR public.has_agency_student_access(auth.uid(), student_id)
);

CREATE POLICY "Admins and billing can insert student payers"
ON public.student_payers
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) 
  OR public.has_billing_access(auth.uid())
);

CREATE POLICY "Admins and billing can update student payers"
ON public.student_payers
FOR UPDATE
USING (
  public.is_admin(auth.uid()) 
  OR public.has_billing_access(auth.uid())
);

CREATE POLICY "Admins and billing can delete student payers"
ON public.student_payers
FOR DELETE
USING (
  public.is_admin(auth.uid()) 
  OR public.has_billing_access(auth.uid())
);

-- Index for faster lookups
CREATE INDEX idx_student_payers_student ON public.student_payers(student_id);
CREATE INDEX idx_student_payers_payer ON public.student_payers(payer_id);

-- Trigger for updated_at
CREATE TRIGGER update_student_payers_updated_at
BEFORE UPDATE ON public.student_payers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();