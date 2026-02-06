export type ERAParseStatus = 'pending' | 'parsing' | 'parsed' | 'error';
export type ERAMatchStatus = 'unmatched' | 'auto_matched' | 'manual_matched' | 'no_match';
export type ERARemittanceStatus = 'pending' | 'reviewed' | 'posted' | 'partial';

export interface ERAImport {
  id: string;
  agency_id?: string | null;
  filename: string;
  file_size?: number | null;
  raw_content?: string | null;
  parse_status: ERAParseStatus;
  parse_error?: string | null;
  total_remittances: number;
  total_amount: number;
  matched_count: number;
  unmatched_count: number;
  imported_by: string;
  created_at: string;
  updated_at: string;
}

export interface ERARemittanceRecord {
  id: string;
  import_id?: string | null;
  payer_name?: string | null;
  payer_id_code?: string | null;
  payee_name?: string | null;
  payee_npi?: string | null;
  check_eft_number?: string | null;
  payment_method?: string | null;
  payment_date?: string | null;
  total_paid: number;
  total_adjustments: number;
  total_patient_responsibility: number;
  claim_count: number;
  status: ERARemittanceStatus;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface ERALineItem {
  id: string;
  remittance_id: string;
  claim_id?: string | null;
  claim_line_item_id?: string | null;
  patient_name?: string | null;
  patient_id?: string | null;
  claim_number?: string | null;
  service_date_from?: string | null;
  service_date_to?: string | null;
  cpt_code?: string | null;
  modifiers: string[];
  billed_amount: number;
  allowed_amount: number;
  paid_amount: number;
  patient_responsibility: number;
  adjustment_reason_codes: string[];
  adjustment_amounts: number[];
  remark_codes: string[];
  match_status: ERAMatchStatus;
  match_confidence?: number | null;
  posted: boolean;
  posted_at?: string | null;
  created_at: string;
}
