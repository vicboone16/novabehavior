import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LibraryRegistryEntry {
  id: string;
  library_key: string;
  library_name: string;
  library_type: string;
  supports_item_scoring: boolean;
  supports_reports: boolean;
  supports_goal_mapping: boolean;
  supports_exports: boolean;
  supports_domains: boolean;
  supports_subdomains: boolean;
  supports_goal_bank: boolean;
  supports_benchmarks: boolean;
  supports_age_bands: boolean;
  supports_progress_tracking: boolean;
  is_active: boolean;
  notes: string | null;
}

export interface LibraryDomain {
  id: string;
  library_key: string;
  domain_key: string;
  domain_name: string;
  display_order: number;
  is_active: boolean;
}

export interface LibrarySubdomain {
  id: string;
  library_key: string;
  domain_key: string;
  subdomain_key: string;
  subdomain_name: string;
  display_order: number;
  is_active: boolean;
}

export interface LibraryGoal {
  id: string;
  library_key: string;
  domain_key: string;
  subdomain_key: string | null;
  goal_key: string;
  goal_title: string;
  goal_description: string | null;
  goal_type: string | null;
  age_band_key: string | null;
  benchmark_level: string | null;
  suggested_mastery_criteria: string | null;
  tags: string[] | null;
  is_active: boolean;
}

export interface LibraryGoalObjective {
  id: string;
  library_goal_id: string;
  objective_key: string;
  objective_text: string;
  display_order: number;
  is_active: boolean;
}

export interface CrosswalkRule {
  id: string;
  source_library_key: string;
  source_domain_key: string | null;
  source_subdomain_key: string | null;
  score_band: string;
  target_library_key: string;
  target_domain_key: string | null;
  target_subdomain_key: string | null;
  target_program_area: string | null;
  target_tags: string[] | null;
  recommendation_text: string | null;
  priority_level: number;
  is_active: boolean;
}

export function useLibraryRegistry() {
  return useQuery({
    queryKey: ['library-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_library_registry')
        .select('*')
        .eq('is_active', true)
        .order('library_name');
      if (error) throw error;
      return (data ?? []) as LibraryRegistryEntry[];
    },
  });
}

export function useLibraryDomains(libraryKey?: string) {
  return useQuery({
    queryKey: ['library-domains', libraryKey],
    enabled: !!libraryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_domains')
        .select('*')
        .eq('library_key', libraryKey!)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data ?? []) as LibraryDomain[];
    },
  });
}

export function useLibrarySubdomains(libraryKey?: string, domainKey?: string) {
  return useQuery({
    queryKey: ['library-subdomains', libraryKey, domainKey],
    enabled: !!libraryKey,
    queryFn: async () => {
      let q = supabase
        .from('library_subdomains')
        .select('*')
        .eq('library_key', libraryKey!)
        .eq('is_active', true)
        .order('display_order');
      if (domainKey) q = q.eq('domain_key', domainKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LibrarySubdomain[];
    },
  });
}

export function useLibraryGoals(libraryKey?: string, domainKey?: string, subdomainKey?: string) {
  return useQuery({
    queryKey: ['library-goals', libraryKey, domainKey, subdomainKey],
    enabled: !!libraryKey,
    queryFn: async () => {
      let q = supabase
        .from('library_goal_bank')
        .select('*')
        .eq('library_key', libraryKey!)
        .eq('is_active', true)
        .order('goal_title');
      if (domainKey) q = q.eq('domain_key', domainKey);
      if (subdomainKey) q = q.eq('subdomain_key', subdomainKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LibraryGoal[];
    },
  });
}

export function useLibraryGoalObjectives(goalId?: string) {
  return useQuery({
    queryKey: ['library-goal-objectives', goalId],
    enabled: !!goalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_goal_objectives')
        .select('*')
        .eq('library_goal_id', goalId!)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data ?? []) as LibraryGoalObjective[];
    },
  });
}

export function useCrosswalkRules(sourceLibraryKey?: string) {
  return useQuery({
    queryKey: ['crosswalk-rules', sourceLibraryKey],
    enabled: !!sourceLibraryKey,
    queryFn: async () => {
      let q = supabase
        .from('library_crosswalk_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority_level');
      if (sourceLibraryKey) q = q.eq('source_library_key', sourceLibraryKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrosswalkRule[];
    },
  });
}

export function useAllCrosswalkRules() {
  return useQuery({
    queryKey: ['crosswalk-rules-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_crosswalk_rules')
        .select('*')
        .order('source_library_key')
        .order('priority_level');
      if (error) throw error;
      return (data ?? []) as CrosswalkRule[];
    },
  });
}
