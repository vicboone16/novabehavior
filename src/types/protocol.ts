export type ProtocolStatus = 'active' | 'archived' | 'draft';
export type ProtocolAssignmentStatus = 'active' | 'paused' | 'mastered' | 'discontinued';

export interface ProtocolStep {
  id: string;
  order: number;
  instruction: string;
  materials?: string;
  promptLevel?: string;
  criteria?: string;
  notes?: string;
}

export interface PromptLevel {
  level: number;
  name: string;
  description: string;
  abbreviation: string;
}

export interface ProtocolMasteryCriteria {
  percentCorrect?: number;
  consecutiveSessions?: number;
  minimumTrials?: number;
  acrossStaff?: number;
  acrossSettings?: number;
}

export interface ProtocolTemplate {
  id: string;
  curriculum_item_id?: string | null;
  agency_id?: string | null;
  title: string;
  description?: string | null;
  curriculum_system?: string | null;
  domain?: string | null;
  level?: string | null;
  steps: ProtocolStep[];
  materials_needed: string[];
  prompt_hierarchy: PromptLevel[];
  error_correction_procedure?: string | null;
  mastery_criteria: ProtocolMasteryCriteria;
  generalization_guidelines?: string | null;
  data_collection_method: string;
  estimated_duration_minutes?: number | null;
  tags: string[];
  is_template: boolean;
  created_by?: string | null;
  status: ProtocolStatus;
  created_at: string;
  updated_at: string;
}

export interface ProtocolAssignment {
  id: string;
  student_id: string;
  protocol_template_id: string;
  assigned_by?: string | null;
  assigned_staff: string[];
  status: ProtocolAssignmentStatus;
  customizations: Record<string, unknown>;
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  protocol_template?: ProtocolTemplate;
}

export const CURRICULUM_SYSTEMS = [
  { id: 'ABLLS-R', name: 'ABLLS-R', type: 'assessment' as const, description: 'Assessment of Basic Language and Learning Skills - Revised', publisher: 'Partington Behavior Analysts' },
  { id: 'PEAK', name: 'PEAK', type: 'curriculum' as const, description: 'Promoting the Emergence of Advanced Knowledge', publisher: 'Mark R. Dixon' },
  { id: 'AFLS', name: 'AFLS', type: 'assessment' as const, description: 'Assessment of Functional Living Skills', publisher: 'Partington Behavior Analysts' },
  { id: 'EFL', name: 'EFL', type: 'curriculum' as const, description: 'Essential for Living', publisher: 'Patrick McGreevy' },
  { id: 'TOPS-2', name: 'TOPS-2', type: 'assessment' as const, description: 'Test of Problem Solving - 2nd Edition', publisher: 'LinguiSystems' },
  { id: 'TOPL-3', name: 'TOPL-3', type: 'assessment' as const, description: 'Test of Pragmatic Language - 3rd Edition', publisher: 'PRO-ED' },
] as const;

export const DEFAULT_PROMPT_HIERARCHY: PromptLevel[] = [
  { level: 0, name: 'Full Physical', description: 'Hand-over-hand physical guidance', abbreviation: 'FP' },
  { level: 1, name: 'Partial Physical', description: 'Light touch or nudge', abbreviation: 'PP' },
  { level: 2, name: 'Model', description: 'Demonstrate the response', abbreviation: 'M' },
  { level: 3, name: 'Gestural', description: 'Point or gesture toward correct response', abbreviation: 'G' },
  { level: 4, name: 'Verbal', description: 'Verbal hint or instruction', abbreviation: 'V' },
  { level: 5, name: 'Independent', description: 'No prompt needed', abbreviation: 'I' },
];
