export type DataCollectionMethod = 'frequency' | 'duration' | 'interval' | 'abc' | 'latency';

export type SkillAcquisitionMethod = 'dtt' | 'net' | 'task_analysis' | 'probe';

export type BehaviorFunction = 'attention' | 'escape' | 'tangible' | 'sensory' | 'automatic' | 'unknown';

export type GoalDirection = 'increase' | 'decrease' | 'maintain';
export type GoalMetric = 'frequency' | 'percentage' | 'duration' | 'rate' | 'latency';

export type CaseType = 'school-based' | 'fba-only' | 'direct-services' | 'consultation';

export type DocumentType = 'fba' | 'bip' | 'iep' | 'psycho-ed' | 'progress-report' | 'medical' | 'intake' | 'teacher-interview' | 'parent-interview' | 'observation-notes' | 'other';

// DTT Prompt levels - ordered from most intrusive to least
export type PromptLevel = 'full_physical' | 'partial_physical' | 'model' | 'gestural' | 'verbal' | 'independent';

export const PROMPT_LEVEL_LABELS: Record<PromptLevel, string> = {
  full_physical: 'Full Physical (FP)',
  partial_physical: 'Partial Physical (PP)',
  model: 'Model (M)',
  gestural: 'Gestural (G)',
  verbal: 'Verbal (V)',
  independent: 'Independent (I)',
};

export const PROMPT_LEVEL_ORDER: PromptLevel[] = [
  'full_physical',
  'partial_physical',
  'model',
  'gestural',
  'verbal',
  'independent',
];

// Error types for DTT
export type ErrorType = 'no_response' | 'incorrect' | 'prompted_error' | 'self_corrected';

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  no_response: 'No Response',
  incorrect: 'Incorrect',
  prompted_error: 'Prompted Error',
  self_corrected: 'Self-Corrected',
};

// Mastery criteria options
export type MasteryCriteriaType = 'percent_correct' | 'consecutive_sessions' | 'trend_stability';

export interface MasteryCriteria {
  type: MasteryCriteriaType;
  percentCorrect?: number; // e.g., 80%
  consecutiveSessions?: number; // e.g., 3 sessions
  minTrials?: number; // Minimum trials per session
}

// DTT Trial entry
export interface DTTTrial {
  id: string;
  timestamp: Date;
  isCorrect: boolean;
  promptLevel: PromptLevel;
  errorType?: ErrorType;
  notes?: string;
}

// DTT Session for a skill target
export interface DTTSession {
  id: string;
  skillTargetId: string;
  studentId: string;
  date: Date;
  trials: DTTTrial[];
  percentCorrect: number;
  percentIndependent: number;
  notes?: string;
}

// Skill Target (what's being taught)
export interface SkillTarget {
  id: string;
  studentId: string;
  name: string;
  operationalDefinition?: string;
  domain?: string; // e.g., "Communication", "Social", "Academic"
  program?: string; // Parent program/skill area
  method: SkillAcquisitionMethod;
  status: 'baseline' | 'acquisition' | 'maintenance' | 'generalization' | 'mastered';
  masteryCriteria?: MasteryCriteria;
  masteredDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Custom prompt levels (user can add more)
  customPromptLevels?: string[];
  // For task analysis
  steps?: string[];
  chainingMethod?: 'forward' | 'backward' | 'total_task';
}

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
  isMastered?: boolean; // Behavior goal mastered - archived
  masteredAt?: Date;
  isArchived?: boolean; // Manually archived (different from mastery)
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

export interface ExtractedBackgroundInfo {
  referralReason?: string;
  referralSource?: string;
  presentingConcerns?: string;
  educationalHistory?: string;
  previousPlacements?: string;
  diagnoses?: string;
  medicalInfo?: string;
  previousBIPs?: string;
  strategiesTried?: string;
  whatWorked?: string;
  whatDidntWork?: string;
  homeEnvironment?: string;
  familyStructure?: string;
  culturalConsiderations?: string;
  behaviorsOfConcernSummary?: string;
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
  // Background Information (from any document type)
  backgroundInfo?: ExtractedBackgroundInfo;
}

export interface IndirectAssessmentResult {
  id: string;
  type: 'FAST' | 'MAS' | 'QABF';
  studentId: string;
  completedBy: string;
  completedAt: Date;
  targetBehavior: string;
  responses: Record<string, number>;
  scores: {
    attention: number;
    escape: number;
    tangible: number;
    sensory: number;
  };
  primaryFunction: BehaviorFunction;
  notes?: string;
}

