import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ── Types ──────────────────────────────────────────────────────────── */

export interface ClinicalGoal {
  id: string;
  title: string;
  description: string | null;
  objective: string | null;
  domain: string;
  subdomain: string | null;
  phase: string | null;
  goal_category: string | null;
  program_name: string | null;
  collection_type: string | null;
  library_section: string | null;
  status: string | null;
  crosswalk_tags: any;
  created_at: string | null;
  updated_at: string;
}

export interface ClinicalBenchmark {
  id: string;
  goal_id: string | null;
  benchmark_text: string | null;
  benchmark_order: number | null;
}

export interface ClinicalTarget {
  id: string;
  goal_id: string | null;
  target_text: string | null;
  target_order: number;
  created_at: string;
}

export interface CrosswalkTag {
  id: string;
  system_name: string;
  tag_category: string;
  tag_name: string;
}

export interface GoalWithRelations extends ClinicalGoal {
  benchmarks: ClinicalBenchmark[];
  targets: ClinicalTarget[];
  crosswalkTags: CrosswalkTag[];
}

/* ── Hooks ──────────────────────────────────────────────────────────── */

/** Map a cl_goal_library row to the ClinicalGoal shape */
function mapClGoalToClinical(row: any): ClinicalGoal {
  return {
    id: row.id,
    title: row.title,
    description: row.long_description || row.objective,
    objective: row.objective,
    domain: row.domain || 'Uncategorized',
    subdomain: row.subdomain || null,
    phase: row.strand || null,
    goal_category: row.goal_type || null,
    program_name: row.goal_code || null,
    collection_type: 'goal_bank',
    library_section: 'clinical_collections',
    status: row.is_active ? 'active' : 'inactive',
    crosswalk_tags: row.crosswalk_tags_json,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Get distinct goal-bank domains (merges clinical_goals + cl_goal_library) */
export function useGoalBankDomains() {
  return useQuery({
    queryKey: ['clinical-goals', 'goal-bank-domains'],
    queryFn: async () => {
      // Fetch from both tables in parallel
      const [legacyRes, newRes] = await Promise.all([
        supabase
          .from('clinical_goals')
          .select('domain')
          .eq('library_section', 'clinical_collections')
          .eq('collection_type', 'goal_bank'),
        supabase
          .from('cl_goal_library')
          .select('domain')
          .eq('is_active', true),
      ]);

      const map = new Map<string, number>();
      (legacyRes.data || []).forEach((row: any) => {
        if (row.domain) map.set(row.domain, (map.get(row.domain) || 0) + 1);
      });
      (newRes.data || []).forEach((row: any) => {
        if (row.domain) map.set(row.domain, (map.get(row.domain) || 0) + 1);
      });

      return Array.from(map.entries())
        .map(([domain, count]) => ({ domain, goalCount: count }))
        .sort((a, b) => a.domain.localeCompare(b.domain));
    },
  });
}

/** Get goals for a specific domain (merges both tables) */
export function useGoalsByDomain(domainSlug: string | undefined) {
  return useQuery({
    queryKey: ['clinical-goals', 'by-domain', domainSlug?.toLowerCase()],
    enabled: !!domainSlug,
    queryFn: async () => {
      const domainPattern = domainSlug!.replace(/-/g, '_');

      const [legacyRes, newRes] = await Promise.all([
        supabase
          .from('clinical_goals')
          .select('*')
          .eq('library_section', 'clinical_collections')
          .eq('collection_type', 'goal_bank')
          .ilike('domain', domainPattern)
          .order('phase', { ascending: true, nullsFirst: false })
          .order('title', { ascending: true }),
        supabase
          .from('cl_goal_library')
          .select('*')
          .eq('is_active', true)
          .ilike('domain', domainPattern)
          .order('sort_order', { ascending: true })
          .order('title', { ascending: true }),
      ]);

      const legacy = (legacyRes.data || []) as ClinicalGoal[];
      const mapped = (newRes.data || []).map(mapClGoalToClinical);
      return [...legacy, ...mapped];
    },
  });
}

/** Get a single goal with benchmarks, targets, and crosswalk tags (checks both tables) */
export function useGoalDetail(goalId: string | undefined) {
  return useQuery({
    queryKey: ['clinical-goals', 'detail', goalId],
    enabled: !!goalId,
    queryFn: async () => {
      // Try legacy table first
      const { data: legacyGoal } = await supabase
        .from('clinical_goals')
        .select('*')
        .eq('id', goalId!)
        .maybeSingle();

      if (legacyGoal) {
        // Load legacy relations
        const [benchRes, targetRes, crosswalkRes] = await Promise.all([
          supabase.from('clinical_goal_benchmarks').select('*').eq('goal_id', goalId!).order('benchmark_order', { ascending: true }),
          supabase.from('clinical_goal_targets').select('*').eq('goal_id', goalId!).order('target_order', { ascending: true }),
          supabase.from('clinical_goal_crosswalk').select('id, tag_id, clinical_crosswalk_tags(id, system_name, tag_category, tag_name)').eq('goal_id', goalId!),
        ]);
        const tags: CrosswalkTag[] = (crosswalkRes.data || []).map((row: any) => row.clinical_crosswalk_tags).filter(Boolean);
        return {
          ...legacyGoal,
          benchmarks: (benchRes.data || []) as ClinicalBenchmark[],
          targets: (targetRes.data || []) as ClinicalTarget[],
          crosswalkTags: tags,
        } as GoalWithRelations;
      }

      // Try new cl_goal_library table
      const { data: newGoal, error } = await supabase
        .from('cl_goal_library')
        .select('*')
        .eq('id', goalId!)
        .single();

      if (error) throw error;

      const mapped = mapClGoalToClinical(newGoal);

      // Load cl_goal_benchmarks
      const { data: benchData } = await supabase
        .from('cl_goal_benchmarks')
        .select('*')
        .eq('goal_id', goalId!)
        .order('benchmark_order', { ascending: true });

      const benchmarks: ClinicalBenchmark[] = (benchData || []).map((b: any) => ({
        id: b.id,
        goal_id: b.goal_id,
        benchmark_text: b.benchmark_text,
        benchmark_order: b.benchmark_order,
      }));

      return {
        ...mapped,
        benchmarks,
        targets: [] as ClinicalTarget[],
        crosswalkTags: [] as CrosswalkTag[],
      } as GoalWithRelations;
    },
  });
}

/** Search goals across all goal banks (merges both tables) */
export function useGoalSearch(query: string, filters?: {
  domain?: string;
  subdomain?: string;
  phase?: string;
  goal_category?: string;
  crosswalkTagId?: string;
}) {
  return useQuery({
    queryKey: ['clinical-goals', 'search', query, filters],
    enabled: query.length >= 2 || !!filters?.crosswalkTagId,
    queryFn: async () => {
      // Legacy table query
      let q = supabase
        .from('clinical_goals')
        .select('*')
        .eq('library_section', 'clinical_collections')
        .eq('collection_type', 'goal_bank');

      if (filters?.domain) q = q.eq('domain', filters.domain);
      if (filters?.subdomain) q = q.eq('subdomain', filters.subdomain);
      if (filters?.phase) q = q.eq('phase', filters.phase);
      if (filters?.goal_category) q = q.eq('goal_category', filters.goal_category);

      if (query.length >= 2) {
        q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%,objective.ilike.%${query}%`);
      }

      // New table query
      let q2 = supabase.from('cl_goal_library').select('*').eq('is_active', true);
      if (filters?.domain) q2 = q2.ilike('domain', filters.domain);
      if (filters?.subdomain) q2 = q2.ilike('subdomain', filters.subdomain);
      if (query.length >= 2) {
        q2 = q2.or(`title.ilike.%${query}%,long_description.ilike.%${query}%,objective.ilike.%${query}%`);
      }

      const [legacyRes, newRes] = await Promise.all([
        q.order('domain').order('title').limit(100),
        q2.order('domain').order('title').limit(100),
      ]);

      const legacy = (legacyRes.data || []) as ClinicalGoal[];
      const mapped = (newRes.data || []).map(mapClGoalToClinical);
      let combined = [...legacy, ...mapped];

      // If filtering by crosswalk tag, do a secondary query (legacy only for now)
      if (filters?.crosswalkTagId) {
        const { data: linked } = await supabase
          .from('clinical_goal_crosswalk')
          .select('goal_id')
          .eq('tag_id', filters.crosswalkTagId);
        const linkedIds = new Set((linked || []).map((r: any) => r.goal_id));
        combined = combined.filter((g) => linkedIds.has(g.id));
      }

      return combined;
    },
  });
}

/** Get goals linked to a specific crosswalk tag */
export function useGoalsByCrosswalkTag(tagId: string | undefined) {
  return useQuery({
    queryKey: ['clinical-goals', 'by-crosswalk-tag', tagId],
    enabled: !!tagId,
    queryFn: async () => {
      const { data: links, error: linkError } = await supabase
        .from('clinical_goal_crosswalk')
        .select('goal_id')
        .eq('tag_id', tagId!);

      if (linkError) throw linkError;
      if (!links || links.length === 0) return [];

      const goalIds = links.map((l: any) => l.goal_id);
      const { data, error } = await supabase
        .from('clinical_goals')
        .select('*')
        .in('id', goalIds)
        .order('domain')
        .order('title');

      if (error) throw error;
      return (data || []) as ClinicalGoal[];
    },
  });
}
