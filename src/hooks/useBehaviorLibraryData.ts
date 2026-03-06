import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BxProblem {
  id: string;
  problem_code: string;
  title: string;
  definition?: string;
  domain: string;
  examples: string[];
  risk_level: string;
  function_tags: string[];
  trigger_tags: string[];
  topics: string[];
  contraindications: string[];
  status: string;
  source_origin: string;
  agency_id?: string;
  created_at: string;
  updated_at: string;
  // joined counts
  goals_count?: number;
  objectives_count?: number;
}

export interface BxGoal {
  id: string;
  goal_code: string;
  goal_title: string;
  domain: string;
  tags: string[];
  status: string;
  agency_id?: string;
  created_at: string;
  updated_at: string;
  objectives_count?: number;
}

export interface BxObjective {
  id: string;
  objective_code: string;
  objective_title: string;
  operational_definition?: string;
  mastery_criteria?: string;
  measurement_recommendations: string[];
  replacement_skill_tags: string[];
  prerequisites: string[];
  status: string;
  agency_id?: string;
  created_at: string;
  updated_at: string;
  strategies_count?: number;
  goals_count?: number;
}

export interface BxStrategy {
  id: string;
  strategy_code: string;
  strategy_name: string;
  strategy_type: string[];
  risk_level: string;
  requires_bcba: boolean;
  implementation_steps: string[];
  staff_script?: string;
  materials: string[];
  fidelity_checklist: string[];
  data_targets: string[];
  contraindications: string[];
  status: string;
  short_description?: string;
  full_description?: string;
  function_tags?: string[];
  setting_tags?: string[];
  tier_tags?: string[];
  grade_band_tags?: string[];
  role_tags?: string[];
  crisis_relevance?: boolean;
  data_to_collect?: any;
  fidelity_tips?: any;
  staff_scripts?: any;
  family_version?: string;
  teacher_quick_version?: string;
  sort_order?: number;
  agency_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CiRec {
  id: string;
  client_id?: string;
  behavior_id?: string;
  intervention_id?: string;
  score?: number;
  reasons_json?: any;
  status: string;
  created_at: string;
}

export function useBehaviorLibraryData() {
  const [problems, setProblems] = useState<BxProblem[]>([]);
  const [goals, setGoals] = useState<BxGoal[]>([]);
  const [objectives, setObjectives] = useState<BxObjective[]>([]);
  const [strategies, setStrategies] = useState<BxStrategy[]>([]);
  const [recs, setRecs] = useState<CiRec[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Link tables
  const [problemGoalLinks, setProblemGoalLinks] = useState<any[]>([]);
  const [problemObjectiveLinks, setProblemObjectiveLinks] = useState<any[]>([]);
  const [goalObjectiveLinks, setGoalObjectiveLinks] = useState<any[]>([]);
  const [objectiveStrategyLinks, setObjectiveStrategyLinks] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pRes, gRes, oRes, sRes, rRes, pgRes, poRes, goRes, osRes] = await Promise.all([
        supabase.from('bx_presenting_problems').select('*').order('title'),
        supabase.from('bx_replacement_goals').select('*').order('goal_title'),
        supabase.from('bx_objectives').select('*').order('objective_title'),
        supabase.from('bx_strategies').select('*').order('strategy_name'),
        (supabase.from as any)('ci_intervention_recs').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('bx_problem_goal_links').select('*'),
        supabase.from('bx_problem_objective_links').select('*'),
        supabase.from('bx_goal_objective_links').select('*'),
        supabase.from('bx_objective_strategy_links').select('*'),
      ]);

      setProblems((pRes.data || []) as unknown as BxProblem[]);
      setGoals((gRes.data || []) as unknown as BxGoal[]);
      setObjectives((oRes.data || []) as unknown as BxObjective[]);
      setStrategies((sRes.data || []) as unknown as BxStrategy[]);
      setRecs((rRes.data || []) as unknown as CiRec[]);
      setProblemGoalLinks(pgRes.data || []);
      setProblemObjectiveLinks(poRes.data || []);
      setGoalObjectiveLinks(goRes.data || []);
      setObjectiveStrategyLinks(osRes.data || []);
    } catch (err: any) {
      console.error('Failed to load behavior library data:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getGoalCountForProblem = useCallback((problemId: string) => {
    return problemGoalLinks.filter((l: any) => l.problem_id === problemId).length;
  }, [problemGoalLinks]);

  const getObjectiveCountForProblem = useCallback((problemId: string) => {
    return problemObjectiveLinks.filter((l: any) => l.problem_id === problemId).length;
  }, [problemObjectiveLinks]);

  const getObjectiveCountForGoal = useCallback((goalId: string) => {
    return goalObjectiveLinks.filter((l: any) => l.goal_id === goalId).length;
  }, [goalObjectiveLinks]);

  const getStrategyCountForObjective = useCallback((objectiveId: string) => {
    return objectiveStrategyLinks.filter((l: any) => l.objective_id === objectiveId).length;
  }, [objectiveStrategyLinks]);

  const getGoalCountForObjective = useCallback((objectiveId: string) => {
    return goalObjectiveLinks.filter((l: any) => l.objective_id === objectiveId).length;
  }, [goalObjectiveLinks]);

  const getLinkedObjectivesForStrategy = useCallback((strategyId: string) => {
    const links = objectiveStrategyLinks.filter((l: any) => l.strategy_id === strategyId);
    return links.map((l: any) => objectives.find(o => o.id === l.objective_id)).filter(Boolean);
  }, [objectiveStrategyLinks, objectives]);

