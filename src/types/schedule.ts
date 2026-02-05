import type { Json } from '@/integrations/supabase/types';

export interface Appointment {
  id: string;
  title?: string | null;
  student_id?: string | null;
  staff_user_id?: string | null;
  staff_user_ids?: string[];
  created_by: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_recurring: boolean | null;
  recurrence_rule?: Json;
  status: string;
  appointment_type: string;
  linked_session_id?: string | null;
  notes?: string | null;
  color?: string | null;
  created_at: string;
  updated_at: string;
  // New verification fields
  service_type?: string;
  service_setting?: string;
  location_detail?: string;
  verification_status?: string;
  verification_required?: boolean;
  verified_at?: string;
  verified_by?: string;
}

export type ScheduleViewType = 'day' | 'week' | 'month' | 'timeline';

export type FilterMode = 'all' | 'my' | 'staff' | 'student';

export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

export interface CalendarStudent {
  id: string;
  name: string;
  color: string;
}

export interface CalendarStaff {
  id: string;
  name: string;
  credential?: string;
}
