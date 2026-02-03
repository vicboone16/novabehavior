export interface SupervisionLog {
  id: string;
  supervisor_user_id: string;
  supervisee_user_id: string;
  student_id?: string | null;
  session_id?: string | null;
  supervision_type: 'direct' | 'indirect' | 'group';
  supervision_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  activities: string[];
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldworkHours {
  id: string;
  trainee_user_id: string;
  supervisor_user_id: string;
  hours_type: 'supervised' | 'independent';
  hours: number;
  fieldwork_date: string;
  experience_type: 'unrestricted' | 'restricted' | 'concentrated';
  task_list_items: string[];
  notes?: string | null;
  verified: boolean;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupervisionRequirement {
  id: string;
  supervisee_user_id: string;
  supervisor_user_id: string;
  requirement_type: 'rbt_5pct' | 'rbt_10pct' | 'fieldwork';
  target_percentage: number;
  billing_period_start: string;
  billing_period_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupervisionLogWithProfiles extends SupervisionLog {
  supervisor?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  supervisee?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface ComplianceData {
  supervisee_user_id: string;
  supervisee_name: string;
  total_direct_hours: number;
  supervision_hours: number;
  supervision_percentage: number;
  target_percentage: number;
  is_compliant: boolean;
  period_start: string;
  period_end: string;
}

export const SUPERVISION_ACTIVITIES = [
  'Direct Observation',
  'Performance Feedback',
  'Modeling',
  'Role Play',
  'Behavior Skills Training',
  'Case Consultation',
  'Documentation Review',
  'Graph Analysis',
  'Treatment Planning',
  'Other'
] as const;

export const BACB_TASK_LIST_ITEMS = [
  'A-1: Identify the goals of behavior analysis',
  'A-2: Explain the philosophical assumptions underlying behavior analysis',
  'A-3: Describe and explain behavior from the perspective of radical behaviorism',
  'A-4: Distinguish among behaviorism, the experimental analysis of behavior, applied behavior analysis, and professional practice',
  'A-5: Describe and define the dimensions of applied behavior analysis',
  // Add more task list items as needed
] as const;