  const getLinkedGoalsForStrategy = useCallback((strategyId: string) => {
    const objectiveIds = objectiveStrategyLinks
      .filter((l: any) => l.strategy_id === strategyId)
      .map((l: any) => l.objective_id);
    const goalIds = goalObjectiveLinks
      .filter((l: any) => objectiveIds.includes(l.objective_id))
      .map((l: any) => l.goal_id);
    return [...new Set(goalIds)].map(gId => goals.find(g => g.id === gId)).filter(Boolean);
  }, [objectiveStrategyLinks, goalObjectiveLinks, goals]);

  const getLinkedProblemsForStrategy = useCallback((strategyId: string) => {
    const objectiveIds = objectiveStrategyLinks
      .filter((l: any) => l.strategy_id === strategyId)
      .map((l: any) => l.objective_id);
    const problemIds = problemObjectiveLinks
      .filter((l: any) => objectiveIds.includes(l.objective_id))
      .map((l: any) => l.problem_id);
    return [...new Set(problemIds)].map(pId => problems.find(p => p.id === pId)).filter(Boolean);
  }, [objectiveStrategyLinks, problemObjectiveLinks, problems]);

  // CRUD
  const saveStrategy = useCallback(async (strategy: Partial<BxStrategy> & { id?: string }) => {
    try {
      if (strategy.id) {
        const { error } = await supabase.from('bx_strategies').update({
          strategy_name: strategy.strategy_name,
          strategy_code: strategy.strategy_code,
          strategy_type: strategy.strategy_type || [],
          risk_level: strategy.risk_level || 'low',
          requires_bcba: strategy.requires_bcba ?? false,
          implementation_steps: strategy.implementation_steps || [],
          staff_script: strategy.staff_script,
          materials: strategy.materials || [],
          fidelity_checklist: strategy.fidelity_checklist || [],
          data_targets: strategy.data_targets || [],
          contraindications: strategy.contraindications || [],
          status: strategy.status || 'active',
          short_description: strategy.short_description,
          full_description: strategy.full_description,
          function_tags: strategy.function_tags || [],
          setting_tags: strategy.setting_tags || [],
          tier_tags: strategy.tier_tags || [],
          grade_band_tags: strategy.grade_band_tags || [],
          role_tags: strategy.role_tags || [],
          crisis_relevance: strategy.crisis_relevance ?? false,
          family_version: strategy.family_version,
          teacher_quick_version: strategy.teacher_quick_version,
        } as any).eq('id', strategy.id);
        if (error) throw error;
        toast.success('Strategy updated');
      } else {
        const { error } = await supabase.from('bx_strategies').insert({
          strategy_name: strategy.strategy_name || 'Untitled',
          strategy_code: strategy.strategy_code || `STR-${Date.now()}`,
          strategy_type: strategy.strategy_type || [],
          risk_level: strategy.risk_level || 'low',
          requires_bcba: strategy.requires_bcba ?? false,
          implementation_steps: strategy.implementation_steps || [],
          staff_script: strategy.staff_script,
          materials: strategy.materials || [],
          fidelity_checklist: strategy.fidelity_checklist || [],
          data_targets: strategy.data_targets || [],
          contraindications: strategy.contraindications || [],
          status: strategy.status || 'active',
          short_description: strategy.short_description,
          full_description: strategy.full_description,
          function_tags: strategy.function_tags || [],
          setting_tags: strategy.setting_tags || [],
          tier_tags: strategy.tier_tags || [],
          grade_band_tags: strategy.grade_band_tags || [],
          role_tags: strategy.role_tags || [],
          crisis_relevance: strategy.crisis_relevance ?? false,
          family_version: strategy.family_version,
          teacher_quick_version: strategy.teacher_quick_version,
        } as any);
        if (error) throw error;
        toast.success('Strategy created');
      }
      await fetchAll();
    } catch (err: any) {
      toast.error('Failed to save strategy: ' + err.message);
    }
  }, [fetchAll]);

  const archiveStrategy = useCallback(async (id: string) => {
    const { error } = await supabase.from('bx_strategies').update({ status: 'inactive' } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Strategy archived');
    await fetchAll();
  }, [fetchAll]);

  const duplicateStrategy = useCallback(async (id: string) => {
    const source = strategies.find(s => s.id === id);
    if (!source) return;
    const { id: _id, created_at, updated_at, ...rest } = source;
    await saveStrategy({ ...rest, strategy_name: `${source.strategy_name} (Copy)`, strategy_code: `${source.strategy_code}-COPY` });
  }, [strategies, saveStrategy]);

  // Link management
  const addLink = useCallback(async (table: string, data: Record<string, any>) => {
    const { error } = await (supabase.from as any)(table).insert(data);
    if (error) { toast.error(error.message); return; }
    toast.success('Link created');
    await fetchAll();
  }, [fetchAll]);

  const removeLink = useCallback(async (table: string, id: string) => {
    const { error } = await (supabase.from as any)(table).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Link removed');
    await fetchAll();
  }, [fetchAll]);

  return {
    problems, goals, objectives, strategies, recs,
    problemGoalLinks, problemObjectiveLinks, goalObjectiveLinks, objectiveStrategyLinks,
    isLoading, fetchAll,
    getGoalCountForProblem, getObjectiveCountForProblem,
    getObjectiveCountForGoal, getStrategyCountForObjective,
    getGoalCountForObjective, getLinkedObjectivesForStrategy,
    getLinkedGoalsForStrategy, getLinkedProblemsForStrategy,
    saveStrategy, archiveStrategy, duplicateStrategy,
    addLink, removeLink,
  };
}
