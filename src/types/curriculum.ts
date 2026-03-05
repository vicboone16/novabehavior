// Curriculum and Skill Acquisition Types

export interface Domain {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  display_order: number;
  agency_id?: string | null;
  source_tier: 'global' | 'agency' | 'custom';
  status: 'active' | 'archived';
  created_by?: string | null;
  modified_by?: string | null;
  modified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurriculumSystem {
  id: string;
  name: string;
  type: 'assessment' | 'curriculum' | 'adaptive' | 'social';
  description: string | null;
  publisher: string | null;
  version: string | null;
  age_range_min_months: number | null;
  age_range_max_months: number | null;
  tags: string[];
  active: boolean;
  agency_id?: string | null;
  source_tier: 'global' | 'agency' | 'custom';
  status: 'active' | 'archived';
  forked_from_id?: string | null;
  created_by?: string | null;
  modified_by?: string | null;
  modified_at?: string | null;
  item_count?: number;
  import_format?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurriculumItem {
  id: string;
  curriculum_system_id: string;
  domain_id: string | null;
  level: string | null;
  code: string | null;
  title: string;
  description: string | null;
  mastery_criteria: string | null;
  teaching_notes: string | null;
  prerequisites: string[];
  age_band_min: number | null;
  age_band_max: number | null;
  keywords: string[];
  source_reference: string | null;
  display_order: number;
  active: boolean;
  agency_id?: string | null;
  source_tier: 'global' | 'agency' | 'custom';
  status: 'active' | 'archived';
  forked_from_id?: string | null;
  modified_by?: string | null;
  modified_at?: string | null;
  edit_history?: unknown;
  created_at: string;
  updated_at: string;
  // Joined fields
  domain?: Domain;
  curriculum_system?: CurriculumSystem;
}

export interface OrgGoalTemplate {
  id: string;
  domain_id: string | null;
  title: string;
  description: string | null;
  mastery_criteria: string | null;
  prompting_notes: string | null;
  data_collection_type: string;
  generalization_notes: string | null;
  tags: string[];
  active: boolean;
  agency_id?: string | null;
  source_tier: 'global' | 'agency' | 'custom';
  status: 'active' | 'archived';
  forked_from_id?: string | null;
  created_by: string | null;
  modified_by?: string | null;
  modified_at?: string | null;
  edit_history?: unknown;
  created_at: string;
  updated_at: string;
  // Joined
  domain?: Domain;
}

export interface StudentTarget {
  id: string;
  student_id: string;
  domain_id: string | null;
  title: string;
  description: string | null;
  mastery_criteria: string | null;
  data_collection_type: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'mastered' | 'discontinued';
  source_type: 'curriculum' | 'org_template' | 'custom';
  source_id: string | null;
  customized: boolean;
  linked_prerequisite_ids: string[];
  baseline_data: Record<string, any>;
  current_performance: Record<string, any>;
  date_added: string;
  date_mastered: string | null;
  added_by: string | null;
  notes_for_staff: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  domain?: Domain;
  source_item?: CurriculumItem;
  source_template?: OrgGoalTemplate;
}

export interface StudentCurriculumPlan {
  id: string;
  student_id: string;
  curriculum_system_id: string;
  date_started: string;
  active: boolean;
  current_level: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  curriculum_system?: CurriculumSystem;
}

export interface StudentAssessment {
  id: string;
  student_id: string;
  curriculum_system_id: string;
  date_administered: string;
  administered_by: string | null;
  status: 'draft' | 'final';
  raw_attachment_path: string | null;
  results_json: Record<string, MilestoneScore>;
  domain_scores: Record<string, number>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  curriculum_system?: CurriculumSystem;
}

export interface MilestoneScore {
  score: number; // 0, 0.5, 1
  notes?: string;
  date_scored?: string;
}

// UI State types
export interface TargetImportState {
  selectedItems: string[];
  customizations: Record<string, Partial<StudentTarget>>;
  includePrerequisites: boolean;
}

export interface RecommendedTarget {
  curriculum_item: CurriculumItem;
  reason: string;
  priority_score: number;
  domain_gap_count: number;
  related_mastered: string[];
}

export type SkillsSubTab = 'targets' | 'curriculum' | 'recommendations';
