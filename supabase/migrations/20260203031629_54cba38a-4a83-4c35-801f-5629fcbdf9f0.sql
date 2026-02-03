-- Add funding_mode to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS funding_mode TEXT DEFAULT 'school_based' CHECK (funding_mode IN ('school_based', 'insurance'));

-- Create payers table (reusable across clients)
CREATE TABLE IF NOT EXISTS public.payers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  payer_type TEXT CHECK (payer_type IN ('medicaid', 'commercial', 'private', 'other')),
  phone TEXT,
  email TEXT,
  fax TEXT,
  address TEXT,
  billing_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_payers junction table (links clients to their payers)
CREATE TABLE IF NOT EXISTS public.client_payers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.payers(id) ON DELETE CASCADE,
  member_id TEXT,
  group_number TEXT,
  policy_holder_name TEXT,
  policy_holder_dob DATE,
  relationship_to_client TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE,
  termination_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, payer_id)
);

-- Create authorizations table
CREATE TABLE IF NOT EXISTS public.authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.payers(id) ON DELETE CASCADE,
  auth_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  service_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  units_approved INTEGER NOT NULL DEFAULT 0,
  units_used INTEGER NOT NULL DEFAULT 0,
  units_remaining INTEGER GENERATED ALWAYS AS (units_approved - units_used) STORED,
  unit_type TEXT CHECK (unit_type IN ('15min', '30min', '1hr', 'session', 'day')),
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired', 'exhausted', 'denied')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorizations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payers (accessible by all authenticated users)
CREATE POLICY "Users can view all payers" 
ON public.payers 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can insert payers" 
ON public.payers 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can update payers" 
ON public.payers 
FOR UPDATE 
TO authenticated 
USING (true);

-- Create RLS policies for client_payers
CREATE POLICY "Users can view client payers" 
ON public.client_payers 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can insert client payers" 
ON public.client_payers 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can update client payers" 
ON public.client_payers 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Users can delete client payers" 
ON public.client_payers 
FOR DELETE 
TO authenticated 
USING (true);

-- Create RLS policies for authorizations
CREATE POLICY "Users can view authorizations" 
ON public.authorizations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can insert authorizations" 
ON public.authorizations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can update authorizations" 
ON public.authorizations 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Users can delete authorizations" 
ON public.authorizations 
FOR DELETE 
TO authenticated 
USING (true);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_payers_updated_at ON public.payers;
CREATE TRIGGER update_payers_updated_at
BEFORE UPDATE ON public.payers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_payers_updated_at ON public.client_payers;
CREATE TRIGGER update_client_payers_updated_at
BEFORE UPDATE ON public.client_payers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_authorizations_updated_at ON public.authorizations;
CREATE TRIGGER update_authorizations_updated_at
BEFORE UPDATE ON public.authorizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();