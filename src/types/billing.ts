export type ClaimStatus = 'draft' | 'ready' | 'submitted' | 'paid' | 'partial' | 'denied' | 'appealed' | 'void';

export interface BillingClaim {
  id: string;
  claim_number: string;
  student_id: string;
  payer_id: string;
  authorization_id?: string | null;
  service_date_from: string;
  service_date_to: string;
  place_of_service: string;
  diagnosis_codes: string[];
  total_charges: number;
  status: ClaimStatus;
  submitted_date?: string | null;
  paid_date?: string | null;
  paid_amount?: number | null;
  adjustment_amount?: number | null;
  adjustment_codes?: string[];
  denial_reason?: string | null;
  denial_code?: string | null;
  appeal_deadline?: string | null;
  appeal_submitted_date?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimLineItem {
  id: string;
  claim_id: string;
  session_id?: string | null;
  line_number: number;
  service_date: string;
  cpt_code: string;
  modifiers: string[];
  units: number;
  unit_charge: number;
  total_charge: number;
  rendering_provider_npi?: string | null;
  rendering_provider_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ERARemittance {
  id: string;
  claim_id?: string | null;
  remittance_date: string;
  payer_claim_number?: string | null;
  check_number?: string | null;
  paid_amount: number;
  adjustment_codes: string[];
  remark_codes: string[];
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface BillingClaimWithDetails extends BillingClaim {
  student?: {
    name: string;
    dob?: string;
  };
  payer?: {
    name: string;
  };
  line_items?: ClaimLineItem[];
}

export const PLACE_OF_SERVICE_CODES: { code: string; description: string }[] = [
  { code: '02', description: 'Telehealth' },
  { code: '03', description: 'School' },
  { code: '11', description: 'Office' },
  { code: '12', description: 'Home' },
  { code: '99', description: 'Other' },
];

export const ABA_CPT_CODES: { code: string; description: string; defaultUnits: number }[] = [
  { code: '97151', description: 'Behavior ID Assessment', defaultUnits: 1 },
  { code: '97152', description: 'Behavior ID Supporting Assessment', defaultUnits: 1 },
  { code: '97153', description: 'Adaptive Behavior Treatment by Technician', defaultUnits: 4 },
  { code: '97154', description: 'Group Adaptive Behavior Treatment', defaultUnits: 4 },
  { code: '97155', description: 'Adaptive Behavior Treatment by QHP', defaultUnits: 4 },
  { code: '97156', description: 'Family Adaptive Behavior Treatment', defaultUnits: 4 },
  { code: '97157', description: 'Multiple Family Group Treatment', defaultUnits: 4 },
  { code: '97158', description: 'Group Adaptive Behavior Treatment by QHP', defaultUnits: 4 },
  { code: '0362T', description: 'Behavior ID Supporting Assessment (each additional)', defaultUnits: 1 },
  { code: '0373T', description: 'Adaptive Behavior Treatment with Modifications', defaultUnits: 4 },
];

export const COMMON_MODIFIERS = [
  { code: '59', description: 'Distinct Procedural Service' },
  { code: '76', description: 'Repeat Procedure by Same Physician' },
  { code: '77', description: 'Repeat Procedure by Another Physician' },
  { code: 'GT', description: 'Via Interactive Telecommunications' },
  { code: 'HM', description: 'Less than Bachelor Degree Level' },
  { code: 'HN', description: 'Bachelor Degree Level' },
  { code: 'HO', description: 'Master Degree Level' },
  { code: 'HP', description: 'Doctoral Level' },
  { code: 'XE', description: 'Separate Encounter' },
  { code: 'XS', description: 'Separate Structure' },
];

export const DENIAL_REASON_CODES = [
  { code: '1', description: 'Deductible Amount' },
  { code: '2', description: 'Coinsurance Amount' },
  { code: '3', description: 'Co-payment Amount' },
  { code: '16', description: 'Claim/Service Lacks Information' },
  { code: '18', description: 'Duplicate Claim/Service' },
  { code: '29', description: 'Time Limit for Filing Has Expired' },
  { code: '50', description: 'Non-covered Service' },
  { code: '96', description: 'Non-covered Charge' },
  { code: '97', description: 'Payment Adjusted - Auth Not Obtained' },
  { code: '197', description: 'Precertification/Authorization/Notification Absent' },
];
