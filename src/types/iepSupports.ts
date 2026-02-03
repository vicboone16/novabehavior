// IEP/504 Supports Library Types - Based on exact JSON schema provided

// ==================== IEP Support Item Types ====================

export type IEPItemType = 'Accommodation' | 'Modification';

export type IEPComplianceLevel = 'Safe' | 'Caution' | 'Modification';

export type IEPStatus = 'active' | 'inactive' | 'deprecated';

export type IEPSourceOrigin = 'internal' | 'uploaded' | 'district_library' | 'user_custom';

export interface IEPExportLanguage {
  iep: string;
  parent: string;
}

export interface IEPSource {
  origin: IEPSourceOrigin;
  source_doc: string | null;
  source_page: number | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface IEPSupportItem {
  id: string;
  item_type: IEPItemType;
  title: string;
  description: string;
  implementation_notes: string[];
  domains: string[];
  disability_tags: string[];
  grade_band: string[];
  setting_tags: string[];
  topics: string[];
  contraindications: string[];
  idea_compliance_level: IEPComplianceLevel;
  export_language: IEPExportLanguage;
  status: IEPStatus;
  source_origin?: IEPSourceOrigin;
  source_doc?: string | null;
  source_page?: number | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  usage_count?: number;
  acceptance_rate?: number;
}

// ==================== Student IEP Support Link Types ====================

export type LinkStatus = 'existing' | 'considering' | 'recommended' | 'rejected' | 'archived';

export type LinkOwner = 'bcba' | 'teacher' | 'admin';

export type RecommendationConfidence = 'low' | 'medium' | 'high';

export interface LinkEvidence {
  data_points: string[];
  assessments: string[];
  observations: string[];
}

export interface ImplementationPlan {
  start_date: string | null;
  frequency: string | null;
  who_implements: string[];
  how_measured: string | null;
}

export interface StudentIEPSupportLink {
  link_id: string;
  student_id: string;
  item_id: string;
  link_status: LinkStatus;
  owner: LinkOwner;
  notes: string | null;
  evidence: LinkEvidence;
  date_added: string;
  date_updated: string;
  review_due: string | null;
  approved_by: string | null;
  implementation_plan: ImplementationPlan;
  confirmation_required?: boolean;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  recommendation_score?: number | null;
  recommendation_confidence?: RecommendationConfidence | null;
  rationale_bullets?: string[];
  risk_flags?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // Joined fields
  item?: IEPSupportItem;
}

// ==================== Search Query Types ====================

export interface IEPSearchFilters {
  item_type: IEPItemType[];
  domains: string[];
  topics: string[];
  disability_tags: string[];
  grade_band: string[];
  setting_tags: string[];
  idea_compliance_level: IEPComplianceLevel[];
  status: IEPStatus[];
  source_origin: IEPSourceOrigin[];
  exclude_item_ids: string[];
}

export interface IEPSearchSort {
  by: 'relevance' | 'title' | 'recent' | 'recommendation_score';
  direction: 'asc' | 'desc';
}

export interface IEPSearchPagination {
  page: number;
  page_size: number;
}

export interface IEPSearchContext {
  student_id?: string;
  school_based: boolean;
  include_student_links: boolean;
}

export interface IEPSearchQuery {
  query_text: string;
  filters: Partial<IEPSearchFilters>;
  sort: IEPSearchSort;
  pagination: IEPSearchPagination;
  context: IEPSearchContext;
}

export interface IEPSearchFacet {
  value: string;
  count: number;
  label: string;
}

export interface IEPSearchFacets {
  item_type: IEPSearchFacet[];
  domains: IEPSearchFacet[];
  topics: IEPSearchFacet[];
  disability_tags: IEPSearchFacet[];
  grade_band: IEPSearchFacet[];
  setting_tags: IEPSearchFacet[];
  idea_compliance_level: IEPSearchFacet[];
  source_origin: IEPSearchFacet[];
}

export interface IEPSearchResult {
  items: IEPSupportItem[];
  facets: IEPSearchFacets;
  total: number;
  page: number;
  page_size: number;
}

// ==================== Recommendation Types ====================

export interface StudentGoal {
  goal_id: string;
  domain: string;
  skill_area: string;
  goal_text: string;
  baseline_summary: string;
}

export interface DataSignals {
  academic: string[];
  behavior: string[];
  attendance: string[];
  sensory: string[];
  communication: string[];
  executive_function: string[];
}

export interface RecommendationConstraints {
  school_based_mode: boolean;
  allowed_item_types: IEPItemType[];
  max_recommendations: number;
  exclude_item_ids: string[];
}

export interface StudentRecommendationProfile {
  student_id: string;
  grade_band: string;
  age: number;
  eligibility: string[];
  primary_needs: string[];
  settings: string[];
  current_accommodations_item_ids: string[];
  current_modifications_item_ids: string[];
}

export interface IEPRecommendationRequest {
  student: StudentRecommendationProfile;
  goals: StudentGoal[];
  data_signals: DataSignals;
  constraints: RecommendationConstraints;
}

export type RiskFlag = 'contraindication_present' | 'caution_item' | 'modification_requires_team';

export interface IEPRecommendationItem {
  item_id: string;
  rank: number;
  recommendation_score: number;
  confidence: RecommendationConfidence;
  recommended_link_status: 'recommended';
  rationale_bullets: string[];
  risk_flags: RiskFlag[];
  suggested_export_language: IEPExportLanguage;
  // Joined item
  item?: IEPSupportItem;
}

export interface IEPRecommendationResult {
  student_id: string;
  generated_at: string;
  recommendations: IEPRecommendationItem[];
}

// ==================== Filter Panel Config ====================

export interface FilterControl {
  type: 'multi_select' | 'single_select' | 'checkbox';
  field: string;
  label: string;
  options?: string[];
}

export interface FilterGroup {
  group_id: string;
  title: string;
  controls: FilterControl[];
}

export const IEP_FILTER_PANEL_CONFIG = {
  panel_title: 'IEP / 504 Supports Library',
  search_placeholder: 'Search accommodations, modifications, topics, or disabilities…',
  filter_groups: [
    {
      group_id: 'core',
      title: 'Core Filters',
      controls: [
        { type: 'multi_select', field: 'item_type', label: 'Type', options: ['Accommodation', 'Modification'] },
        { type: 'multi_select', field: 'domains', label: 'Domain' },
        { type: 'multi_select', field: 'topics', label: 'Topic' }
      ]
    },
    {
      group_id: 'student_fit',
      title: 'Student Fit',
      controls: [
        { type: 'multi_select', field: 'disability_tags', label: 'Disability / Eligibility' },
        { type: 'multi_select', field: 'grade_band', label: 'Grade Band', options: ['preschool', 'elementary', 'middle_school', 'high_school', 'all'] },
        { type: 'multi_select', field: 'setting_tags', label: 'Setting', options: ['general_ed', 'small_group', 'resource_room', 'special_ed', 'testing', 'transitions', 'lunch_recess', 'pe', 'counseling', 'remote_learning', 'administration'] }
      ]
    },
    {
      group_id: 'safety',
      title: 'Safety & Compliance',
      controls: [
        { type: 'multi_select', field: 'idea_compliance_level', label: 'Compliance Level', options: ['Safe', 'Caution', 'Modification'] },
        { type: 'multi_select', field: 'source_origin', label: 'Source', options: ['internal', 'uploaded', 'district_library', 'user_custom'] }
      ]
    }
  ]
} as const;

// ==================== Display Names ====================

export const ITEM_TYPE_DISPLAY: Record<string, string> = {
  Accommodation: 'Accommodation',
  Modification: 'Modification'
};

export const COMPLIANCE_DISPLAY: Record<string, { label: string; color: string; bgColor: string }> = {
  Safe: { label: 'Safe', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  Caution: { label: 'Caution', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  Modification: { label: 'Modification', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  safe: { label: 'Safe', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  caution: { label: 'Caution', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  modification: { label: 'Modification', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' }
};

export const DOMAIN_DISPLAY: Record<string, string> = {
  behavior: 'Behavior',
  attention_executive_function: 'Attention & Executive Function',
  communication: 'Communication',
  auditory_access: 'Auditory Access',
  visual_access: 'Visual Access',
  sensory_regulation: 'Sensory Regulation',
  academics_reading: 'Academics - Reading',
  academics_writing: 'Academics - Writing',
  academics_math: 'Academics - Math',
  academics: 'Academics',
  social_emotional: 'Social-Emotional',
  emotional_regulation: 'Emotional Regulation',
  motor_physical: 'Motor & Physical',
  adaptive_functioning: 'Adaptive Functioning',
  health_medical: 'Health & Medical',
  testing_assessment: 'Testing & Assessment',
  transitions: 'Transitions',
  environmental_access: 'Environmental Access',
  safety: 'Safety',
  attendance: 'Attendance',
  mental_health: 'Mental Health',
  memory: 'Memory',
  assistive_technology: 'Assistive Technology',
  implementation: 'Implementation',
  compliance: 'Compliance',
  transition_planning: 'Transition Planning'
};

export const GRADE_BAND_DISPLAY: Record<string, string> = {
  preschool: 'Preschool',
  elementary: 'Elementary',
  middle_school: 'Middle School',
  high_school: 'High School',
  transition: 'Transition (18-22)',
  all: 'All Grades'
};

export const DISABILITY_DISPLAY: Record<string, string> = {
  autism: 'Autism',
  adhd: 'ADHD',
  emotional_disturbance: 'Emotional Disturbance',
  specific_learning_disability: 'Specific Learning Disability',
  intellectual_disability: 'Intellectual Disability',
  speech_language_impairment: 'Speech/Language Impairment',
  deaf_hard_of_hearing: 'Deaf/Hard of Hearing',
  other_health_impairment: 'Other Health Impairment',
  anxiety: 'Anxiety',
  nvld: 'NVLD',
  '504_only': '504 Only',
  all: 'All Classifications'
};

export const SETTING_DISPLAY: Record<string, string> = {
  general_ed: 'General Education',
  special_ed: 'Special Education',
  small_group: 'Small Group',
  resource_room: 'Resource Room',
  one_to_one: '1:1 Instruction',
  testing: 'Testing',
  lunch_recess: 'Lunch/Recess',
  pe: 'PE/Specials',
  hallways_transitions: 'Hallways/Transitions',
  transitions: 'Transitions',
  transportation: 'Transportation',
  home_support: 'Home Support',
  counseling: 'Counseling',
  remote_learning: 'Remote Learning',
  administration: 'Administration'
};

export const SOURCE_ORIGIN_DISPLAY: Record<string, string> = {
  internal: 'Internal',
  uploaded: 'Uploaded',
  district_library: 'District Library',
  user_custom: 'User Custom'
};
