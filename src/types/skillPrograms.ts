// Skill Programs hierarchy types: Domain → Program → Target

export interface SkillProgram {
  id: string;
  student_id: string;
  domain_id: string | null;
  name: string;
  description: string | null;
  method: SkillMethod;
  status: ProgramStatus;
  status_effective_date: string;
  benchmark_enabled: boolean;
  benchmark_definition: Record<string, any>;
  default_mastery_criteria: string | null;
  default_mastery_percent: number | null;
  default_mastery_consecutive_sessions: number | null;
  active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  domain?: { id: string; name: string };
  targets?: SkillTarget[];
  status_history?: ProgramStatusEntry[];
}

export interface SkillTarget {
  id: string;
  program_id: string;
  name: string;
  operational_definition: string | null;
  mastery_criteria: string | null;
  mastery_percent: number | null;
  mastery_consecutive_sessions: number | null;
  status: TargetStatus;
  status_effective_date: string;
  display_order: number;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  ta_steps?: TaskAnalysisStep[];
}

export interface PromptLevel {
  id: string;
  name: string;
  abbreviation: string;
  rank: number;
  is_default: boolean;
  agency_id: string | null;
}

export interface StudentPromptLevel {
  id: string;
  student_id: string;
  prompt_level_id: string;
  enabled: boolean;
  custom_label: string | null;
  display_order: number;
  prompt_level?: PromptLevel;
}

export interface TargetTrial {
  id: string;
  target_id: string;
  session_id: string | null;
  trial_index: number;
  outcome: TrialOutcome;
  prompt_level_id: string | null;
  prompt_success: boolean | null;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: string;
}

export interface TaskAnalysisStep {
  id: string;
  target_id: string;
  step_number: number;
  step_label: string;
}

export interface TaskAnalysisStepData {
  id: string;
  step_id: string;
  session_id: string | null;
  outcome: string;
  prompt_level_id: string | null;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: string;
}

export interface ProgramStatusEntry {
  id: string;
  program_id: string;
  status_from: string | null;
  status_to: string;
  effective_date: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface TargetStatusEntry {
  id: string;
  target_id: string;
  status_from: string | null;
  status_to: string;
  effective_date: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export type SkillMethod = 'discrete_trial' | 'net' | 'task_analysis' | 'probe' | 'frequency' | 'duration' | 'latency' | 'interval';
export type ProgramStatus = 'baseline' | 'acquisition' | 'fluency' | 'generalization' | 'maintenance' | 'mastered' | 'on_hold' | 'discontinued';
export type TargetStatus = 'not_started' | 'in_progress' | 'mastered' | 'on_hold' | 'discontinued';
export type TrialOutcome = 'correct' | 'incorrect' | 'no_response' | 'prompted';

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  baseline: 'Baseline',
  acquisition: 'Acquisition',
  fluency: 'Fluency',
  generalization: 'Generalization',
  maintenance: 'Maintenance',
  mastered: 'Mastered',
  on_hold: 'On Hold',
  discontinued: 'Discontinued',
};

export const TARGET_STATUS_LABELS: Record<TargetStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  mastered: 'Mastered',
  on_hold: 'On Hold',
  discontinued: 'Discontinued',
};

export const SKILL_METHOD_LABELS: Record<SkillMethod, string> = {
  discrete_trial: 'Discrete Trial (DTT)',
  net: 'Natural Environment (NET)',
  task_analysis: 'Task Analysis',
  probe: 'Probe / Cold Probe',
  frequency: 'Frequency',
  duration: 'Duration',
  latency: 'Latency',
  interval: 'Interval',
};

export const PROGRAM_STATUS_COLORS: Record<ProgramStatus, string> = {
  baseline: 'bg-slate-500',
  acquisition: 'bg-blue-500',
  fluency: 'bg-cyan-500',
  generalization: 'bg-purple-500',
  maintenance: 'bg-amber-500',
  mastered: 'bg-green-500',
  on_hold: 'bg-yellow-500',
  discontinued: 'bg-gray-400',
};
