export type ModuleStatus = 'active' | 'archived';
export type VersionStatus = 'draft' | 'published';
export type LibraryItemType = 'script' | 'visual' | 'replacement_idea' | 'checklist' | 'tip_sheet' | 'other';
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue';

export interface ParentTrainingModule {
  module_id: string;
  scope: string;
  agency_id: string | null;
  status: string;
  canonical_key: string | null;
  title: string;
  short_description: string | null;
  est_minutes: number;
  skill_tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParentTrainingModuleVersion {
  module_version_id: string;
  module_id: string;
  version_num: number;
  status: VersionStatus;
  content: Record<string, unknown>;
  change_notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ParentTrainingLibraryItem {
  item_id: string;
  scope: string;
  agency_id: string | null;
  status: string;
  item_type: string;
  title: string;
  summary: string | null;
  tags: string[];
  body: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParentTrainingAssignment {
  assignment_id: string;
  agency_id: string | null;
  module_id: string;
  module_version_id: string;
  parent_user_id: string;
  client_id: string;
  status: AssignmentStatus;
  due_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  module_title?: string;
  parent_name?: string;
  client_name?: string;
}

export interface ParentTrainingProgress {
  progress_id: string;
  assignment_id: string;
  parent_user_id: string;
  client_id: string;
  started_at: string | null;
  completed_at: string | null;
  time_spent_seconds: number;
  quiz_score_percent: number | null;
  responses: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const LIBRARY_ITEM_TYPES: { value: string; label: string }[] = [
  { value: 'script', label: 'Script' },
  { value: 'visual', label: 'Visual Support' },
  { value: 'replacement_idea', label: 'Replacement Idea' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'tip_sheet', label: 'Tip Sheet' },
  { value: 'other', label: 'Other' },
];
