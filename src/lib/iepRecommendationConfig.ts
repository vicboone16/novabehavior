// IEP Recommendation Engine Configuration
// Based on provided JSON schemas

export const GOAL_DOMAIN_CROSSWALK = [
  { match_any: ["task initiation", "won't start", "doesn't begin work", "getting started"], domain: "attention_executive_function", topics: ["task_initiation", "work_completion", "prompting"] },
  { match_any: ["work refusal", "noncompliance", "refuses", "says no", "avoidance"], domain: "behavior", topics: ["task_avoidance", "compliance", "demand_tolerance"] },
  { match_any: ["attention", "off task", "distracted", "focus", "sustained attention"], domain: "attention_executive_function", topics: ["sustained_attention", "on_task_behavior", "time_management"] },
  { match_any: ["organization", "loses materials", "missing assignments", "messy backpack"], domain: "attention_executive_function", topics: ["organization", "materials_management", "planning"] },
  { match_any: ["working memory", "forgetting directions", "can't remember", "retention"], domain: "attention_executive_function", topics: ["working_memory", "directions", "memory_support"] },
  { match_any: ["reading", "reading comprehension", "decoding", "fluency"], domain: "academics", topics: ["reading_support", "comprehension", "fluency"] },
  { match_any: ["math", "calculation", "problem solving", "math facts"], domain: "academics", topics: ["math_support", "problem_solving", "computation"] },
  { match_any: ["writing", "written expression", "spelling", "grammar"], domain: "academics", topics: ["writing_support", "written_expression", "spelling"] },
  { match_any: ["note taking", "copy from board", "copying", "handwriting fatigue"], domain: "academics", topics: ["note_taking", "copying_support", "output_support"] },
  { match_any: ["test anxiety", "testing", "quizzes", "exams"], domain: "testing_assessment", topics: ["test_anxiety", "extended_time", "quiet_setting"] },
  { match_any: ["speech", "articulation", "sounds", "pronunciation"], domain: "communication", topics: ["speech_production", "articulation", "expressive_language"] },
  { match_any: ["receptive language", "doesn't understand", "follow directions", "comprehension"], domain: "communication", topics: ["receptive_language", "directions", "comprehension_checks"] },
  { match_any: ["expressive language", "limited words", "doesn't talk", "short phrases"], domain: "communication", topics: ["expressive_language", "language_development", "modeling"] },
  { match_any: ["aac", "device", "pictures", "pecs", "communication system"], domain: "communication", topics: ["aac", "alternative_response_modes", "communication_partner_training"] },
  { match_any: ["social skills", "peer interaction", "friends", "play skills"], domain: "social_emotional", topics: ["peer_interaction", "social_skills", "play_skills"] },
  { match_any: ["pragmatics", "conversation skills", "turn taking in conversation", "topic maintenance"], domain: "communication", topics: ["pragmatics", "conversation", "perspective_taking"] },
  { match_any: ["emotional regulation", "big feelings", "meltdowns", "tantrums", "frustration tolerance"], domain: "emotional_regulation", topics: ["coping_skills", "calm_down_routine", "emotion_identification"] },
  { match_any: ["anxiety", "panic", "worry", "school refusal"], domain: "mental_health", topics: ["anxiety_support", "panic_support", "school_refusal"] },
  { match_any: ["depression", "withdrawn", "low mood", "hopeless"], domain: "mental_health", topics: ["mood_support", "counseling", "check_ins"] },
  { match_any: ["self injury", "self-harm", "head banging", "scratching", "biting self"], domain: "safety", topics: ["self_injury", "crisis_support", "safety_plan"] },
  { match_any: ["aggression", "hitting", "kicking", "biting others", "throwing objects"], domain: "behavior", topics: ["aggression", "deescalation", "replacement_behaviors"] },
  { match_any: ["elopement", "runs away", "bolting", "leaves area"], domain: "safety", topics: ["elopement", "supervision", "transition_support"] },
  { match_any: ["sensory", "overstimulated", "noise sensitivity", "light sensitivity"], domain: "sensory_regulation", topics: ["sensory_support", "noise_reduction", "environmental_adjustments"] },
  { match_any: ["transitions", "change in routine", "difficulty switching", "moving between tasks"], domain: "transitions", topics: ["transition_support", "advance_notice", "visual_schedule"] },
  { match_any: ["attendance", "tardy", "misses school", "absences"], domain: "attendance", topics: ["attendance_support", "reentry_support", "schedule_flexibility"] },
  { match_any: ["medical", "chronic illness", "fatigue", "pain", "nurse visits"], domain: "health_medical", topics: ["health_support", "fatigue_management", "medical_access"] },
  { match_any: ["mobility", "wheelchair", "physical access", "stairs", "movement needs"], domain: "environmental_access", topics: ["mobility_access", "accessible_pathways", "transition_time"] },
  { match_any: ["fine motor", "handwriting", "grip", "scissor skills"], domain: "motor_physical", topics: ["fine_motor", "handwriting_support", "adaptive_tools"] },
  { match_any: ["gross motor", "pe participation", "coordination", "balance"], domain: "motor_physical", topics: ["pe_access", "adapted_equipment", "motor_planning"] },
  { match_any: ["assistive tech", "text to speech", "speech to text", "reader tools"], domain: "assistive_technology", topics: ["assistive_tech", "text_to_speech", "speech_to_text"] },
  { match_any: ["life skills", "vocational", "college planning", "job skills", "independent living"], domain: "transition_planning", topics: ["post_secondary", "vocational_skills", "independent_living"] },
  { match_any: ["teacher consistency", "implementation", "fidelity", "staff training"], domain: "implementation", topics: ["fidelity", "staff_training", "documentation"] },
  { match_any: ["compliance", "idea", "504 compliance", "minutes tracking", "progress reporting"], domain: "compliance", topics: ["idea_compliance", "504_compliance", "service_delivery"] }
] as const;

