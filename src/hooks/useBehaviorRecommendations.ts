import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecommendationResult {
  strategy_id: string;
  strategy_key: string;
  strategy_name: string;
  strategy_group: string;
  category: string;
  evidence_level: string;
  priority_score: number;
  rationale: string;
  teacher_quick_version: string;
  family_version: string;
}

export interface RecommendationProfile {
  id: string | null;
  title: string | null;
  profile_key: string | null;
  description: string | null;
  function_target: string | null;
  environment: string | null;
  escalation_level: string | null;
  age_band: string | null;
  tier: string | null;
  is_active: boolean | null;
  strategy_count: number | null;
}

export interface SavedResult {
  id: string;
  function_target: string | null;
  environment: string | null;
  escalation_level: string | null;
  age_band: string | null;
  tier: string | null;
  student_id: string | null;
  profile_id: string | null;
  notes: string | null;
  generated_by: string | null;
  created_at: string | null;
}

export interface SavedResultDetail {
  recommendation_result_id: string | null;
  strategy_id: string | null;
  strategy_key: string | null;
  strategy_name: string | null;
  strategy_group: string | null;
  priority_score: number | null;
  rationale: string | null;
  selected: boolean | null;
  teacher_quick_version: string | null;
  function_target: string | null;
  environment: string | null;
  escalation_level: string | null;
  age_band: string | null;
  tier: string | null;
  student_id: string | null;
  created_at: string | null;
}

export interface QuickRecommendParams {
  function_target: string;
  environment?: string;
  escalation_level?: string;
  age_band?: string;
  tier?: string;
}

export function useBehaviorRecommendations() {
  const [profiles, setProfiles] = useState<RecommendationProfile[]>([]);
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('v_behavior_recommendation_profiles').select('*');
      if (error) {
        // fallback to base table
        const { data: base } = await supabase.from('behavior_recommendation_profiles').select('*');
        setProfiles((base || []) as RecommendationProfile[]);
      } else {
        setProfiles((data || []) as RecommendationProfile[]);
      }
    } catch (err: any) {
      console.error('Failed to load recommendation profiles:', err.message);
    }
  }, []);

  const fetchSavedResults = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('behavior_recommendation_results')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSavedResults((data || []) as SavedResult[]);
    } catch (err: any) {
      console.error('Failed to load saved results:', err.message);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchProfiles(), fetchSavedResults()]);
    setIsLoading(false);
  }, [fetchProfiles, fetchSavedResults]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const quickRecommend = useCallback(async (params: QuickRecommendParams): Promise<RecommendationResult[]> => {
    try {
      const args: any = { p_function_target: params.function_target };
      if (params.environment) args.p_environment = params.environment;
      if (params.escalation_level) args.p_escalation_level = params.escalation_level;
      if (params.age_band) args.p_age_band = params.age_band;
      if (params.tier) args.p_tier = params.tier;

      const { data, error } = await (supabase.rpc as any)('recommend_behavior_strategies_v2', args);
      if (error) throw error;
      return (data || []) as RecommendationResult[];
    } catch (err: any) {
      toast.error('Recommendation failed: ' + err.message);
      return [];
    }
  }, []);

  const saveRecommendationSet = useCallback(async (
    params: QuickRecommendParams,
    strategies: RecommendationResult[],
    studentId?: string,
    notes?: string
  ): Promise<string | null> => {
    try {
      // 1) Insert result
      const { data: resultData, error: resultErr } = await supabase
        .from('behavior_recommendation_results')
        .insert({
          function_target: params.function_target,
          environment: params.environment || null,
          escalation_level: params.escalation_level || null,
          age_band: params.age_band || null,
          tier: params.tier || null,
          student_id: studentId || null,
          notes: notes || null,
        })
        .select('id')
        .single();

      if (resultErr) throw resultErr;
      const resultId = resultData.id;

      // 2) Insert result strategies
      const stratRows = strategies.map(s => ({
        recommendation_result_id: resultId,
        strategy_id: s.strategy_id,
        priority_score: s.priority_score,
        rationale: s.rationale || null,
        selected: true,
        source: 'rpc_v2',
      }));

      if (stratRows.length > 0) {
        const { error: stratErr } = await supabase
          .from('behavior_recommendation_result_strategies')
          .insert(stratRows);
        if (stratErr) throw stratErr;
      }

      toast.success('Recommendation set saved');
      await fetchSavedResults();
      return resultId;
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
      return null;
    }
  }, [fetchSavedResults]);

  const fetchResultDetail = useCallback(async (resultId: string): Promise<SavedResultDetail[]> => {
    try {
      const { data, error } = await (supabase.from as any)('v_behavior_recommendation_result_detail')
        .select('*')
        .eq('recommendation_result_id', resultId);
      if (error) throw error;
      return (data || []) as SavedResultDetail[];
    } catch (err: any) {
      console.error('Failed to load result detail:', err.message);
      return [];
    }
  }, []);

  const toggleStrategySelected = useCallback(async (resultStrategyId: string, selected: boolean) => {
    try {
      const { error } = await supabase
        .from('behavior_recommendation_result_strategies')
        .update({ selected })
        .eq('id', resultStrategyId);
      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  }, []);

  const updateProfile = useCallback(async (id: string, data: Partial<RecommendationProfile>) => {
    try {
      const { error } = await supabase.from('behavior_recommendation_profiles')
        .update({
          title: data.title,
          description: data.description,
          function_target: data.function_target,
          environment: data.environment,
          escalation_level: data.escalation_level,
          age_band: data.age_band,
          tier: data.tier,
          is_active: data.is_active,
        } as any)
        .eq('id', id);
      if (error) throw error;
      toast.success('Profile updated');
      await fetchProfiles();
    } catch (err: any) {
      toast.error('Failed to update profile: ' + err.message);
    }
  }, [fetchProfiles]);

  return {
    profiles, savedResults, isLoading,
    fetchAll, quickRecommend, saveRecommendationSet,
    fetchResultDetail, toggleStrategySelected, updateProfile,
  };
}
