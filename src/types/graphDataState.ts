// Graph data state types for ABA-clinical rendering
export type DataState = 'no_data' | 'observed_zero' | 'measured';

export type GraphMetric =
  | 'percent_correct'
  | 'percent_independent'
  | 'percent_prompted'
  | 'trials_per_session'
  | 'frequency'
  | 'rate'
  | 'duration'
  | 'latency'
  | 'cumulative_frequency'
  | 'cumulative_duration'
  | 'prompt_distribution';

export type XAxisMode = 'date' | 'session_number';
export type AggregationMode = 'per_session' | 'per_day';
export type ChartView = 'line' | 'bar' | 'stacked_bar';

export const SKILL_METRICS: { value: GraphMetric; label: string }[] = [
  { value: 'percent_correct', label: '% Correct' },
  { value: 'percent_independent', label: '% Independent' },
  { value: 'percent_prompted', label: '% Prompted' },
  { value: 'trials_per_session', label: 'Trials / Session' },
  { value: 'prompt_distribution', label: 'Prompt Distribution' },
];

export const BEHAVIOR_METRICS: { value: GraphMetric; label: string }[] = [
  { value: 'frequency', label: 'Frequency' },
  { value: 'rate', label: 'Rate' },
  { value: 'duration', label: 'Duration' },
  { value: 'latency', label: 'Latency' },
  { value: 'cumulative_frequency', label: 'Cumulative Frequency' },
  { value: 'cumulative_duration', label: 'Cumulative Duration' },
];

export interface ABADataPoint {
  date: string;
  sessionIndex: number;
  dataState: DataState;
  value: number | null;
  phase?: string;
  // Tooltip data
  correct?: number;
  incorrect?: number;
  totalTrials?: number;
  independent?: number;
  prompted?: number;
  sessionDuration?: number;
  notes?: string;
}

export interface BenchmarkCriterionStep {
  benchmark_step_id: string;
  benchmark_label: string;
  benchmark_order: number;
  criterion_value: number | null;
  criterion_unit: string | null;
  phase_label: string | null;
  phase_start_date: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  is_met: boolean;
  step_status: 'met' | 'active' | 'pending';
}

export interface GraphOverlays {
  phaseMarkers: boolean;
  masteryThreshold: boolean;
  masteryThresholdValue: number;
  movingAverage: boolean;
  movingAverageWindow: number;
  trendLine: boolean;
  baselineMean: boolean;
  goalLine: boolean;
  dataCompleteness: boolean;
  changingCriterion: boolean;
  changingCriterionLabels: boolean;
}

export const DEFAULT_OVERLAYS: GraphOverlays = {
  phaseMarkers: true,
  masteryThreshold: true,
  masteryThresholdValue: 80,
  movingAverage: false,
  movingAverageWindow: 3,
  trendLine: false,
  baselineMean: false,
  goalLine: false,
  dataCompleteness: false,
  changingCriterion: false,
  changingCriterionLabels: true,
};
