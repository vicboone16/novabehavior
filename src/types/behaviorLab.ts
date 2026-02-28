// Behavior Lab game content schema
export interface GameScenario {
  scenario_text: string;
  scenario_context?: string; // e.g. "Home setting, after school"
  behavior_description: string;
  lay_language?: string; // Parent-friendly version
}

export interface GameOption {
  id: string;
  label: string;
  lay_label?: string; // Parent-friendly label
  description: string; // micro-example under the option
  is_correct: boolean;
  function_match?: {
    primary: string;
    confidence: number; // 0-100
    secondary?: string;
    secondary_confidence?: number;
  };
  feedback: string;
  lay_feedback?: string;
}

export interface GameQuestion {
  question_id: string;
  question_type: 'function_id' | 'reinforcement' | 'replacement_skill' | 'consequence_match';
  prompt: string;
  lay_prompt?: string;
  options: GameOption[];
  explanation: string; // shown after answering
  lay_explanation?: string;
  aba_term_note?: string; // toggle-able ABA term
}

export interface GameContent {
  scenarios: GameScenario[];
  questions: GameQuestion[];
}

export interface BehaviorLabGame {
  game_id: string;
  title: string;
  description: string | null;
  difficulty: string;
  stage: string;
  skill_tags: string[];
  est_seconds: number;
  scope: string;
  agency_id: string | null;
  canonical_key: string | null;
  status: string;
  content: GameContent;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BehaviorLabAttempt {
  attempt_id: string;
  game_id: string;
  coach_user_id: string;
  agency_id: string | null;
  learner_id: string | null;
  difficulty: string;
  score_percent: number;
  xp_earned: number;
  streak_count: number;
  skill_tags: string[];
  mistakes_summary: Record<string, any> | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const STAGES = ['identify', 'apply', 'analyze'] as const;
export const SKILL_TAG_OPTIONS = [
  'function_identification',
  'reinforcement_concepts',
  'replacement_skills',
  'consequence_analysis',
  'antecedent_strategies',
  'data_interpretation',
] as const;

export const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

export const STAGE_LABELS: Record<string, string> = {
  identify: 'Identify',
  apply: 'Apply',
  analyze: 'Analyze',
};
