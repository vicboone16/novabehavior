// TOI (Time Out of Instruction) Types

export type TOIEventType = 
  | 'TOI_SLEEPING'
  | 'TOI_NURSE_OFFICE'
  | 'TOI_HEALTH_ROOM_REST'
  | 'TOI_MED_SIDE_EFFECT_FATIGUE'
  | 'TOI_ILLNESS_LETHARGY'
  | 'TOI_DECOMPRESSION_BREAK'
  | 'TOI_WAITING_PICKUP'
  | 'TOI_OTHER';

export type TOILocation = 
  | 'classroom'
  | 'nurse'
  | 'office'
  | 'sensory_room'
  | 'outside'
  | 'other';

export type TOIContributor = 
  | 'medication_change'
  | 'missed_dose'
  | 'illness'
  | 'poor_sleep_night'
  | 'unknown'
  | 'other';

export interface TOIEvent {
  id: string;
  student_id: string;
  event_group: string;
  event_type: TOIEventType;
  display_label: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  location: TOILocation | null;
  suspected_contributor: TOIContributor | null;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TOIEventInput {
  student_id: string;
  event_type: TOIEventType;
  display_label: string;
  start_time: string;
  end_time?: string | null;
  location?: TOILocation | null;
  suspected_contributor?: TOIContributor | null;
  notes?: string | null;
}

// Quick type preset configuration
export interface TOIQuickTypePreset {
  type: TOIEventType;
  label: string;
  icon: string;
  defaultLocation?: TOILocation;
  defaultContributor?: TOIContributor;
}

export const TOI_QUICK_TYPE_PRESETS: TOIQuickTypePreset[] = [
  { type: 'TOI_SLEEPING', label: 'Sleeping', icon: '😴', defaultLocation: 'classroom' },
  { type: 'TOI_NURSE_OFFICE', label: 'Nurse', icon: '🏥', defaultLocation: 'nurse' },
  { type: 'TOI_HEALTH_ROOM_REST', label: 'Resting', icon: '🛋️', defaultLocation: 'sensory_room' },
  { type: 'TOI_MED_SIDE_EFFECT_FATIGUE', label: 'Medication Fatigue', icon: '💊', defaultContributor: 'medication_change' },
  { type: 'TOI_DECOMPRESSION_BREAK', label: 'Decompression', icon: '🧘', defaultLocation: 'sensory_room' },
  { type: 'TOI_WAITING_PICKUP', label: 'Waiting Pickup', icon: '🚗', defaultLocation: 'office' },
  { type: 'TOI_OTHER', label: 'Other', icon: '📝' },
];

export const TOI_EVENT_LABELS: Record<TOIEventType, string> = {
  TOI_SLEEPING: 'Sleeping',
  TOI_NURSE_OFFICE: "Nurse's Office",
  TOI_HEALTH_ROOM_REST: 'Health Room Rest',
  TOI_MED_SIDE_EFFECT_FATIGUE: 'Medication Fatigue',
  TOI_ILLNESS_LETHARGY: 'Illness/Lethargy',
  TOI_DECOMPRESSION_BREAK: 'Decompression Break',
  TOI_WAITING_PICKUP: 'Waiting for Pickup',
  TOI_OTHER: 'Other',
};

export const TOI_LOCATION_LABELS: Record<TOILocation, string> = {
  classroom: 'Classroom',
  nurse: "Nurse's Office",
  office: 'Main Office',
  sensory_room: 'Sensory Room',
  outside: 'Outside',
  other: 'Other',
};

export const TOI_CONTRIBUTOR_LABELS: Record<TOIContributor, string> = {
  medication_change: 'Medication Change',
  missed_dose: 'Missed Dose',
  illness: 'Illness',
  poor_sleep_night: 'Poor Sleep Night',
  unknown: 'Unknown',
  other: 'Other',
};

// Helper to format duration
export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

// Helper to calculate live duration from start time
export function calculateLiveDuration(startTime: string): number {
  const start = new Date(startTime);
  const now = new Date();
  return Math.round((now.getTime() - start.getTime()) / 60000);
}
