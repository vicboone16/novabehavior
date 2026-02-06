export type ClearinghouseSubmissionStatus = 'generated' | 'uploaded' | 'accepted' | 'rejected' | 'partial';
export type ClaimSubmissionStatus = 'pending' | 'accepted' | 'rejected' | 'paid' | 'denied';

export interface ClearinghouseSubmission {
  id: string;
  agency_id?: string | null;
  batch_number: string;
  submission_date: string;
  claim_count: number;
  total_charges: number;
  file_url?: string | null;
  status: ClearinghouseSubmissionStatus;
  response_data: Record<string, unknown>;
  clearinghouse: string;
  submitted_by: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimSubmissionHistory {
  id: string;
  claim_id: string;
  submission_id?: string | null;
  clearinghouse_status: ClaimSubmissionStatus;
  clearinghouse_claim_id?: string | null;
  rejection_reasons: string[];
  response_date?: string | null;
  response_data: Record<string, unknown>;
  created_at: string;
}

// 837P Segment types for file generation
export interface Claim837P {
  claimNumber: string;
  patientName: string;
  patientDob: string;
  patientGender: string;
  patientAddress: string;
  subscriberId: string;
  payerName: string;
  payerId: string;
  renderingProviderNpi: string;
  renderingProviderName: string;
  billingProviderNpi: string;
  billingProviderName: string;
  billingProviderTaxId: string;
  billingProviderAddress: string;
  diagnosisCodes: string[];
  placeOfService: string;
  serviceLines: {
    cptCode: string;
    modifiers: string[];
    units: number;
    charge: number;
    serviceDate: string;
    diagnosisPointers: number[];
  }[];
}
