-- Create shared_library_folders table first
CREATE TABLE IF NOT EXISTS shared_library_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text,
  name text NOT NULL,
  parent_folder_id uuid REFERENCES shared_library_folders(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'private',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shared_library_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage folders"
  ON shared_library_folders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Now add columns to shared_library_items
ALTER TABLE shared_library_items 
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES shared_library_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

-- Reclassify IEP/FBA built-in tools
UPDATE clinical_form_templates 
SET form_category = 'built_in'
WHERE form_name IN (
  'Auto IEP Workbook', 
  'FBA Case Planner', 
  'IEP Communications & Meeting Notes',
  'IEP/FBA/BIP at a Glance'
);

-- Add repeatable "Behaviors of Concern" section to Child Behavior Assessment
UPDATE clinical_form_templates
SET sections = sections || '[{
  "key": "behaviors_of_concern",
  "title": "Specific Behaviors of Concern",
  "repeatable": true,
  "repeat_label": "Add Another Behavior",
  "fields": [
    {"key": "behavior_name", "label": "Behavior Name", "type": "text", "required": true},
    {"key": "behavior_description", "label": "Describe the behavior", "type": "textarea"},
    {"key": "behavior_frequency", "label": "How often does this behavior occur?", "type": "select", "options": ["Rarely", "Sometimes", "Often", "Very Often", "Constantly"]},
    {"key": "behavior_intensity", "label": "Intensity (1-5)", "type": "select", "options": ["1 - Mild", "2 - Low", "3 - Moderate", "4 - High", "5 - Severe"]},
    {"key": "behavior_duration", "label": "Typical duration", "type": "select", "options": ["Seconds", "1-5 minutes", "5-15 minutes", "15-30 minutes", "30+ minutes"]},
    {"key": "behavior_triggers", "label": "Known triggers or antecedents", "type": "textarea"},
    {"key": "behavior_response", "label": "How do you typically respond?", "type": "textarea"}
  ]
}]'::jsonb
WHERE form_name = 'Child Behavior Assessment';