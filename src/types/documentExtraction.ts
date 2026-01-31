// Clinical Document Extraction Types
// Implements clinical-grade document intelligence with confidence scoring and traceability

// ============ Core Enums ============

export type DocumentType = 
  | 'IEP' 
  | 'FBA' 
  | 'BIP' 
  | 'ASSESSMENT_REPORT' 
  | 'SERVICE_LOG' 
  | 'OTHER' 
  | 'UNKNOWN';

export type IngestionProfile = 
  | 'native_text_pdf' 
  | 'scanned_pdf' 
  | 'mixed_pdf' 
  | 'image' 
  | 'docx' 
  | 'txt' 
  | 'unknown';

export type ExtractionMethod = 'native_text' | 'ocr' | 'hybrid';

export type BehaviorFunction = 'attention' | 'escape' | 'access' | 'automatic' | 'other';

export type ActionType = 
  | 'CREATE_CLIENT' 
  | 'UPDATE_CLIENT' 
  | 'CREATE_PROGRAM_ITEM' 
  | 'UPDATE_PROGRAM_ITEM' 
  | 'ATTACH_DOCUMENT' 
  | 'NO_OP';

export type ProgramArea = 'SKILLS' | 'BEHAVIOR' | 'UNKNOWN';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'modified';

// ============ Source Traceability ============

