// Staff Profile 2.0 Types

export type StaffRole = 'super_admin' | 'admin' | 'staff' | 'viewer';
export type EmploymentStatus = 'active' | 'inactive' | 'onboarding' | 'terminated';
export type GeocodeStatus = 'pending' | 'success' | 'failed' | 'manual';

export interface StaffAvailability {
  id: string;
  staff_user_id: string;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
  is_active: boolean;
  effective_from: string | null;
  effective_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffCredential {
  id: string;
  staff_user_id: string;
  credential_type: string;
  credential_number: string | null;
  issuing_body: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  verification_status: 'pending' | 'verified' | 'expired' | 'invalid';
  verified_by: string | null;
  verified_at: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupervisorLink {
  id: string;
  supervisee_staff_id: string;
  supervisor_staff_id: string;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'inactive' | 'pending';
  supervision_type: 'primary' | 'secondary' | 'backup';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  supervisor_profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  supervisee_profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface OverrideLog {
  id: string;
  override_type: 'scheduling_availability' | 'scheduling_radius' | 'roster_assignment' | 'supervisor_chain' | 'authorization';
  overridden_by: string;
  reason: string;
  affected_object_type: 'session' | 'appointment' | 'assignment' | 'authorization';
  affected_object_ids: string[];
  original_constraint: Record<string, any> | null;
  override_context: Record<string, any> | null;
  created_at: string;
}

export interface ScheduleRequest {
  id: string;
  client_id: string;
  service_type: string;
  location_id: string | null;
  requested_day: string | null;
  requested_start_time: string | null;
  requested_end_time: string | null;
  frequency: 'one_time' | 'weekly' | 'biweekly' | 'monthly';
  duration_minutes: number;
  preferred_staff_ids: string[];
  constraints: Record<string, any>;
  status: 'pending' | 'scheduled' | 'partially_scheduled' | 'cancelled' | 'on_hold';
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledSession {
  id: string;
  appointment_id: string | null;
  session_id: string | null;
  schedule_request_id: string | null;
  client_id: string;
  staff_user_id: string;
  supervisor_user_id: string | null;
  location_id: string | null;
  service_type: string;
  start_datetime: string;
  end_datetime: string;
  computed_distance_miles: number | null;
  travel_time_estimate_minutes: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  override_applied: boolean;
  override_log_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionBlockingReason {
  id: string;
  session_id: string;
  blocking_reason_code: string;
  message: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface IEPGoal {
  id: string;
  client_id: string;
  goal_area: string;
  goal_text: string;
  short_description: string | null;
  baseline_summary: string | null;
  measurement_type: string;
  target_criteria: string | null;
  start_date: string | null;
  end_date: string | null;
  responsible_provider_role: string | null;
  status: 'active' | 'mastered' | 'modified' | 'discontinued' | 'draft';
  data_completeness_status: 'sufficient' | 'insufficient' | 'pending';
  last_progress_update: string | null;
  narrative_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalLink {
  id: string;
  goal_id: string;
  link_type: 'target' | 'program' | 'behavior_metric' | 'session_metric' | 'skill_target';
  linked_object_id: string;
  linked_object_table: string;
  link_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServicePlanMinutes {
  id: string;
  client_id: string;
  service_line: string;
  mandated_minutes_per_period: number;
  period_type: 'week' | 'month' | 'quarter' | 'year';
  source: 'IEP' | 'Contract' | 'Authorization' | 'Other';
  effective_start_date: string;
  effective_end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveredMinutesLog {
  id: string;
  client_id: string;
  session_id: string | null;
  service_line: string;
  provider_user_id: string;
  provider_credential: string | null;
  location_type: string | null;
  minutes_delivered: number;
  session_date: string;
  is_billable: boolean;
  is_makeup: boolean;
  makeup_for_date: string | null;
  created_at: string;
}

// Constants
export const SERVICE_TYPES = [
  { value: 'direct_aba', label: 'Direct ABA' },
  { value: 'parent_training', label: 'Parent Training' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'observation', label: 'Observation' },
  { value: 'supervision', label: 'Supervision' },
  { value: 'meeting_admin', label: 'Meeting/Admin' },
  { value: 'telehealth', label: 'Telehealth' },
  { value: 'assessment', label: 'Assessment' },
];

export const SETTINGS_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'school', label: 'School' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'community', label: 'Community' },
  { value: 'telehealth', label: 'Telehealth' },
];

export const CREDENTIAL_TYPES = [
  { value: 'BCBA', label: 'BCBA' },
  { value: 'BCaBA', label: 'BCaBA' },
  { value: 'RBT', label: 'RBT' },
  { value: 'QABA', label: 'QABA' },
  { value: 'QBA', label: 'QBA' },
  { value: 'Other', label: 'Other' },
];

export const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

export const LANGUAGES = [
  'English', 'Spanish', 'Mandarin', 'Cantonese', 'Vietnamese',
  'Korean', 'Tagalog', 'Arabic', 'Russian', 'Portuguese',
  'French', 'Hindi', 'Urdu', 'Japanese', 'ASL', 'Other'
];

export const GOAL_AREAS = [
  'Behavior',
  'Social',
  'Academic',
  'Communication',
  'Daily Living',
  'Motor',
  'Play/Leisure',
  'Self-Help',
  'Vocational',
  'Other',
];

export const MEASUREMENT_TYPES = [
  { value: 'frequency', label: 'Frequency Count' },
  { value: 'duration', label: 'Duration' },
  { value: 'percent', label: 'Percent Correct' },
  { value: 'rubric', label: 'Rubric/Rating Scale' },
  { value: 'trials', label: 'Discrete Trials' },
  { value: 'interval', label: 'Interval Recording' },
  { value: 'latency', label: 'Latency' },
];

export const BLOCKING_REASON_CODES = [
  { code: 'missing_note', label: 'Missing Clinical Note' },
  { code: 'missing_review', label: 'Pending Supervisor Review' },
  { code: 'auth_expired', label: 'Authorization Expired' },
  { code: 'auth_exhausted', label: 'Authorization Hours Exhausted' },
  { code: 'staff_not_assigned', label: 'Staff Not Assigned to Client' },
  { code: 'supervisor_missing', label: 'Missing Supervisor Chain' },
  { code: 'incomplete_fields', label: 'Incomplete Required Fields' },
];
