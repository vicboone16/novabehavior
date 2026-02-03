// Payment Processing Types

export type PaymentType = 'copay' | 'coinsurance' | 'deductible' | 'self_pay' | 'balance' | 'prepayment';
export type PaymentMethod = 'card' | 'ach' | 'check' | 'cash' | 'other';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled';
export type PaymentPlanStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'defaulted';
export type PaymentPlanFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface BillingPayment {
  id: string;
  student_id: string;
  payer_id?: string | null;
  claim_id?: string | null;
  amount: number;
  payment_type: PaymentType;
  payment_method?: PaymentMethod | null;
  stripe_payment_intent_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_payment_method_id?: string | null;
  status: PaymentStatus;
  description?: string | null;
  reference_number?: string | null;
  receipt_url?: string | null;
  failure_reason?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  service_date_from?: string | null;
  service_date_to?: string | null;
  created_by: string;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  student?: { name: string };
  payer?: { name: string };
}

export interface StoredPaymentMethod {
  id: string;
  student_id: string;
  stripe_customer_id: string;
  stripe_payment_method_id: string;
  card_brand?: string | null;
  card_last4?: string | null;
  card_exp_month?: number | null;
  card_exp_year?: number | null;
  is_default: boolean;
  is_active: boolean;
  nickname?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentPlan {
  id: string;
  student_id: string;
  total_amount: number;
  installment_amount: number;
  frequency: PaymentPlanFrequency;
  total_installments: number;
  completed_installments: number;
  start_date: string;
  next_payment_date?: string | null;
  auto_charge: boolean;
  stored_payment_method_id?: string | null;
  status: PaymentPlanStatus;
  original_claim_ids?: string[];
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  student?: { name: string };
  stored_payment_method?: StoredPaymentMethod;
}

// Eligibility Types
export type EligibilityCheckType = 'realtime' | 'batch' | 'manual';
export type EligibilityStatus = 'pending' | 'success' | 'error' | 'no_response' | 'manual';

export interface EligibilityCheck {
  id: string;
  student_id: string;
  payer_id?: string | null;
  client_payer_id?: string | null;
  check_type: EligibilityCheckType;
  service_date: string;
  pverify_request_id?: string | null;
  pverify_response?: Record<string, unknown>;
  is_eligible?: boolean | null;
  eligibility_status?: string | null;
  plan_name?: string | null;
  plan_number?: string | null;
  group_number?: string | null;
  copay_amount?: number | null;
  coinsurance_percent?: number | null;
  deductible_total?: number | null;
  deductible_remaining?: number | null;
  out_of_pocket_max?: number | null;
  out_of_pocket_remaining?: number | null;
  aba_covered?: boolean | null;
  aba_auth_required?: boolean | null;
  aba_visit_limit?: number | null;
  aba_visits_used?: number | null;
  aba_dollar_limit?: number | null;
  aba_dollars_used?: number | null;
  status: EligibilityStatus;
  error_message?: string | null;
  performed_by: string;
  performed_at: string;
  created_at: string;
  // Joined
  student?: { name: string };
  payer?: { name: string };
}

// Prior Authorization Types
export type PriorAuthRequestType = 'initial' | 'continuation' | 'modification' | 'expedited';
export type PriorAuthDecision = 'pending' | 'approved' | 'denied' | 'partial' | 'additional_info_needed';
export type PriorAuthStatus = 'draft' | 'ready' | 'submitted' | 'in_review' | 'completed' | 'cancelled';

export interface PriorAuthRequest {
  id: string;
  student_id: string;
  payer_id?: string | null;
  authorization_id?: string | null;
  request_type: PriorAuthRequestType;
  service_codes: string[];
  units_requested: number;
  service_start_date: string;
  service_end_date: string;
  diagnosis_codes?: string[];
  clinical_summary?: string | null;
  medical_necessity?: string | null;
  treatment_goals?: string[];
  supporting_documentation?: Record<string, unknown>;
  ai_generated_justification?: string | null;
  submission_method?: 'portal' | 'fax' | 'phone' | 'electronic' | null;
  submitted_at?: string | null;
  submitted_by?: string | null;
  payer_reference_number?: string | null;
  decision?: PriorAuthDecision | null;
  decision_date?: string | null;
  approved_units?: number | null;
  denial_reason?: string | null;
  appeal_deadline?: string | null;
  status: PriorAuthStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  student?: { name: string };
  payer?: { name: string };
}

// Payment form types
export interface PaymentFormData {
  studentId: string;
  amount: number;
  paymentType: PaymentType;
  description?: string;
  claimId?: string;
  payerId?: string;
  savePaymentMethod?: boolean;
  storedPaymentMethodId?: string;
}

// Constants
export const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'copay', label: 'Copay' },
  { value: 'coinsurance', label: 'Coinsurance' },
  { value: 'deductible', label: 'Deductible' },
  { value: 'self_pay', label: 'Self Pay' },
  { value: 'balance', label: 'Balance Due' },
  { value: 'prepayment', label: 'Prepayment' },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  { value: 'succeeded', label: 'Succeeded', color: 'bg-green-100 text-green-800' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
  { value: 'refunded', label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
  { value: 'partially_refunded', label: 'Partial Refund', color: 'bg-orange-100 text-orange-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
];

export const PRIOR_AUTH_STATUSES: { value: PriorAuthStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'ready', label: 'Ready to Submit', color: 'bg-blue-100 text-blue-800' },
  { value: 'submitted', label: 'Submitted', color: 'bg-purple-100 text-purple-800' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

export const PRIOR_AUTH_DECISIONS: { value: PriorAuthDecision; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { value: 'denied', label: 'Denied', color: 'bg-red-100 text-red-800' },
  { value: 'partial', label: 'Partially Approved', color: 'bg-orange-100 text-orange-800' },
  { value: 'additional_info_needed', label: 'Info Needed', color: 'bg-blue-100 text-blue-800' },
];
