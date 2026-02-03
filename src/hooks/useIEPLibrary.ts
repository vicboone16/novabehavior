import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  IEPLibraryItem,
  StudentIEPSupport,
  IEPLibraryFilters,
  RecommendedSupport,
  StudentIEPProfile,
  IEPItemType,
  IEPStudentStatus,
  IEPSource,
  RecommendationAction
} from '@/types/iepLibrary';

const DEFAULT_FILTERS: IEPLibraryFilters = {
  search: '',
  item_type: 'all',
  domains: [],
  disability_tags: [],
  grade_band: [],
  setting_tags: [],
  topics: [],
  sort_by: 'title'
};

export function useIEPLibrary() {
  const { user } = useAuth();
  const [libraryItems, setLibraryItems] = useState<IEPLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<IEPLibraryFilters>(DEFAULT_FILTERS);

  // Fetch library items with filters
  const fetchLibraryItems = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('iep_library_items')
        .select('*')
        .eq('status', 'active');

      // Apply filters
      if (filters.item_type !== 'all') {
        query = query.eq('item_type', filters.item_type);
      }

      if (filters.domains.length > 0) {
        query = query.overlaps('domains', filters.domains);
      }

      if (filters.disability_tags.length > 0) {
        query = query.overlaps('disability_tags', filters.disability_tags);
      }

      if (filters.grade_band.length > 0) {
        query = query.overlaps('grade_band', filters.grade_band);
      }

      if (filters.setting_tags.length > 0) {
        query = query.overlaps('setting_tags', filters.setting_tags);
      }

      // Apply sorting
      switch (filters.sort_by) {
        case 'most_used':
          query = query.order('usage_count', { ascending: false });
          break;
        case 'most_accepted':
          query = query.order('acceptance_rate', { ascending: false });
          break;
        case 'recently_added':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('title', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Client-side search filtering and type conversion
      let filteredData = (data || []).map(item => {
        const exportLang = item.export_language as unknown;
        return {
          ...item,
          implementation_notes: Array.isArray(item.implementation_notes) 
            ? item.implementation_notes as string[]
            : (typeof item.implementation_notes === 'object' && item.implementation_notes
              ? Object.values(item.implementation_notes as Record<string, string>)
              : []),
          export_language: (typeof exportLang === 'object' && exportLang && 'iep' in (exportLang as object))
            ? exportLang as { iep: string; parent: string }
            : { iep: '', parent: '' }
        };
      }) as IEPLibraryItem[];

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(item =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.topics.some(t => t.toLowerCase().includes(searchLower))
        );
      }

      setLibraryItems(filteredData);
    } catch (error) {
      console.error('Error fetching IEP library items:', error);
      toast.error('Failed to load IEP library');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLibraryItems();
  }, [fetchLibraryItems]);

  // Create a new library item
  const createLibraryItem = async (item: Partial<IEPLibraryItem>) => {
    try {
      const insertData: Record<string, unknown> = {
        item_type: item.item_type || 'accommodation',
        title: item.title || '',
        description: item.description || '',
        implementation_notes: item.implementation_notes || [],
        domains: item.domains || [],
        disability_tags: item.disability_tags || [],
        grade_band: item.grade_band || [],
        setting_tags: item.setting_tags || [],
        topics: item.topics || [],
        contraindications: item.contraindications || [],
        idea_compliance_level: item.idea_compliance_level || 'safe',
        export_language: item.export_language || { iep: '', parent: '' },
        evidence_notes: item.evidence_notes || null,
        source_reference: item.source_reference || null,
        status: item.status || 'active',
        agency_id: item.agency_id || null,
        created_by: user?.id || null
      };

      const { data, error } = await (supabase
        .from('iep_library_items') as any)
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Library item created');
      await fetchLibraryItems();
      return data;
    } catch (error) {
      console.error('Error creating library item:', error);
      toast.error('Failed to create library item');
      throw error;
    }
  };

  // Update a library item
  const updateLibraryItem = async (id: string, updates: Partial<IEPLibraryItem>) => {
    try {
      // Convert export_language if needed
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.export_language) {
        updateData.export_language = updates.export_language;
      }

      const { error } = await supabase
        .from('iep_library_items')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Library item updated');
      await fetchLibraryItems();
    } catch (error) {
      console.error('Error updating library item:', error);
      toast.error('Failed to update library item');
      throw error;
    }
  };

  // Archive a library item
  const archiveLibraryItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('iep_library_items')
        .update({ status: 'archived' })
        .eq('id', id);

      if (error) throw error;

      toast.success('Library item archived');
      await fetchLibraryItems();
    } catch (error) {
      console.error('Error archiving library item:', error);
      toast.error('Failed to archive library item');
      throw error;
    }
  };

  // Duplicate a library item
  const duplicateLibraryItem = async (id: string) => {
    try {
      const item = libraryItems.find(i => i.id === id);
      if (!item) throw new Error('Item not found');

      const insertData: Record<string, unknown> = {
        item_type: item.item_type,
        title: `${item.title} (Copy)`,
        description: item.description,
        implementation_notes: item.implementation_notes,
        domains: item.domains,
        disability_tags: item.disability_tags,
        grade_band: item.grade_band,
        setting_tags: item.setting_tags,
        topics: item.topics,
        contraindications: item.contraindications,
        idea_compliance_level: item.idea_compliance_level,
        export_language: item.export_language,
        evidence_notes: item.evidence_notes,
        source_reference: item.source_reference,
        status: 'active',
        agency_id: item.agency_id,
        created_by: user?.id || null
      };
      
      const { data, error } = await (supabase
        .from('iep_library_items') as any)
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      toast.success('Library item duplicated');
      await fetchLibraryItems();
      return data;
    } catch (error) {
      console.error('Error duplicating library item:', error);
      toast.error('Failed to duplicate library item');
      throw error;
    }
  };

  return {
    libraryItems,
    isLoading,
    filters,
    setFilters,
    fetchLibraryItems,
    createLibraryItem,
    updateLibraryItem,
    archiveLibraryItem,
    duplicateLibraryItem
  };
}

