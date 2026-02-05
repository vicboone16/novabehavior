export type ContractType = 'district' | 'school' | 'agency_partner' | 'private_pay';
export type BillingFrequency = 'weekly' | 'biweekly' | 'monthly';
export type ContractStatus = 'active' | 'expired' | 'pending' | 'terminated';
export type FundingSource = 'district_funded' | 'grant' | 'settlement' | 'medicaid' | 'private_insurance' | 'self_pay';

export interface ContractService {
  service_type: string;
  cpt_code?: string;
  rate: number;
  unit_type: 'hour' | '15min' | 'session' | 'day';
  description?: string;
}

export interface ContractRate {
  id: string;
  agency_id?: string;
  contract_type: ContractType;
  organization_name: string;
  organization_id?: string;
  contract_start_date: string;
  contract_end_date?: string;
  contract_number?: string;
  services: ContractService[];
  billing_frequency: BillingFrequency;
  invoice_due_days: number;
  requires_signature: boolean;
  status: ContractStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentContractAssignment {
  id: string;
  student_id: string;
  contract_id: string;
  start_date: string;
  end_date?: string;
  funding_source?: FundingSource;
  authorized_hours_per_week?: number;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  // Joined fields
  contract?: ContractRate;
  student?: {
    id: string;
    name: string;
  };
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  district: 'School District',
  school: 'Individual School',
  agency_partner: 'Agency Partner',
  private_pay: 'Private Pay',
};

export const FUNDING_SOURCE_LABELS: Record<FundingSource, string> = {
  district_funded: 'District Funded',
  grant: 'Grant',
  settlement: 'Settlement',
  medicaid: 'Medicaid',
  private_insurance: 'Private Insurance',
  self_pay: 'Self Pay',
};

export const BILLING_FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
};
