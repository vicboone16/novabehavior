export interface ReportBranding {
  id: string;
  agency_id: string | null;
  organization_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  footer_text: string | null;
  contact_info: ContactInfo | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
}

export interface GeneratedReport {
  id: string;
  student_id: string | null;
  report_type: ReportType;
  branding_id: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  content: ReportContent | null;
  pdf_url: string | null;
  generated_at: string;
  generated_by: string | null;
  shared_with: ShareRecipient[] | null;
  is_public: boolean;
  public_token: string;
}

export type ReportType = 
  | 'progress'
  | 'fba_summary'
  | 'behavior_data'
  | 'iep_prep'
  | 'attendance'
  | 'billing_summary';

export interface ReportContent {
  title: string;
  sections: ReportSection[];
  generatedAt: string;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'text' | 'chart' | 'table' | 'summary';
  content: unknown;
}

export interface ShareRecipient {
  email: string;
  access_token: string;
  sent_at: string;
  viewed_at?: string;
}

export const REPORT_TYPE_LABELS: Record<ReportType, { label: string; description: string }> = {
  progress: { label: 'Progress Report', description: 'Behavior trends and goal progress' },
  fba_summary: { label: 'FBA Summary', description: 'Parent-friendly FBA findings' },
  behavior_data: { label: 'Behavior Data Summary', description: 'Charts and graphs for meetings' },
  iep_prep: { label: 'IEP Prep Report', description: 'Comprehensive meeting preparation document' },
  attendance: { label: 'Attendance Report', description: 'Session attendance summary' },
  billing_summary: { label: 'Billing Summary', description: 'Services delivered for billing' },
};