export const EXCLUSION_RULES = [
  { if_student_has: "seizure_disorder", then_exclude: true, reason: "Lighting changes may be contraindicated" },
  { if_setting_is: "testing", then_require: "admin_approval", reason: "Testing accommodations require documentation" }
] as const;

export const EVIDENCE_TAGS = [
  "work_refusal", "test_anxiety", "sensory_overload", "low_processing_speed", "handwriting_fatigue"
] as const;

export interface RecommendationWeights {
  eligibility_match: number;
  eligibility_all_tag: number;
  grade_band_match: number;
  setting_match: number;
  general_ed_setting_bonus: number;
  goal_domain_match_per_goal: number;
  goal_topic_match_per_goal: number;
  data_signal_match_per_hit: number;
  safe_bonus: number;
  caution_penalty: number;
  modification_penalty: number;
  contraindication_present_penalty: number;
  recently_added_considering_small_boost: number;
  high_overlap_dedupe_penalty: number;
}

export interface ConfidenceThresholds {
  high_min_score: number;
  medium_min_score: number;
}

export interface TuningProfile {
  profile_id: string;
  description: string;
  weights: Partial<RecommendationWeights>;
  confidence_thresholds?: Partial<ConfidenceThresholds>;
}

export const DEFAULT_WEIGHTS: RecommendationWeights = {
  eligibility_match: 3,
  eligibility_all_tag: 1,
  grade_band_match: 2,
  setting_match: 2,
  general_ed_setting_bonus: 1,
  goal_domain_match_per_goal: 3,
  goal_topic_match_per_goal: 1,
  data_signal_match_per_hit: 2,
  safe_bonus: 1,
  caution_penalty: -1,
  modification_penalty: -1,
  contraindication_present_penalty: -3,
  recently_added_considering_small_boost: 1,
  high_overlap_dedupe_penalty: -2
};

export const DEFAULT_CONFIDENCE: ConfidenceThresholds = {
  high_min_score: 10,
  medium_min_score: 6
};

export const TUNING_PROFILES: TuningProfile[] = [
  {
    profile_id: "conservative_district",
    description: "Prioritizes Safe accommodations; limits Caution/Modification suggestions",
    weights: { caution_penalty: -2, modification_penalty: -3, safe_bonus: 2 },
    confidence_thresholds: { high_min_score: 11, medium_min_score: 7 }
  },
  {
    profile_id: "clinical_bcba",
    description: "More willing to recommend Caution items with guardrails",
    weights: { caution_penalty: -1, contraindication_present_penalty: -2 },
    confidence_thresholds: { high_min_score: 10, medium_min_score: 6 }
  }
];

export const DEDUPE_RULES = {
  enabled: true,
  same_type_only: true,
  min_shared_domains: 2,
  min_shared_topics: 2
};

export const VALID_DOMAINS = [
  "academics", "testing_assessment", "attention_executive_function", "communication",
  "social_emotional", "behavior", "transitions", "sensory_regulation", "emotional_regulation",
  "mental_health", "attendance", "health_medical", "motor_physical", "environmental_access",
  "assistive_technology", "transition_planning", "implementation", "compliance", "safety"
] as const;

