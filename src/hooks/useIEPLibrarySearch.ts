import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  IEPSupportItem,
  IEPSearchQuery,
  IEPSearchResult,
  IEPSearchFacets,
  IEPSearchFacet
} from '@/types/iepSupports';

const DEFAULT_QUERY: IEPSearchQuery = {
  query_text: '',
  filters: {},
  sort: { by: 'title', direction: 'asc' },
  pagination: { page: 1, page_size: 20 },
  context: { school_based: false, include_student_links: false }
};

// Transform database row to IEPSupportItem
function transformItem(row: Record<string, unknown>): IEPSupportItem {
  const exportLang = row.export_language as Record<string, string> | null;
  const implNotes = row.implementation_notes;
  const itemType = row.item_type as string;
  const compliance = row.idea_compliance_level as string;
  
  return {
    id: row.id as string,
    item_type: (itemType?.charAt(0).toUpperCase() + itemType?.slice(1)) as IEPSupportItem['item_type'],
    title: row.title as string,
    description: row.description as string,
    implementation_notes: Array.isArray(implNotes) ? implNotes as string[] : [],
    domains: (row.domains as string[]) || [],
    disability_tags: (row.disability_tags as string[]) || [],
    grade_band: (row.grade_band as string[]) || [],
    setting_tags: (row.setting_tags as string[]) || [],
    topics: (row.topics as string[]) || [],
    contraindications: (row.contraindications as string[]) || [],
    idea_compliance_level: (compliance?.charAt(0).toUpperCase() + compliance?.slice(1)) as IEPSupportItem['idea_compliance_level'],
    export_language: exportLang ? { iep: exportLang.iep || '', parent: exportLang.parent || '' } : { iep: '', parent: '' },
    status: row.status as IEPSupportItem['status'],
    source_origin: row.source_origin as IEPSupportItem['source_origin'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    usage_count: row.usage_count as number,
    acceptance_rate: row.acceptance_rate as number
  };
}

// Build facets from items
function buildFacets(items: IEPSupportItem[]): IEPSearchFacets {
  const countValues = (arr: string[][]): Map<string, number> => {
    const counts = new Map<string, number>();
    arr.flat().forEach(val => {
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return counts;
  };

  const toFacets = (counts: Map<string, number>, displayMap?: Record<string, string>): IEPSearchFacet[] => {
    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        count,
        label: displayMap?.[value] || value
      }))
      .sort((a, b) => b.count - a.count);
  };

  return {
    item_type: toFacets(countValues(items.map(i => [i.item_type]))),
    domains: toFacets(countValues(items.map(i => i.domains))),
    topics: toFacets(countValues(items.map(i => i.topics))),
    disability_tags: toFacets(countValues(items.map(i => i.disability_tags))),
    grade_band: toFacets(countValues(items.map(i => i.grade_band))),
    setting_tags: toFacets(countValues(items.map(i => i.setting_tags))),
    idea_compliance_level: toFacets(countValues(items.map(i => [i.idea_compliance_level]))),
    source_origin: toFacets(countValues(items.map(i => i.source_origin ? [i.source_origin] : [])))
  };
}