export interface FBAFindings {
  id: string;
  studentId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'complete';
  // Analysis results
  primaryFunction?: BehaviorFunction;
  secondaryFunctions?: BehaviorFunction[];
  functionStrengths?: { function: BehaviorFunction; percentage: number }[];
  // Patterns
  topAntecedents?: { value: string; count: number; percentage: number }[];
  topConsequences?: { value: string; count: number; percentage: number }[];
  // Hypothesis
  hypothesisStatements?: string[];
  // Data summary
  abcEntriesCount?: number;
  sessionsCount?: number;
  frequencyTotal?: number;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  // Recommendations
  recommendations?: string[];
  ageRange?: string;
  // Assessor info
  assessorName?: string;
  assessorTitle?: string;
  notes?: string;
}

export interface BIPData {
  id: string;
  studentId: string;
  createdAt: Date;
  updatedAt: Date;
  // From FBA
  targetBehaviors: { name: string; definition: string }[];
  hypothesisStatements: string[];
  primaryFunction: BehaviorFunction;
  // BIP specific
  replacementBehaviors: { name: string; definition: string; teachingPlan?: string }[];
  preventativeStrategies: string[];
  teachingStrategies: string[];
  reinforcementStrategies: string[];
  reactiveStrategies: string[];
  crisisPlan?: string;
  monitoringPlan?: string;
  reviewDate?: Date;
  teamMembers?: string[];
  status: 'draft' | 'active' | 'archived';
}

export interface FBAWorkflowProgress {
  completedSteps: number[]; // Array of completed step indices
  currentStep: number;
  updatedAt: Date;
}

// Background information for reports
export interface StudentBackgroundInfo {
  // Referral Information
  referralReason?: string;
  referralSource?: string;
  referralDate?: Date;
  presentingConcerns?: string;
  // Student History
  educationalHistory?: string;
  previousPlacements?: string;
  diagnoses?: string;
  medicalInfo?: string;
  // Previous Interventions
  previousBIPs?: string;
  strategiesTried?: string;
  whatWorked?: string;
  whatDidntWork?: string;
  // Family/Home Context
  homeEnvironment?: string;
  familyStructure?: string;
  culturalConsiderations?: string;
  // Behaviors of Concern (for report)
  behaviorsOfConcernSummary?: string;
  // Last updated
  updatedAt?: Date;
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
  // Background information for reports
  backgroundInfo?: StudentBackgroundInfo;
  // Narrative notes (not session-tied)
  narrativeNotes?: NarrativeNote[];
  // Documents
  documents?: StudentDocument[];
  // Indirect assessments (FAST, MAS, QABF)
  indirectAssessments?: IndirectAssessmentResult[];
  // FBA findings (saved analysis)
  fbaFindings?: FBAFindings;
  // BIP data
  bipData?: BIPData;
  // FBA Workflow progress (per student)
  fbaWorkflowProgress?: FBAWorkflowProgress;
  // Historical data (synced to cloud)
  historicalData?: StudentHistoricalData;
  // Skill acquisition targets
  skillTargets?: SkillTarget[];
  // DTT Sessions
  dttSessions?: DTTSession[];
  // Custom prompt levels (additions to default hierarchy)
  customPromptLevels?: string[];
  // Note requirements
  notesRequired?: boolean;
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
  observationDurationMinutes?: number; // For historical entries - allows rate calculation
  isHistorical?: boolean; // Flag to identify manually-entered historical data
}

// Historical data stored per student for cloud sync
export interface HistoricalFrequencyEntry {
  id: string;
  behaviorId: string;
  count: number;
  timestamp: Date;
  observationDurationMinutes?: number;
}

export interface HistoricalDurationEntry {
  id: string;
  behaviorId: string;
  durationSeconds: number;
  timestamp: Date;
}

export interface StudentHistoricalData {
  frequencyEntries: HistoricalFrequencyEntry[];
  durationEntries: HistoricalDurationEntry[];
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
  'fba': 'FBA (Functional Behavior Assessment)',
  'bip': 'BIP (Behavior Intervention Plan)',
  'iep': 'IEP (Individualized Education Program)',
  'psycho-ed': 'Psycho-educational / Eligibility Report',
  'progress-report': 'Progress Report',
  'medical': 'Medical Report',
  'intake': 'Intake / Referral Form',
  'teacher-interview': 'Teacher Interview',
  'parent-interview': 'Parent / Caregiver Interview',
  'observation-notes': 'Observation Notes',
  'other': 'Other (specify)',
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
