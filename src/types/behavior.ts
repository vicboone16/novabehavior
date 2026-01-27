export type DataCollectionMethod = 'frequency' | 'duration' | 'interval' | 'abc';

export type BehaviorFunction = 'attention' | 'escape' | 'tangible' | 'sensory' | 'automatic' | 'unknown';

export type GoalDirection = 'increase' | 'decrease' | 'maintain';
export type GoalMetric = 'frequency' | 'percentage' | 'duration' | 'rate';

export interface BehaviorGoal {
  id: string;
  studentId: string;
  behaviorId: string;
  direction: GoalDirection;
  metric: GoalMetric;
  targetValue: number;
  baseline?: number;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

export interface Behavior {
  id: string;
  name: string;
  type: DataCollectionMethod; // For backwards compat, this is the primary method
  methods: DataCollectionMethod[]; // Multiple methods per behavior
}

export interface Student {
  id: string;
  name: string;
  behaviors: Behavior[];
  color: string;
  customAntecedents?: string[];
  customConsequences?: string[];
}

export interface ABCBehaviorEntry {
  behaviorId: string;
  behaviorName: string;
  frequencyCount: number;
  hasDuration?: boolean;
  durationMinutes?: number;
}

export interface ABCEntry {
  id: string;
  studentId: string;
  behaviorId: string;
  antecedent: string;
  antecedents?: string[]; // Multiple antecedents
  behavior: string;
  behaviors?: ABCBehaviorEntry[]; // Multiple behaviors with individual counts/durations
  consequence: string;
  consequences?: string[]; // Multiple consequences
  functions?: BehaviorFunction[]; // Hypothesized functions
  frequencyCount: number; // Legacy - total count
  hasDuration?: boolean;
  durationMinutes?: number; // Legacy - total duration
  timestamp: Date;
  sessionId?: string;
}

export interface FrequencyEntry {
  id: string;
  studentId: string;
  behaviorId: string;
  count: number;
  timestamp: Date;
  timestamps?: Date[]; // Individual occurrence timestamps
  sessionId?: string;
}

export interface DurationEntry {
  id: string;
  studentId: string;
  behaviorId: string;
  duration: number; // in seconds
  startTime: Date;
  endTime?: Date;
  sessionId?: string;
}

export interface IntervalEntry {
  id: string;
  studentId: string;
  behaviorId: string;
  intervalNumber: number;
  occurred: boolean;
  timestamp: Date;
  markedAt?: Date; // When the occurrence was marked
  voided?: boolean; // True if this interval doesn't count (late arrival/early departure)
  voidReason?: 'late_arrival' | 'early_departure' | 'not_present';
  sessionId?: string;
}

export interface StudentIntervalStatus {
  studentId: string;
  joinedAtInterval: number; // Which interval they joined (0 = start, >0 = late arrival)
  departedAtInterval?: number; // Which interval they left (undefined = stayed till end)
}

export interface SessionConfig {
  intervalLength: number; // in seconds
  totalIntervals: number;
  samplingType: 'whole' | 'partial' | 'momentary';
}

export interface SessionLengthOverride {
  studentId?: string;
  behaviorId?: string;
  lengthMinutes: number; // Session length in minutes for this student/behavior
}

export interface Session {
  id: string;
  date: Date;
  notes: string;
  studentIds: string[];
  sessionLengthMinutes: number; // Total session length in minutes
  sessionLengthOverrides?: SessionLengthOverride[]; // Per-student/behavior overrides
  abcEntries: ABCEntry[];
  frequencyEntries: FrequencyEntry[];
  durationEntries: DurationEntry[];
  intervalEntries: IntervalEntry[];
}

export interface TrackerOrder {
  [studentId: string]: DataCollectionMethod[];
}

export const ANTECEDENT_OPTIONS = [
  'Demand placed',
  'Attention removed',
  'Denied access',
  'Transition',
  'Unstructured time',
  'Sensory input',
  'Other'
];

export const CONSEQUENCE_OPTIONS = [
  'Attention given',
  'Demand removed',
  'Access given',
  'Ignored',
  'Redirected',
  'Time out',
  'Other'
];

export const FUNCTION_OPTIONS: { value: BehaviorFunction; label: string }[] = [
  { value: 'attention', label: 'Attention' },
  { value: 'escape', label: 'Escape/Avoidance' },
  { value: 'tangible', label: 'Tangible/Access' },
  { value: 'sensory', label: 'Sensory/Automatic' },
  { value: 'automatic', label: 'Automatic Reinforcement' },
  { value: 'unknown', label: 'Unknown/Multiple' },
];

export const STUDENT_COLORS = [
  'hsl(199, 89%, 38%)',
  'hsl(173, 58%, 39%)',
  'hsl(262, 83%, 58%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(280, 65%, 60%)',
  'hsl(160, 84%, 39%)',
  'hsl(45, 93%, 47%)',
];

export const METHOD_LABELS: Record<DataCollectionMethod, string> = {
  frequency: 'Frequency',
  duration: 'Duration',
  interval: 'Interval',
  abc: 'ABC'
};
