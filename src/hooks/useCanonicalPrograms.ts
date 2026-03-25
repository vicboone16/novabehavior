import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ Types ============

export interface CanonicalProgram {
  id: string;
  name: string;
  description: string | null;
  framework_source: string | null;
  status: string;
  is_selectable: boolean;
  domain_id: string | null;
  domain_name: string | null;
}

export interface ResolvedProgramAssignment {
  id: string;
  learner_id: string;
  original_program_id: string | null;
  effective_program_id: string | null;
  program_name_snapshot: string;
  domain_name_snapshot: string | null;
  assignment_status: string;
  assigned_at: string;
  ended_at: string | null;
  current_program_name: string | null;
  current_program_status: string | null;
  current_domain_name: string | null;
}

export interface CanonicalObjective {
  id: string;
  program_id: string | null;
  name: string;
  objective_text: string | null;
  status: string;
}

export interface CanonicalTarget {
  id: string;
  objective_id: string | null;
  name: string;
  target_text: string | null;
  measurement_type: string | null;
  status: string;
}

// ============ Hook: Selectable Programs ============

export function useSelectablePrograms() {
  const [programs, setPrograms] = useState<CanonicalProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_nt_selectable_programs' as any)
      .select('*');

    if (error) {
      console.error('Error fetching selectable programs:', error);
    } else {
      setPrograms((data || []) as unknown as CanonicalProgram[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { programs, loading, refetch: fetch };
}

// ============ Hook: Learner Program Assignments (Resolved) ============

export function useLearnerProgramAssignments(learnerId: string) {
  const [assignments, setAssignments] = useState<ResolvedProgramAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!learnerId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('v_nt_learner_program_assignments_resolved' as any)
      .select('*')
      .eq('learner_id', learnerId);

    if (error) {
      console.error('Error fetching program assignments:', error);
    } else {
      setAssignments((data || []) as unknown as ResolvedProgramAssignment[]);
    }
    setLoading(false);
  }, [learnerId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { assignments, loading, refetch: fetch };
}

// ============ Hook: Canonical Objectives & Targets ============

export function useCanonicalObjectives(programId: string | null) {
  const [objectives, setObjectives] = useState<CanonicalObjective[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!programId) { setObjectives([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('nt_objectives')
      .select('id, program_id, name, objective_text, status')
      .eq('program_id', programId)
      .in('status', ['active', 'draft']);

    if (error) {
      console.error('Error fetching objectives:', error);
    } else {
      setObjectives((data || []) as CanonicalObjective[]);
    }
    setLoading(false);
  }, [programId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { objectives, loading, refetch: fetch };
}

export function useCanonicalTargets(objectiveId: string | null) {
  const [targets, setTargets] = useState<CanonicalTarget[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!objectiveId) { setTargets([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('nt_targets')
      .select('id, objective_id, name, target_text, measurement_type, status')
      .eq('objective_id', objectiveId)
      .in('status', ['active', 'draft']);

    if (error) {
      console.error('Error fetching targets:', error);
    } else {
      setTargets((data || []) as CanonicalTarget[]);
    }
    setLoading(false);
  }, [objectiveId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { targets, loading, refetch: fetch };
}

// ============ Hook: Create Canonical Items ============

export function useCanonicalCreators() {
  const createProgramDomain = useCallback(async (name: string, category?: string, description?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('nt_create_program_domain', {
      p_name: name,
      p_category: category || null,
      p_description: description || null,
      p_created_by: user?.id || null,
    });
    if (error) { toast.error(`Failed: ${error.message}`); return null; }
    toast.success('Domain created');
    return data as string;
  }, []);

  const createProgram = useCallback(async (domainId: string, name: string, description?: string, source?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('nt_create_program', {
      p_domain_id: domainId,
      p_name: name,
      p_description: description || null,
      p_framework_source: source || null,
      p_created_by: user?.id || null,
    });
    if (error) { toast.error(`Failed: ${error.message}`); return null; }
    toast.success('Program created');
    return data as string;
  }, []);

  const createObjective = useCallback(async (programId: string, name: string, text?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('nt_create_objective', {
      p_program_id: programId,
      p_name: name,
      p_objective_text: text || null,
      p_created_by: user?.id || null,
    });
    if (error) { toast.error(`Failed: ${error.message}`); return null; }
    toast.success('Objective created');
    return data as string;
  }, []);

  const createTarget = useCallback(async (objectiveId: string, name: string, text?: string, measurementType?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('nt_create_target', {
      p_objective_id: objectiveId,
      p_name: name,
      p_target_text: text || null,
      p_measurement_type: measurementType || null,
      p_created_by: user?.id || null,
    });
    if (error) { toast.error(`Failed: ${error.message}`); return null; }
    toast.success('Target created');
    return data as string;
  }, []);

  const createBehaviorDomain = useCallback(async (name: string, description?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('nt_create_behavior_domain', {
      p_name: name,
      p_description: description || null,
      p_created_by: user?.id || null,
    });
    if (error) { toast.error(`Failed: ${error.message}`); return null; }
    toast.success('Behavior domain created');
    return data as string;
  }, []);

  const createBehavior = useCallback(async (domainId: string, name: string, definition?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('nt_create_behavior', {
      p_domain_id: domainId,
      p_name: name,
      p_definition: definition || null,
      p_created_by: user?.id || null,
    });
    if (error) { toast.error(`Failed: ${error.message}`); return null; }
    toast.success('Behavior created');
    return data as string;
  }, []);

  return {
    createProgramDomain,
    createProgram,
    createObjective,
    createTarget,
    createBehaviorDomain,
    createBehavior,
  };
}
