-- Create contract rates table
CREATE TABLE IF NOT EXISTS contract_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- Contract party
  contract_type TEXT NOT NULL CHECK (contract_type IN ('district', 'school', 'agency_partner', 'private_pay')),
  organization_name TEXT NOT NULL,
  organization_id UUID,
  
  -- Contract terms
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  contract_number TEXT,
  
  -- Rate details stored as JSONB array
  services JSONB NOT NULL DEFAULT '[]',
  
  -- Billing settings
  billing_frequency TEXT DEFAULT 'monthly' CHECK (billing_frequency IN ('weekly', 'biweekly', 'monthly')),
  invoice_due_days INTEGER DEFAULT 30,
  requires_signature BOOLEAN DEFAULT false,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending', 'terminated')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link students to contracts
CREATE TABLE IF NOT EXISTS student_contract_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contract_rates(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  funding_source TEXT CHECK (funding_source IN ('district_funded', 'grant', 'settlement', 'medicaid', 'private_insurance', 'self_pay')),
  authorized_hours_per_week NUMERIC(5,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, contract_id)
);

-- Enable RLS
ALTER TABLE contract_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_contract_assignments ENABLE ROW LEVEL SECURITY;

-- RLS for contract_rates
CREATE POLICY "Users can view contracts in their agency"
  ON contract_rates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agency_memberships am
      WHERE am.agency_id = contract_rates.agency_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
    )
  );

CREATE POLICY "Admins can manage contracts"
  ON contract_rates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agency_memberships am
      WHERE am.agency_id = contract_rates.agency_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.status = 'active'
    )
  );

-- RLS for student_contract_assignments
CREATE POLICY "Users can view student contract assignments"
  ON student_contract_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN agency_memberships am ON am.agency_id = s.agency_id
      WHERE s.id = student_contract_assignments.student_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
    )
  );

CREATE POLICY "Admins can manage student contract assignments"
  ON student_contract_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN agency_memberships am ON am.agency_id = s.agency_id
      WHERE s.id = student_contract_assignments.student_id
      AND am.user_id = auth.uid()
      AND am.role IN ('owner', 'admin')
      AND am.status = 'active'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_rates_agency ON contract_rates(agency_id);
CREATE INDEX IF NOT EXISTS idx_contract_rates_status ON contract_rates(status);
CREATE INDEX IF NOT EXISTS idx_student_contracts_student ON student_contract_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_contracts_contract ON student_contract_assignments(contract_id);