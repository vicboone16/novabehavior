// IEP Accommodations & Modifications Library Types

export type IEPItemType = 'accommodation' | 'modification';

export type IEPStudentStatus = 'existing' | 'considering' | 'not_using';

export type IEPSource = 'from_iep_document' | 'clinician_added' | 'teacher_reported' | 'recommended_by_system';

export type IEPComplianceLevel = 'safe' | 'caution' | 'modification';

export type RecommendationAction = 'accepted' | 'dismissed' | 'saved_for_later';

// Domain tags for IEP supports
export const IEP_DOMAINS = [
  'behavior',
  'attention_executive_function',
  'communication',
  'auditory_access',
  'visual_access',
  'sensory_regulation',
  'academics_reading',
  'academics_writing',
  'academics_math',
  'social_emotional',
  'motor_physical',
  'adaptive_functioning',
  'health_medical',
  'testing_assessment',
  'transitions',
  'environmental_access',
  'safety'
] as const;

export type IEPDomain = typeof IEP_DOMAINS[number];

// Disability/Classification tags
export const IEP_DISABILITY_TAGS = [
  'autism',
  'adhd',
  'emotional_disturbance',
  'specific_learning_disability',
  'intellectual_disability',
  'speech_language_impairment',
  'deaf_hard_of_hearing',
  'other_health_impairment',
  'anxiety',
  'nvld',
  '504_only'
] as const;

export type IEPDisabilityTag = typeof IEP_DISABILITY_TAGS[number];

// Grade bands
export const IEP_GRADE_BANDS = [
  'preschool',
  'elementary',
  'middle_school',
  'high_school',
  'transition'
] as const;

export type IEPGradeBand = typeof IEP_GRADE_BANDS[number];

// Setting tags
export const IEP_SETTING_TAGS = [
  'general_ed',
  'special_ed',
  'small_group',
  'one_to_one',
  'testing',
  'lunch_recess',
  'pe',
  'hallways_transitions',
  'transportation',
  'home_support'
] as const;

export type IEPSettingTag = typeof IEP_SETTING_TAGS[number];

// Export language structure
export interface IEPExportLanguage {
  iep: string;
  parent: string;
}

// Global Library Item
export interface IEPLibraryItem {
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
  evidence_notes: string | null;
  source_reference: string[] | null;
  status: 'active' | 'archived';
  usage_count: number;
  acceptance_rate: number;
  agency_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Student IEP Support (linked to student)
export interface StudentIEPSupport {
  id: string;
  student_id: string;
  library_item_id: string | null;
  custom_title: string | null;
  custom_description: string | null;
  item_type: IEPItemType;
  student_status: IEPStudentStatus;
  source: IEPSource;
  notes: string | null;
  start_date: string | null;
  review_date: string | null;
  is_primary_support: boolean;
  domains_override: string[] | null;
  setting_tags_override: string[] | null;
  linked_goal_ids: string[];
  last_reviewed_by: string | null;
  last_reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  library_item?: IEPLibraryItem;
}

// Recommendation Log
export interface IEPRecommendationLog {
  id: string;
  student_id: string;
  library_item_id: string;
  recommended_reason: string | null;
  confidence: number;
  user_action: RecommendationAction | null;
  actioned_by: string | null;
  actioned_at: string | null;
  student_profile_snapshot: Record<string, any> | null;
  created_at: string;
  // Joined
  library_item?: IEPLibraryItem;
}

// Audit Log Entry
export interface StudentIEPSupportAudit {
  id: string;
  support_id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  changed_by: string | null;
  change_details: Record<string, any> | null;
  created_at: string;
}

// UI Helper Types
export interface IEPLibraryFilters {
  search: string;
  item_type: IEPItemType | 'all';
  domains: string[];
  disability_tags: string[];
  grade_band: string[];
  setting_tags: string[];
  topics: string[];
  sort_by: 'title' | 'most_used' | 'most_accepted' | 'recently_added';
}

export interface RecommendedSupport {
  library_item: IEPLibraryItem;
  reason: string;
  confidence: number;
  matching_factors: {
    grade_band_match: boolean;
    disability_match: boolean;
    domain_match: boolean;
    similar_student_acceptance: number;
  };
}

// Student metadata for recommendations
export interface StudentIEPProfile {
  grade_band: IEPGradeBand;
  disability_tags: string[];
  presenting_concerns: string[];
  active_domains: string[];
  safety_flags: string[];
}

// Export options
export interface IEPExportOptions {
  use_idea_language: boolean;
  exclude_clinical_notes: boolean;
  group_by_domain: boolean;
  separate_accommodations_modifications: boolean;
  plaafp_ready_phrasing: boolean;
  language_style: 'clinical' | 'district' | 'parent';
}

// Domain display info
export const DOMAIN_DISPLAY_NAMES: Record<string, string> = {
  behavior: 'Behavior',
  attention_executive_function: 'Attention & Executive Function',
  communication: 'Communication',
  auditory_access: 'Auditory Access',
  visual_access: 'Visual Access',
  sensory_regulation: 'Sensory Regulation',
  academics_reading: 'Academics - Reading',
  academics_writing: 'Academics - Writing',
  academics_math: 'Academics - Math',
  social_emotional: 'Social-Emotional',
  motor_physical: 'Motor & Physical',
  adaptive_functioning: 'Adaptive Functioning',
  health_medical: 'Health & Medical',
  testing_assessment: 'Testing & Assessment',
  transitions: 'Transitions',
  environmental_access: 'Environmental Access',
  safety: 'Safety'
};

// Disability tag display names
export const DISABILITY_DISPLAY_NAMES: Record<string, string> = {
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
  '504_only': '504 Only'
};

// Grade band display names
export const GRADE_BAND_DISPLAY_NAMES: Record<string, string> = {
  preschool: 'Preschool',
  elementary: 'Elementary',
  middle_school: 'Middle School',
  high_school: 'High School',
  transition: 'Transition (18-22)'
};

// Setting display names
export const SETTING_DISPLAY_NAMES: Record<string, string> = {
  general_ed: 'General Education',
  special_ed: 'Special Education',
  small_group: 'Small Group',
  one_to_one: '1:1 Instruction',
  testing: 'Testing',
  lunch_recess: 'Lunch/Recess',
  pe: 'PE/Specials',
  hallways_transitions: 'Hallways/Transitions',
  transportation: 'Transportation',
  home_support: 'Home Support'
};