export const VALID_SETTINGS = [
  "general_ed", "small_group", "resource_room", "special_ed", "testing",
  "transitions", "lunch_recess", "pe", "counseling", "remote_learning", "administration"
] as const;

export const VALID_GRADE_BANDS = ["preschool", "elementary", "middle_school", "high_school", "all"] as const;

// Topic dictionary with synonyms for matching
export const TOPIC_DICTIONARY: Record<string, { definition: string; synonyms: string[]; related_domains: string[] }> = {
  task_initiation: { definition: "Starting tasks independently or with minimal prompting.", synonyms: ["getting_started", "begin_work", "start_task"], related_domains: ["attention_executive_function", "behavior"] },
  work_completion: { definition: "Completing assigned work within expected parameters.", synonyms: ["finish_work", "complete_assignments"], related_domains: ["academics", "attention_executive_function"] },
  organization: { definition: "Managing materials, space, and tasks effectively.", synonyms: ["materials_management", "planner_use", "binder_system"], related_domains: ["attention_executive_function"] },
  planning: { definition: "Planning steps and sequencing actions to complete tasks.", synonyms: ["sequencing", "plan_steps"], related_domains: ["attention_executive_function"] },
  time_management: { definition: "Estimating and using time appropriately for tasks and transitions.", synonyms: ["time_awareness", "deadline_support"], related_domains: ["attention_executive_function"] },
  working_memory: { definition: "Holding and manipulating information to follow directions or complete tasks.", synonyms: ["remembering_steps", "mental_storage"], related_domains: ["attention_executive_function"] },
  directions: { definition: "Understanding and following instructions.", synonyms: ["follow_instructions", "one_step", "multi_step"], related_domains: ["communication", "attention_executive_function"] },
  memory_support: { definition: "External supports to remember information.", synonyms: ["cue_cards", "reminders"], related_domains: ["attention_executive_function", "communication"] },
  on_task_behavior: { definition: "Sustaining engagement with tasks and instruction.", synonyms: ["focus", "engagement"], related_domains: ["attention_executive_function"] },
  sustained_attention: { definition: "Maintaining attention over time despite distractions.", synonyms: ["attention_span", "staying_focused"], related_domains: ["attention_executive_function"] },
  reading_support: { definition: "Supports for decoding, fluency, and comprehension.", synonyms: ["read_aloud", "text_to_speech"], related_domains: ["academics", "assistive_technology"] },
  comprehension: { definition: "Understanding spoken or written material.", synonyms: ["understanding", "meaning_making"], related_domains: ["academics", "communication"] },
  writing_support: { definition: "Supports for written output including composition and mechanics.", synonyms: ["written_expression", "spelling", "grammar_support"], related_domains: ["academics", "assistive_technology"] },
  aac: { definition: "Alternative communication supports such as devices, PECS, or boards.", synonyms: ["pecs", "communication_device"], related_domains: ["communication", "assistive_technology"] },
  expressive_language: { definition: "Producing language to communicate needs, ideas, or responses.", synonyms: ["speaking", "language_output"], related_domains: ["communication"] },
  receptive_language: { definition: "Understanding language presented verbally or in writing.", synonyms: ["language_comprehension"], related_domains: ["communication"] },
  pragmatics: { definition: "Social use of language.", synonyms: ["social_communication"], related_domains: ["communication", "social_emotional"] },
  peer_interaction: { definition: "Skills related to engaging with peers appropriately.", synonyms: ["friendship_skills", "play_with_peers"], related_domains: ["social_emotional"] },
  social_skills: { definition: "Skills for navigating social situations and expectations.", synonyms: ["social_behavior", "group_skills"], related_domains: ["social_emotional"] },
  emotion_identification: { definition: "Recognizing and labeling emotions in self and others.", synonyms: ["feelings_labeling"], related_domains: ["emotional_regulation", "social_emotional"] },
  coping_skills: { definition: "Strategies for managing stress and emotional escalation.", synonyms: ["calming_strategies", "self_soothing"], related_domains: ["emotional_regulation", "mental_health"] },
  anxiety_support: { definition: "Supports to reduce anxiety-related barriers.", synonyms: ["worry_support", "stress_support"], related_domains: ["mental_health"] },
  sensory_support: { definition: "Supports to help manage sensory input needs.", synonyms: ["sensory_tools", "sensory_breaks"], related_domains: ["sensory_regulation"] },
  transition_support: { definition: "Supports to move between activities/settings smoothly.", synonyms: ["transition_cues", "transition_person"], related_domains: ["transitions"] },
  visual_schedule: { definition: "Visual plan of daily activities and routines.", synonyms: ["daily_schedule", "picture_schedule"], related_domains: ["transitions", "attention_executive_function"] },
  self_injury: { definition: "Self-injurious behaviors requiring safety and support planning.", synonyms: ["sib", "self_harm_behavior"], related_domains: ["safety", "behavior"] },
  elopement: { definition: "Leaving supervised area without permission.", synonyms: ["running_away", "bolting"], related_domains: ["safety"] },
  deescalation: { definition: "Strategies to reduce intensity of escalated behavior.", synonyms: ["calming_support", "cool_down"], related_domains: ["behavior", "safety"] },
  replacement_behaviors: { definition: "Teaching alternative behaviors that meet the same function.", synonyms: ["alternative_skills"], related_domains: ["behavior"] },
  fidelity: { definition: "Consistency and accuracy of implementation of supports.", synonyms: ["implementation_integrity"], related_domains: ["implementation"] },
  documentation: { definition: "Documenting implementation, progress, and supports provided.", synonyms: ["tracking", "logs"], related_domains: ["implementation", "compliance"] }
};