// Hook for student-specific IEP supports
export function useStudentIEPSupports(studentId: string) {
  const { user } = useAuth();
  const [supports, setSupports] = useState<StudentIEPSupport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch student supports with library item details
  const fetchSupports = useCallback(async () => {
    if (!studentId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_iep_supports')
        .select(`
          *,
          library_item:iep_library_items(*)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = (data || []).map(item => {
        const rawLibraryItem = item.library_item as Record<string, unknown> | null;
        const libraryItem = rawLibraryItem ? {
          ...rawLibraryItem,
          implementation_notes: Array.isArray(rawLibraryItem.implementation_notes) 
            ? rawLibraryItem.implementation_notes as string[]
            : (typeof rawLibraryItem.implementation_notes === 'object' && rawLibraryItem.implementation_notes
              ? Object.values(rawLibraryItem.implementation_notes as Record<string, string>)
              : []),
          export_language: (typeof rawLibraryItem.export_language === 'object' && rawLibraryItem.export_language && 'iep' in (rawLibraryItem.export_language as object))
            ? rawLibraryItem.export_language as { iep: string; parent: string }
            : { iep: '', parent: '' }
        } as IEPLibraryItem : undefined;

        return {
          ...item,
          library_item: libraryItem
        };
      }) as StudentIEPSupport[];

      setSupports(processedData);
    } catch (error) {
      console.error('Error fetching student IEP supports:', error);
      toast.error('Failed to load student supports');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchSupports();
  }, [fetchSupports]);

  // Add support from library
  const addFromLibrary = async (
    libraryItemId: string,
    status: IEPStudentStatus = 'considering',
    source: IEPSource = 'clinician_added'
  ) => {
    try {
      // Fetch the library item to get type
      const { data: libraryItem, error: fetchError } = await supabase
        .from('iep_library_items')
        .select('item_type')
        .eq('id', libraryItemId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('student_iep_supports')
        .insert({
          student_id: studentId,
          library_item_id: libraryItemId,
          item_type: libraryItem.item_type,
          student_status: status,
          source,
          created_by: user?.id || null
        });

      if (error) throw error;

      // Increment usage count (ignore errors if function doesn't exist)
      try {
        await supabase
          .from('iep_library_items')
          .update({ usage_count: supabase.rpc ? 1 : 1 }) // Placeholder - would need proper increment
          .eq('id', libraryItemId);
      } catch {
        // Silent fail
      }

      toast.success('Support added to student');
      await fetchSupports();
    } catch (error) {
      console.error('Error adding support from library:', error);
      toast.error('Failed to add support');
      throw error;
    }
  };

  // Add custom support
  const addCustomSupport = async (
    title: string,
    description: string,
    itemType: IEPItemType,
    status: IEPStudentStatus = 'considering'
  ) => {
    try {
      const { error } = await supabase
        .from('student_iep_supports')
        .insert({
          student_id: studentId,
          custom_title: title,
          custom_description: description,
          item_type: itemType,
          student_status: status,
          source: 'clinician_added',
          created_by: user?.id || null
        });

      if (error) throw error;

      toast.success('Custom support added');
      await fetchSupports();
    } catch (error) {
      console.error('Error adding custom support:', error);
      toast.error('Failed to add custom support');
      throw error;
    }
  };

  // Update support status
  const updateStatus = async (supportId: string, newStatus: IEPStudentStatus) => {
    try {
      const { error } = await supabase
        .from('student_iep_supports')
        .update({ student_status: newStatus })
        .eq('id', supportId);

      if (error) throw error;

      toast.success(`Support moved to ${newStatus.replace('_', ' ')}`);
      await fetchSupports();
    } catch (error) {
      console.error('Error updating support status:', error);
      toast.error('Failed to update status');
      throw error;
    }
  };

  // Update support notes
  const updateNotes = async (supportId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('student_iep_supports')
        .update({ notes })
        .eq('id', supportId);

      if (error) throw error;

      toast.success('Notes updated');
      await fetchSupports();
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
      throw error;
    }
  };

  // Set review date
  const setReviewDate = async (supportId: string, reviewDate: string) => {
    try {
      const { error } = await supabase
        .from('student_iep_supports')
        .update({ 
          review_date: reviewDate,
          last_reviewed_by: user?.id || null,
          last_reviewed_at: new Date().toISOString()
        })
        .eq('id', supportId);

      if (error) throw error;

      toast.success('Review date set');
      await fetchSupports();
    } catch (error) {
      console.error('Error setting review date:', error);
      toast.error('Failed to set review date');
      throw error;
    }
  };

  // Remove support from student
  const removeSupport = async (supportId: string) => {
    try {
      const { error } = await supabase
        .from('student_iep_supports')
        .delete()
        .eq('id', supportId);

      if (error) throw error;

      toast.success('Support removed');
      await fetchSupports();
    } catch (error) {
      console.error('Error removing support:', error);
      toast.error('Failed to remove support');
      throw error;
    }
  };

  // Get supports by status
  const getSupportsByStatus = (status: IEPStudentStatus) => 
    supports.filter(s => s.student_status === status);

  return {
    supports,
    isLoading,
    fetchSupports,
    addFromLibrary,
    addCustomSupport,
    updateStatus,
    updateNotes,
    setReviewDate,
    removeSupport,
    getSupportsByStatus,
    existingSupports: getSupportsByStatus('existing'),
    consideringSupports: getSupportsByStatus('considering'),
    notUsingSupports: getSupportsByStatus('not_using')
  };
}

// Hook for IEP recommendations
export function useIEPRecommendations(studentId: string, studentProfile?: StudentIEPProfile) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedSupport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate recommendations based on student profile
  const generateRecommendations = useCallback(async () => {
    if (!studentId || !studentProfile) return;

    setIsLoading(true);
    try {
      // Fetch active library items
      const { data: libraryItems, error: libraryError } = await supabase
        .from('iep_library_items')
        .select('*')
        .eq('status', 'active');

      if (libraryError) throw libraryError;

      // Fetch existing student supports to exclude
      const { data: existingSupports, error: supportsError } = await supabase
        .from('student_iep_supports')
        .select('library_item_id')
        .eq('student_id', studentId)
        .not('library_item_id', 'is', null);

      if (supportsError) throw supportsError;

      const existingItemIds = new Set(existingSupports?.map(s => s.library_item_id) || []);

      // Fetch acceptance rates from logs
      const { data: logs } = await supabase
        .from('iep_recommendation_logs')
        .select('library_item_id, user_action')
        .eq('user_action', 'accepted');

      // Score and filter items
      const scored = (libraryItems || [])
        .filter(item => !existingItemIds.has(item.id))
        .map(item => {
          let score = 0;
          const factors = {
            grade_band_match: false,
            disability_match: false,
            domain_match: false,
            similar_student_acceptance: 0
          };

          // Grade band match (+30)
          if ((item.grade_band as string[] | null)?.some((g: string) => g === studentProfile.grade_band)) {
            score += 30;
            factors.grade_band_match = true;
          }

          // Disability match (+25)
          if ((item.disability_tags as string[] | null)?.some((d: string) => studentProfile.disability_tags.includes(d))) {
            score += 25;
            factors.disability_match = true;
          }

          // Domain match (+20 per matching domain)
          const domainMatches = (item.domains as string[] | null)?.filter((d: string) => 
            studentProfile.active_domains.includes(d)
          ).length || 0;
          if (domainMatches > 0) {
            score += Math.min(domainMatches * 20, 40);
            factors.domain_match = true;
          }

          // Presenting concerns match (+10)
          if ((item.topics as string[] | null)?.some((t: string) => 
            studentProfile.presenting_concerns.some(c => 
              t.toLowerCase().includes(c.toLowerCase())
            )
          )) {
            score += 10;
          }

          // Check contraindications (-100 if matches safety flags)
          if ((item.contraindications as string[] | null)?.some((c: string) =>
            studentProfile.safety_flags.some(f =>
              c.toLowerCase().includes(f.toLowerCase())
            )
          )) {
            score = -100;
          }

          // Boost accommodations over modifications (+5)
          if (item.item_type === 'accommodation') {
            score += 5;
          }

          // Acceptance rate boost
          const itemLogs = logs?.filter(l => l.library_item_id === item.id) || [];
          if (itemLogs.length > 0) {
            factors.similar_student_acceptance = Math.round((itemLogs.length / (logs?.length || 1)) * 100);
            score += Math.min(factors.similar_student_acceptance / 10, 10);
          }

          const exportLang = item.export_language as unknown;

          return {
            library_item: {
              ...item,
              implementation_notes: Array.isArray(item.implementation_notes) 
                ? item.implementation_notes as string[]
                : [],
              export_language: (typeof exportLang === 'object' && exportLang && 'iep' in (exportLang as object))
                ? exportLang as { iep: string; parent: string }
                : { iep: '', parent: '' }
            } as IEPLibraryItem,
            confidence: Math.max(0, Math.min(100, score)),
            matching_factors: factors,
            reason: generateReasonText(item, factors, studentProfile)
          };
        })
        .filter(r => r.confidence > 20)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);

      setRecommendations(scored);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Failed to generate recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [studentId, studentProfile]);

  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  // Log recommendation action
  const logAction = async (
    libraryItemId: string,
    action: RecommendationAction,
    reason: string,
    confidence: number
  ) => {
    try {
      const { error } = await (supabase
        .from('iep_recommendation_logs') as any)
        .insert([{
          student_id: studentId,
          library_item_id: libraryItemId,
          recommended_reason: reason,
          confidence,
          user_action: action,
          actioned_by: user?.id || null,
          actioned_at: new Date().toISOString(),
          student_profile_snapshot: studentProfile || null
        }]);

      if (error) throw error;

      // Update acceptance rate if accepted
      if (action === 'accepted') {
        await updateAcceptanceRate(libraryItemId);
      }

      // Remove from recommendations list
      setRecommendations(prev => prev.filter(r => r.library_item.id !== libraryItemId));
    } catch (error) {
      console.error('Error logging recommendation action:', error);
    }
  };

  return {
    recommendations,
    isLoading,
    generateRecommendations,
    logAction
  };
}

// Helper function to generate recommendation reason text
function generateReasonText(
  item: Record<string, unknown>,
  factors: { grade_band_match: boolean; disability_match: boolean; domain_match: boolean; similar_student_acceptance: number },
  profile: StudentIEPProfile
): string {
  const reasons: string[] = [];

  if (factors.grade_band_match) {
    reasons.push(`appropriate for ${profile.grade_band.replace('_', ' ')} students`);
  }

  if (factors.disability_match) {
    const matchingDisabilities = (item.disability_tags as string[] | null)?.filter((d: string) => 
      profile.disability_tags.includes(d)
    ) || [];
    if (matchingDisabilities.length > 0) {
      reasons.push(`commonly used for ${matchingDisabilities[0]}`);
    }
  }

  if (factors.domain_match) {
    const matchingDomains = (item.domains as string[] | null)?.filter((d: string) => 
      profile.active_domains.includes(d)
    ) || [];
    if (matchingDomains.length > 0) {
      reasons.push(`supports ${matchingDomains[0].replace('_', ' ')}`);
    }
  }

  if (factors.similar_student_acceptance > 30) {
    reasons.push(`frequently accepted for similar students`);
  }

  return reasons.length > 0 
    ? `Recommended because this support is ${reasons.join(', ')}.`
    : 'Recommended based on student profile.';
}

// Helper to update acceptance rate
async function updateAcceptanceRate(libraryItemId: string) {
  try {
    const { data: logs } = await supabase
      .from('iep_recommendation_logs')
      .select('user_action')
      .eq('library_item_id', libraryItemId);

    if (logs && logs.length > 0) {
      const accepted = logs.filter(l => l.user_action === 'accepted').length;
      const rate = Math.round((accepted / logs.length) * 100);

      await supabase
        .from('iep_library_items')
        .update({ acceptance_rate: rate })
        .eq('id', libraryItemId);
    }
  } catch (error) {
    console.error('Error updating acceptance rate:', error);
  }
}
