-- Enhanced Session Notes System for ABA Documentation

-- Create enum for note types
DO $$ BEGIN
  CREATE TYPE public.session_note_type AS ENUM (
    'therapist',
    'assessment', 
    'clinical',
    'parent_training',
    'supervision_revision'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for note subtype
DO $$ BEGIN
  CREATE TYPE public.note_subtype AS ENUM (
    'clinical_only',
    'parent_training_only',
    'combined'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for service setting
DO $$ BEGIN
  CREATE TYPE public.service_setting AS ENUM (
    'school',
    'home',
    'telehealth',
    'clinic',
    'community'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enhanced session notes table
CREATE TABLE IF NOT EXISTS public.enhanced_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  
  -- Note classification
  note_type text NOT NULL DEFAULT 'therapist',
  subtype text, -- For supervision_revision notes
  
  -- Author info
  author_user_id UUID NOT NULL,
  author_role text NOT NULL DEFAULT 'staff', -- RBT, BCBA, Teacher, Admin
  
  -- Timing (can override session times)
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  -- Location
  service_setting text DEFAULT 'school',
  location_detail text,
  
  -- Auto-pull configuration
  auto_pull_enabled BOOLEAN DEFAULT true,
  pulled_data_snapshot JSONB DEFAULT '{}',
  
  -- Note content (structured by template)
  note_content JSONB DEFAULT '{}',
  
  -- Status and workflow
  status text NOT NULL DEFAULT 'draft', -- draft, submitted, locked
  billable BOOLEAN DEFAULT true,
  
  -- Signature
  clinician_signature_name text,
  credential text,
  signed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID
);

-- Create note versions table for audit trail
CREATE TABLE IF NOT EXISTS public.note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.enhanced_session_notes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  edited_by UUID NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  edit_reason text,
  changes_summary text,
  previous_content JSONB NOT NULL,
  previous_status text
);

-- Create supervisor review records table (separate from clinical notes)
CREATE TABLE IF NOT EXISTS public.supervisor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.enhanced_session_notes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL, -- Original note author
  reviewer_user_id UUID NOT NULL, -- BCBA/Admin reviewing
  
  -- Review details
  review_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  review_outcome text NOT NULL DEFAULT 'pending', -- pending, approved, needs_revision, flagged
  comments text, -- Private audit comments
  
  -- Required actions
  required_action text, -- 'revise_note', 'bcba_followup', 'training_needed'
  action_notes text,
  action_completed BOOLEAN DEFAULT false,
  action_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create note templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  note_type text NOT NULL,
  description text,
  template_fields JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhanced_notes_student ON public.enhanced_session_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_notes_author ON public.enhanced_session_notes(author_user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_notes_session ON public.enhanced_session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_notes_status ON public.enhanced_session_notes(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_notes_type ON public.enhanced_session_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_enhanced_notes_date ON public.enhanced_session_notes(start_time);

CREATE INDEX IF NOT EXISTS idx_note_versions_note ON public.note_versions(note_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_reviews_note ON public.supervisor_reviews(note_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_reviews_reviewer ON public.supervisor_reviews(reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_reviews_outcome ON public.supervisor_reviews(review_outcome);

-- Enable RLS
ALTER TABLE public.enhanced_session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enhanced_session_notes
CREATE POLICY "Users can view notes for accessible students"
ON public.enhanced_session_notes FOR SELECT
USING (
  auth.uid() = author_user_id 
  OR is_student_owner(student_id, auth.uid())
  OR has_student_access(student_id, auth.uid())
  OR has_tag_based_access(auth.uid(), student_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can create notes for accessible students"
ON public.enhanced_session_notes FOR INSERT
WITH CHECK (
  auth.uid() = author_user_id
  AND (
    is_student_owner(student_id, auth.uid())
    OR has_student_access(student_id, auth.uid())
    OR has_tag_based_access(auth.uid(), student_id)
    OR is_admin(auth.uid())
  )
);

CREATE POLICY "Authors can update their draft notes"
ON public.enhanced_session_notes FOR UPDATE
USING (
  (auth.uid() = author_user_id AND status = 'draft')
  OR is_admin(auth.uid())
);

CREATE POLICY "Admins can delete notes"
ON public.enhanced_session_notes FOR DELETE
USING (is_admin(auth.uid()));

-- RLS Policies for note_versions
CREATE POLICY "Users can view versions for their notes"
ON public.note_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enhanced_session_notes n
    WHERE n.id = note_id
    AND (n.author_user_id = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "System can insert versions"
ON public.note_versions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for supervisor_reviews
CREATE POLICY "Admins can manage supervisor reviews"
ON public.supervisor_reviews FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authors can view reviews of their notes"
ON public.supervisor_reviews FOR SELECT
USING (auth.uid() = author_user_id);

-- RLS Policies for note_templates
CREATE POLICY "All authenticated users can view active templates"
ON public.note_templates FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage templates"
ON public.note_templates FOR ALL
USING (is_admin(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_enhanced_notes_updated_at
  BEFORE UPDATE ON public.enhanced_session_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supervisor_reviews_updated_at
  BEFORE UPDATE ON public.supervisor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_note_templates_updated_at
  BEFORE UPDATE ON public.note_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default note templates
INSERT INTO public.note_templates (name, note_type, description, template_fields, is_default) VALUES
(
  'Therapist Session Note',
  'therapist',
  'RBT/Teacher session documentation',
  '[
    {"id": "programs_run", "label": "Programs Run", "type": "auto", "hint": "Auto-populated from session data"},
    {"id": "behavior_summary", "label": "Behavior Data Summary", "type": "auto", "hint": "Auto-populated from session data"},
    {"id": "interventions", "label": "Interventions Implemented", "type": "multiselect", "options": ["Antecedent strategies", "Reinforcement", "Prompting", "De-escalation", "Response blocking", "Functional communication training"]},
    {"id": "session_narrative", "label": "Session Narrative", "type": "textarea", "hint": "Summarize participation, engagement, transitions, barriers, and response to intervention"},
    {"id": "caregiver_communication", "label": "Caregiver/Teacher Communication", "type": "textarea"},
    {"id": "next_session_plan", "label": "Plan / Next Session Focus", "type": "textarea"}
  ]',
  true
),
(
  'Assessment Note',
  'assessment',
  'Intake, observation, record review documentation',
  '[
    {"id": "assessment_type", "label": "Assessment Type", "type": "select", "options": ["Intake interview", "Direct observation", "Record review", "Rating scale", "Combined"]},
    {"id": "respondents", "label": "Respondent(s)", "type": "text"},
    {"id": "tools_used", "label": "Tools Used", "type": "multiselect", "options": ["FAST", "QABF", "MAS", "Vineland", "SRS-2", "ABLLS-R", "VB-MAPP", "AFLS", "Other"]},
    {"id": "context", "label": "Context & Reason for Assessment", "type": "textarea"},
    {"id": "activities", "label": "Activities Completed", "type": "textarea"},
    {"id": "findings", "label": "Summary of Findings", "type": "textarea"},
    {"id": "hypothesized_functions", "label": "Hypothesized Function(s)", "type": "multiselect", "options": ["Attention", "Escape/Avoidance", "Tangible", "Sensory/Automatic"]},
    {"id": "recommendations", "label": "Recommendations / Next Steps", "type": "textarea"}
  ]',
  true
),
(
  'Clinical Note (BCBA)',
  'clinical',
  'Supervision, treatment planning, clinical decisions',
  '[
    {"id": "clinical_focus", "label": "Clinical Focus", "type": "multiselect", "options": ["Supervision", "Protocol modification", "Skills review", "Behavior plan review", "Caregiver coaching", "Team collaboration", "Data review only"]},
    {"id": "data_review", "label": "Data Review Summary", "type": "textarea", "hint": "Trends, patterns, mastery progress, regression flags"},
    {"id": "clinical_decisions", "label": "Clinical Decisions Made", "type": "textarea", "hint": "Program changes, prompt fading, reinforcement schedule, behavior plan revisions"},
    {"id": "staff_training", "label": "Training / Feedback Provided to Staff", "type": "textarea"},
    {"id": "follow_up", "label": "Plan / Follow-Up", "type": "textarea"}
  ]',
  true
),
(
  'Parent Training Note',
  'parent_training',
  'Telehealth or in-person caregiver coaching',
  '[
    {"id": "training_goals", "label": "Training Goal(s)", "type": "textarea"},
    {"id": "content_delivered", "label": "Content Delivered", "type": "multiselect", "options": ["Instruction", "Modeling", "Rehearsal", "Feedback", "Written materials", "Video examples"]},
    {"id": "content_narrative", "label": "Content Details", "type": "textarea"},
    {"id": "caregiver_performance", "label": "Caregiver Performance / Fidelity", "type": "textarea", "hint": "Observed strengths, errors, barriers"},
    {"id": "fidelity_percentage", "label": "Fidelity Estimate (%)", "type": "number"},
    {"id": "home_practice", "label": "Home Practice Plan", "type": "textarea", "hint": "Homework, routine embedding, troubleshooting"}
  ]',
  true
),
(
  'Supervision Revision Note',
  'supervision_revision',
  'Combined clinical and/or parent training',
  '[
    {"id": "subtype", "label": "Note Subtype", "type": "select", "options": ["Clinical only", "Parent training only", "Combined"]},
    {"id": "clinical_focus", "label": "Clinical Focus", "type": "multiselect", "options": ["Supervision", "Protocol modification", "Skills review", "Behavior plan review", "Caregiver coaching", "Team collaboration"]},
    {"id": "data_review", "label": "Data Review Summary", "type": "textarea"},
    {"id": "clinical_decisions", "label": "Clinical Decisions Made", "type": "textarea"},
    {"id": "training_goals", "label": "Parent Training Goals", "type": "textarea"},
    {"id": "caregiver_performance", "label": "Caregiver Performance", "type": "textarea"},
    {"id": "follow_up", "label": "Plan / Follow-Up", "type": "textarea"}
  ]',
  true
)
ON CONFLICT DO NOTHING;