export function useIEPLibrarySearch() {
  const [query, setQuery] = useState<IEPSearchQuery>(DEFAULT_QUERY);
  const [allItems, setAllItems] = useState<IEPSupportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all items once
  const fetchAllItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: queryError } = await supabase
        .from('iep_library_items')
        .select('*')
        .eq('status', 'active')
        .order('title', { ascending: true });

      if (queryError) throw queryError;

      const transformed = (data || []).map(row => transformItem(row as Record<string, unknown>));
      setAllItems(transformed);
    } catch (err) {
      console.error('Error fetching IEP library items:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  // Filter and search items based on query
  const searchResults = useMemo((): IEPSearchResult => {
    let filtered = [...allItems];

    // Text search
    if (query.query_text) {
      const searchLower = query.query_text.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.export_language.iep.toLowerCase().includes(searchLower) ||
        item.export_language.parent.toLowerCase().includes(searchLower) ||
        item.topics.some(t => t.toLowerCase().includes(searchLower)) ||
        item.domains.some(d => d.toLowerCase().includes(searchLower)) ||
        item.disability_tags.some(d => d.toLowerCase().includes(searchLower))
      );
    }

    // Apply filters
    const f = query.filters;
    
    if (f.item_type && f.item_type.length > 0) {
      filtered = filtered.filter(item => 
        f.item_type!.some(t => t.toLowerCase() === item.item_type.toLowerCase())
      );
    }

    if (f.domains && f.domains.length > 0) {
      filtered = filtered.filter(item => 
        item.domains.some(d => f.domains!.includes(d))
      );
    }

    if (f.topics && f.topics.length > 0) {
      filtered = filtered.filter(item => 
        item.topics.some(t => f.topics!.includes(t))
      );
    }

    if (f.disability_tags && f.disability_tags.length > 0) {
      filtered = filtered.filter(item => 
        item.disability_tags.some(d => f.disability_tags!.includes(d))
      );
    }

    if (f.grade_band && f.grade_band.length > 0) {
      filtered = filtered.filter(item => 
        item.grade_band.some(g => f.grade_band!.includes(g))
      );
    }

    if (f.setting_tags && f.setting_tags.length > 0) {
      filtered = filtered.filter(item => 
        item.setting_tags.some(s => f.setting_tags!.includes(s))
      );
    }

    if (f.idea_compliance_level && f.idea_compliance_level.length > 0) {
      filtered = filtered.filter(item => 
        f.idea_compliance_level!.some(c => c.toLowerCase() === item.idea_compliance_level.toLowerCase())
      );
    }

    if (f.source_origin && f.source_origin.length > 0) {
      filtered = filtered.filter(item => 
        item.source_origin && f.source_origin!.includes(item.source_origin)
      );
    }

    if (f.exclude_item_ids && f.exclude_item_ids.length > 0) {
      const excludeSet = new Set(f.exclude_item_ids);
      filtered = filtered.filter(item => !excludeSet.has(item.id));
    }

    // Build facets from all items (not filtered) for accurate counts
    const facets = buildFacets(allItems);

    // Sort
    const { by, direction } = query.sort;
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (by) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'recent':
          cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case 'recommendation_score':
          cmp = (b.usage_count || 0) - (a.usage_count || 0);
          break;
        default:
          cmp = a.title.localeCompare(b.title);
      }
      return direction === 'desc' ? -cmp : cmp;
    });

    // Paginate
    const { page, page_size } = query.pagination;
    const start = (page - 1) * page_size;
    const paginated = filtered.slice(start, start + page_size);

    return {
      items: paginated,
      facets,
      total: filtered.length,
      page,
      page_size
    };
  }, [allItems, query]);

  // Update query helpers
  const setSearchText = useCallback((text: string) => {
    setQuery(prev => ({ ...prev, query_text: text, pagination: { ...prev.pagination, page: 1 } }));
  }, []);

  const setFilter = useCallback(<K extends keyof IEPSearchQuery['filters']>(
    key: K, 
    value: IEPSearchQuery['filters'][K]
  ) => {
    setQuery(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      pagination: { ...prev.pagination, page: 1 }
    }));
  }, []);

  const toggleFilter = useCallback((key: keyof IEPSearchQuery['filters'], value: string) => {
    setQuery(prev => {
      const current = (prev.filters[key] as string[]) || [];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return {
        ...prev,
        filters: { ...prev.filters, [key]: newValues },
        pagination: { ...prev.pagination, page: 1 }
      };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setQuery(prev => ({
      ...prev,
      filters: {},
      pagination: { ...prev.pagination, page: 1 }
    }));
  }, []);

  const setSort = useCallback((by: IEPSearchQuery['sort']['by'], direction?: 'asc' | 'desc') => {
    setQuery(prev => ({
      ...prev,
      sort: { by, direction: direction || prev.sort.direction }
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setQuery(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }));
  }, []);

  const hasActiveFilters = useMemo(() => {
    const f = query.filters;
    return Object.values(f).some(v => Array.isArray(v) ? v.length > 0 : !!v);
  }, [query.filters]);

  return {
    query,
    setQuery,
    searchResults,
    allItems,
    isLoading,
    error,
    refetch: fetchAllItems,
    setSearchText,
    setFilter,
    toggleFilter,
    clearFilters,
    setSort,
    setPage,
    hasActiveFilters
  };
}
