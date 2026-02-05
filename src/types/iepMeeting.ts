export interface IEPMeetingPrep {
  id: string;
  student_id: string;
  meeting_date: string;
  meeting_type: 'annual' | 'triennial' | 'amendment' | '504' | 'initial' | 'transition';
  data_summary: DataSummary | null;
  goal_progress: GoalProgress[] | null;
  recommendations: Recommendation[] | null;
  documents_checklist: DocumentCheckItem[] | null;
  attendees: Attendee[] | null;
  generated_report_url: string | null;
  status: 'draft' | 'ready' | 'completed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataSummary {
  behaviorTrends: {
    behaviorName: string;
    baseline: number;
    current: number;
    percentChange: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  sessionAttendance: {
    totalScheduled: number;
    totalAttended: number;
    attendanceRate: number;
  };
  periodStart: string;
  periodEnd: string;
}

export interface GoalProgress {
  goalId: string;
  goalText: string;
  baseline: string;
  target: string;
  current: string;
  percentComplete: number;
  status: 'on_track' | 'at_risk' | 'met' | 'not_started';
  lastUpdated: string;
}

export interface Recommendation {
  id: string;
  type: 'continue' | 'modify' | 'add' | 'remove';
  text: string;
  rationale?: string;
  aiGenerated?: boolean;
}

export interface DocumentCheckItem {
  id: string;
  document: string;
  included: boolean;
  notes?: string;
}

export interface Attendee {
  id: string;
  name: string;
  role: string;
  email?: string;
  confirmed: boolean;
}

export const MEETING_TYPES: Record<string, { label: string; description: string }> = {
  annual: { label: 'Annual Review', description: 'Yearly IEP review meeting' },
  triennial: { label: 'Triennial Evaluation', description: '3-year reevaluation meeting' },
  amendment: { label: 'IEP Amendment', description: 'Mid-year IEP modification' },
  '504': { label: '504 Plan Review', description: 'Section 504 accommodation review' },
  initial: { label: 'Initial IEP', description: 'First-time IEP development' },
  transition: { label: 'Transition Meeting', description: 'Transition planning meeting' },
};

export const DEFAULT_DOCUMENTS_CHECKLIST: DocumentCheckItem[] = [
  { id: '1', document: 'Current IEP/504 Plan', included: false },
  { id: '2', document: 'Behavior Intervention Plan (BIP)', included: false },
  { id: '3', document: 'Functional Behavior Assessment (FBA)', included: false },
  { id: '4', document: 'Progress Monitoring Data', included: false },
  { id: '5', document: 'Session Notes Summary', included: false },
  { id: '6', document: 'Teacher Input/Observations', included: false },
  { id: '7', document: 'Parent Input', included: false },
  { id: '8', document: 'Assessment Results', included: false },
];
