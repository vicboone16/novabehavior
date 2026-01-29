// Scheduling-to-Session Workflow Types

export type AppointmentStatus = 
  | 'scheduled' 
  | 'completed' 
  | 'canceled' 
  | 'rescheduled' 
  | 'no_show' 
  | 'did_not_occur' 
  | 'pending_verification';

export type VerificationStatus = 'unverified' | 'verified_occurred' | 'verified_not_occurred';

export type ServiceType = 
  | 'direct_therapy' 
  | 'supervision' 
  | 'parent_training' 
  | 'assessment' 
  | 'consult';

export type ServiceSetting = 'school' | 'home' | 'telehealth' | 'clinic' | 'community';

export type AttendanceOutcome = 
  | 'occurred' 
  | 'canceled' 
  | 'rescheduled' 
  | 'no_show' 
  | 'client_unavailable' 
  | 'provider_unavailable' 
  | 'weather' 
  | 'school_event' 
  | 'other';

// Reason codes for different outcomes
export const CANCELED_REASONS = [
  { code: 'caregiver_cancelled', label: 'Caregiver Cancelled' },
  { code: 'illness', label: 'Illness' },
  { code: 'transportation_issue', label: 'Transportation Issue' },
  { code: 'school_event', label: 'School Event' },
  { code: 'family_emergency', label: 'Family Emergency' },
  { code: 'therapist_cancelled', label: 'Therapist Cancelled' },
  { code: 'weather', label: 'Weather' },
  { code: 'other', label: 'Other' },
] as const;

export const RESCHEDULED_REASONS = [
  { code: 'caregiver_requested', label: 'Caregiver Requested' },
  { code: 'therapist_requested', label: 'Therapist Requested' },
  { code: 'school_schedule_change', label: 'School Schedule Change' },
  { code: 'conflict', label: 'Schedule Conflict' },
  { code: 'other', label: 'Other' },
] as const;

export const NO_SHOW_REASONS = [
  { code: 'no_call_no_show', label: 'No Call, No Show' },
  { code: 'late_over_threshold', label: 'Late Over Threshold' },
  { code: 'unable_to_access_home', label: 'Unable to Access Home' },
  { code: 'student_refused', label: 'Student Refused' },
  { code: 'caregiver_unresponsive', label: 'Caregiver Unresponsive' },
  { code: 'other', label: 'Other' },
] as const;

export const CLIENT_UNAVAILABLE_REASONS = [
  { code: 'asleep', label: 'Asleep' },
  { code: 'dysregulated', label: 'Dysregulated' },
  { code: 'not_home', label: 'Not Home' },
  { code: 'pulled_from_class', label: 'Pulled from Class' },
  { code: 'other', label: 'Other' },
] as const;

export type ReasonCode = 
  | typeof CANCELED_REASONS[number]['code']
  | typeof RESCHEDULED_REASONS[number]['code']
  | typeof NO_SHOW_REASONS[number]['code']
  | typeof CLIENT_UNAVAILABLE_REASONS[number]['code'];

export function getReasonCodesForOutcome(outcome: AttendanceOutcome) {
  switch (outcome) {
    case 'canceled': return CANCELED_REASONS;
    case 'rescheduled': return RESCHEDULED_REASONS;
    case 'no_show': return NO_SHOW_REASONS;
    case 'client_unavailable': return CLIENT_UNAVAILABLE_REASONS;
    default: return [];
  }
}

export interface AttendanceLog {
  id: string;
  student_id: string;
  appointment_id?: string;
  session_id?: string;
  date: string;
  outcome: AttendanceOutcome;
  reason_code?: ReasonCode;
  reason_detail?: string;
  follow_up_needed: boolean;
  follow_up_date?: string;
  follow_up_completed: boolean;
  follow_up_completed_at?: string;
  follow_up_notes?: string;
  marked_by_user_id: string;
  marked_at: string;
  created_at: string;
  updated_at: string;
  // Joined
  student_name?: string;
  marked_by_name?: string;
}

export interface AttendanceMetrics {
  scheduled: number;
  occurred: number;
  canceled: number;
  rescheduled: number;
  noShow: number;
  pendingVerification: number;
  attendanceRate: number;
}

// Status colors for calendar
export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-500/20 text-blue-700 border-blue-500',
  pending_verification: 'bg-amber-500/20 text-amber-700 border-amber-500',
  completed: 'bg-emerald-500/20 text-emerald-700 border-emerald-500',
  canceled: 'bg-slate-500/20 text-slate-500 border-slate-400',
  rescheduled: 'bg-purple-500/20 text-purple-700 border-purple-500',
  no_show: 'bg-red-500/20 text-red-700 border-red-500',
  did_not_occur: 'bg-orange-500/20 text-orange-700 border-orange-500',
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  direct_therapy: 'Direct Therapy',
  supervision: 'Supervision',
  parent_training: 'Parent Training',
  assessment: 'Assessment',
  consult: 'Consultation',
};

export const SERVICE_SETTING_LABELS: Record<ServiceSetting, string> = {
  school: 'School',
  home: 'Home',
  telehealth: 'Telehealth',
  clinic: 'Clinic',
  community: 'Community',
};

export const OUTCOME_LABELS: Record<AttendanceOutcome, string> = {
  occurred: 'Occurred',
  canceled: 'Canceled',
  rescheduled: 'Rescheduled',
  no_show: 'No Show',
  client_unavailable: 'Client Unavailable',
  provider_unavailable: 'Provider Unavailable',
  weather: 'Weather',
  school_event: 'School Event',
  other: 'Other',
};
