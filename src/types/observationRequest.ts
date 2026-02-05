export interface ObservationRequest {
  id: string;
  student_id: string;
  request_type: 'behavior_observation' | 'skills_checklist' | 'antecedent_log' | 'frequency_count';
  target_behaviors: string[] | null;
  instructions: string | null;
  recipient_name: string;
  recipient_email: string;
  recipient_role: string | null;
  access_token: string;
  status: 'pending' | 'sent' | 'opened' | 'in_progress' | 'completed' | 'expired';
  sent_at: string | null;
  expires_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
  response_data: ObservationResponseData | null;
  created_by: string | null;
  created_at: string;
}

export interface ObservationResponseData {
  observations: ObservationEntry[];
  notes?: string;
  submittedAt?: string;
}

export interface ObservationEntry {
  id: string;
  behaviorId?: string;
  behaviorName?: string;
  timestamp: string;
  type: 'frequency' | 'duration' | 'abc';
  count?: number;
  durationMinutes?: number;
  antecedent?: string;
  consequence?: string;
  notes?: string;
}

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  behavior_observation: 'Behavior Observation',
  skills_checklist: 'Skills Checklist',
  antecedent_log: 'Antecedent Log',
  frequency_count: 'Frequency Count',
};

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-500' },
  sent: { label: 'Sent', color: 'bg-blue-500' },
  opened: { label: 'Opened', color: 'bg-yellow-500' },
  in_progress: { label: 'In Progress', color: 'bg-orange-500' },
  completed: { label: 'Completed', color: 'bg-green-500' },
  expired: { label: 'Expired', color: 'bg-red-500' },
};
