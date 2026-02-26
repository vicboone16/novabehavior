// Criteria Engine types: Templates, Evaluations, Automation, Prompt Sets

// ── Phase lifecycle ──
export type TargetPhase = 'baseline' | 'acquisition' | 'probe' | 'generalization' | 'maintenance' | 'closed';

export const PHASE_ORDER: TargetPhase[] = ['baseline', 'acquisition', 'probe', 'generalization', 'maintenance', 'closed'];

export const PHASE_LABELS: Record<TargetPhase, string> = {
  baseline: 'Baseline',
  acquisition: 'Acquisition',
  probe: 'Probe',
  generalization: 'Generalization',
  maintenance: 'Maintenance',
  closed: 'Closed',
};

export const PHASE_COLORS: Record<TargetPhase, string> = {
  baseline: 'bg-slate-500',
  acquisition: 'bg-blue-500',
  probe: 'bg-violet-500',
  generalization: 'bg-purple-500',
  maintenance: 'bg-amber-500',
  closed: 'bg-green-600',
};

export function getNextPhase(current: TargetPhase): TargetPhase | null {
  const idx = PHASE_ORDER.indexOf(current);
  return idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

export function getCriteriaTypeForPhase(phase: TargetPhase): CriteriaType | null {
  const map: Partial<Record<TargetPhase, CriteriaType>> = {
    acquisition: 'mastery',
    probe: 'probe',
    generalization: 'generalization',
    maintenance: 'maintenance',
  };
  return map[phase] || null;
}

// ── Criteria ──
export type CriteriaType = 'mastery' | 'probe' | 'generalization' | 'maintenance';
export type CriteriaScope = 'global' | 'student' | 'program' | 'target';

export const CRITERIA_TYPE_LABELS: Record<CriteriaType, string> = {
  mastery: 'Mastery',
  probe: 'Probe',
  generalization: 'Generalization',
  maintenance: 'Maintenance',
};

export type MeasureType = 'percent_correct' | 'count_trials' | 'duration' | 'rate_frequency' | 'latency' | 'prompt_level';
export type WindowType = 'consecutive_sessions' | 'rolling_window' | 'within_time_period' | 'scheduled_frequency' | 'consecutive_opportunities' | 'per_condition';

export const MEASURE_LABELS: Record<MeasureType, string> = {
  percent_correct: 'Percent Correct',
  count_trials: 'Count / Trials',
  duration: 'Duration',
  rate_frequency: 'Rate / Frequency',
  latency: 'Latency',
  prompt_level: 'Prompt Level',
};

export const WINDOW_LABELS: Record<WindowType, string> = {
  consecutive_sessions: 'Consecutive Sessions',
  rolling_window: 'Rolling Window',
  within_time_period: 'Within Time Period',
  scheduled_frequency: 'Scheduled Frequency',
  consecutive_opportunities: 'Consecutive Opportunities',
  per_condition: 'Per Condition',
};

export interface CriteriaRuleJson {
  measure: MeasureType;
  threshold: number;
  success_definition: {
    count_prompted_as_correct: boolean;
    max_prompt_rank_allowed: number | null;
  };
  window: {
    type: WindowType;
    n?: number;
    min_opportunities_per_session?: number;
    required_successes?: number;
    days?: number;
    frequency?: 'weekly' | 'biweekly' | 'monthly';
    duration_weeks?: number;
    min_successes?: number;
    min_sessions_per_condition?: number;
  };
  filters: {
    session_type?: 'teaching' | 'probe' | 'any';
    people_required?: number | null;
    settings_required?: number | null;
    materials_required?: number | null;
  };
}

export interface CriteriaTemplate {
  id: string;
  scope: CriteriaScope;
  scope_id: string | null;
  criteria_type: CriteriaType;
  name: string;
  rule_json: CriteriaRuleJson;
  is_default: boolean;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CriteriaEvaluation {
  id: string;
  target_id: string;
  criteria_type: CriteriaType;
  met_status: boolean;
  met_at: string | null;
  metric_value: number | null;
  window_used: Record<string, any> | null;
  filters_applied: Record<string, any> | null;
  evidence: Record<string, any> | null;
  recommended_action: string | null;
  evaluated_at: string;
}

// ── Prompt Sets ──
export interface PromptSet {
  id: string;
  scope: CriteriaScope;
  scope_id: string | null;
  name: string;
  is_default: boolean;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  levels?: PromptLevelEntry[];
}

export interface PromptLevelEntry {
  id: string;
  prompt_set_id: string | null;
  name: string;
  abbreviation: string;
  rank: number;
  is_default: boolean;
  agency_id: string | null;
  counts_as_prompted: boolean;
  is_active: boolean;
}

// ── Automation ──
export type AdvanceMode = 'alert_only' | 'queue_for_review' | 'auto_advance';

export interface AutomationSettings {
  id: string;
  scope: CriteriaScope;
  scope_id: string | null;
  auto_advance_enabled: boolean;
  advance_mode: AdvanceMode;
  require_confirmation: boolean;
  auto_open_next_target: boolean;
  next_target_rule: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// ── Review Queue ──
export type ReviewStatus = 'pending' | 'approved' | 'dismissed' | 'snoozed';

export interface ReviewQueueItem {
  id: string;
  target_id: string;
  program_id: string | null;
  student_id: string;
  criteria_type: string;
  current_phase: string;
  suggested_phase: string | null;
  evidence: Record<string, any> | null;
  status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  // Joined
  target?: { name: string };
  program?: { name: string };
  student?: { name: string };
}

// ── Criteria rule preview helpers ──
export function generateCriteriaPreview(rule: CriteriaRuleJson): string {
  const parts: string[] = [];
  
  parts.push(`≥${rule.threshold}%`);
  
  if (rule.window.type === 'consecutive_sessions') {
    parts.push(`for ${rule.window.n || 3} consecutive sessions`);
    if (rule.window.min_opportunities_per_session) {
      parts.push(`(min ${rule.window.min_opportunities_per_session} opportunities/session)`);
    }
  } else if (rule.window.type === 'within_time_period') {
    parts.push(`${rule.window.required_successes || 2} successful sessions within ${rule.window.days || 14} days`);
  } else if (rule.window.type === 'per_condition') {
    const f = rule.filters;
    const conditions: string[] = [];
    if (f.people_required) conditions.push(`${f.people_required} people`);
    if (f.settings_required) conditions.push(`${f.settings_required} settings`);
    if (f.materials_required) conditions.push(`${f.materials_required} materials`);
    parts.push(`across ${conditions.join(' + ')}`);
  } else if (rule.window.type === 'scheduled_frequency') {
    parts.push(`${rule.window.frequency} for ${rule.window.duration_weeks} weeks`);
  } else if (rule.window.type === 'rolling_window') {
    parts.push(`over last ${rule.window.n} ${rule.window.min_opportunities_per_session ? 'sessions' : 'trials'}`);
  } else if (rule.window.type === 'consecutive_opportunities') {
    parts.push(`${rule.window.n} consecutive opportunities`);
  }
  
  const correctDef = rule.success_definition.count_prompted_as_correct
    ? 'prompted counts as correct'
    : 'independent only';
  parts.push(`(${correctDef})`);
  
  if (rule.filters.session_type && rule.filters.session_type !== 'any') {
    parts.push(`[${rule.filters.session_type} sessions]`);
  }
  
  return parts.join(' ');
}

export function getDefaultCriteriaRule(type: CriteriaType): CriteriaRuleJson {
  switch (type) {
    case 'mastery':
      return {
        measure: 'percent_correct',
        threshold: 80,
        success_definition: { count_prompted_as_correct: false, max_prompt_rank_allowed: null },
        window: { type: 'consecutive_sessions', n: 3, min_opportunities_per_session: 5 },
        filters: { session_type: 'teaching' },
      };
    case 'probe':
      return {
        measure: 'percent_correct',
        threshold: 80,
        success_definition: { count_prompted_as_correct: false, max_prompt_rank_allowed: null },
        window: { type: 'within_time_period', required_successes: 2, days: 14 },
        filters: { session_type: 'probe' },
      };
    case 'generalization':
      return {
        measure: 'percent_correct',
        threshold: 80,
        success_definition: { count_prompted_as_correct: false, max_prompt_rank_allowed: null },
        window: { type: 'per_condition', min_sessions_per_condition: 1 },
        filters: { session_type: 'any', people_required: 2, settings_required: 2, materials_required: 0 },
      };
    case 'maintenance':
      return {
        measure: 'percent_correct',
        threshold: 80,
        success_definition: { count_prompted_as_correct: true, max_prompt_rank_allowed: 2 },
        window: { type: 'scheduled_frequency', frequency: 'weekly', duration_weeks: 4, min_successes: 4 },
        filters: { session_type: 'probe' },
      };
  }
}
