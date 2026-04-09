import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LibraryProgram {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  action_status: string | null;
  is_active: boolean;
  domain_id: string;
  subdomain_id: string | null;
  domain_name: string;
  subdomain_name: string | null;
}

export interface LibraryProgramFilters {
  search?: string;
  domainId?: string;
  subdomainId?: string;
  tagIds?: string[];
  showArchived?: boolean;
}

export function useLibraryPrograms(filters: LibraryProgramFilters = {}) {
  return useQuery({
    queryKey: ['library-programs', filters],
    queryFn: async () => {
      let query = supabase
        .from('library_programs')
        .select('*, program_domains!inner(name), program_subdomains(name)')
        .order('sort_order');

      if (!filters.showArchived) {
        query = query.eq('is_active', true);
      }

      if (filters.domainId) {
        query = query.eq('domain_id', filters.domainId);
      }

      if (filters.subdomainId) {
        query = query.eq('subdomain_id', filters.subdomainId);
      }

      if (filters.search && filters.search.trim().length >= 2) {
        query = query.ilike('name', `%${filters.search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let programs: LibraryProgram[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        sort_order: row.sort_order,
        action_status: row.action_status,
        is_active: row.is_active,
        domain_id: row.domain_id,
        subdomain_id: row.subdomain_id,
        domain_name: row.program_domains?.name ?? '',
        subdomain_name: row.program_subdomains?.name ?? null,
      }));

      // Client-side tag filtering if tagIds provided
      if (filters.tagIds && filters.tagIds.length > 0) {
        const { data: links } = await supabase
          .from('program_tag_links')
          .select('program_id')
          .in('tag_id', filters.tagIds);
        const taggedIds = new Set((links || []).map((l: any) => l.program_id));
        programs = programs.filter(p => taggedIds.has(p.id));
      }

      return programs;
    },
  });
}

export function useLibraryProgramCount() {
  return useQuery({
    queryKey: ['library-programs-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('library_programs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
