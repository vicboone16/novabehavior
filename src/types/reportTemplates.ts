export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number';
  required?: boolean;
  prefill?: string;
  auto_populate?: string;
}

export interface TemplateSection {
  key: string;
  title: string;
  enabled: boolean;
  fields: TemplateField[];
}

export interface PayerReportTemplate {
  id: string;
  name: string;
  payer_ids: string[];
  payer_names: string[];
  report_type: 'initial_assessment' | 'progress_report';
  is_default: boolean;
  sections: TemplateSection[];
  agency_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportGenerationData {
  studentName: string;
  studentDob?: string;
  diagnosis?: string;
  sessionCount?: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  fieldValues: Record<string, string>;
  enabledSections: string[];
}

export interface InsuranceReportConfig {
  template: PayerReportTemplate;
  data: ReportGenerationData;
  branding?: {
    organizationName: string;
    logoUrl?: string;
    primaryColor: string;
    footerText?: string;
    contactInfo?: {
      phone?: string;
      email?: string;
      address?: string;
    };
  };
}
