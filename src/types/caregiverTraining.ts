export type BSTPhase = 'instruction' | 'modeling' | 'rehearsal' | 'feedback' | 'combined';
export type TrainingProgramStatus = 'active' | 'archived' | 'draft';

export interface CaregiverTrainingProgram {
  id: string;
  agency_id?: string | null;
  title: string;
  description?: string | null;
  target_skills: { id: string; name: string; description?: string }[];
  bst_steps: { phase: BSTPhase; description: string; materials?: string }[];
  competency_criteria: {
    percentCorrect?: number;
    consecutiveChecks?: number;
    generalizationRequired?: boolean;
  };
  estimated_duration_hours?: number | null;
  category: string;
  status: TrainingProgramStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaregiverTrainingSession {
  id: string;
  program_id?: string | null;
  student_id: string;
  caregiver_name: string;
  caregiver_relationship?: string | null;
  session_date: string;
  duration_minutes: number;
  bst_phase: BSTPhase;
  competency_rating?: number | null;
  skills_addressed: { id: string; name: string; rating?: number }[];
  notes?: string | null;
  staff_user_id: string;
  created_at: string;
  updated_at: string;
  // Joined
  program_title?: string;
  staff_name?: string;
}

export interface CaregiverCompetencyCheck {
  id: string;
  program_id?: string | null;
  student_id: string;
  caregiver_name: string;
  check_date: string;
  checklist_items: { id: string; description: string; correct: boolean; notes?: string }[];
  percent_correct: number;
  setting?: string | null;
  passed: boolean;
  evaluator_id: string;
  notes?: string | null;
  created_at: string;
}

export interface CaregiverGeneralizationProbe {
  id: string;
  program_id?: string | null;
  student_id: string;
  caregiver_name: string;
  probe_date: string;
  setting: string;
  observer_id: string;
  items_observed: { id: string; skill: string; observed: boolean; fidelity?: number }[];
  fidelity_percentage: number;
  notes?: string | null;
  created_at: string;
}

export const BST_PHASE_LABELS: Record<BSTPhase, string> = {
  instruction: 'Instruction',
  modeling: 'Modeling',
  rehearsal: 'Rehearsal',
  feedback: 'Feedback',
  combined: 'Combined',
};

export const BST_PHASE_DESCRIPTIONS: Record<BSTPhase, string> = {
  instruction: 'Provide verbal/written instructions on the target skill',
  modeling: 'Demonstrate the correct implementation of the skill',
  rehearsal: 'Caregiver practices the skill with coaching',
  feedback: 'Provide corrective and positive feedback on performance',
  combined: 'Combined BST components in single session',
};
