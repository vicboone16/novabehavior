// Client Profile 2.0 Types

export interface ClientContact {
  id: string;
  client_id: string;
  full_name: string;
  relationship: string;
  phones: Array<{ type: string; number: string; is_primary: boolean }>;
  emails: Array<{ email: string; is_primary: boolean }>;
  preferred_contact_method: 'phone' | 'email' | 'text' | 'app' | null;
  preferred_language: string | null;
  notes: string | null;
  is_primary_guardian: boolean;
  is_secondary_guardian: boolean;
  is_emergency_contact: boolean;
  is_school_contact: boolean;
  is_provider_contact: boolean;
  can_pickup: boolean;
  can_make_decisions: boolean;
  visibility_permission: VisibilityPermission;
  created_at: string;
  updated_at: string;
}

export interface ClientSafetyMedical {
  id: string;
  client_id: string;
  safety_flags: string[];
  emergency_protocol_present: boolean;
  allergies: string[];
  medications: Array<{
    name: string;
    dose: string;
    schedule_windows: string[];
    notes: string;
  }>;
  seizure_protocol: string | null;
  medical_conditions: string[];
  crisis_plan_doc_id: string | null;
  known_triggers: { structured: string[]; notes: string };
  deescalation_supports: { structured: string[]; notes: string };
  dietary_restrictions: string[];
  mobility_needs: string | null;
  sensory_considerations: string | null;
  other_medical_notes: string | null;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientCommunicationAccess {
  id: string;
  client_id: string;
  primary_language: string;
  secondary_languages: string[];
  preferred_language_for_caregiver_comms: string;
  interpreter_required: boolean;
  interpreter_language: string | null;
  communication_mode: 'verbal' | 'aac' | 'sign' | 'pecs' | 'mixed' | null;
  aac_device_type: string | null;
  aac_notes: string | null;
  sensory_preferences: {
    visual: string[];
    auditory: string[];
    tactile: string[];
    notes: string;
  };
  cultural_notes: string | null;
  cultural_notes_visibility: 'internal_only' | 'clinical_team' | 'school_team';
  created_at: string;
  updated_at: string;
}

export interface ClientSchedulingPreferences {
  id: string;
  client_id: string;
  availability_windows: AvailabilityWindow[];
  hard_constraints: HardConstraint[];
  preferred_session_length: number | null;
  preferred_cadence: 'daily' | '3x_week' | '2x_week' | 'weekly' | null;
  max_sessions_per_day: number;
  min_gap_between_sessions: number | null;
  school_schedule: {
    start_time?: string;
    end_time?: string;
    early_release_days?: string[];
  };
  vacation_blackouts: Array<{
    start_date: string;
    end_date: string;
    reason: string;
  }>;
  notes: string | null;
  notes_visibility: string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityWindow {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
  location_type: 'home' | 'school' | 'clinic' | 'community' | 'any';
}

export interface HardConstraint {
  day: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface ClientLocation {
  id: string;
  client_id: string;
  location_type: 'home' | 'school' | 'clinic' | 'community' | 'daycare' | 'other';
  location_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  geocode_lat: number | null;
  geocode_lng: number | null;
  geocode_status: 'pending' | 'success' | 'failed' | 'manual';
  is_active: boolean;
  is_primary_service_site: boolean;
  onsite_contact_name: string | null;
  onsite_contact_phone: string | null;
  onsite_contact_email: string | null;
  access_instructions: string | null;
  safety_notes: string | null;
  safety_notes_visibility: string;
  allowed_session_types: string[];
  allowed_staff_roles: string[];
  school_hours_only: boolean;
  school_hours: { start_time?: string; end_time?: string };
  parking_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientTeamAssignment {
  id: string;
  client_id: string;
  staff_user_id: string;
  role: 'primary_supervisor' | 'secondary_supervisor' | 'bcba' | 'bcaba' | 'rbt' | 'bt' | 'case_manager' | 'scheduler' | 'admin';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  permission_scope: string[];
  supervision_required: boolean;
  supervising_staff_id: string | null;
  billable_rate: number | null;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  staff_profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    credential: string | null;
  };
}

export interface ClientServiceLine {
  id: string;
  client_id: string;
  service_type: string;
  cpt_code: string | null;
  is_active: boolean;
  requires_authorization: boolean;
  authorization_status: 'not_required' | 'required' | 'pending' | 'approved' | 'expired' | 'denied';
  payer_id: string | null;
  authorized_units: number | null;
  unit_type: 'hours' | 'units' | 'sessions';
  used_units: number;
  remaining_units: number;
  start_date: string | null;
  end_date: string | null;
  expiry_alert_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  doc_type: 'consent' | 'iep' | 'fba' | 'bip' | 'assessment' | 'medical' | 'authorization' | 'insurance' | 'progress_report' | 'correspondence' | 'other';
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  school_year_tag: string | null;
  visibility_permission: VisibilityPermission;
  is_current_version: boolean;
  version_number: number;
  previous_version_id: string | null;
  uploaded_by: string | null;
  upload_date: string;
  expiration_date: string | null;
  review_required: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientCommunicationLog {
  id: string;
  client_id: string;
  contact_id: string | null;
  contact_person: string;
  contact_role: string | null;
  date_time: string;
  method: 'phone' | 'email' | 'in_person' | 'video_call' | 'text' | 'app_message' | 'fax' | 'mail';
  direction: 'inbound' | 'outbound';
  topic_tags: string[];
  summary: string;
  detailed_notes: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_tasks: Array<{
    task: string;
    assigned_to: string;
    due_date: string;
    completed: boolean;
  }>;
  attachments: string[];
  visibility: 'internal_only' | 'clinical_team' | 'school_team';
  logged_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClientCaseAttribute {
  id: string;
  client_id: string;
  attribute_type: 'program' | 'funding_source' | 'priority' | 'region' | 'custom';
  attribute_key: string;
  attribute_value: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type VisibilityPermission = 'internal_only' | 'clinical_team' | 'school_team' | 'parent_shareable';

export type ActivationStatus = 'inactive' | 'pending' | 'active' | 'on_hold' | 'discharged';

export type ProfileCompletenessStatus = 'incomplete' | 'partial' | 'complete';

export interface ProfileCompleteness {
  status: ProfileCompletenessStatus;
  score: number;
  missing: string[];
  warnings: string[];
}

export const SAFETY_FLAG_OPTIONS = [
  { value: 'aggression', label: 'Aggression', severity: 'high' },
  { value: 'sib', label: 'Self-Injurious Behavior (SIB)', severity: 'high' },
  { value: 'elopement', label: 'Elopement Risk', severity: 'high' },
  { value: 'pica', label: 'PICA', severity: 'high' },
  { value: 'medical_fragile', label: 'Medically Fragile', severity: 'medium' },
  { value: 'seizure_disorder', label: 'Seizure Disorder', severity: 'medium' },
  { value: 'property_destruction', label: 'Property Destruction', severity: 'medium' },
  { value: 'verbal_aggression', label: 'Verbal Aggression', severity: 'low' },
  { value: 'feeding_issues', label: 'Feeding/Swallowing Issues', severity: 'medium' },
];

export const COMMUNICATION_MODES = [
  { value: 'verbal', label: 'Verbal' },
  { value: 'aac', label: 'AAC Device' },
  { value: 'sign', label: 'Sign Language' },
  { value: 'pecs', label: 'PECS' },
  { value: 'mixed', label: 'Mixed/Multimodal' },
];

export const STAFF_ROLES = [
  { value: 'primary_supervisor', label: 'Primary Supervisor (BCBA)' },
  { value: 'secondary_supervisor', label: 'Secondary Supervisor' },
  { value: 'bcba', label: 'BCBA' },
  { value: 'bcaba', label: 'BCaBA' },
  { value: 'rbt', label: 'RBT' },
  { value: 'bt', label: 'Behavior Technician' },
  { value: 'case_manager', label: 'Case Manager' },
  { value: 'scheduler', label: 'Scheduler' },
  { value: 'admin', label: 'Administrator' },
];

export const PERMISSION_SCOPES = [
  { value: 'view_only', label: 'View Only' },
  { value: 'data_entry', label: 'Data Entry' },
  { value: 'notes', label: 'Notes' },
  { value: 'plan_edit', label: 'Plan Edit' },
  { value: 'billing', label: 'Billing Access' },
];

export const DOCUMENT_TYPES = [
  // Clinical Documents
  { value: 'consent', label: 'Consent Form', category: 'clinical' },
  { value: 'iep', label: 'IEP', category: 'clinical' },
  { value: 'fba', label: 'FBA', category: 'clinical' },
  { value: 'bip', label: 'BIP', category: 'clinical' },
  { value: 'progress_report', label: 'Progress Report', category: 'clinical' },
  // Assessments
  { value: 'assessment', label: 'General Assessment', category: 'assessment' },
  { value: 'assessment_vbmapp', label: 'VB-MAPP', category: 'assessment' },
  { value: 'assessment_ablls', label: 'ABLLS-R', category: 'assessment' },
  { value: 'assessment_vineland', label: 'Vineland', category: 'assessment' },
  { value: 'assessment_abas', label: 'ABAS-3', category: 'assessment' },
  { value: 'assessment_peak', label: 'PEAK', category: 'assessment' },
  { value: 'assessment_afls', label: 'AFLS', category: 'assessment' },
  { value: 'assessment_psychoed', label: 'Psychological/Educational Evaluation', category: 'assessment' },
  { value: 'assessment_other', label: 'Other Assessment', category: 'assessment' },
  // Administrative
  { value: 'medical', label: 'Medical Record', category: 'administrative' },
  { value: 'authorization', label: 'Authorization', category: 'administrative' },
  { value: 'insurance', label: 'Insurance Document', category: 'administrative' },
  { value: 'correspondence', label: 'Correspondence', category: 'administrative' },
  { value: 'intake', label: 'Intake Form', category: 'administrative' },
  { value: 'discharge', label: 'Discharge Summary', category: 'administrative' },
  { value: 'other', label: 'Other', category: 'other' },
];

export const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In Person' },
  { value: 'video_call', label: 'Video Call' },
  { value: 'text', label: 'Text Message' },
  { value: 'app_message', label: 'App Message' },
  { value: 'fax', label: 'Fax' },
  { value: 'mail', label: 'Mail' },
];

export const TOPIC_TAGS = [
  'scheduling',
  'progress',
  'concern',
  'authorization',
  'intake',
  'discharge',
  'billing',
  'school',
  'medical',
  'behavior',
  'goals',
  'parent_training',
  'other',
];
