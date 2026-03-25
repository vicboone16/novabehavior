import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BehaviorTranslation {
  function_category: string;
  clinical_term: string;
  parent_friendly: string;
  learning_frame: string;
  home_strategies: string[];
}

const db = supabase as any;

// In-memory cache
let translationCache: BehaviorTranslation[] | null = null;

export function useBehaviorTranslations() {
  const [translations, setTranslations] = useState<BehaviorTranslation[]>(translationCache || []);
  const [loading, setLoading] = useState(!translationCache);

  useEffect(() => {
    if (translationCache) return;
    db.from('behavior_translations')
      .select('function_category, clinical_term, parent_friendly, learning_frame, home_strategies')
      .eq('is_default', true)
      .then(({ data }: any) => {
        const rows = (data || []).map((r: any) => ({
          ...r,
          home_strategies: Array.isArray(r.home_strategies) ? r.home_strategies : [],
        }));
        translationCache = rows;
        setTranslations(rows);
        setLoading(false);
      });
  }, []);

  const translate = useCallback((clinicalTerm: string, functionCategory?: string): BehaviorTranslation | null => {
    const pool = translationCache || translations;
    const normalized = clinicalTerm.toLowerCase().trim();
    
    // Try exact match with function
    if (functionCategory) {
      const exact = pool.find(
        t => t.clinical_term.toLowerCase() === normalized && 
             t.function_category.toLowerCase() === functionCategory.toLowerCase()
      );
      if (exact) return exact;
    }
    
    // Try term-only match
    const termMatch = pool.find(t => t.clinical_term.toLowerCase() === normalized);
    if (termMatch) return termMatch;

    // Try partial match
    const partial = pool.find(
      t => normalized.includes(t.clinical_term.toLowerCase()) || 
           t.clinical_term.toLowerCase().includes(normalized)
    );
    return partial || null;
  }, [translations]);

  const translateFunction = useCallback((functionCategory: string): string => {
    const map: Record<string, string> = {
      escape: 'avoiding tasks',
      attention: 'seeking connection',
      access: 'wanting something specific',
      automatic: 'sensory/self-regulation',
      tangible: 'wanting something specific',
      sensory: 'sensory/self-regulation',
    };
    return map[functionCategory.toLowerCase()] || functionCategory;
  }, []);

  return { translations, loading, translate, translateFunction };
}

// Standalone translation utility (no hooks)
export function translateBehaviorFunction(fn: string): string {
  const map: Record<string, string> = {
    escape: 'avoiding tasks',
    attention: 'seeking connection',
    access: 'wanting something specific',
    automatic: 'sensory/self-regulation',
    tangible: 'wanting something specific',
    sensory: 'sensory/self-regulation',
  };
  return map[fn.toLowerCase()] || fn;
}

export function buildLearningFrame(fn: string, behavior: string): string {
  const fnFriendly = translateBehaviorFunction(fn);
  return `Your child is learning to manage ${fnFriendly} in healthy ways.`;
}
