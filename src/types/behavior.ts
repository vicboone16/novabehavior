export type DataCollectionMethod = 'frequency' | 'duration' | 'interval' | 'abc';

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
}

export interface ABCEntry {
  id: string;
  studentId: string;
  behaviorId: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  timestamp: Date;
  sessionId?: string;
}

export interface FrequencyEntry {
  id: string;
  studentId: string;
  behaviorId: string;
  count: number;
  timestamp: Date;
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
  sessionId?: string;
}

export interface SessionConfig {
  intervalLength: number; // in seconds
  totalIntervals: number;
  samplingType: 'whole' | 'partial' | 'momentary';
}

export interface Session {
  id: string;
  date: Date;
  notes: string;
  studentIds: string[];
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
