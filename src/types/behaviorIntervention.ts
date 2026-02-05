// Behavior Intervention Planner Types

export const BX_DOMAINS = [
  {
    domain: 'academic_performance_functional_academics',
    labels: ['Academic Performance', 'Functional Academics'],
    description: 'Barriers impacting task completion, independence, help-seeking, work production, and academic engagement.',
    defaultTopics: ['task_completion', 'independence', 'help_seeking', 'work_accuracy', 'work_fluency']
  },
  {
    domain: 'emotional_or_physical_well_being',
    labels: ['Emotional or Physical Well-Being'],
    description: 'Anxiety, avoidance, mood/affect, physiological responses, withdrawal, self-directed behaviors, coping and tolerance.',
    defaultTopics: ['anxiety_support', 'avoidance', 'mood_regulation', 'coping_skills', 'withdrawal', 'self_injury']
  },
  {
    domain: 'social_interaction_communication',
    labels: ['Social Interaction', 'Communication'],
    description: 'Peer interaction, participation, conversational skills, fear of judgement, social avoidance, functional communication.',
    defaultTopics: ['peer_interaction', 'social_skills', 'pragmatics', 'functional_communication']
  },
  {
    domain: 'behavior_compliance_self_management',
    labels: ['Behavior', 'Compliance', 'Self-Management'],
    description: 'Noncompliance, aggression, disruption, rule-following, self-monitoring, reinforcement systems.',
    defaultTopics: ['compliance', 'reinforcement', 'deescalation', 'replacement_behaviors', 'self_management']
  },
  {
    domain: 'transitions_change_tolerance',
    labels: ['Transitions', 'Change in Routine'],
    description: 'Difficulty shifting activities/settings, resistance to changes, rigidity, transition behavior.',
    defaultTopics: ['transition_support', 'advance_notice', 'visual_schedule', 'flexibility']
  },
  {
    domain: 'safety_high_risk',
    labels: ['Safety', 'High Risk'],
    description: 'Elopement, severe aggression, self-injury, dangerous behavior requiring crisis procedures and supervision plans.',
    defaultTopics: ['elopement', 'crisis_support', 'safety_plan', 'supervision']
  }
] as const;

export type BxDomainKey = typeof BX_DOMAINS[number]['domain'];

export type RiskLevel = 'low' | 'medium' | 'high' | 'crisis';
export type BxStatus = 'active' | 'inactive' | 'deprecated';
export type SourceOrigin = 'book' | 'internal' | 'user_custom' | 'uploaded';
export type FunctionTag = 'escape' | 'attention' | 'tangible' | 'automatic' | 'multiple' | 'unknown';
export type StrategyType = 'antecedent' | 'teaching' | 'reinforcement' | 'differential_reinforcement' | 'extinction' | 'environmental' | 'self_management' | 'crisis';
export type StrategyPhase = 'prevention' | 'teaching' | 'reinforcement' | 'maintenance' | 'crisis';
export type LinkStatus = 'existing' | 'considering' | 'recommended' | 'rejected' | 'archived';

export interface BxPresentingProblem {
  id: string;
  problem_code: string;
  source_origin: SourceOrigin;
  source_title?: string;
  source_section?: string;
  source_problem_number?: string;
  source_page?: number;
  domain: string;
  title: string;
  definition?: string;
  examples: string[];
  risk_level: RiskLevel;
  function_tags: FunctionTag[];
  trigger_tags: string[];
  topics: string[];
  contraindications: string[];
  status: BxStatus;
  agency_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Search optimization fields
  aliases?: string[];
  searchBoostPhrases?: string[];
}

export interface BxObjective {
  id: string;
  objective_code: string;
  objective_title: string;
  operational_definition?: string;
  mastery_criteria?: string;
  measurement_recommendations: string[];
  replacement_skill_tags: string[];
  prerequisites: string[];
  status: BxStatus;
  agency_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BxStrategy {
  id: string;
  strategy_code: string;
  strategy_name: string;
  strategy_type: StrategyType[];
  risk_level: RiskLevel;
  requires_bcba: boolean;
  implementation_steps: string[];
  staff_script?: string;
  materials: string[];
  fidelity_checklist: string[];
  data_targets: string[];
  contraindications: string[];
  status: BxStatus;
  agency_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BxProblemObjectiveLink {
  id: string;
  problem_id: string;
  objective_id: string;
  priority: number;
  created_at: string;
}

export interface BxObjectiveStrategyLink {
  id: string;
  objective_id: string;
  strategy_id: string;
  priority: number;
  phase: StrategyPhase;
  created_at: string;
}

export interface StudentBxPlanLink {
  id: string;
  student_id: string;
  problem_id?: string;
  objective_id?: string;
  strategy_id?: string;
  link_status: LinkStatus;
  target_behavior_label?: string;
  function_hypothesis: FunctionTag[];
  setting_notes?: string;
  data_summary?: string;
  implementation_owner: string[];
  start_date?: string;
  review_due?: string;
  notes?: string;
  recommended_score?: number;
  recommendation_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  problem?: BxPresentingProblem;
  objective?: BxObjective;
  strategy?: BxStrategy;
}

export interface BxRecommendation {
  problem: BxPresentingProblem;
  objectives: Array<{
    objective: BxObjective;
    strategies: Array<{
      strategy: BxStrategy;
      phase: StrategyPhase;
      score: number;
    }>;
    score: number;
  }>;
  totalScore: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface BxRecommendationRequest {
  studentId: string;
  problemIds?: string[];
  functionHypothesis?: FunctionTag[];
  triggers?: string[];
  schoolMode?: boolean;
  domain?: string;
}
