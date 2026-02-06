export type ApplicantPipelineStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
export type JobPostingStatus = 'open' | 'filled' | 'closed' | 'draft';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary';
export type OnboardingTaskCategory = 'paperwork' | 'training' | 'compliance' | 'orientation' | 'it_setup' | 'other';
export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'skipped';
export type ApplicantSource = 'website' | 'referral' | 'job_board' | 'social_media' | 'walk_in' | 'other';

export interface JobPosting {
  id: string;
  agency_id?: string | null;
  title: string;
  description?: string | null;
  requirements?: string | null;
  credential_required?: string | null;
  location?: string | null;
  employment_type: EmploymentType;
  salary_range_min?: number | null;
  salary_range_max?: number | null;
  status: JobPostingStatus;
  posted_date: string;
  closing_date?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed
  applicant_count?: number;
}

export interface JobApplicant {
  id: string;
  job_posting_id?: string | null;
  agency_id?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  resume_url?: string | null;
  cover_letter?: string | null;
  source: ApplicantSource;
  pipeline_status: ApplicantPipelineStatus;
  rating?: number | null;
  notes?: string | null;
  interview_date?: string | null;
  offer_date?: string | null;
  hire_date?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  job_title?: string;
}

export interface OnboardingTemplate {
  id: string;
  agency_id?: string | null;
  name: string;
  role_type: string;
  items: { task: string; category: OnboardingTaskCategory; dayOffset: number; description?: string }[];
  estimated_days: number;
  status: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingTask {
  id: string;
  template_id?: string | null;
  new_hire_user_id?: string | null;
  applicant_id?: string | null;
  task_name: string;
  category: OnboardingTaskCategory;
  description?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  status: OnboardingTaskStatus;
  document_url?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentorAssignment {
  id: string;
  new_hire_user_id?: string | null;
  applicant_id?: string | null;
  mentor_user_id: string;
  agency_id?: string | null;
  start_date: string;
  end_date?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  mentor_name?: string;
  new_hire_name?: string;
}

export const PIPELINE_STAGES: { status: ApplicantPipelineStatus; label: string; color: string }[] = [
  { status: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-800' },
  { status: 'screening', label: 'Screening', color: 'bg-yellow-100 text-yellow-800' },
  { status: 'interview', label: 'Interview', color: 'bg-purple-100 text-purple-800' },
  { status: 'offer', label: 'Offer', color: 'bg-orange-100 text-orange-800' },
  { status: 'hired', label: 'Hired', color: 'bg-green-100 text-green-800' },
  { status: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { status: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-100 text-gray-800' },
];
