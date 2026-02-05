-- Create fidelity check templates (per intervention/BIP)
CREATE TABLE IF NOT EXISTS fidelity_check_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  intervention_id UUID,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create treatment fidelity checks
CREATE TABLE IF NOT EXISTS treatment_fidelity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES fidelity_check_templates(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  observer_user_id UUID NOT NULL REFERENCES auth.users(id),
  implementer_user_id UUID REFERENCES auth.users(id),
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  intervention_id UUID,
  
  -- Fidelity scoring
  items JSONB NOT NULL DEFAULT '[]',
  items_implemented INTEGER NOT NULL DEFAULT 0,
  items_total INTEGER NOT NULL DEFAULT 0,
  fidelity_percentage NUMERIC(5, 2) GENERATED ALWAYS AS 
    (CASE WHEN items_total > 0 THEN (items_implemented::numeric / items_total) * 100 ELSE 0 END) STORED,
  
  -- Context
  setting TEXT,
  duration_minutes INTEGER,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE fidelity_check_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_fidelity_checks ENABLE ROW LEVEL SECURITY;

-- RLS for templates
CREATE POLICY "Users can view templates for students they have access to"
  ON fidelity_check_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN agency_memberships am ON am.agency_id = s.agency_id
      WHERE s.id = fidelity_check_templates.student_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
    )
    OR student_id IS NULL
  );

CREATE POLICY "Supervisors can manage templates"
  ON fidelity_check_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND credential IN ('BCBA', 'BCBA-D', 'BCaBA')
    )
  );

-- RLS for fidelity checks
CREATE POLICY "Users can view fidelity checks for their students"
  ON treatment_fidelity_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN agency_memberships am ON am.agency_id = s.agency_id
      WHERE s.id = treatment_fidelity_checks.student_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
    )
  );

CREATE POLICY "Users can create fidelity checks"
  ON treatment_fidelity_checks FOR INSERT
  WITH CHECK (observer_user_id = auth.uid());

CREATE POLICY "Observers can update their own checks"
  ON treatment_fidelity_checks FOR UPDATE
  USING (observer_user_id = auth.uid());

CREATE POLICY "Supervisors can delete fidelity checks"
  ON treatment_fidelity_checks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND credential IN ('BCBA', 'BCBA-D', 'BCaBA')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fidelity_checks_student ON treatment_fidelity_checks(student_id);
CREATE INDEX IF NOT EXISTS idx_fidelity_checks_date ON treatment_fidelity_checks(check_date);
CREATE INDEX IF NOT EXISTS idx_fidelity_templates_student ON fidelity_check_templates(student_id);