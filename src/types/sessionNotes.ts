// Session Notes Types for ABA Documentation

export type SessionNoteType = 
  | 'therapist'
  | 'assessment'
  | 'clinical'
  | 'parent_training'
  | 'supervision_revision';

export type NoteSubtype = 
  | 'clinical_only'
  | 'parent_training_only'
  | 'combined';

export type ServiceSetting = 
  | 'school'
  | 'home'
  | 'telehealth'
  | 'clinic'
  | 'community';

export type NoteStatus = 'draft' | 'submitted' | 'locked';

export type ReviewOutcome = 'pending' | 'approved' | 'needs_revision' | 'flagged';

export type AuthorRole = 'RBT' | 'BCBA' | 'Teacher' | 'Admin';

export interface NoteTemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'auto' | 'date';
  hint?: string;
  options?: string[];
  required?: boolean;
}

export interface NoteTemplate {
  id: string;
  name: string;
  note_type: SessionNoteType;
  description?: string;
  template_fields: NoteTemplateField[];
  is_default: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BehaviorDataSummary {
  behaviorId: string;
  behaviorName: string;
  frequencyCount: number;
  durationSeconds: number;
  intervalPercentage: number;
  abcCount: number;
  topographies?: string[];
}

export interface SkillDataSummary {
  targetId: string;
  targetName: string;
  trialsCompleted: number;
  percentCorrect: number;
  percentIndependent: number;
  promptLevelsSummary?: string;
}

export interface PulledDataSnapshot {
  sessionTiming: {
    startTime: string;
    endTime: string;
    durationMinutes: number;
  };
  setting: ServiceSetting;
  location?: string;
  behaviors: BehaviorDataSummary[];
  skills: SkillDataSummary[];
  pulledAt: string;
}

export interface EnhancedSessionNote {
  id: string;
  student_id: string;
  session_id?: string;
  
  // Classification
  note_type: SessionNoteType;
  subtype?: NoteSubtype;
  
  // Author
  author_user_id: string;
  author_role: AuthorRole;
  author_name?: string;
  
  // Timing
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  
  // Location
  service_setting: ServiceSetting;
  location_detail?: string;
  
  // Data
  auto_pull_enabled: boolean;
  pulled_data_snapshot: PulledDataSnapshot | null;
  note_content: Record<string, unknown>;
  
  // Status
  status: NoteStatus;
  billable: boolean;
  
  // Signature
  clinician_signature_name?: string;
  credential?: string;
  signed_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  locked_at?: string;
  locked_by?: string;
  
  // Joined data
  student_name?: string;
  reviewer_name?: string;
}

export interface NoteVersion {
  id: string;
  note_id: string;
  version_number: number;
  edited_by: string;
  edited_by_name?: string;
  edited_at: string;
  edit_reason?: string;
  changes_summary?: string;
  previous_content: Record<string, unknown>;
  previous_status?: NoteStatus;
}

export interface SupervisorReview {
  id: string;
  note_id: string;
  student_id: string;
  author_user_id: string;
  reviewer_user_id: string;
  
  review_date: string;
  review_outcome: ReviewOutcome;
  comments?: string;
  
  required_action?: 'revise_note' | 'bcba_followup' | 'training_needed';
  action_notes?: string;
  action_completed: boolean;
  action_completed_at?: string;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  student_name?: string;
  author_name?: string;
  reviewer_name?: string;
  note_type?: SessionNoteType;
}

export const NOTE_TYPE_LABELS: Record<SessionNoteType, string> = {
  therapist: 'Therapist Note',
  assessment: 'Assessment Note',
  clinical: 'Clinical Note (BCBA)',
  parent_training: 'Parent Training',
  supervision_revision: 'Supervision Revision',
};

export const SERVICE_SETTING_LABELS: Record<ServiceSetting, string> = {
  school: 'School',
  home: 'Home',
  telehealth: 'Telehealth',
  clinic: 'Clinic',
  community: 'Community',
};

export const REVIEW_OUTCOME_CONFIG: Record<ReviewOutcome, { 
  label: string; 
  color: string;
  description: string;
}> = {
  pending: { 
    label: 'Pending Review', 
    color: 'bg-warning/20 text-warning-foreground',
    description: 'Awaiting supervisor review',
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-primary/20 text-primary',
    description: 'Note approved by supervisor',
  },
  needs_revision: { 
    label: 'Needs Revision', 
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    description: 'Revisions required before approval',
  },
  flagged: { 
    label: 'Flagged', 
    color: 'bg-destructive/20 text-destructive',
    description: 'Flagged for follow-up or training',
  },
};

export const AUTHOR_ROLE_OPTIONS: AuthorRole[] = ['RBT', 'BCBA', 'Teacher', 'Admin'];

// Intervention options for therapist notes
export const INTERVENTION_OPTIONS = [
  'Antecedent strategies',
  'Reinforcement delivery',
  'Prompting procedures',
  'De-escalation techniques',
  'Response blocking',
  'Functional communication training',
  'Token economy',
  'Visual supports',
  'Modeling',
  'Behavior momentum',
  'First-then board',
  'Timer/countdown',
  'Choice making',
  'Environmental modifications',
];

// Assessment tools for assessment notes
export const ASSESSMENT_TOOLS = [
  'FAST',
  'QABF',
  'MAS',
  'Vineland-3',
  'SRS-2',
  'ABLLS-R',
  'VB-MAPP',
  'AFLS',
  'PEAK',
  'Essentials for Living',
  'CARS-2',
  'ADOS-2',
  'Direct Observation',
  'Parent Interview',
  'Teacher Interview',
  'Record Review',
  'Other',
];

// Hypothesized functions
export const FUNCTION_OPTIONS = [
  'Attention (Social Positive)',
  'Escape/Avoidance (Social Negative)',
  'Access to Tangibles',
  'Sensory/Automatic',
  'Multiple Functions',
];

// BST components for parent training
export const BST_COMPONENTS = [
  'Instruction',
  'Modeling',
  'Rehearsal',
  'Feedback',
  'Written materials',
  'Video examples',
  'Role play',
  'In-situ training',
];

// Clinical focus areas
export const CLINICAL_FOCUS_OPTIONS = [
  'Supervision',
  'Protocol modification',
  'Skills review',
  'Behavior plan review',
  'Caregiver coaching',
  'Team collaboration',
  'Data review only',
  'Treatment planning',
  'Goal revision',
  'Discharge planning',
];
