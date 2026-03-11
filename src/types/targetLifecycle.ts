// Target Lifecycle types

export type TargetLifecycleStatus = 'active' | 'on_hold' | 'closed';

export type TargetClosedReason = 'mastered' | 'discontinued' | 'replaced' | 'generalized' | 'archived' | 'other';

export type LifecycleAction = 
  | 'hold' 
  | 'reinstate' 
  | 'close' 
  | 'reopen' 
  | 'discontinue' 
  | 'replace' 
  | 'phase_change' 
  | 'status_change'
  | 'created';

export const LIFECYCLE_STATUS_LABELS: Record<TargetLifecycleStatus, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  closed: 'Closed',
};

export const CLOSED_REASON_LABELS: Record<TargetClosedReason, string> = {
  mastered: 'Mastered',
  discontinued: 'Discontinued',
  replaced: 'Replaced',
  generalized: 'Generalized',
  archived: 'Archived',
  other: 'Other',
};

export const ACTION_LABELS: Record<LifecycleAction, string> = {
  hold: 'Put On Hold',
  reinstate: 'Reinstated',
  close: 'Closed',
  reopen: 'Reopened',
  discontinue: 'Discontinued',
  replace: 'Replaced',
  phase_change: 'Phase Changed',
  status_change: 'Status Changed',
  created: 'Created',
};

export const ACTION_COLORS: Record<LifecycleAction, string> = {
  hold: 'text-amber-600',
  reinstate: 'text-blue-600',
  close: 'text-green-600',
  reopen: 'text-blue-500',
  discontinue: 'text-red-600',
  replace: 'text-purple-600',
  phase_change: 'text-indigo-600',
  status_change: 'text-muted-foreground',
  created: 'text-emerald-600',
};

export interface TargetActivityLogEntry {
  id: string;
  target_id: string;
  action: LifecycleAction;
  previous_status: string | null;
  new_status: string | null;
  previous_phase: string | null;
  new_phase: string | null;
  reason: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export type ProgramInstanceStatus = 'active' | 'on_hold' | 'completed' | 'paused' | 'archived';

export const PROGRAM_STATUS_LABELS: Record<ProgramInstanceStatus, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  paused: 'Paused',
  archived: 'Archived',
};

// Actions available based on current lifecycle_status
export function getAvailableActions(status: TargetLifecycleStatus): LifecycleAction[] {
  switch (status) {
    case 'active':
      return ['hold', 'close', 'discontinue', 'replace'];
    case 'on_hold':
      return ['reinstate', 'close', 'discontinue'];
    case 'closed':
      return ['reopen'];
    default:
      return [];
  }
}
