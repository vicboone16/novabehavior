import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProgramDomain {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProgramSubdomain {
  id: string;
  domain_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProgramTagCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ProgramTag {
  id: string;
  tag_category_id: string;
  name: string;
  slug: string;
  color: string | null;
  is_active: boolean;
}

export function useProgramDomains() {
  return useQuery({
    queryKey: ['program-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_domains')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as ProgramDomain[];
    },
  });
}

export function useProgramSubdomains(domainId?: string) {
  return useQuery({
    queryKey: ['program-subdomains', domainId],
    enabled: !!domainId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_subdomains')
        .select('*')
        .eq('domain_id', domainId!)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as ProgramSubdomain[];
    },
  });
}

export function useProgramTagCategories() {
  return useQuery({
    queryKey: ['program-tag-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_tag_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as ProgramTagCategory[];
    },
  });
}

export function useProgramTags(categorySlug?: string) {
  return useQuery({
    queryKey: ['program-tags', categorySlug],
    queryFn: async () => {
      let query = supabase
        .from('program_tags')
        .select('*, program_tag_categories!inner(slug)')
        .eq('is_active', true)
        .order('name');
      
      if (categorySlug) {
        query = query.eq('program_tag_categories.slug', categorySlug);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        tag_category_id: t.tag_category_id,
        name: t.name,
        slug: t.slug,
        color: t.color,
        is_active: t.is_active,
      })) as ProgramTag[];
    },
  });
}

export function useProgramTagLinks(programId?: string) {
  return useQuery({
    queryKey: ['program-tag-links', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_tag_links')
        .select('*, program_tags(id, name, slug, color, tag_category_id)')
        .eq('program_id', programId!);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

// Auto-tagging suggestion engine
interface AutoTagSuggestion {
  domainId: string;
  domainName: string;
  subdomainId?: string;
  subdomainName?: string;
  tagIds: string[];
  confidence: 'high' | 'medium' | 'low';
}

const DOMAIN_RULES: { domainSlug: string; patterns: RegExp[] }[] = [
  { domainSlug: 'communication', patterns: [/\bmand/i, /\brequest/i, /\btact/i, /\blabel/i, /\blistener respond/i, /\blrffc/i, /\bintraverbal/i, /\bechoic/i, /\baac\b/i, /\bpecs\b/i, /\bvocal/i, /\blinguistic/i, /\bspontaneous vocal/i] },
  { domainSlug: 'social-play', patterns: [/\bplay\b/i, /\bsocial/i, /\bpeer/i, /\bgroup skill/i, /\bturn tak/i, /\bjoint attention/i] },
  { domainSlug: 'learning-engagement', patterns: [/\battend/i, /\brespond.*name/i, /\bimitat/i, /\bmatch/i, /\bfollow.*direction/i, /\btask init/i, /\btask complet/i, /\bon.task/i, /\binstructional control/i, /\bvisual percep/i, /\bclassroom routine/i] },
  { domainSlug: 'behavior-regulation', patterns: [/\btantrum/i, /\baggress/i, /\belopement/i, /\bcoping/i, /\bcompl[iy]/i, /\btoleranc/i, /\bregulat/i, /\barguing/i, /\bcorrection/i, /\bfrustrat/i, /\bescalat/i, /\bpower without/i, /\bfirst.then/i, /\bfast start/i, /\bright words/i, /\bde.escalat/i, /\bdenial/i, /\bdelay/i, /\baccepting direction/i] },
  { domainSlug: 'adaptive-living', patterns: [/\btoilet/i, /\bhygiene/i, /\bdressing/i, /\bfeeding/i, /\bself.care/i, /\bchore/i, /\bhome living/i, /\bcommunity use/i, /\bwork\b/i, /\bself.direction/i, /\bdaily routine/i] },
  { domainSlug: 'academic-pre-academic', patterns: [/\breading/i, /\bwriting/i, /\bmath/i, /\bacademic/i, /\bpre.academic/i, /\bschool readiness/i, /\bearly learning/i] },
  { domainSlug: 'safety-independence', patterns: [/\bsafety/i, /\bstop\b/i, /\bstranger/i, /\bemergenc/i, /\bcommunity safety/i, /\bindependence skill/i] },
  { domainSlug: 'motor', patterns: [/\bfine motor/i, /\bgross motor/i, /\bmotor planning/i, /\btrac/i, /\bgrasp/i, /\bcoordinat/i, /\bmotor imitat/i] },
];

export function suggestAutoTags(
  title: string,
  domains: ProgramDomain[],
): AutoTagSuggestion | null {
  const text = title.toLowerCase();
  for (const rule of DOMAIN_RULES) {
    const matchCount = rule.patterns.filter(p => p.test(text)).length;
    if (matchCount > 0) {
      const domain = domains.find(d => d.slug === rule.domainSlug);
      if (domain) {
        return {
          domainId: domain.id,
          domainName: domain.name,
          confidence: matchCount >= 2 ? 'high' : 'medium',
          tagIds: [],
        };
      }
    }
  }
  return null;
}
