export type TrainingModuleContentType = 'video' | 'document' | 'quiz' | 'interactive' | 'link';
export type TrainingAssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'exempt';
export type CEUActivityType = 'training' | 'workshop' | 'conference' | 'supervision' | 'self_study' | 'webinar' | 'other';
export type CEUVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface TrainingModule {
  id: string;
  agency_id?: string | null;
  title: string;
  description?: string | null;
  content_type: TrainingModuleContentType;
  content_url?: string | null;
  content_data: Record<string, unknown>;
  duration_estimate_minutes?: number | null;
  ceu_credits: number;
  category: string;
  required_roles: string[];
  pass_criteria: {
    minScore?: number;
    requiredQuestions?: number;
  };
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingAssignment {
  id: string;
  module_id: string;
  staff_user_id: string;
  assigned_by?: string | null;
  assigned_date: string;
  due_date?: string | null;
  status: TrainingAssignmentStatus;
  completed_date?: string | null;
  score?: number | null;
  attempts: number;
  time_spent_minutes: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  module?: TrainingModule;
  staff_name?: string;
}

export interface CEURecord {
  id: string;
  staff_user_id: string;
  agency_id?: string | null;
  activity_type: CEUActivityType;
  title: string;
  provider?: string | null;
  credits_earned: number;
  date_completed: string;
  expiration_date?: string | null;
  certificate_url?: string | null;
  bacb_requirement_category?: string | null;
  verification_status: CEUVerificationStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const BACB_CEU_CATEGORIES = [
  { id: 'learning', label: 'Learning/Instruction', required: 0 },
  { id: 'ethics', label: 'Ethics', required: 4 },
  { id: 'supervision', label: 'Supervision', required: 3 },
  { id: 'general', label: 'General', required: 0 },
] as const;
