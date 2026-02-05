export interface FidelityCheckItem {
  id: string;
  text: string;
  implemented: boolean;
  notes?: string;
}

export interface FidelityCheckTemplate {
  id: string;
  student_id?: string;
  intervention_id?: string;
  name: string;
  items: { text: string }[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TreatmentFidelityCheck {
  id: string;
  template_id?: string;
  session_id?: string;
  student_id: string;
  observer_user_id: string;
  implementer_user_id?: string;
  check_date: string;
  intervention_id?: string;
  items: FidelityCheckItem[];
  items_implemented: number;
  items_total: number;
  fidelity_percentage: number;
  setting?: string;
  duration_minutes?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  observer?: {
    display_name?: string;
    first_name?: string;
    last_name?: string;
  };
  implementer?: {
    display_name?: string;
    first_name?: string;
    last_name?: string;
  };
  student?: {
    name: string;
  };
}

export interface FidelityStats {
  averagePercentage: number;
  totalChecks: number;
  belowThresholdCount: number;
  trend: 'up' | 'down' | 'stable';
}
