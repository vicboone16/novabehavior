import { supabase } from '@/integrations/supabase/client';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const DOMAINS = [
  { name: 'Communication', sort_order: 1 },
  { name: 'Social & Play', sort_order: 2 },
  { name: 'Learning & Engagement', sort_order: 3 },
  { name: 'Behavior & Regulation', sort_order: 4 },
  { name: 'Adaptive Living', sort_order: 5 },
  { name: 'Academic & Pre-Academic', sort_order: 6 },
  { name: 'Safety & Independence', sort_order: 7 },
  { name: 'Motor', sort_order: 8 },
];

const SUBDOMAINS: Record<string, string[]> = {
  'Communication': [
    'Requesting / Functional Communication',
    'Labeling / Expressive Language',
    'Receptive Language',
    'Intraverbals / WH Responding',
    'Conversational / Pragmatics',
    'Communication Repair & Advocacy',
  ],
  'Social & Play': [
    'Social Interaction',
    'Play Skills',
    'Peer & Group Skills',
    'Social Reciprocity',
  ],
  'Learning & Engagement': [
    'Attention & Readiness',
    'Instruction Following',
    'Task Engagement',
    'Independence & Routines',
    'Learning Foundations',
  ],
  'Behavior & Regulation': [
    'Behavior Reduction',
    'Replacement Behaviors',
    'Tolerance Skills',
    'Regulation & Coping',
    'Cooperation & Compliance',
    'Safety Behaviors',
  ],
  'Adaptive Living': [
    'Hygiene & Self-Care',
    'Daily Living',
    'Home & Routine Skills',
  ],
  'Academic & Pre-Academic': [
    'Early Learning',
    'Core Academics',
    'Classroom Readiness',
  ],
  'Safety & Independence': [
    'Safety Skills',
    'Community Safety',
    'Independence',
  ],
  'Motor': [
    'Fine Motor',
    'Gross Motor',
    'Motor Integration',
  ],
};

const TAG_CATEGORIES = [
  'Framework Tags',
  'Source Category Tags',
  'Skill Tags',
  'Function Tags',
  'Setting Tags',
  'Prompt Tags',
  'Program Labels',
];

const FRAMEWORK_TAGS = [
  'VB-MAPP', 'ABAS-3', 'EESA', 'AFLS', 'PEAK', 'Vineland-3',
  'ABLLS-R', 'ESDM', 'PRT', 'AIM', 'RUBI', 'IISCA', 'FAST', 'SBT',
];

