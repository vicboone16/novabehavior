export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'exported' | 'rejected';
export type TimesheetEntryType = 'session' | 'drive' | 'admin' | 'training' | 'meeting' | 'supervision' | 'other';
export type PayrollExportFormat = 'quickbooks' | 'gusto' | 'adp' | 'generic';

export interface StaffTimesheet {
  id: string;
  staff_user_id: string;
  agency_id?: string | null;
  pay_period_start: string;
  pay_period_end: string;
  status: TimesheetStatus;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  drive_time_hours: number;
  total_mileage: number;
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  staff_name?: string;
}

export interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  appointment_id?: string | null;
  entry_type: TimesheetEntryType;
  entry_date: string;
  clock_in?: string | null;
  clock_out?: string | null;
  duration_minutes: number;
  mileage: number;
  is_billable: boolean;
  pay_rate?: number | null;
  student_id?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  student_name?: string;
}

export interface PayrollExport {
  id: string;
  agency_id?: string | null;
  export_format: PayrollExportFormat;
  pay_period_start: string;
  pay_period_end: string;
  staff_count: number;
  total_hours: number;
  total_amount: number;
  file_url?: string | null;
  exported_by: string;
  created_at: string;
}
