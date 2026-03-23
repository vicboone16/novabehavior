
-- IEP Evaluation/FBA Tracker table (mirrors the spreadsheet structure)
CREATE TABLE IF NOT EXISTS iep_evaluation_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  created_by uuid NOT NULL,
  
  -- Consent & dates
  eval_type text NOT NULL DEFAULT 'FBA',
  consent_requested boolean NOT NULL DEFAULT false,
  consent_received boolean NOT NULL DEFAULT false,
  ap_consent_date date,
  eval_due_date date,
  school_site text,
  classification text,
  
  -- Checklist items
  record_review boolean NOT NULL DEFAULT false,
  parent_input boolean NOT NULL DEFAULT false,
  teacher_input boolean NOT NULL DEFAULT false,
  teacher_forms_administered boolean NOT NULL DEFAULT false,
  parent_forms_administered boolean NOT NULL DEFAULT false,
  teacher_forms_collected boolean NOT NULL DEFAULT false,
  parent_forms_collected boolean NOT NULL DEFAULT false,
  forms_scored boolean NOT NULL DEFAULT false,
  report_drafted boolean NOT NULL DEFAULT false,
  report_finalized boolean NOT NULL DEFAULT false,
  iep_scheduled boolean NOT NULL DEFAULT false,
  present_at_iep boolean NOT NULL DEFAULT false,
  
  -- Observations 1-5 (nullable, expandable)
  observation_1_completed boolean NOT NULL DEFAULT false,
  observation_1_date timestamptz,
  observation_1_notes text,
  observation_2_completed boolean NOT NULL DEFAULT false,
  observation_2_date timestamptz,
  observation_2_notes text,
  observation_3_completed boolean NOT NULL DEFAULT false,
  observation_3_date timestamptz,
  observation_3_notes text,
  observation_4_completed boolean NOT NULL DEFAULT false,
  observation_4_date timestamptz,
  observation_4_notes text,
  observation_5_completed boolean NOT NULL DEFAULT false,
  observation_5_date timestamptz,
  observation_5_notes text,
  
  -- IEP meeting
  iep_meeting_date timestamptz,
  iep_meeting_notes text,
  
  -- Parent meeting
  parent_meeting_date timestamptz,
  parent_meeting_notes text,
  
  -- General
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(student_id, eval_type, created_at)
);

-- RLS
ALTER TABLE iep_evaluation_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all eval trackers"
  ON iep_evaluation_tracker FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert eval trackers"
  ON iep_evaluation_tracker FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update eval trackers"
  ON iep_evaluation_tracker FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete own eval trackers"
  ON iep_evaluation_tracker FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
