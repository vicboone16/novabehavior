// NYDOE CR Report Template Definition
// Each section has a key, title, type, and default content (template placeholders)

export interface NydoeSection {
  key: string;
  title: string;
  type: 'rich_text' | 'table' | 'behavior_block' | 'goal_table' | 'coordination_table' | 'assessment_list' | 'schedule_table';
  parentSection?: string; // e.g., "I", "II", "III", "IV"
  content: string; // default template text with blanks
  editable: boolean;
  importable?: boolean; // can import from existing data
  importSource?: string; // e.g., 'vineland', 'vbmapp', 'behaviors', 'programs'
}

export interface NydoeHeaderData {
  agencyName: string;
  agencyLogo?: string;
  reportTitle: string;
  reportSubtitle: string;
  diagnosis: string;
  patientName: string;
  diagnostician: string;
  parentName: string;
  comorbidDiagnoses: string;
  dateOfBirth: string;
  age: string;
  reportDate: string;
  assessorName: string;
  assessorCredentials: string;
}

export const DEFAULT_HEADER: NydoeHeaderData = {
  agencyName: '',
  reportTitle: 'Assessment Summary and Treatment Plan',
  reportSubtitle: 'Initial Assessment Summary',
  diagnosis: 'F84.0 Autism Spectrum Disorder',
  patientName: '',
  diagnostician: '',
  parentName: '',
  comorbidDiagnoses: '',
  dateOfBirth: '',
  age: '',
  reportDate: new Date().toLocaleDateString(),
  assessorName: '',
  assessorCredentials: '',
};

