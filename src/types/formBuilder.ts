export type FormFieldType = 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'rating' | 'signature' | 'file' | 'section_header' | 'paragraph';
export type FormStatus = 'draft' | 'published' | 'archived';
export type FormSubmissionStatus = 'draft' | 'submitted' | 'reviewed' | 'archived';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldCondition {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty';
  value: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FormFieldOption[];
  conditions?: FormFieldCondition[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  defaultValue?: string;
  helpText?: string;
  order: number;
}

export interface CustomForm {
  id: string;
  agency_id?: string | null;
  title: string;
  description?: string | null;
  form_schema: FormField[];
  version: number;
  status: FormStatus;
  category: string;
  requires_signature: boolean;
  auto_populate_fields: Record<string, string>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustomFormSubmission {
  id: string;
  form_id: string;
  student_id?: string | null;
  respondent_name?: string | null;
  respondent_email?: string | null;
  respondent_relationship?: string | null;
  responses: Record<string, unknown>;
  signature_data?: string | null;
  signed_at?: string | null;
  status: FormSubmissionStatus;
  submitted_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  form?: CustomForm;
}

export const FORM_FIELD_TYPES: { type: FormFieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Short Text', icon: 'Type' },
  { type: 'textarea', label: 'Long Text', icon: 'AlignLeft' },
  { type: 'number', label: 'Number', icon: 'Hash' },
  { type: 'email', label: 'Email', icon: 'Mail' },
  { type: 'phone', label: 'Phone', icon: 'Phone' },
  { type: 'date', label: 'Date', icon: 'Calendar' },
  { type: 'select', label: 'Dropdown', icon: 'ChevronDown' },
  { type: 'multiselect', label: 'Multi-Select', icon: 'CheckSquare' },
  { type: 'checkbox', label: 'Checkbox', icon: 'CheckSquare' },
  { type: 'radio', label: 'Radio Buttons', icon: 'Circle' },
  { type: 'rating', label: 'Rating Scale', icon: 'Star' },
  { type: 'signature', label: 'Signature', icon: 'PenTool' },
  { type: 'file', label: 'File Upload', icon: 'Upload' },
  { type: 'section_header', label: 'Section Header', icon: 'Heading' },
  { type: 'paragraph', label: 'Info Text', icon: 'FileText' },
];
