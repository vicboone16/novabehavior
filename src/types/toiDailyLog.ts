// TOI Daily Status Log Types

export type TOIDailyStatus = 'observed_none' | 'not_observed';

export interface TOIDailyLog {
  id: string;
  student_id: string;
  log_date: string; // DATE format: YYYY-MM-DD
  status: TOIDailyStatus;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TOIDailyLogInput {
  student_id: string;
  log_date: string; // DATE format: YYYY-MM-DD
  status: TOIDailyStatus;
  notes?: string | null;
}

export const TOI_DAILY_STATUS_LABELS: Record<TOIDailyStatus, string> = {
  observed_none: 'Observed - No TOI',
  not_observed: 'No Observation',
};

export const TOI_DAILY_STATUS_COLORS: Record<TOIDailyStatus, string> = {
  observed_none: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200',
  not_observed: 'bg-muted text-muted-foreground border-border',
};

// For UI representation - includes the "has TOI" state derived from events
export type TOIDailyDisplayStatus = 'has_toi' | 'observed_none' | 'not_observed' | 'blank';

export const TOI_DISPLAY_STATUS_LABELS: Record<TOIDailyDisplayStatus, string> = {
  has_toi: 'TOI Occurred',
  observed_none: 'Observed - No TOI',
  not_observed: 'No Observation',
  blank: '',
};

export const TOI_DISPLAY_STATUS_COLORS: Record<TOIDailyDisplayStatus, string> = {
  has_toi: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300',
  observed_none: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200',
  not_observed: 'bg-muted text-muted-foreground border-border',
  blank: 'bg-background border-border',
};