// Helper: map goal text to domains/topics using crosswalk
export function mapGoalToDomainTopics(goalText: string): { domain: string; topics: string[] } | null {
  const lower = goalText.toLowerCase();
  for (const rule of GOAL_DOMAIN_CROSSWALK) {
    if (rule.match_any.some(phrase => lower.includes(phrase.toLowerCase()))) {
      return { domain: rule.domain, topics: [...rule.topics] };
    }
  }
  return null;
}

// Helper: check for topic synonyms
export function matchTopicWithSynonyms(topic: string, targetTopics: string[]): boolean {
  const normalizedTopic = topic.toLowerCase().replace(/\s+/g, '_');
  if (targetTopics.includes(normalizedTopic)) return true;
  
  const dictEntry = TOPIC_DICTIONARY[normalizedTopic];
  if (dictEntry) {
    return dictEntry.synonyms.some(syn => targetTopics.includes(syn));
  }
  return false;
}

// Helper: deduplicate similar recommendations
export function deduplicateRecommendations<T extends { 
  item_id: string; 
  recommendation_score: number;
  item?: { item_type?: string; domains?: string[]; topics?: string[]; idea_compliance_level?: string };
}>(recs: T[]): T[] {
  if (!DEDUPE_RULES.enabled) return recs;
  
  const kept: T[] = [];
  const removed = new Set<string>();
  
  for (const rec of recs) {
    if (removed.has(rec.item_id)) continue;
    
    // Check against already kept items
    let dominated = false;
    for (const kept_rec of kept) {
      if (DEDUPE_RULES.same_type_only && rec.item?.item_type !== kept_rec.item?.item_type) continue;
      
      const sharedDomains = (rec.item?.domains || []).filter(d => 
        (kept_rec.item?.domains || []).includes(d)
      );
      const sharedTopics = (rec.item?.topics || []).filter(t => 
        (kept_rec.item?.topics || []).includes(t)
      );
      
      if (sharedDomains.length >= DEDUPE_RULES.min_shared_domains && 
          sharedTopics.length >= DEDUPE_RULES.min_shared_topics) {
        // Similar items - keep higher score or prefer Safe
        if (rec.recommendation_score <= kept_rec.recommendation_score) {
          dominated = true;
          break;
        } else if (rec.item?.idea_compliance_level === 'Safe' && 
                   kept_rec.item?.idea_compliance_level !== 'Safe') {
          // Remove kept, add this one
          const idx = kept.indexOf(kept_rec);
          if (idx > -1) kept.splice(idx, 1);
          removed.add(kept_rec.item_id);
        } else {
          dominated = true;
          break;
        }
      }
    }
    
    if (!dominated) {
      kept.push(rec);
    } else {
      removed.add(rec.item_id);
    }
  }
  
  return kept;
}

// Get weights for a specific profile
export function getWeightsForProfile(profileId?: string): RecommendationWeights {
  if (!profileId) return DEFAULT_WEIGHTS;
  
  const profile = TUNING_PROFILES.find(p => p.profile_id === profileId);
  if (!profile) return DEFAULT_WEIGHTS;
  
  return { ...DEFAULT_WEIGHTS, ...profile.weights };
}

export function getConfidenceForProfile(profileId?: string): ConfidenceThresholds {
  if (!profileId) return DEFAULT_CONFIDENCE;
  
  const profile = TUNING_PROFILES.find(p => p.profile_id === profileId);
  if (!profile?.confidence_thresholds) return DEFAULT_CONFIDENCE;
  
  return { ...DEFAULT_CONFIDENCE, ...profile.confidence_thresholds };
}