export const NYDOE_SECTIONS: NydoeSection[] = [
  // I. BIO-PSYCHOSOCIAL
  {
    key: 'background',
    title: 'Background Information',
    parentSection: 'I. Bio-Psychosocial Information',
    type: 'rich_text',
    editable: true,
    content: '_______ is a __ year __ month old boy who lives in ____, ____ with his ____.',
  },
  {
    key: 'reason_for_assessment',
    title: 'Reason for Assessment',
    parentSection: 'I. Bio-Psychosocial Information',
    type: 'rich_text',
    editable: true,
    content: "____'s parents initially sought evaluation when at age ___ years, when they noticed ____. Developmentally __________. Currently the main concerns of the family are _______.",
  },
  {
    key: 'diagnosis',
    title: 'Diagnosis',
    parentSection: 'I. Bio-Psychosocial Information',
    type: 'rich_text',
    editable: true,
    content: '______ has had a comprehensive evaluation and was diagnosed with F84.0 Autism Spectrum Disorder on ________ by ________.',
  },
  {
    key: 'medications',
    title: 'Medications',
    parentSection: 'I. Bio-Psychosocial Information',
    type: 'rich_text',
    editable: true,
    content: '____ does/does not take prescription medications on a daily basis. Dr. ___________________ is the prescribing doctor. _____ is seen by Dr. ____________ for routine visits.',
  },
  {
    key: 'educational_setting',
    title: 'Educational Setting',
    parentSection: 'I. Bio-Psychosocial Information',
    type: 'rich_text',
    editable: true,
    content: '____ is a N grade student at NAME OF SCHOOL Monday – Friday from 8:00am until 2:45pm. CLIENT Has/ Does not have an IEP. The IEP focuses on CONCERNS. In addition to services for Speech and Language 2x weekly for 30m each, and Occupational Therapy 2x weekly for 30m each, CLIENT is placed in a Regular/ Special Ed classroom where the teacher to student ratio is N: N. CLIENT Has/ Does not have a paraprofessional on a 1:1 support basis to assist with behavior goals in the school setting.',
  },
  {
    key: 'parent_involvement',
    title: 'Parent Level of Involvement & Family Support System',
    parentSection: 'I. Bio-Psychosocial Information',
    type: 'rich_text',
    editable: true,
    content: "CLIENT's parent(s) NAME & NAME are/ plan to be very involved in ABA treatment. They understand the requirement and importance of parental involvement in ABA. They will be present for sessions and participate in parent training on behavior prevention/ intervention and strategies for skill acquisition.",
  },
  {
    key: 'coordination_of_care',
    title: 'Coordination of Care',
    parentSection: 'I. Bio-Psychosocial Information',
    type: 'rich_text',
    editable: true,
    content: 'The BCBA coordinates care with all medical and behavioral health providers, specialists, and other practitioners involved in a member\'s care in order to ensure consistency in treatment. The BCBA will make a reasonable effort to communicate with the member\'s service providers. Nevertheless, reports of progress will be shared among providers to establish consistency in treatment. Coordination of care takes place throughout the duration of services.',
  },
  {
    key: 'coordination_contacts',
    title: 'Coordination of Care Contacts',
    parentSection: 'I. Bio-Psychosocial Information',
    type: 'coordination_table',
    editable: true,
    content: '[]',
  },

  // II. ASSESSMENTS
  {
    key: 'assessment_instruments',
    title: 'Summary of Assessment Instruments and Methods',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    importable: true,
    importSource: 'assessments',
    content: 'Indirect Observation:\n• Records Review: IEP dated ____, Diagnostic Evaluation dated: _______\n\nDirect Methods/Observation(s):\n• Vineland Adaptive Scales, Third Edition Parent/Caregiver: ____\n• Functional Assessment Interview (FAI) Family/Caregiver: ____\n• Functional Assessment Screening Tool (FAST) (Iwata, et. Al., 2013): _____\n• Preference Assessment – Parent Interview & Client Interview: ______\n• Observation via telehealth: _________',
  },
  {
    key: 'direct_observation_1',
    title: 'Direct Observation 1',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'direct_observation_2',
    title: 'Direct Observation 2',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'strengths_hobbies',
    title: "Client's Strengths and Hobbies",
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'preference_assessment',
    title: 'Preference Assessment',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: 'Reinforcement is essential to ABA treatment as proper reinforcement must be recognized prior to any ABA instruction occurring. A (Free Operant/Single Stimulus/Paired choice/MSW/MSWO) assessment tool was administered to determine a variety of reinforcements according to the client\'s level of preference.',
  },
  {
    key: 'reinforcement_schedule',
    title: 'Reinforcement Schedule',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: 'Based on the results discovered, it is recommended that client initially begins on (List reinforcement schedule). Gradual fading of the reinforcement schedule as well as transition to more natural forms of reinforcement will occur contingent upon client\'s progress in treatment.',
  },

  // VB-MAPP
  {
    key: 'vbmapp_present_levels',
    title: 'VB-MAPP Present Level of Performance by Domain',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    importable: true,
    importSource: 'vbmapp',
    content: "The evaluator used the VB-MAPP to evaluate ______. The VB-MAPP is a criterion referenced assessment tool that provides a baseline level of performance in language and verbal behavior. _______'s VB-MAPP Milestones score was a ______ out of a possible score of 170.",
  },
  {
    key: 'vbmapp_language_comm',
    title: 'Language/Communication Skills (VB-MAPP)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vbmapp_social',
    title: 'Social Skills (VB-MAPP)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vbmapp_play',
    title: 'Play & Leisure Skills (VB-MAPP)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vbmapp_independent_living',
    title: 'Independent Living/Self-Help Skills (VB-MAPP)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vbmapp_community',
    title: 'Community Integration & Involvement (VB-MAPP)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vbmapp_cognitive',
    title: 'Cognitive Skills (VB-MAPP)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vbmapp_barriers',
    title: 'VB-MAPP Environmental Factors that Interfere with Progress',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    importable: true,
    importSource: 'vbmapp',
    content: "________'s maladaptive behavior was assessed using the VB-MAPP Barriers Assessment. _____'s VB-MAPP Barriers assessment score was __.",
  },

  // Vineland
  {
    key: 'vineland_present_levels',
    title: 'Vineland Present Levels of Performance',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    importable: true,
    importSource: 'vineland',
    content: 'The evaluator used the Vineland Adaptive Scales, Third Edition, to evaluate ____.',
  },
  {
    key: 'vineland_adaptive_behavior',
    title: 'Adaptive Behavior',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vineland_communication',
    title: 'Communication Domain',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vineland_daily_living',
    title: 'Daily Living Skills Domain',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vineland_social',
    title: 'Social Domain',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vineland_language_comm',
    title: 'Language/Communication Skills (Vineland)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vineland_social_skills',
    title: 'Social Skills (Vineland)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vineland_play',
    title: 'Play & Leisure Skills (Vineland)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vineland_independent_living',
    title: 'Independent Living/Self-Help Skills (Vineland)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vineland_community',
    title: 'Community Integration & Involvement (Vineland)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vineland_cognitive',
    title: 'Cognitive Skills (Vineland)',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'vineland_maladaptive',
    title: 'Vineland Environmental Factors That Interfere with Progress',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },

  // ABLLS/AFLS
  {
    key: 'ablls_afls_present_levels',
    title: 'ABLLS/AFLS Present Level of Performance by Domain',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'ablls_afls_barriers',
    title: 'ABLLS/AFLS Factors that Interfere with Progress',
    parentSection: 'II. Assessments',
    type: 'rich_text',
    editable: true,
    content: '',
  },

  // FBA & BIP
  {
    key: 'fba_bip',
    title: 'Functional Behavior Assessment & Behavior Intervention Plan',
    parentSection: 'II. Assessments',
    type: 'behavior_block',
    editable: true,
    importable: true,
    importSource: 'behaviors',
    content: '[]', // JSON array of behavior blocks
  },

  // III. BEHAVIOR REDUCTION GOALS
  {
    key: 'behavior_reduction_goals',
    title: 'Behavior Reduction Goals',
    parentSection: 'III. Behavior Reduction Goals',
    type: 'goal_table',
    editable: true,
    importable: true,
    importSource: 'behaviors',
    content: '[]',
  },

  // IV. BEHAVIOR REPLACEMENT GOALS
  {
    key: 'communication_goals',
    title: 'Communication/Language Goals',
    parentSection: 'IV. Behavior Replacement Goals',
    type: 'goal_table',
    editable: true,
    importable: true,
    importSource: 'programs',
    content: '[]',
  },
  {
    key: 'social_goals',
    title: 'Social Skills Goals',
    parentSection: 'IV. Behavior Replacement Goals',
    type: 'goal_table',
    editable: true,
    importable: true,
    importSource: 'programs',
    content: '[]',
  },
  {
    key: 'adaptive_safety_goals',
    title: 'Adaptive/Safety Goals',
    parentSection: 'IV. Behavior Replacement Goals',
    type: 'goal_table',
    editable: true,
    importable: true,
    importSource: 'programs',
    content: '[]',
  },
  {
    key: 'parent_training',
    title: 'Parent Training Summary & Goals',
    parentSection: 'IV. Behavior Replacement Goals',
    type: 'goal_table',
    editable: true,
    content: '[]',
  },

  // Service Protocols
  {
    key: 'service_protocols',
    title: 'Service Protocols & Details',
    parentSection: 'V. Service Protocols',
    type: 'rich_text',
    editable: true,
    content: 'Due to the above-mentioned skill deficits, it is necessary for CLIENT to receive ABA treatment at this time, in order to attain the necessary skills to function within his family and alongside his peers, and in an educational environment.',
  },
  {
    key: 'recommendations',
    title: 'Recommendations for Treatment',
    parentSection: 'V. Service Protocols',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'service_hours',
    title: 'Recommended Service Hours',
    parentSection: 'V. Service Protocols',
    type: 'table',
    editable: true,
    content: JSON.stringify([
      { service: 'Direct care', hours: '', notes: 'Based on medical necessity and client availability' },
      { service: 'Supervision of BT/RBTs', hours: '', notes: '10% of direct care' },
      { service: 'Parent Training', hours: '', notes: '' },
      { service: 'BTM-Treatment Planning', hours: '', notes: '' },
      { service: 'Coordination of Care', hours: '', notes: '' },
      { service: 'Reassessment', hours: '', notes: '' },
    ]),
  },
  {
    key: 'schedule',
    title: 'Schedule for Home Based ABA Sessions',
    parentSection: 'V. Service Protocols',
    type: 'schedule_table',
    editable: true,
    content: JSON.stringify([
      { day: 'Monday', btRbt: '', bcba: '' },
      { day: 'Tuesday', btRbt: '', bcba: '' },
      { day: 'Wednesday', btRbt: '', bcba: '' },
      { day: 'Thursday', btRbt: '', bcba: '' },
      { day: 'Friday', btRbt: '', bcba: '' },
      { day: 'Saturday', btRbt: '', bcba: '' },
      { day: 'Sunday', btRbt: '', bcba: '' },
    ]),
  },
  {
    key: 'risk_factors',
    title: 'Emergency Response / Crisis Plan',
    parentSection: 'V. Service Protocols',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'transition_discharge',
    title: 'Transition Criteria & Discharge Plan',
    parentSection: 'V. Service Protocols',
    type: 'rich_text',
    editable: true,
    content: '',
  },
  {
    key: 'signature',
    title: 'BCBA Signature',
    parentSection: 'V. Service Protocols',
    type: 'rich_text',
    editable: true,
    content: '',
  },
];

// Group sections by parent section for navigation
export function groupSectionsByParent(sections: NydoeSection[]) {
  const groups: Record<string, NydoeSection[]> = {};
  for (const s of sections) {
    const parent = s.parentSection || 'Other';
    if (!groups[parent]) groups[parent] = [];
    groups[parent].push(s);
  }
  return groups;
}
