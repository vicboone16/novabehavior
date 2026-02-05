-- Create supervision chain violations tracking table
CREATE TABLE IF NOT EXISTS supervision_chain_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL CHECK (violation_type IN ('missing_supervisor', 'expired_link', 'ratio_exceeded')),
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE supervision_chain_violations ENABLE ROW LEVEL SECURITY;

-- RLS policies for supervision chain violations
CREATE POLICY "Users can view violations in their agency"
  ON supervision_chain_violations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN agency_memberships am ON am.user_id = auth.uid()
      JOIN agency_memberships am2 ON am2.agency_id = am.agency_id
      WHERE am2.user_id = supervision_chain_violations.staff_user_id
      AND am.status = 'active'
      AND am2.status = 'active'
    )
  );

CREATE POLICY "Supervisors can create violations"
  ON supervision_chain_violations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND credential IN ('BCBA', 'BCBA-D', 'BCaBA')
    )
  );

CREATE POLICY "Supervisors can update violations"
  ON supervision_chain_violations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND credential IN ('BCBA', 'BCBA-D', 'BCaBA')
    )
  );

-- Function to check if an RBT can be scheduled
CREATE OR REPLACE FUNCTION can_schedule_rbt(_staff_user_id UUID, _session_date DATE)
RETURNS TABLE(allowed BOOLEAN, reason TEXT) AS $$
BEGIN
  -- Check if staff is an RBT (needs supervision)
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = _staff_user_id
    AND credential = 'RBT'
  ) THEN
    -- Non-RBTs don't need supervision chain check
    RETURN QUERY SELECT true, 'Not an RBT - no supervision required'::TEXT;
    RETURN;
  END IF;

  -- Check for active supervisor link
  IF NOT EXISTS (
    SELECT 1 FROM supervisor_links
    WHERE supervisee_staff_id = _staff_user_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= _session_date)
  ) THEN
    RETURN QUERY SELECT false, 'No active supervisor assigned. RBTs must have an active supervisor to be scheduled.'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_schedule_rbt TO authenticated;