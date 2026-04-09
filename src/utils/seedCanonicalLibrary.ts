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

export interface SeedResult {
  domainsInserted: number;
  subdomainsInserted: number;
  tagCategoriesInserted: number;
  frameworkTagsInserted: number;
}

export async function seedCanonicalLibrary(): Promise<SeedResult> {
  const result: SeedResult = { domainsInserted: 0, subdomainsInserted: 0, tagCategoriesInserted: 0, frameworkTagsInserted: 0 };

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

  return result;
}