export interface SourceReference {
  page: number;
  snippet: string;
  block_id?: string;
  bbox?: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface FieldConfidenceEntry {
  field_path: string; // JSONPath-like, e.g., "$.entities.client.dob"
  score: number; // 0-1
  source: SourceReference;
  evidence_type?: 'labeled' | 'inferred' | 'weak';
  parse_status?: 'valid' | 'partial' | 'heuristic';
}

// ============ Document Metadata ============

export interface DocumentMetadata {
  document_id: string;
  filename: string;
  mime_type: string;
  detected_doc_type: DocumentType;
  pages: number;
  ingestion_profile: IngestionProfile;
  language_detected: string;
  file_size_bytes?: number;
  uploaded_at: string;
}

// ============ Layout Extraction ============

export interface LayoutBlock {
  page: number;
  block_id: string;
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'footer' | 'header' | 'unknown';
  text: string;
  bbox?: [number, number, number, number];
}

export interface ExtractedTable {
  page: number;
  table_id: string;
  rows: string[][];
  headers?: string[];
  confidence: number;
}

export interface PageExtractionStats {
  page: number;
  method: ExtractionMethod;
  avg_ocr_confidence: number;
  char_count: number;
  has_tables: boolean;
  has_images: boolean;
}

export interface ExtractionData {
  raw_text: string;
  layout: LayoutBlock[];
  tables: ExtractedTable[];
  page_map: PageExtractionStats[];
}

// ============ Client Identity ============

export interface ClientIdentity {
  client_id?: string; // If matched to existing
  full_name: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  grade?: string;
  school?: string;
  site?: string;
  match_confidence?: number;
  match_method?: 'exact' | 'fuzzy' | 'partial';
}

// ============ FBA Payload ============

export interface ExtractedBehavior {
  behavior_name: string;
  operational_definition: string;
  hypothesized_function?: BehaviorFunction[];
  antecedents?: string[];
  consequences?: string[];
  replacement_behaviors?: string[];
  source: SourceReference;
  confidence: number;
}

export interface FBAPayload {
  reason_for_referral: string;
  background?: string;
  setting_events?: string[];
  target_behaviors: ExtractedBehavior[];
  assessment_methods?: string[];
  summary?: string;
  recommendations?: string[];
}

// ============ BIP Payload ============

export interface BIPPayload {
  target_behaviors: string[];
  prevention_strategies: string[];
  teaching_strategies: string[];
  response_strategies: string[];
  reinforcement_plan?: string;
  crisis_plan?: string;
  data_plan?: string;
  team_responsibilities?: string;
}

// ============ IEP Payload ============

export interface ExtractedGoal {
  goal_id?: string; // Generated fingerprint
  text: string;
  domain?: string;
  program_area: ProgramArea;
  measurement_type?: 'percent' | 'frequency' | 'duration' | 'trials' | 'other';
  baseline?: string;
  mastery_criteria?: string;
  objectives?: ExtractedObjective[];
  source: SourceReference;
  confidence: number;
}

export interface ExtractedObjective {
  text: string;
  sequence?: number;
  source: SourceReference;
}

export interface ExtractedService {
  service: string;
  provider_role?: string;
  setting?: string;
  frequency?: string;
  minutes_per_session?: number;
  total_minutes?: number;
  group_size?: string;
  source: SourceReference;
  confidence: number;
}

export interface ExtractedAccommodation {
  text: string;
  category?: string;
  source: SourceReference;
  normalized_text?: string;
  confidence: number;
}

export interface IEPPayload {
  effective_date?: string;
  review_date?: string;
  goals: ExtractedGoal[];
  accommodations: ExtractedAccommodation[];
  behavior_supports?: string[];
  services: ExtractedService[];
  eligibility?: string[];
}

// ============ Assessment Report Payload ============

export interface AssessmentReportPayload {
  assessment_type?: string;
  assessment_date?: string;
  scores?: Array<{
    code: string;
    score: number | string;
    domain?: string;
    source: SourceReference;
    confidence: number;
  }>;
  summary?: string;
  recommendations?: string[];
}

// ============ Unified Doc Payload ============

export type DocPayload = 
  | { type: 'FBA'; data: FBAPayload }
  | { type: 'BIP'; data: BIPPayload }
  | { type: 'IEP'; data: IEPPayload }
  | { type: 'ASSESSMENT_REPORT'; data: AssessmentReportPayload }
  | { type: 'OTHER'; data: Record<string, unknown> };

// ============ Confidence Aggregation ============

export interface ConfidenceData {
  overall: number;
  field_confidence: FieldConfidenceEntry[];
  warnings: string[];
  requires_review_reasons: string[];
  page_confidence: Array<{ page: number; score: number }>;
}

// ============ Proposed Actions ============

export interface ProposedAction {
  action_id: string;
  action_type: ActionType;
  target: string; // e.g., client_id or behavior_program_id
  target_type: 'client' | 'skill_target' | 'behavior_program' | 'document' | 'service';
  summary: string;
  requires_review: boolean;
  confidence_gate: number;
  field_changes?: Array<{
    field: string;
    old_value?: string | number | null;
    new_value: string | number | null;
    source: SourceReference;
  }>;
  conflicts?: Array<{
    field: string;
    existing_value: string | number;
    extracted_value: string | number;
    resolution?: 'keep_existing' | 'use_extracted' | 'merge';
  }>;
}

// ============ Complete Extraction Result ============

export interface DocumentExtractionResult {
  document: DocumentMetadata;
  extraction: ExtractionData;
  entities: {
    client: ClientIdentity;
    doc_payload: DocPayload;
  };
  confidence: ConfidenceData;
  proposed_actions: ProposedAction[];
  background_info?: BackgroundInfo;
}

export interface BackgroundInfo {
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

// ============ Review Workflow ============

export interface ReviewDecision {
  action_id: string;
  status: ReviewStatus;
  modified_value?: unknown;
  reviewer_notes?: string;
  reviewed_at: string;
  reviewed_by: string;
}

export interface AppliedChange {
  action_id: string;
  action_type: ActionType;
  target_id: string;
  applied_at: string;
  applied_by: string;
  audit_trail: {
    extraction_id: string;
    original_source: SourceReference;
    confidence_at_application: number;
  };
}

// ============ Goal Fingerprinting ============

export interface GoalFingerprint {
  goal_id: string; // SHA-256 hash
  normalized_target_behavior: string;
  domain: string;
  program_area: ProgramArea;
  measurement_type?: string;
  mastery_criteria_normalized?: string;
}

// ============ Duplicate Detection ============

export interface DuplicateMatch {
  existing_id: string;
  match_type: 'exact' | 'near' | 'potential';
  similarity_score: number;
  differences: Array<{
    field: string;
    existing: string;
    extracted: string;
  }>;
}

// ============ Extraction Request/Response ============

export interface ClinicalExtractionRequest {
  file_path?: string;
  file_url?: string;
  document_text?: string;
  document_type_hint?: DocumentType;
  student_id?: string; // For client matching
  options?: {
    force_ocr?: boolean;
    extract_tables?: boolean;
    enable_dedup?: boolean;
    confidence_threshold?: number;
  };
}

export interface ClinicalExtractionResponse {
  success: boolean;
  result?: DocumentExtractionResult;
  error?: string;
  processing_time_ms?: number;
}

// ============ Confidence Calculation Helpers ============

export const CONFIDENCE_THRESHOLDS = {
  AUTO_APPLY: 0.90,
  SAFE_APPLY_FIELD: 0.85,
  REQUIRES_REVIEW: 0.85,
  IDENTITY_MATCH: 0.92,
  GOAL_DUPLICATE: 0.88,
  CLIENT_MATCH_HIGH: 0.92,
  CLIENT_MATCH_SUGGEST: 0.80,
};

export const CONFIDENCE_PENALTIES = {
  SCANNED_PAGE: 0.15,
  MIXED_PAGE: 0.08,
  OCR_LOW_85: 0.10,
  OCR_LOW_75: 0.20,
  OCR_LOW_65: 0.35,
  MULTI_COLUMN_UNCERTAIN: 0.12,
  TABLE_PARSE_LOW: 0.18,
  ROTATION_SKEW: 0.12,
};

// ============ Program Area Routing ============

export const SKILL_DOMAINS = [
  'Communication',
  'Social',
  'Academic', 
  'Adaptive',
  'Motor',
  'Language',
  'Play',
  'Listener Responding',
  'Mand',
  'Tact',
  'Intraverbal',
  'Imitation',
  'Visual Perceptual',
  'Group',
  'Classroom Routines',
  'Math',
  'Reading',
  'Writing',
];

export const BEHAVIOR_DOMAINS = [
  'Behavior',
  'Self-regulation',
  'Reduction',
  'Compliance',
  'Safety',
];

export const BEHAVIOR_REDUCTION_KEYWORDS = [
  'decrease',
  'reduce',
  'eliminate',
  'tantrum',
  'aggression',
  'elopement',
  'self-injury',
  'self-injurious',
  'non-compliance',
  'noncompliance',
  'disruption',
  'property destruction',
  'hitting',
  'biting',
  'kicking',
  'screaming',
  'crying',
  'throwing',
];

export function determineGoalProgramArea(goal: ExtractedGoal): ProgramArea {
  const text = (goal.text + ' ' + (goal.domain || '')).toLowerCase();
  
  // Check for behavior reduction keywords
  if (BEHAVIOR_REDUCTION_KEYWORDS.some(kw => text.includes(kw))) {
    return 'BEHAVIOR';
  }
  
  // Check domain
  if (goal.domain) {
    if (BEHAVIOR_DOMAINS.some(d => goal.domain!.toLowerCase().includes(d.toLowerCase()))) {
      return 'BEHAVIOR';
    }
    if (SKILL_DOMAINS.some(d => goal.domain!.toLowerCase().includes(d.toLowerCase()))) {
      return 'SKILLS';
    }
  }
  
  return 'UNKNOWN';
}

// ============ Goal Fingerprint Generation ============

export function normalizeGoalText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/by\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/gi, '') // Remove date patterns
    .replace(/given\s+[^,]+,/gi, '') // Remove "Given X," conditions
    .replace(/when\s+[^,]+,/gi, '') // Remove "When X," conditions
    .trim();
}

export async function generateGoalFingerprint(goal: ExtractedGoal): Promise<string> {
  const payload = [
    normalizeGoalText(goal.text),
    goal.domain || '',
    goal.program_area,
    goal.measurement_type || '',
    goal.mastery_criteria ? normalizeGoalText(goal.mastery_criteria) : '',
  ].join('|');
  
  // Use Web Crypto API for SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
