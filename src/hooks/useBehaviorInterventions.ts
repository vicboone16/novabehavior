import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  BxPresentingProblem, 
  BxObjective, 
  BxStrategy,
  StudentBxPlanLink,
  LinkStatus,
  BxProblemObjectiveLink,
  BxObjectiveStrategyLink
} from '@/types/behaviorIntervention';

// Type for replacement goals
export interface BxReplacementGoal {
  id: string;
  goal_code: string;
  goal_title: string;
  domain: string;
  tags: string[];
  status: string;
  agency_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Hook for fetching presenting problems
export function usePresentingProblems(domain?: string) {
  const [problems, setProblems] = useState<BxPresentingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bx_presenting_problems')
        .select('*')
        .eq('status', 'active')
        .order('problem_code');

      if (domain) {
        query = query.eq('domain', domain);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProblems((data || []) as BxPresentingProblem[]);
    } catch (error) {
      console.error('Error fetching problems:', error);
      toast({ title: 'Error loading problems', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [domain, toast]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  return { problems, loading, refetch: fetchProblems };
}

// Hook for fetching objectives linked to a problem
export function useProblemObjectives(problemId?: string) {
  const [objectives, setObjectives] = useState<BxObjective[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!problemId) {
      setObjectives([]);
      return;
    }

    const fetchObjectives = async () => {
      setLoading(true);
      try {
        const { data: links, error: linksError } = await supabase
          .from('bx_problem_objective_links')
          .select('objective_id, priority')
          .eq('problem_id', problemId)
          .order('priority');

        if (linksError) throw linksError;

        if (links && links.length > 0) {
          const objectiveIds = links.map(l => l.objective_id);
          const { data: objectivesData, error: objError } = await supabase
            .from('bx_objectives')
            .select('*')
            .in('id', objectiveIds)
            .eq('status', 'active');

          if (objError) throw objError;
          setObjectives((objectivesData || []) as BxObjective[]);
        } else {
          setObjectives([]);
        }
      } catch (error) {
        console.error('Error fetching objectives:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchObjectives();
  }, [problemId]);

  return { objectives, loading };
}

// Hook for fetching replacement goals linked to a problem
export function useProblemGoals(problemId?: string) {
  const [goals, setGoals] = useState<BxReplacementGoal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!problemId) {
      setGoals([]);
      return;
    }

    const fetchGoals = async () => {
      setLoading(true);
      try {
        const { data: links, error: linksError } = await supabase
          .from('bx_problem_goal_links')
          .select('goal_id, priority')
          .eq('problem_id', problemId)
          .order('priority');

        if (linksError) throw linksError;

        if (links && links.length > 0) {
          const goalIds = links.map(l => l.goal_id);
          const { data: goalsData, error: goalsError } = await supabase
            .from('bx_replacement_goals')
            .select('*')
            .in('id', goalIds)
            .eq('status', 'active');

          if (goalsError) throw goalsError;
          setGoals((goalsData || []) as BxReplacementGoal[]);
        } else {
          setGoals([]);
        }
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [problemId]);

  return { goals, loading };
}

// Hook for fetching objectives linked to a replacement goal
export function useGoalObjectives(goalId?: string | null) {
  const [objectives, setObjectives] = useState<BxObjective[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!goalId) {
      setObjectives([]);
      return;
    }

    const fetchObjectives = async () => {
      setLoading(true);
      try {
        // Fetch objectives linked to this goal via bx_goal_objective_links
        const { data: links, error: linksError } = await supabase
          .from('bx_goal_objective_links')
          .select('objective_id, priority')
          .eq('goal_id', goalId)
          .order('priority');

        if (linksError) throw linksError;

        if (links && links.length > 0) {
          const objectiveIds = links.map(l => l.objective_id);
          const { data: objectivesData, error: objError } = await supabase
            .from('bx_objectives')
            .select('*')
            .in('id', objectiveIds)
            .eq('status', 'active');

          if (objError) throw objError;
          
          // Sort by priority order from links
          const sortedObjectives = objectiveIds
            .map(id => objectivesData?.find(o => o.id === id))
            .filter(Boolean) as BxObjective[];
          
          setObjectives(sortedObjectives);
        } else {
          setObjectives([]);
        }
      } catch (error) {
        console.error('Error fetching goal objectives:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchObjectives();
  }, [goalId]);

  return { objectives, loading };
}

// Hook for fetching strategies linked to an objective
export function useObjectiveStrategies(objectiveId?: string) {
  const [strategies, setStrategies] = useState<Array<BxStrategy & { phase: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!objectiveId) {
      setStrategies([]);
      return;
    }

    const fetchStrategies = async () => {
      setLoading(true);
      try {
        const { data: links, error: linksError } = await supabase
          .from('bx_objective_strategy_links')
          .select('strategy_id, phase, priority')
          .eq('objective_id', objectiveId)
          .order('priority');

        if (linksError) throw linksError;

        if (links && links.length > 0) {
          const strategyIds = links.map(l => l.strategy_id);
          const { data: strategiesData, error: strError } = await supabase
            .from('bx_strategies')
            .select('*')
            .in('id', strategyIds)
            .eq('status', 'active');

          if (strError) throw strError;

          // Merge phase info
          const strategiesWithPhase = (strategiesData || []).map(s => {
            const link = links.find(l => l.strategy_id === s.id);
            return { ...s, phase: link?.phase || 'teaching' } as BxStrategy & { phase: string };
          });
          setStrategies(strategiesWithPhase);
        } else {
          setStrategies([]);
        }
      } catch (error) {
        console.error('Error fetching strategies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, [objectiveId]);

  return { strategies, loading };
}

// Hook for student's intervention plan links
export function useStudentBxPlan(studentId: string) {
  const [links, setLinks] = useState<StudentBxPlanLink[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLinks = useCallback(async () => {
    if (!studentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_bx_plan_links')
        .select(`
          *,
          problem:bx_presenting_problems(*),
          objective:bx_objectives(*),
          strategy:bx_strategies(*)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks((data || []) as StudentBxPlanLink[]);
    } catch (error) {
      console.error('Error fetching student plan:', error);
      toast({ title: 'Error loading intervention plan', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [studentId, toast]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const addLink = async (link: Partial<StudentBxPlanLink>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('student_bx_plan_links')
        .insert({
          student_id: studentId,
          ...link,
          created_by: user?.id,
        });

      if (error) throw error;
      toast({ title: 'Intervention added' });
      fetchLinks();
    } catch (error) {
      console.error('Error adding link:', error);
      toast({ title: 'Error adding intervention', variant: 'destructive' });
    }
  };

  const updateLinkStatus = async (linkId: string, status: LinkStatus) => {
    try {
      const updates: any = { link_status: status };
      if (status === 'existing' && !links.find(l => l.id === linkId)?.start_date) {
        updates.start_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('student_bx_plan_links')
        .update(updates)
        .eq('id', linkId);

      if (error) throw error;
      toast({ title: `Status updated to ${status}` });
      fetchLinks();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  };

  const removeLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('student_bx_plan_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      toast({ title: 'Intervention removed' });
      fetchLinks();
    } catch (error) {
      console.error('Error removing link:', error);
      toast({ title: 'Error removing intervention', variant: 'destructive' });
    }
  };

  // Group by status
  const existing = links.filter(l => l.link_status === 'existing');
  const considering = links.filter(l => l.link_status === 'considering');
  const recommended = links.filter(l => l.link_status === 'recommended');
  const rejected = links.filter(l => l.link_status === 'rejected');
  const archived = links.filter(l => l.link_status === 'archived');

  return {
    links,
    existing,
    considering,
    recommended,
    rejected,
    archived,
    loading,
    refetch: fetchLinks,
    addLink,
    updateLinkStatus,
    removeLink,
  };
}

// Hook for CRUD on problems, objectives, strategies
export function useBxLibraryActions() {
  const { toast } = useToast();

  const createProblem = async (problem: Partial<BxPresentingProblem>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        problem_code: problem.problem_code!,
        domain: problem.domain!,
        title: problem.title!,
        definition: problem.definition,
        examples: problem.examples || [],
        risk_level: problem.risk_level || 'low',
        function_tags: problem.function_tags || [],
        trigger_tags: problem.trigger_tags || [],
        topics: problem.topics || [],
        contraindications: problem.contraindications || [],
        status: problem.status || 'active',
        source_origin: problem.source_origin || 'internal',
        source_title: problem.source_title,
        agency_id: problem.agency_id,
        created_by: user?.id,
      };
      
      const { data, error } = await supabase
        .from('bx_presenting_problems')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Presenting problem created' });
      return data;
    } catch (error) {
      console.error('Error creating problem:', error);
      toast({ title: 'Error creating problem', variant: 'destructive' });
      throw error;
    }
  };

  const createObjective = async (objective: Partial<BxObjective>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        objective_code: objective.objective_code!,
        objective_title: objective.objective_title!,
        operational_definition: objective.operational_definition,
        mastery_criteria: objective.mastery_criteria,
        measurement_recommendations: objective.measurement_recommendations || [],
        replacement_skill_tags: objective.replacement_skill_tags || [],
        prerequisites: objective.prerequisites || [],
        status: objective.status || 'active',
        agency_id: objective.agency_id,
        created_by: user?.id,
      };
      
      const { data, error } = await supabase
        .from('bx_objectives')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Objective created' });
      return data;
    } catch (error) {
      console.error('Error creating objective:', error);
      toast({ title: 'Error creating objective', variant: 'destructive' });
      throw error;
    }
  };

  const createStrategy = async (strategy: Partial<BxStrategy>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        strategy_code: strategy.strategy_code!,
        strategy_name: strategy.strategy_name!,
        strategy_type: strategy.strategy_type || [],
        risk_level: strategy.risk_level || 'low',
        requires_bcba: strategy.requires_bcba || false,
        implementation_steps: strategy.implementation_steps || [],
        staff_script: strategy.staff_script,
        materials: strategy.materials || [],
        fidelity_checklist: strategy.fidelity_checklist || [],
        data_targets: strategy.data_targets || [],
        contraindications: strategy.contraindications || [],
        status: strategy.status || 'active',
        agency_id: strategy.agency_id,
        created_by: user?.id,
      };
      
      const { data, error } = await supabase
        .from('bx_strategies')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Strategy created' });
      return data;
    } catch (error) {
      console.error('Error creating strategy:', error);
      toast({ title: 'Error creating strategy', variant: 'destructive' });
      throw error;
    }
  };

  const linkProblemObjective = async (problemId: string, objectiveId: string, priority = 1) => {
    try {
      const { error } = await supabase
        .from('bx_problem_objective_links')
        .insert({ problem_id: problemId, objective_id: objectiveId, priority });

      if (error) throw error;
    } catch (error) {
      console.error('Error linking:', error);
      throw error;
    }
  };

  const linkObjectiveStrategy = async (objectiveId: string, strategyId: string, phase: string, priority = 1) => {
    try {
      const { error } = await supabase
        .from('bx_objective_strategy_links')
        .insert({ objective_id: objectiveId, strategy_id: strategyId, phase, priority });

      if (error) throw error;
    } catch (error) {
      console.error('Error linking:', error);
      throw error;
    }
  };

  return {
    createProblem,
    createObjective,
    createStrategy,
    linkProblemObjective,
    linkObjectiveStrategy,
  };
}