const PROGRAMS: { domain: string; subdomain: string; name: string }[] = [
  // Communication → Requesting / Functional Communication
  { domain: 'Communication', subdomain: 'Requesting / Functional Communication', name: 'Manding with Vocal' },
  { domain: 'Communication', subdomain: 'Requesting / Functional Communication', name: 'Manding with AAC/PECS' },
  { domain: 'Communication', subdomain: 'Requesting / Functional Communication', name: 'Manding for Actions' },
  { domain: 'Communication', subdomain: 'Requesting / Functional Communication', name: 'Manding for Information (WH)' },
  { domain: 'Communication', subdomain: 'Requesting / Functional Communication', name: 'Manding for Attention' },
  { domain: 'Communication', subdomain: 'Requesting / Functional Communication', name: 'Manding for Help' },
  { domain: 'Communication', subdomain: 'Requesting / Functional Communication', name: 'Manding for Removal/Break' },
  { domain: 'Communication', subdomain: 'Requesting / Functional Communication', name: 'Spontaneous Requesting' },
  // Communication → Labeling / Expressive Language
  { domain: 'Communication', subdomain: 'Labeling / Expressive Language', name: 'Tacting Objects' },
  { domain: 'Communication', subdomain: 'Labeling / Expressive Language', name: 'Tacting Actions' },
  { domain: 'Communication', subdomain: 'Labeling / Expressive Language', name: 'Tacting Attributes' },
  { domain: 'Communication', subdomain: 'Labeling / Expressive Language', name: 'Tacting Emotions' },
  { domain: 'Communication', subdomain: 'Labeling / Expressive Language', name: 'Tacting Functions' },
  { domain: 'Communication', subdomain: 'Labeling / Expressive Language', name: 'Tacting Categories' },
  { domain: 'Communication', subdomain: 'Labeling / Expressive Language', name: 'Tacting Locations / Prepositions' },
  // Communication → Receptive Language
  { domain: 'Communication', subdomain: 'Receptive Language', name: 'Receptive ID of Objects' },
  { domain: 'Communication', subdomain: 'Receptive Language', name: 'Receptive ID of Actions' },
  { domain: 'Communication', subdomain: 'Receptive Language', name: 'Receptive ID of People' },
  { domain: 'Communication', subdomain: 'Receptive Language', name: 'Following 1-Step Directions' },
  { domain: 'Communication', subdomain: 'Receptive Language', name: 'Following 2-Step Directions' },
  { domain: 'Communication', subdomain: 'Receptive Language', name: 'Following Multi-Step Directions' },
  { domain: 'Communication', subdomain: 'Receptive Language', name: 'LRFFC (Listener Responding by Feature/Function/Class)' },
  // Communication → Intraverbals / WH Responding
  { domain: 'Communication', subdomain: 'Intraverbals / WH Responding', name: 'Fill-in-the-Blank' },
  { domain: 'Communication', subdomain: 'Intraverbals / WH Responding', name: 'Answering WH Questions (What)' },
  { domain: 'Communication', subdomain: 'Intraverbals / WH Responding', name: 'Answering WH Questions (Where)' },
  { domain: 'Communication', subdomain: 'Intraverbals / WH Responding', name: 'Answering WH Questions (Who)' },
  { domain: 'Communication', subdomain: 'Intraverbals / WH Responding', name: 'Answering WH Questions (When/Why)' },
  { domain: 'Communication', subdomain: 'Intraverbals / WH Responding', name: 'Conversational Intraverbals' },
  // Communication → Conversational / Pragmatics
  { domain: 'Communication', subdomain: 'Conversational / Pragmatics', name: 'Greetings & Farewells' },
  { domain: 'Communication', subdomain: 'Conversational / Pragmatics', name: 'Commenting' },
  { domain: 'Communication', subdomain: 'Conversational / Pragmatics', name: 'Conversational Turn-Taking' },
  { domain: 'Communication', subdomain: 'Conversational / Pragmatics', name: 'Topic Maintenance' },
  { domain: 'Communication', subdomain: 'Conversational / Pragmatics', name: 'Asking Questions' },
  { domain: 'Communication', subdomain: 'Conversational / Pragmatics', name: 'Perspective Taking in Conversation' },
  // Communication → Communication Repair & Advocacy
  { domain: 'Communication', subdomain: 'Communication Repair & Advocacy', name: 'Self-Advocacy Statements' },
  { domain: 'Communication', subdomain: 'Communication Repair & Advocacy', name: 'Communication Breakdown Repair' },
  { domain: 'Communication', subdomain: 'Communication Repair & Advocacy', name: 'Requesting Clarification' },
  // Social & Play → Social Interaction
  { domain: 'Social & Play', subdomain: 'Social Interaction', name: 'Joint Attention' },
  { domain: 'Social & Play', subdomain: 'Social Interaction', name: 'Eye Contact on Request' },
  { domain: 'Social & Play', subdomain: 'Social Interaction', name: 'Social Referencing' },
  { domain: 'Social & Play', subdomain: 'Social Interaction', name: 'Initiating Interactions' },
  { domain: 'Social & Play', subdomain: 'Social Interaction', name: 'Responding to Peers' },
  { domain: 'Social & Play', subdomain: 'Social Interaction', name: 'Sharing / Offering' },
  // Social & Play → Play Skills
  { domain: 'Social & Play', subdomain: 'Play Skills', name: 'Functional Play' },
  { domain: 'Social & Play', subdomain: 'Play Skills', name: 'Symbolic/Pretend Play' },
  { domain: 'Social & Play', subdomain: 'Play Skills', name: 'Constructive Play' },
  { domain: 'Social & Play', subdomain: 'Play Skills', name: 'Cooperative Play' },
  { domain: 'Social & Play', subdomain: 'Play Skills', name: 'Game Play with Rules' },
  { domain: 'Social & Play', subdomain: 'Play Skills', name: 'Independent Play' },
  // Social & Play → Peer & Group Skills
  { domain: 'Social & Play', subdomain: 'Peer & Group Skills', name: 'Turn-Taking with Peers' },
  { domain: 'Social & Play', subdomain: 'Peer & Group Skills', name: 'Group Activity Participation' },
  { domain: 'Social & Play', subdomain: 'Peer & Group Skills', name: 'Cooperative Problem-Solving' },
  { domain: 'Social & Play', subdomain: 'Peer & Group Skills', name: 'Joining an Activity' },
  { domain: 'Social & Play', subdomain: 'Peer & Group Skills', name: 'Responding to Group Instructions' },
  // Social & Play → Social Reciprocity
  { domain: 'Social & Play', subdomain: 'Social Reciprocity', name: 'Showing Empathy' },
  { domain: 'Social & Play', subdomain: 'Social Reciprocity', name: 'Reading Social Cues' },
  { domain: 'Social & Play', subdomain: 'Social Reciprocity', name: 'Giving Compliments' },
  { domain: 'Social & Play', subdomain: 'Social Reciprocity', name: 'Accepting Feedback' },
  { domain: 'Social & Play', subdomain: 'Social Reciprocity', name: 'Personal Space Awareness' },
  // Learning & Engagement → Attention & Readiness
  { domain: 'Learning & Engagement', subdomain: 'Attention & Readiness', name: 'Responding to Name' },
  { domain: 'Learning & Engagement', subdomain: 'Attention & Readiness', name: 'Attending to Speaker' },
  { domain: 'Learning & Engagement', subdomain: 'Attention & Readiness', name: 'Sustained Attention' },
  { domain: 'Learning & Engagement', subdomain: 'Attention & Readiness', name: 'Shifting Attention' },
  { domain: 'Learning & Engagement', subdomain: 'Attention & Readiness', name: 'Attending to Materials' },
  // Learning & Engagement → Instruction Following
  { domain: 'Learning & Engagement', subdomain: 'Instruction Following', name: 'Following Vocal Instructions' },
  { domain: 'Learning & Engagement', subdomain: 'Instruction Following', name: 'Following Visual Schedules' },
  { domain: 'Learning & Engagement', subdomain: 'Instruction Following', name: 'Following Gestural Prompts' },
  { domain: 'Learning & Engagement', subdomain: 'Instruction Following', name: 'First-Then Compliance' },
  // Learning & Engagement → Task Engagement
  { domain: 'Learning & Engagement', subdomain: 'Task Engagement', name: 'On-Task Behavior' },
  { domain: 'Learning & Engagement', subdomain: 'Task Engagement', name: 'Task Initiation' },
  { domain: 'Learning & Engagement', subdomain: 'Task Engagement', name: 'Task Completion' },
  { domain: 'Learning & Engagement', subdomain: 'Task Engagement', name: 'Working Independently' },
  { domain: 'Learning & Engagement', subdomain: 'Task Engagement', name: 'Transitioning Between Tasks' },
  // Learning & Engagement → Independence & Routines
  { domain: 'Learning & Engagement', subdomain: 'Independence & Routines', name: 'Following Classroom Routines' },
  { domain: 'Learning & Engagement', subdomain: 'Independence & Routines', name: 'Self-Monitoring Checklist' },
  { domain: 'Learning & Engagement', subdomain: 'Independence & Routines', name: 'Activity Schedules' },
  { domain: 'Learning & Engagement', subdomain: 'Independence & Routines', name: 'Independent Work Station' },
  // Learning & Engagement → Learning Foundations
  { domain: 'Learning & Engagement', subdomain: 'Learning Foundations', name: 'Matching (Identical)' },
  { domain: 'Learning & Engagement', subdomain: 'Learning Foundations', name: 'Matching (Non-Identical)' },
  { domain: 'Learning & Engagement', subdomain: 'Learning Foundations', name: 'Sorting by Category' },
  { domain: 'Learning & Engagement', subdomain: 'Learning Foundations', name: 'Imitation (Motor)' },
  { domain: 'Learning & Engagement', subdomain: 'Learning Foundations', name: 'Imitation (Vocal)' },
  { domain: 'Learning & Engagement', subdomain: 'Learning Foundations', name: 'Visual Perception' },
  // Behavior & Regulation → Behavior Reduction
  { domain: 'Behavior & Regulation', subdomain: 'Behavior Reduction', name: 'Aggression Reduction' },
  { domain: 'Behavior & Regulation', subdomain: 'Behavior Reduction', name: 'Elopement Prevention' },
  { domain: 'Behavior & Regulation', subdomain: 'Behavior Reduction', name: 'SIB Reduction' },
  { domain: 'Behavior & Regulation', subdomain: 'Behavior Reduction', name: 'Property Destruction Reduction' },
  { domain: 'Behavior & Regulation', subdomain: 'Behavior Reduction', name: 'Tantrum Reduction' },
  { domain: 'Behavior & Regulation', subdomain: 'Behavior Reduction', name: 'Stereotypy/RIRB Management' },
  // Behavior & Regulation → Replacement Behaviors
  { domain: 'Behavior & Regulation', subdomain: 'Replacement Behaviors', name: 'Functional Communication (as Replacement)' },
  { domain: 'Behavior & Regulation', subdomain: 'Replacement Behaviors', name: 'Appropriate Protest' },
  { domain: 'Behavior & Regulation', subdomain: 'Replacement Behaviors', name: 'Requesting a Break' },
  { domain: 'Behavior & Regulation', subdomain: 'Replacement Behaviors', name: 'Requesting Attention Appropriately' },
  { domain: 'Behavior & Regulation', subdomain: 'Replacement Behaviors', name: 'Using Right Words' },
  // Behavior & Regulation → Tolerance Skills
  { domain: 'Behavior & Regulation', subdomain: 'Tolerance Skills', name: 'Tolerating Denied Access' },
  { domain: 'Behavior & Regulation', subdomain: 'Tolerance Skills', name: 'Tolerating Wait Times' },
  { domain: 'Behavior & Regulation', subdomain: 'Tolerance Skills', name: 'Tolerating Transitions' },
  { domain: 'Behavior & Regulation', subdomain: 'Tolerance Skills', name: 'Tolerating Non-Preferred Tasks' },
  { domain: 'Behavior & Regulation', subdomain: 'Tolerance Skills', name: 'Tolerating Changes in Routine' },
  // Behavior & Regulation → Regulation & Coping
  { domain: 'Behavior & Regulation', subdomain: 'Regulation & Coping', name: 'Identifying Emotions' },
  { domain: 'Behavior & Regulation', subdomain: 'Regulation & Coping', name: 'Zones of Regulation' },
  { domain: 'Behavior & Regulation', subdomain: 'Regulation & Coping', name: 'Deep Breathing / Calming' },
  { domain: 'Behavior & Regulation', subdomain: 'Regulation & Coping', name: 'Using Coping Tools' },
  { domain: 'Behavior & Regulation', subdomain: 'Regulation & Coping', name: 'De-escalation Strategies' },
  // Behavior & Regulation → Cooperation & Compliance
  { domain: 'Behavior & Regulation', subdomain: 'Cooperation & Compliance', name: 'Accepting Directions (Fast Start)' },
  { domain: 'Behavior & Regulation', subdomain: 'Cooperation & Compliance', name: 'Following Through on Demands' },
  { domain: 'Behavior & Regulation', subdomain: 'Cooperation & Compliance', name: 'Accepting Correction' },
  { domain: 'Behavior & Regulation', subdomain: 'Cooperation & Compliance', name: "Accepting 'No'" },
  { domain: 'Behavior & Regulation', subdomain: 'Cooperation & Compliance', name: 'Power Without Conflict' },
  // Behavior & Regulation → Safety Behaviors
  { domain: 'Behavior & Regulation', subdomain: 'Safety Behaviors', name: 'Dangerous Behavior Reduction' },
  { domain: 'Behavior & Regulation', subdomain: 'Safety Behaviors', name: 'Body Safety Awareness' },
  { domain: 'Behavior & Regulation', subdomain: 'Safety Behaviors', name: 'Responding to Safety Commands' },
  // Adaptive Living → Hygiene & Self-Care
  { domain: 'Adaptive Living', subdomain: 'Hygiene & Self-Care', name: 'Hand Washing' },
  { domain: 'Adaptive Living', subdomain: 'Hygiene & Self-Care', name: 'Tooth Brushing' },
  { domain: 'Adaptive Living', subdomain: 'Hygiene & Self-Care', name: 'Toileting' },
  { domain: 'Adaptive Living', subdomain: 'Hygiene & Self-Care', name: 'Dressing / Undressing' },
  { domain: 'Adaptive Living', subdomain: 'Hygiene & Self-Care', name: 'Grooming' },
  { domain: 'Adaptive Living', subdomain: 'Hygiene & Self-Care', name: 'Bathing' },
  // Adaptive Living → Daily Living
  { domain: 'Adaptive Living', subdomain: 'Daily Living', name: 'Meal Preparation (Simple)' },
  { domain: 'Adaptive Living', subdomain: 'Daily Living', name: 'Eating with Utensils' },
  { domain: 'Adaptive Living', subdomain: 'Daily Living', name: 'Cleaning Up After Meals' },
  { domain: 'Adaptive Living', subdomain: 'Daily Living', name: 'Household Chores' },
  { domain: 'Adaptive Living', subdomain: 'Daily Living', name: 'Laundry Basics' },
  // Adaptive Living → Home & Routine Skills
  { domain: 'Adaptive Living', subdomain: 'Home & Routine Skills', name: 'Morning Routine' },
  { domain: 'Adaptive Living', subdomain: 'Home & Routine Skills', name: 'Bedtime Routine' },
  { domain: 'Adaptive Living', subdomain: 'Home & Routine Skills', name: 'After-School Routine' },
  { domain: 'Adaptive Living', subdomain: 'Home & Routine Skills', name: 'Packing / Unpacking Bag' },
  { domain: 'Adaptive Living', subdomain: 'Home & Routine Skills', name: 'Time Management' },
  // Academic & Pre-Academic → Early Learning
  { domain: 'Academic & Pre-Academic', subdomain: 'Early Learning', name: 'Color Identification' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Early Learning', name: 'Shape Identification' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Early Learning', name: 'Number Identification' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Early Learning', name: 'Letter Identification' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Early Learning', name: 'Counting Objects' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Early Learning', name: 'Rote Counting' },
  // Academic & Pre-Academic → Core Academics
  { domain: 'Academic & Pre-Academic', subdomain: 'Core Academics', name: 'Reading Sight Words' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Core Academics', name: 'Reading Comprehension' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Core Academics', name: 'Writing Name' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Core Academics', name: 'Writing Letters / Numbers' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Core Academics', name: 'Basic Addition' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Core Academics', name: 'Basic Subtraction' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Core Academics', name: 'Telling Time' },
  // Academic & Pre-Academic → Classroom Readiness
  { domain: 'Academic & Pre-Academic', subdomain: 'Classroom Readiness', name: 'Sitting in Chair' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Classroom Readiness', name: 'Raising Hand' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Classroom Readiness', name: 'Lining Up' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Classroom Readiness', name: 'Following Group Instructions' },
  { domain: 'Academic & Pre-Academic', subdomain: 'Classroom Readiness', name: 'Sharing Materials' },
  // Safety & Independence → Safety Skills
  { domain: 'Safety & Independence', subdomain: 'Safety Skills', name: 'Stranger Safety' },
  { domain: 'Safety & Independence', subdomain: 'Safety Skills', name: 'Stop & Wait on Command' },
  { domain: 'Safety & Independence', subdomain: 'Safety Skills', name: 'Identifying Safe vs. Unsafe' },
  { domain: 'Safety & Independence', subdomain: 'Safety Skills', name: 'Fire / Emergency Drill' },
  { domain: 'Safety & Independence', subdomain: 'Safety Skills', name: 'Reporting Danger' },
  // Safety & Independence → Community Safety
  { domain: 'Safety & Independence', subdomain: 'Community Safety', name: 'Pedestrian Safety' },
  { domain: 'Safety & Independence', subdomain: 'Community Safety', name: 'Parking Lot Safety' },
  { domain: 'Safety & Independence', subdomain: 'Community Safety', name: 'Water Safety' },
  { domain: 'Safety & Independence', subdomain: 'Community Safety', name: 'Public Transportation Safety' },
  // Safety & Independence → Independence
  { domain: 'Safety & Independence', subdomain: 'Independence', name: 'Self-Advocacy in Community' },
  { domain: 'Safety & Independence', subdomain: 'Independence', name: 'Making Purchases' },
  { domain: 'Safety & Independence', subdomain: 'Independence', name: 'Using a Phone for Emergencies' },
  { domain: 'Safety & Independence', subdomain: 'Independence', name: 'Navigating Familiar Locations' },
  // Motor → Fine Motor
  { domain: 'Motor', subdomain: 'Fine Motor', name: 'Pencil Grasp' },
  { domain: 'Motor', subdomain: 'Fine Motor', name: 'Cutting with Scissors' },
  { domain: 'Motor', subdomain: 'Fine Motor', name: 'Bead Stringing' },
  { domain: 'Motor', subdomain: 'Fine Motor', name: 'Buttoning / Zipping' },
  { domain: 'Motor', subdomain: 'Fine Motor', name: 'Tracing / Drawing Lines' },
  // Motor → Gross Motor
  { domain: 'Motor', subdomain: 'Gross Motor', name: 'Throwing / Catching Ball' },
  { domain: 'Motor', subdomain: 'Gross Motor', name: 'Jumping' },
  { domain: 'Motor', subdomain: 'Gross Motor', name: 'Climbing Stairs' },
  { domain: 'Motor', subdomain: 'Gross Motor', name: 'Balancing' },
  { domain: 'Motor', subdomain: 'Gross Motor', name: 'Pedaling / Riding' },
  // Motor → Motor Integration
  { domain: 'Motor', subdomain: 'Motor Integration', name: 'Motor Imitation' },
  { domain: 'Motor', subdomain: 'Motor Integration', name: 'Bilateral Coordination' },
  { domain: 'Motor', subdomain: 'Motor Integration', name: 'Motor Planning' },
];

export interface SeedResult {
  domainsInserted: number;
  subdomainsInserted: number;
  tagCategoriesInserted: number;
  frameworkTagsInserted: number;
  programsInserted: number;
}

export async function seedCanonicalLibrary(): Promise<SeedResult> {
  const result: SeedResult = { domainsInserted: 0, subdomainsInserted: 0, tagCategoriesInserted: 0, frameworkTagsInserted: 0, programsInserted: 0 };

  // 1. Upsert domains
  for (const d of DOMAINS) {
    const { data } = await supabase
      .from('program_domains')
      .upsert({ name: d.name, slug: slugify(d.name), sort_order: d.sort_order, is_active: true }, { onConflict: 'slug' })
      .select('id')
      .single();
    if (data) result.domainsInserted++;
  }

  // 2. Fetch domain map
  const { data: domainRows } = await supabase.from('program_domains').select('id, name').eq('is_active', true);
  const domainMap = new Map((domainRows || []).map(d => [d.name, d.id]));

  // 3. Upsert subdomains
  for (const [domainName, subs] of Object.entries(SUBDOMAINS)) {
    const domainId = domainMap.get(domainName);
    if (!domainId) continue;
    for (let i = 0; i < subs.length; i++) {
      const slug = slugify(subs[i]);
      const { error } = await supabase
        .from('program_subdomains')
        .upsert({ domain_id: domainId, name: subs[i], slug, sort_order: i + 1, is_active: true }, { onConflict: 'slug' });
      if (!error) result.subdomainsInserted++;
    }
  }

  // 4. Upsert tag categories
  for (const cat of TAG_CATEGORIES) {
    const { error } = await supabase
      .from('program_tag_categories')
      .upsert({ name: cat, slug: slugify(cat) }, { onConflict: 'slug' });
    if (!error) result.tagCategoriesInserted++;
  }

  // 5. Upsert framework tags
  const { data: fwCat } = await supabase
    .from('program_tag_categories')
    .select('id')
    .eq('slug', 'framework-tags')
    .single();

  if (fwCat) {
    for (const tag of FRAMEWORK_TAGS) {
      const { error } = await supabase
        .from('program_tags')
        .upsert({ tag_category_id: fwCat.id, name: tag, slug: slugify(tag), is_active: true }, { onConflict: 'slug' });
      if (!error) result.frameworkTagsInserted++;
    }
  }

  // 6. Upsert programs into library_programs
  // Fetch subdomain map
  const { data: subdomainRows } = await supabase
    .from('program_subdomains')
    .select('id, name, domain_id')
    .eq('is_active', true);

  const subdomainMap = new Map(
    (subdomainRows || []).map(s => [`${s.domain_id}::${s.name}`, s.id])
  );

  // Track sort_order per subdomain
  const subdomainSortCounters = new Map<string, number>();

  for (const prog of PROGRAMS) {
    const domainId = domainMap.get(prog.domain);
    if (!domainId) continue;

    const subdomainId = subdomainMap.get(`${domainId}::${prog.subdomain}`);
    if (!subdomainId) continue;

    const counterKey = subdomainId;
    const currentOrder = (subdomainSortCounters.get(counterKey) || 0) + 1;
    subdomainSortCounters.set(counterKey, currentOrder);

    const { error } = await supabase
      .from('library_programs')
      .upsert(
        {
          domain_id: domainId,
          subdomain_id: subdomainId,
          name: prog.name,
          slug: slugify(prog.name),
          sort_order: currentOrder,
          action_status: 'ADD',
          is_active: true,
        },
        { onConflict: 'domain_id,subdomain_id,slug' }
      );
    if (!error) result.programsInserted++;
  }

  return result;
}
