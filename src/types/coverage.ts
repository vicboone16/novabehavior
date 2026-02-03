// Coverage Verification Engine Types

export type CoverageMode = 'INSURANCE_STRICT' | 'SCHOOL_LIGHT' | 'HYBRID';

export type CoverageStatus = 'covered' | 'covered_auth_required' | 'not_covered' | 'conditional' | 'unknown';

export type CoverageGateStatus = 'pending' | 'pass' | 'warn' | 'fail' | 'override';

export type TriggerReason = 
  | 'intake' 
  | 'auth_renewal' 
  | 'code_change' 
  | 'modifier_change' 
  | 'plan_renewal' 
  | 'monthly_30_day' 
  | 'new_service_line' 
  | 'manual'
  | 'session_scheduling'
  | 'session_completion';

export type CoverageTaskType = 
  | 'verify_coverage' 
  | 'verify_plan' 
  | 'verify_new_service_line' 
  | 'update_expired_rule' 
  | 'resolve_coverage_block'
  | 'renew_authorization';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';

export interface OrgCoverageSettings {
  id: string;
  coverage_mode: CoverageMode;
  default_verification_cadence_days: number;
  auto_create_tasks_on_intake: boolean;
  auto_create_tasks_on_auth_renewal: boolean;
  auto_create_tasks_on_code_change: boolean;
  auto_create_tasks_on_plan_renewal: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayerPlan {
  id: string;
  client_id: string;
  payer_name: string;
  plan_name: string | null;
  member_id: string | null;
  group_number: string | null;
  effective_start_date: string;
  effective_end_date: string | null;
  plan_renewal_date: string | null;
  is_primary: boolean;
  is_active: boolean;
  notes: string | null;
  notes_visibility: string;
  created_at: string;
  updated_at: string;
}

export interface CoverageRuleInsurance {
  id: string;
  client_id: string;
  payer_plan_id: string | null;
  cpt_code: string;
  icd10_codes: string[];
  modifiers: string[];
  place_of_service: string[];
  provider_credential_required: string[];
  coverage_status: CoverageStatus;
  coverage_notes: string | null;
  last_verified_at: string | null;
  next_verification_due_at: string | null;
  verification_source: string | null;
  evidence_attachment_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  payer_plan?: PayerPlan;
}

export interface CoverageRuleSchool {
  id: string;
  client_id: string;
  service_line: string;
  allowed_settings: string[];
  provider_roles_allowed: string[];
  status: 'active' | 'paused' | 'expired';
  source: 'IEP' | 'contract' | 'site_policy' | 'other';
  source_document_id: string | null;
  last_verified_at: string | null;
  next_verification_due_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoverageCheck {
  id: string;
  client_id: string;
  mode_used: CoverageMode;
  trigger_reason: TriggerReason;
  performed_by: string | null;
  performed_by_type: 'system' | 'staff';
  result_status: 'pass' | 'warn' | 'fail';
  summary: string | null;
  details: Record<string, any>;
  linked_rules_checked: string[];
  evidence_link: string | null;
  follow_up_tasks_created: string[];
  session_id: string | null;
  created_at: string;
}

export interface CoverageTask {
  id: string;
  client_id: string;
  task_type: CoverageTaskType;
  due_date: string;
  assigned_to: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  reason: string | null;
  linked_session_ids: string[];
  linked_coverage_rule_id: string | null;
  linked_payer_plan_id: string | null;
  resolution_notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client?: { name: string; id: string };
  assigned_staff?: { display_name: string };
}

// Constants
export const COVERAGE_MODES = [
  { value: 'INSURANCE_STRICT', label: 'Insurance Strict', description: 'Full CPT/ICD/modifier validation required' },
  { value: 'SCHOOL_LIGHT', label: 'School Light', description: 'Service line eligibility only' },
  { value: 'HYBRID', label: 'Hybrid', description: 'Mixed mode per service line' },
];

export const COVERAGE_STATUSES = [
  { value: 'covered', label: 'Covered', color: 'bg-green-100 text-green-800' },
  { value: 'covered_auth_required', label: 'Covered (Auth Required)', color: 'bg-blue-100 text-blue-800' },
  { value: 'not_covered', label: 'Not Covered', color: 'bg-red-100 text-red-800' },
  { value: 'conditional', label: 'Conditional', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'unknown', label: 'Unknown', color: 'bg-gray-100 text-gray-800' },
];

export const VERIFICATION_SOURCES = [
  { value: 'eligibility_check', label: 'Eligibility Check' },
  { value: 'manual_verification', label: 'Manual Verification' },
  { value: 'payer_portal', label: 'Payer Portal' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'eob_review', label: 'EOB Review' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

export const TASK_TYPES = [
  { value: 'verify_coverage', label: 'Verify Coverage' },
  { value: 'verify_plan', label: 'Verify Plan' },
  { value: 'verify_new_service_line', label: 'Verify New Service Line' },
  { value: 'update_expired_rule', label: 'Update Expired Rule' },
  { value: 'resolve_coverage_block', label: 'Resolve Coverage Block' },
  { value: 'renew_authorization', label: 'Renew Authorization' },
];

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

export const CPT_CODES_ABA = [
  { code: '97151', description: 'Behavior ID Assessment' },
  { code: '97152', description: 'Behavior ID Supporting Assessment' },
  { code: '97153', description: 'Adaptive Behavior Treatment' },
  { code: '97154', description: 'Group Adaptive Behavior Treatment' },
  { code: '97155', description: 'Adaptive Behavior Treatment with Protocol Modification' },
  { code: '97156', description: 'Family Adaptive Behavior Treatment Guidance' },
  { code: '97157', description: 'Multiple-Family Group Adaptive Behavior Treatment' },
  { code: '97158', description: 'Group Adaptive Behavior Treatment with Protocol Modification' },
  { code: '0362T', description: 'Behavior ID Supporting Assessment (Tech)' },
  { code: '0373T', description: 'Adaptive Behavior Treatment (Tech)' },
];

export const SCHOOL_SERVICE_LINES = [
  'Behavior Support',
  'ABA Therapy',
  'Consultation',
  'Parent Training',
  'Assessment',
  'Social Skills',
  'Crisis Support',
  'Observation',
];
