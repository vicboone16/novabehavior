import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BehaviorStrategy {
  id: string;
  strategy_key: string;
  strategy_name: string;
  strategy_group: string | null;
  category: string | null;
  description: string | null;
  evidence_level: string | null;
  function_targets: string[] | null;
  escalation_levels: string[] | null;
  environments: string[] | null;
  teacher_quick_version: string | null;
  family_version: string | null;
  data_to_collect: any;
  fidelity_tips: any;
  staff_scripts: any;
  implementation_notes: string | null;
  contraindications: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
  // from view
  step_count?: number | null;
  training_link_count?: number | null;
}

export interface StrategyStep {
  id: string;
  strategy_id: string | null;
  step_number: number | null;
  step_description: string | null;
  created_at: string | null;
}

export interface StrategyTrainingLink {
  id: string;
  strategy_id: string;
  module_key: string | null;
  academy_module_id: string | null;
  lms_course_id: string | null;
  lms_module_id: string | null;
  lms_lesson_id: string | null;
  created_at: string | null;
}

export interface StrategyRecommendation {
  strategy_id: string;
  strategy_name: string;
  category: string;
}

export function useBehaviorStrategyLibrary() {
  const [strategies, setStrategies] = useState<BehaviorStrategy[]>([]);
  const [steps, setSteps] = useState<StrategyStep[]>([]);
  const [trainingLinks, setTrainingLinks] = useState<StrategyTrainingLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try the detail view first, fall back to base table
      let strategiesData: any[] = [];
      const { data: viewData, error: viewErr } = await (supabase.from as any)('v_behavior_strategy_detail').select('*');
      if (!viewErr && viewData?.length) {
        strategiesData = viewData;
      } else {
        const { data: baseData } = await supabase.from('behavior_strategies').select('*');
        strategiesData = baseData || [];
      }

      const [stepsRes, linksRes] = await Promise.all([
        supabase.from('behavior_strategy_steps').select('*').order('step_number'),
        supabase.from('behavior_strategy_training_links').select('*'),
      ]);

      setStrategies(strategiesData as BehaviorStrategy[]);
      setSteps((stepsRes.data || []) as StrategyStep[]);
      setTrainingLinks((linksRes.data || []) as StrategyTrainingLink[]);
    } catch (err: any) {
      console.error('Failed to load behavior strategies:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getStepsForStrategy = useCallback((strategyId: string) => {
    return steps.filter(s => s.strategy_id === strategyId).sort((a, b) => (a.step_number || 0) - (b.step_number || 0));
  }, [steps]);

  const getTrainingLinksForStrategy = useCallback((strategyId: string) => {
    return trainingLinks.filter(l => l.strategy_id === strategyId);
  }, [trainingLinks]);

  const saveStrategy = useCallback(async (data: Partial<BehaviorStrategy> & { id?: string }) => {
    try {
      const payload: any = {
        strategy_name: data.strategy_name || 'Untitled',
        strategy_key: data.strategy_key || `strat-${Date.now()}`,
        strategy_group: data.strategy_group || null,
        category: data.category || null,
        description: data.description || null,
        evidence_level: data.evidence_level || null,
        function_targets: data.function_targets || [],
        escalation_levels: data.escalation_levels || [],
        environments: data.environments || [],
        teacher_quick_version: data.teacher_quick_version || null,
        family_version: data.family_version || null,
        data_to_collect: data.data_to_collect || null,
        fidelity_tips: data.fidelity_tips || null,
        staff_scripts: data.staff_scripts || null,
        implementation_notes: data.implementation_notes || null,
        contraindications: data.contraindications || null,
        sort_order: data.sort_order ?? null,
      };

      if (data.id) {
        const { error } = await supabase.from('behavior_strategies').update(payload).eq('id', data.id);
        if (error) throw error;
        toast.success('Strategy updated');
      } else {
        const { error } = await supabase.from('behavior_strategies').insert(payload);
        if (error) throw error;
        toast.success('Strategy created');
      }
      await fetchAll();
    } catch (err: any) {
      toast.error('Failed to save strategy: ' + err.message);
    }
  }, [fetchAll]);

  const archiveStrategy = useCallback(async (id: string) => {
    // The table doesn't have a status column in the typed schema, so we'll use a soft approach
    // by adding 'archived' to the strategy_group or description. But actually, the best approach
    // is to just delete or mark via a convention. Let's try updating strategy_group to include archived marker.
    // Actually, we'll just delete since there's no status column.
    // For safety, let's just rename with [ARCHIVED] prefix
    const strategy = strategies.find(s => s.id === id);
    if (!strategy) return;
    const newName = strategy.strategy_name.startsWith('[ARCHIVED]') 
      ? strategy.strategy_name 
      : `[ARCHIVED] ${strategy.strategy_name}`;
    const { error } = await supabase.from('behavior_strategies').update({ strategy_name: newName } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Strategy archived');
    await fetchAll();
  }, [strategies, fetchAll]);

  const saveStep = useCallback(async (step: Partial<StrategyStep> & { strategy_id: string }) => {
    try {
      if (step.id) {
        const { error } = await supabase.from('behavior_strategy_steps')
          .update({ step_description: step.step_description, step_number: step.step_number } as any)
          .eq('id', step.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('behavior_strategy_steps')
          .insert({ strategy_id: step.strategy_id, step_description: step.step_description, step_number: step.step_number });
        if (error) throw error;
      }
      await fetchAll();
    } catch (err: any) {
      toast.error('Failed to save step: ' + err.message);
    }
  }, [fetchAll]);

  const deleteStep = useCallback(async (id: string) => {
    const { error } = await supabase.from('behavior_strategy_steps').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    await fetchAll();
  }, [fetchAll]);

  const recommendStrategies = useCallback(async (fnTarget: string, environment?: string): Promise<StrategyRecommendation[]> => {
    try {
      const args: any = { p_function: fnTarget };
      if (environment) args.p_environment = environment;
      const { data, error } = await (supabase.rpc as any)('recommend_behavior_strategies', args);
      if (error) throw error;
      return (data || []) as StrategyRecommendation[];
    } catch (err: any) {
      toast.error('Recommendation failed: ' + err.message);
      return [];
    }
  }, []);

  return {
    strategies, steps, trainingLinks, isLoading,
    fetchAll, getStepsForStrategy, getTrainingLinksForStrategy,
    saveStrategy, archiveStrategy, saveStep, deleteStep,
    recommendStrategies,
  };
}
