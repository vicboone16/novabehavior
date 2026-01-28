export type DataCollectionMethod = 'frequency' | 'duration' | 'interval' | 'abc' | 'latency';

export type BehaviorFunction = 'attention' | 'escape' | 'tangible' | 'sensory' | 'automatic' | 'unknown';

export type GoalDirection = 'increase' | 'decrease' | 'maintain';
export type GoalMetric = 'frequency' | 'percentage' | 'duration' | 'rate' | 'latency';

export type CaseType = 'school-based' | 'fba-only' | 'direct-services' | 'consultation';

export type DocumentType = 'fba' | 'bip' | 'iep' | 'psycho-ed' | 'progress-report' | 'other';

export interface BehaviorGoal {
  id: string;
  studentId: string;
  behaviorId: string;
  direction: GoalDirection;
  metric: GoalMetric;
  targetValue?: number;
  baseline?: number;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  introducedDate?: Date;
  dataCollectionStartDate?: Date;
  isMastered?: boolean;
  masteryDate?: Date;
  // Smart linking
  linkedBehaviorData?: string[]; // IDs of linked behavior entries
  linkedABCData?: string[]; // IDs of linked ABC entries
  linkedReplacementSkill?: string; // Behavior ID for replacement skill
  linkedInterventionFidelity?: string[]; // IDs of fidelity checks
  masteryCriteria?: string;
  measurementType?: string;
  reviewDate?: Date;
}

export interface BehaviorDefinition {
  id: string;
  name: string;
  operationalDefinition: string;
  category: string;
  isGlobal?: boolean; // Part of global behavior bank
  createdBy?: string; // User who created it
}

export interface Behavior {
  id: string;
  name: string;
  type: DataCollectionMethod;
  methods: DataCollectionMethod[];
  operationalDefinition?: string; // Student-specific definition
  baseBehaviorId?: string; // If pulled from behavior bank
  category?: string;
}

export interface NarrativeNote {
  id: string;
  studentId: string;
  content: string;
  timestamp: Date;
  behaviorId?: string; // Optional - can be tied to a behavior
  tags?: string[];
}

export interface LatencyEntry {
  id: string;
  studentId: string;
  behaviorId: string;
  antecedentTime: Date; // When instruction/antecedent occurred
  behaviorOnsetTime: Date; // When behavior started
  latencySeconds: number; // Calculated
  sessionId?: string;
  notes?: string;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  type: DocumentType;
  customType?: string; // For 'other' type
  fileName: string;
  filePath: string;
  uploadedAt: Date;
  extractedData?: ExtractedDocumentData;
  isProcessed?: boolean;
}

export interface ExtractedDocumentData {
  // From FBAs
  targetBehaviors?: { name: string; definition: string; added?: boolean }[];
  antecedents?: { value: string; added?: boolean }[];
  consequences?: { value: string; added?: boolean }[];
  hypothesizedFunctions?: { value: string; added?: boolean }[];
  settingEvents?: { value: string; added?: boolean }[];
  assessmentTools?: { value: string; added?: boolean }[];
  // From BIPs
  replacementBehaviors?: { name: string; definition?: string; added?: boolean }[];
  preventativeStrategies?: { value: string; added?: boolean }[];
  teachingStrategies?: { value: string; added?: boolean }[];
  reactiveStrategies?: { value: string; added?: boolean }[];
  crisisProcedures?: { value: string; added?: boolean }[];
  // From IEPs
  goals?: { text: string; type: 'academic' | 'behavioral' | 'sel'; added?: boolean }[];
  accommodations?: { value: string; added?: boolean }[];
  behaviorSupports?: { value: string; added?: boolean }[];
  serviceMinutes?: { service: string; minutes: number; added?: boolean }[];
  reviewDates?: { date: string; added?: boolean }[];
}

export interface Student {
  id: string;
  name: string;
  behaviors: Behavior[];
  color: string;
  customAntecedents?: string[];
  customConsequences?: string[];
  isArchived?: boolean;
  archivedAt?: Date;
  // New profile fields
  dateOfBirth?: Date;
  grade?: string;
  school?: string;
  caseTypes?: CaseType[];
  assessmentModeEnabled?: boolean;
  // Narrative notes (not session-tied)
  narrativeNotes?: NarrativeNote[];
  // Documents
  documents?: StudentDocument[];
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
  voidReason?: 'late_arrival' | 'early_departure' | 'not_present' | 'fire_drill' | 'break' | 'transition' | 'other';
  voidReasonCustom?: string; // Custom reason text when voidReason is 'other'
  sessionId?: string;
}

export interface StudentIntervalStatus {
  studentId: string;
  joinedAtInterval: number; // Which interval they joined (0 = start, >0 = late arrival)
  departedAtInterval?: number; // Which interval they left (undefined = stayed till end)
}

export interface StudentSessionStatus {
  studentId: string;
  isPaused: boolean;
  pausedAt?: Date;
  pauseDurations: number[]; // Array of pause durations in ms
  hasEnded: boolean;
  endedAt?: Date;
  effectiveSessionMinutes?: number; // Actual session time minus pauses
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
  abc: 'ABC',
  latency: 'Latency'
};

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  'school-based': 'School-Based',
  'fba-only': 'FBA Only',
  'direct-services': 'Direct Services',
  'consultation': 'Consultation'
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  'fba': 'FBA',
  'bip': 'BIP',
  'iep': 'IEP',
  'psycho-ed': 'Psycho-ed / Eligibility Report',
  'progress-report': 'Progress Report',
  'other': 'Other'
};

export const BEHAVIOR_CATEGORIES = [
  'Aggression',
  'Self-Injury',
  'Property Destruction',
  'Elopement',
  'Non-Compliance',
  'Verbal Disruption',
  'Stereotypy',
  'Social Skills',
  'Communication',
  'Academic',
  'Other'
];
