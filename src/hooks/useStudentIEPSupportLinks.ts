import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  StudentIEPSupportLink,
  LinkStatus,
  LinkOwner,
  IEPSupportItem,
  IEPRecommendationRequest,
  IEPRecommendationItem,
  IEPRecommendationResult,
  RecommendationConfidence,
  RiskFlag,
  DataSignals
} from '@/types/iepSupports';
import {
  getWeightsForProfile,
  getConfidenceForProfile,
  deduplicateRecommendations,
  mapGoalToDomainTopics,
  matchTopicWithSynonyms,
  TOPIC_DICTIONARY
} from '@/lib/iepRecommendationConfig';

// Transform database row to typed object
function transformSupportLink(row: Record<string, unknown>): StudentIEPSupportLink {
  const item = row.item as Record<string, unknown> | null;
  
  return {
    link_id: row.link_id as string,
    student_id: row.student_id as string,
    item_id: row.item_id as string,
    link_status: row.link_status as LinkStatus,
    owner: row.owner as LinkOwner,
    notes: row.notes as string | null,
    evidence: row.evidence as StudentIEPSupportLink['evidence'],
    date_added: row.date_added as string,
    date_updated: row.date_updated as string,
    review_due: row.review_due as string | null,
    approved_by: row.approved_by as string | null,
    implementation_plan: row.implementation_plan as StudentIEPSupportLink['implementation_plan'],
    confirmation_required: row.confirmation_required as boolean,
    confirmed_at: row.confirmed_at as string | null,
    confirmed_by: row.confirmed_by as string | null,
    recommendation_score: row.recommendation_score as number | null,
    recommendation_confidence: row.recommendation_confidence as RecommendationConfidence | null,
    rationale_bullets: (row.rationale_bullets as string[]) || [],
    risk_flags: (row.risk_flags as string[]) || [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    created_by: row.created_by as string | null,
    item: item ? transformLibraryItem(item) : undefined
  };
}

function transformLibraryItem(row: Record<string, unknown>): IEPSupportItem {
  const exportLang = row.export_language as Record<string, string> | null;
  const implNotes = row.implementation_notes;
  
  return {
    id: row.id as string,
    item_type: (row.item_type as string)?.charAt(0).toUpperCase() + (row.item_type as string)?.slice(1) as IEPSupportItem['item_type'],
    title: row.title as string,
    description: row.description as string,
    implementation_notes: Array.isArray(implNotes) ? implNotes as string[] : [],
    domains: (row.domains as string[]) || [],
    disability_tags: (row.disability_tags as string[]) || [],
    grade_band: (row.grade_band as string[]) || [],
    setting_tags: (row.setting_tags as string[]) || [],
    topics: (row.topics as string[]) || [],
    contraindications: (row.contraindications as string[]) || [],
    idea_compliance_level: ((row.idea_compliance_level as string)?.charAt(0).toUpperCase() + (row.idea_compliance_level as string)?.slice(1)) as IEPSupportItem['idea_compliance_level'],
    export_language: exportLang ? { iep: exportLang.iep || '', parent: exportLang.parent || '' } : { iep: '', parent: '' },
    status: row.status as IEPSupportItem['status'],
    source_origin: row.source_origin as IEPSupportItem['source_origin'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    usage_count: row.usage_count as number,
    acceptance_rate: row.acceptance_rate as number
  };
}

export function useStudentIEPSupportLinks(studentId: string) {
  const { user } = useAuth();
  const [links, setLinks] = useState<StudentIEPSupportLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all links for the student with joined item data
  const fetchLinks = useCallback(async () => {
    if (!studentId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: queryError } = await supabase
        .from('student_iep_support_links')
        .select(`
          *,
          item:iep_library_items(*)
        `)
        .eq('student_id', studentId)
        .order('date_added', { ascending: false });

      if (queryError) throw queryError;

      const transformed = (data || []).map(row => transformSupportLink(row as Record<string, unknown>));
      setLinks(transformed);
    } catch (err) {
      console.error('Error fetching student IEP support links:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Get links by status
  const getLinksByStatus = useCallback((status: LinkStatus) => {
    return links.filter(l => l.link_status === status);
  }, [links]);

  const existingLinks = useMemo(() => getLinksByStatus('existing'), [getLinksByStatus]);
  const consideringLinks = useMemo(() => getLinksByStatus('considering'), [getLinksByStatus]);
  const recommendedLinks = useMemo(() => getLinksByStatus('recommended'), [getLinksByStatus]);
  const rejectedLinks = useMemo(() => getLinksByStatus('rejected'), [getLinksByStatus]);

  // Create or update a link
  const upsertLink = useCallback(async (
    itemId: string,
    status: LinkStatus,
    options?: {
      owner?: LinkOwner;
      notes?: string;
      recommendation_score?: number;
      recommendation_confidence?: RecommendationConfidence;
      rationale_bullets?: string[];
      risk_flags?: RiskFlag[];
      confirmation_required?: boolean;
    }
  ) => {
    try {
      // Check if link exists
      const existing = links.find(l => l.item_id === itemId);
      
      if (existing) {
        // Update existing link
        const { error } = await supabase
          .from('student_iep_support_links')
          .update({
            link_status: status,
            ...(options?.notes !== undefined && { notes: options.notes }),
            ...(options?.owner && { owner: options.owner }),
            date_updated: new Date().toISOString().split('T')[0]
          })
          .eq('link_id', existing.link_id);

        if (error) throw error;
        toast.success(`Support moved to ${status}`);
      } else {
        // Create new link
        const { error } = await supabase
          .from('student_iep_support_links')
          .insert({
            student_id: studentId,
            item_id: itemId,
            link_status: status,
            owner: options?.owner || 'bcba',
            notes: options?.notes || null,
            recommendation_score: options?.recommendation_score || null,
            recommendation_confidence: options?.recommendation_confidence || null,
            rationale_bullets: options?.rationale_bullets || [],
            risk_flags: options?.risk_flags || [],
            confirmation_required: options?.confirmation_required || false,
            created_by: user?.id || null
          });

        if (error) throw error;
        toast.success(`Support added as ${status}`);
      }

      await fetchLinks();
    } catch (err) {
      console.error('Error upserting support link:', err);
      toast.error('Failed to update support');
      throw err;
    }
  }, [studentId, user?.id, links, fetchLinks]);

  // Update link status
  const updateLinkStatus = useCallback(async (
    linkId: string,
    newStatus: LinkStatus,
    options?: { confirmed?: boolean }
  ) => {
    try {
      const updateData: Record<string, unknown> = {
        link_status: newStatus,
        date_updated: new Date().toISOString().split('T')[0]
      };

      if (options?.confirmed) {
        updateData.confirmed_at = new Date().toISOString();
        updateData.confirmed_by = user?.id;
        updateData.confirmation_required = false;
      }

      const { error } = await supabase
        .from('student_iep_support_links')
        .update(updateData)
        .eq('link_id', linkId);

      if (error) throw error;
      
      toast.success(`Support moved to ${newStatus}`);
      await fetchLinks();
    } catch (err) {
      console.error('Error updating link status:', err);
      toast.error('Failed to update status');
      throw err;
    }
  }, [user?.id, fetchLinks]);

  // Update notes
  const updateNotes = useCallback(async (linkId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('student_iep_support_links')
        .update({ notes })
        .eq('link_id', linkId);

      if (error) throw error;
      
      toast.success('Notes updated');
      await fetchLinks();
    } catch (err) {
      console.error('Error updating notes:', err);
      toast.error('Failed to update notes');
    }
  }, [fetchLinks]);

  // Set review date
  const setReviewDate = useCallback(async (linkId: string, reviewDate: string) => {
    try {
      const { error } = await supabase
        .from('student_iep_support_links')
        .update({ review_due: reviewDate })
        .eq('link_id', linkId);

      if (error) throw error;
      
      toast.success('Review date set');
      await fetchLinks();
    } catch (err) {
      console.error('Error setting review date:', err);
      toast.error('Failed to set review date');
    }
  }, [fetchLinks]);

  // Delete link
  const deleteLink = useCallback(async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('student_iep_support_links')
        .delete()
        .eq('link_id', linkId);

      if (error) throw error;
      
      toast.success('Support removed');
      await fetchLinks();
    } catch (err) {
      console.error('Error deleting link:', err);
      toast.error('Failed to remove support');
    }
  }, [fetchLinks]);

  return {
    links,
    isLoading,
    error,
    fetchLinks,
    existingLinks,
    consideringLinks,
    recommendedLinks,
    rejectedLinks,
    getLinksByStatus,
    upsertLink,
    updateLinkStatus,
    updateNotes,
    setReviewDate,
    deleteLink
  };
}

// ==================== Recommendation Engine Hook ====================

export function useIEPRecommendations(studentId: string) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<IEPRecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const generateRecommendations = useCallback(async (
    request: IEPRecommendationRequest
  ): Promise<IEPRecommendationResult> => {
    setIsLoading(true);
    
    try {
      // Fetch all active library items
      const { data: allItems, error: itemsError } = await supabase
        .from('iep_library_items')
        .select('*')
        .eq('status', 'active');

      if (itemsError) throw itemsError;

      // Get existing links to exclude
      const { data: existingLinks } = await supabase
        .from('student_iep_support_links')
        .select('item_id')
        .eq('student_id', studentId)
        .in('link_status', ['existing', 'considering']);

      const existingItemIds = new Set(existingLinks?.map(l => l.item_id) || []);
      const excludeIds = new Set([
        ...request.constraints.exclude_item_ids,
        ...request.student.current_accommodations_item_ids,
        ...request.student.current_modifications_item_ids
      ]);

      // Filter candidates
      let candidates = (allItems || []).filter(item => {
        // Exclude already linked items
        if (existingItemIds.has(item.id)) return false;
        if (excludeIds.has(item.id)) return false;

        // Filter by allowed types
        const itemType = item.item_type?.charAt(0).toUpperCase() + item.item_type?.slice(1);
        if (!request.constraints.allowed_item_types.includes(itemType as 'Accommodation' | 'Modification')) {
          return false;
        }

        // School-based mode filter
        if (request.constraints.school_based_mode) {
          const settings = (item.setting_tags as string[]) || [];
          const studentSettings = request.student.settings;
          const hasMatch = settings.some(s => studentSettings.includes(s)) || settings.includes('general_ed');
          if (!hasMatch) return false;
        }

        return true;
      });

      // Score candidates
      const scored = candidates.map(item => {
        const score = calculateScore(item, request);
        const rationale = buildRationale(item, request);
        const riskFlags = identifyRiskFlags(item);
        const confidence = getConfidence(score);

        return {
          item_id: item.id,
          rank: 0,
          recommendation_score: score,
          confidence,
          recommended_link_status: 'recommended' as const,
          rationale_bullets: rationale,
          risk_flags: riskFlags,
          suggested_export_language: {
            iep: (item.export_language as { iep?: string })?.iep || '',
            parent: (item.export_language as { parent?: string })?.parent || ''
          },
          item: transformLibraryItem(item as Record<string, unknown>)
        };
      });

      // Deduplicate similar items
      const deduped = deduplicateRecommendations(scored.filter(r => r.recommendation_score > 0));

      // Sort by score and take top N
      const sorted = deduped
        .sort((a, b) => b.recommendation_score - a.recommendation_score)
        .slice(0, request.constraints.max_recommendations)
        .map((r, idx) => ({ ...r, rank: idx + 1 }));

      const result: IEPRecommendationResult = {
        student_id: studentId,
        generated_at: new Date().toISOString(),
        recommendations: sorted
      };

      setRecommendations(sorted);
      setGeneratedAt(result.generated_at);

      return result;
    } catch (err) {
      console.error('Error generating recommendations:', err);
      toast.error('Failed to generate recommendations');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  return {
    recommendations,
    isLoading,
    generatedAt,
    generateRecommendations,
    clearRecommendations: () => setRecommendations([])
  };
}

// ==================== Scoring Functions with Configurable Weights ====================

function calculateScore(
  item: Record<string, unknown>,
  request: IEPRecommendationRequest,
  profileId?: string
): number {
  const weights = getWeightsForProfile(profileId);
  let score = 0;
  const student = request.student;
  const goals = request.goals;
  const signals = request.data_signals;

  // 1) Eligibility / disability match
  const disabilityTags = (item.disability_tags as string[]) || [];
  if (disabilityTags.some(d => student.eligibility.includes(d))) {
    score += weights.eligibility_match;
  }
  if (disabilityTags.includes('all')) {
    score += weights.eligibility_all_tag;
  }

  // 2) Grade band match
  const gradeBand = (item.grade_band as string[]) || [];
  if (gradeBand.includes(student.grade_band) || gradeBand.includes('all')) {
    score += weights.grade_band_match;
  }

  // 3) Setting match
  const settings = (item.setting_tags as string[]) || [];
  if (settings.some(s => student.settings.includes(s))) {
    score += weights.setting_match;
  } else if (settings.includes('general_ed')) {
    score += weights.general_ed_setting_bonus;
  }

  // 4) Goal/domain match using crosswalk
  const domains = (item.domains as string[]) || [];
  const topics = (item.topics as string[]) || [];
  
  for (const goal of goals) {
    // Try to map goal text to domains/topics via crosswalk
    const mapped = mapGoalToDomainTopics(goal.goal_text);
    if (mapped) {
      if (domains.includes(mapped.domain)) {
        score += weights.goal_domain_match_per_goal;
      }
      if (mapped.topics.some(t => matchTopicWithSynonyms(t, topics))) {
        score += weights.goal_topic_match_per_goal;
      }
    }
    // Also check direct matches
    if (domains.includes(goal.domain)) {
      score += weights.goal_domain_match_per_goal;
    }
    if (matchTopicWithSynonyms(goal.skill_area, topics)) {
      score += weights.goal_topic_match_per_goal;
    }
  }

  // 5) Data signal match using topic dictionary synonyms
  const allSignals = [
    ...signals.academic,
    ...signals.behavior,
    ...signals.attendance,
    ...signals.sensory,
    ...signals.communication,
    ...signals.executive_function
  ];
  
  let signalMatches = 0;
  for (const signal of allSignals) {
    const signalLower = signal.toLowerCase().replace(/\s+/g, '_');
    if ([...domains, ...topics].some(d => {
      if (d === signalLower) return true;
      const dictEntry = TOPIC_DICTIONARY[d];
      return dictEntry?.synonyms.some(s => s === signalLower || signalLower.includes(s));
    })) {
      signalMatches++;
    }
  }
  score += signalMatches * weights.data_signal_match_per_hit;

  // 6) Compliance weighting
  const compliance = item.idea_compliance_level as string;
  if (compliance?.toLowerCase() === 'safe') {
    score += weights.safe_bonus;
  } else if (compliance?.toLowerCase() === 'caution') {
    score += weights.caution_penalty;
  }
  
  if ((item.item_type as string)?.toLowerCase() === 'modification') {
    score += weights.modification_penalty;
  }

  // 7) Contraindication penalty
  const contraindications = (item.contraindications as string[]) || [];
  if (contraindications.length > 0) {
    score += weights.contraindication_present_penalty;
  }

  return Math.max(0, score);
}

function buildRationale(
  item: Record<string, unknown>,
  request: IEPRecommendationRequest
): string[] {
  const reasons: string[] = [];
  const student = request.student;
  const goals = request.goals;
  const signals = request.data_signals;

  const disabilityTags = (item.disability_tags as string[]) || [];
  const matchingDisabilities = disabilityTags.filter(d => student.eligibility.includes(d));
  if (matchingDisabilities.length > 0) {
    reasons.push(`Matches eligibility/needs: ${matchingDisabilities.join(', ')}`);
  }

  const domains = (item.domains as string[]) || [];
  const matchingDomains = domains.filter(d => goals.some(g => g.domain === d));
  if (matchingDomains.length > 0) {
    reasons.push(`Aligned to goal domain(s): ${matchingDomains.join(', ')}`);
  }

  const settings = (item.setting_tags as string[]) || [];
  const matchingSettings = settings.filter(s => student.settings.includes(s));
  if (matchingSettings.length > 0) {
    reasons.push(`Fits current setting(s): ${matchingSettings.join(', ')}`);
  }

  const topics = (item.topics as string[]) || [];
  const allSignals = [
    ...signals.academic,
    ...signals.behavior,
    ...signals.sensory,
    ...signals.communication,
    ...signals.executive_function
  ];
  const matchingTopics = topics.filter(t => 
    allSignals.some(s => s.toLowerCase().includes(t.toLowerCase()))
  );
  if (matchingTopics.length > 0) {
    reasons.push(`Targets observed needs: ${matchingTopics.slice(0, 3).join(', ')}`);
  }

  return reasons.slice(0, 3);
}

function identifyRiskFlags(item: Record<string, unknown>): RiskFlag[] {
  const flags: RiskFlag[] = [];
  
  const compliance = item.idea_compliance_level as string;
  if (compliance?.toLowerCase() === 'caution') {
    flags.push('caution_item');
  }
  
  if ((item.item_type as string)?.toLowerCase() === 'modification') {
    flags.push('modification_requires_team');
  }

  const contraindications = (item.contraindications as string[]) || [];
  if (contraindications.length > 0) {
    flags.push('contraindication_present');
  }

  return flags;
}

function getConfidence(score: number, profileId?: string): RecommendationConfidence {
  const thresholds = getConfidenceForProfile(profileId);
  if (score >= thresholds.high_min_score) return 'high';
  if (score >= thresholds.medium_min_score) return 'medium';
  return 'low';
}
