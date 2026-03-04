// Progression Engine types
import type { CriteriaScope, CriteriaType, TargetPhase } from './criteriaEngine';

export type TriggerNextOn = 'mastery_met' | 'probe_met' | 'generalization_met' | 'maintenance_met' | 'closed' | 'any_met';
export type NextActionMode = 'none' | 'next_target_in_program' | 'next_benchmark_stage' | 'next_program_in_pathway';
export type SequenceMode = 'sort_order' | 'custom_list';
export type EndOfLadderAction = 'suggest_close' | 'auto_close' | 'next_target' | 'next_program' | 'none';
export type NotificationMode = 'immediate' | 'daily_digest' | 'none';
export type AdvanceMode = 'alert_only' | 'queue_for_review' | 'auto_advance';

export const TRIGGER_LABELS: Record<TriggerNextOn, string> = {
  mastery_met: 'Mastery Met',
  probe_met: 'Probe Met',
  generalization_met: 'Generalization Met',
  maintenance_met: 'Maintenance Met',
  closed: 'Target Closed',
  any_met: 'Any Criteria Met',
};

export const NEXT_ACTION_LABELS: Record<NextActionMode, string> = {
  none: 'None (Alert Only)',
  next_target_in_program: 'Next Target in Program',
  next_benchmark_stage: 'Advance Benchmark Stage',
  next_program_in_pathway: 'Next Program in Pathway',
};

export const END_OF_LADDER_LABELS: Record<EndOfLadderAction, string> = {
  suggest_close: 'Suggest Close',
  auto_close: 'Auto-Close',
  next_target: 'Move to Next Target',
  next_program: 'Move to Next Program',
  none: 'None',
};

export interface BenchmarkStage {
  id: string;
  scope: CriteriaScope;
  scope_id: string | null;
  name: string;
  stage_order: number;
  criteria_type: CriteriaType;
  criteria_template_id: string | null;
  phase_sync_enabled: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgramPathway {
  id: string;
  scope: 'global' | 'student';
  scope_id: string | null;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  steps?: ProgramPathwayStep[];
}

export interface ProgramPathwayStep {
  id: string;
  program_pathway_id: string;
  program_id: string;
  step_order: number;
  start_when: Record<string, any> | null;
  complete_when: Record<string, any> | null;
  auto_create_targets: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtendedAutomationSettings {
  id: string;
  scope: CriteriaScope;
  scope_id: string | null;
  auto_advance_enabled: boolean;
  advance_mode: AdvanceMode;
  require_confirmation: boolean;
  auto_open_next_target: boolean;
  next_target_rule: Record<string, any> | null;
  trigger_next_on: TriggerNextOn;
  next_action_mode: NextActionMode;
  auto_start_phase: TargetPhase | null;
  sequence_mode: SequenceMode;
  sequence_list_json: string[] | null;
  end_of_ladder_action: EndOfLadderAction;
  pathway_id: string | null;
  notification_mode: NotificationMode;
  created_at: string;
  updated_at: string;
}
