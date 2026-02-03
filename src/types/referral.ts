export type ReferralSource = 'school' | 'physician' | 'parent' | 'insurance' | 'self' | 'other';
export type ReferralPriority = 'urgent' | 'high' | 'normal' | 'low';
export type ReferralStatus = 'received' | 'screening' | 'assessment' | 'accepted' | 'waitlist' | 'declined' | 'converted';
export type ChecklistStatus = 'pending' | 'in_progress' | 'complete';

export interface Referral {
  id: string;
  referral_date: string;
  source: ReferralSource;
  source_contact_name?: string | null;
  source_contact_email?: string | null;
  source_contact_phone?: string | null;
  client_first_name: string;
  client_last_name: string;
  client_dob?: string | null;
  client_diagnosis?: string | null;
  client_address?: string | null;
  client_city?: string | null;
  client_state?: string | null;
  client_zip?: string | null;
  parent_guardian_name?: string | null;
  parent_guardian_email?: string | null;
  parent_guardian_phone?: string | null;
  funding_source?: string | null;
  insurance_info?: Record<string, unknown>;
  priority_level: ReferralPriority;
  status: ReferralStatus;
  assigned_to_user_id?: string | null;
  waitlist_position?: number | null;
  waitlist_added_date?: string | null;
  estimated_start_date?: string | null;
  converted_student_id?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IntakeChecklistTemplate {
  id: string;
  name: string;
  description?: string | null;
  funding_source?: string | null;
  items: ChecklistItem[];
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  category?: string;
}

export interface IntakeChecklist {
  id: string;
  referral_id: string;
  checklist_template_id?: string | null;
  items: ChecklistItem[];
  completed_items: string[];
  status: ChecklistStatus;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntakeDocument {
  id: string;
  referral_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface ReferralWithDetails extends Referral {
  assigned_user?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  checklists?: IntakeChecklist[];
  documents?: IntakeDocument[];
}

export const REFERRAL_STAGES: { value: ReferralStatus; label: string; color: string }[] = [
  { value: 'received', label: 'Received', color: 'bg-blue-500' },
  { value: 'screening', label: 'Screening', color: 'bg-yellow-500' },
  { value: 'assessment', label: 'Assessment', color: 'bg-purple-500' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-500' },
  { value: 'waitlist', label: 'Waitlist', color: 'bg-orange-500' },
  { value: 'declined', label: 'Declined', color: 'bg-red-500' },
  { value: 'converted', label: 'Converted', color: 'bg-emerald-500' },
];

export const DOCUMENT_TYPES = [
  'Referral Form',
  'Medical Records',
  'Diagnosis Report',
  'Insurance Card',
  'Consent Forms',
  'Previous Assessments',
  'IEP/504 Plan',
  'Other',
] as const;
