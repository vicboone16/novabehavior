import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  SkillProgram,
  SkillTarget,
  SkillProgramObjective,
  TargetBenchmark,
  PromptLevel,
  ProgramStatus,
  TargetStatus,
  TaskAnalysisStep,
} from '@/types/skillPrograms';

export function useSkillPrograms(studentId: string) {
  const [programs, setPrograms] = useState<SkillProgram[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrograms = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('skill_programs')
      .select('*, domain:domains(id, name), top_level_domain:program_domains(id, name), subdomain:program_subdomains(id, name)')
      .eq('student_id', studentId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching skill programs:', error);
    } else {
      const programIds = (data || []).map((p: any) => p.id);
      let targetsMap: Record<string, SkillTarget[]> = {};
      let objectivesMap: Record<string, SkillProgramObjective[]> = {};
      let benchmarksMap: Record<string, TargetBenchmark[]> = {};

      if (programIds.length > 0) {
        // Fetch targets
        const { data: targetsData } = await supabase
          .from('skill_targets')
          .select('*')
          .in('program_id', programIds)
          .eq('active', true)
          .order('display_order');

        const targetIds: string[] = [];
        if (targetsData) {
          for (const t of targetsData) {
            targetIds.push(t.id);
            if (!targetsMap[t.program_id]) targetsMap[t.program_id] = [];
            targetsMap[t.program_id].push(t as unknown as SkillTarget);
          }
        }

        // Fetch objectives
        const { data: objectivesData } = await supabase
          .from('skill_program_objectives')
          .select('*')
          .in('program_id', programIds)
          .eq('is_active', true)
          .order('sort_order');

        if (objectivesData) {
          for (const o of objectivesData) {
            if (!objectivesMap[(o as any).program_id]) objectivesMap[(o as any).program_id] = [];
            objectivesMap[(o as any).program_id].push(o as unknown as SkillProgramObjective);
          }
        }

        // Fetch benchmarks for all targets
        if (targetIds.length > 0) {
          const { data: benchmarksData } = await supabase
            .from('benchmarks')
            .select('*')
            .in('target_id', targetIds)
            .eq('is_active', true)
            .order('sort_order');

          if (benchmarksData) {
            for (const b of benchmarksData) {
              if (!benchmarksMap[(b as any).target_id]) benchmarksMap[(b as any).target_id] = [];
              benchmarksMap[(b as any).target_id].push(b as unknown as TargetBenchmark);
            }
          }
        }

        // Attach benchmarks to targets
        for (const programTargets of Object.values(targetsMap)) {
          for (const t of programTargets) {
            t.benchmarks = benchmarksMap[t.id] || [];
          }
        }

        // Attach targets to objectives
        for (const [programId, objectives] of Object.entries(objectivesMap)) {
          for (const obj of objectives) {
            obj.targets = (targetsMap[programId] || []).filter(t => t.objective_id === obj.id);
          }
        }
      }

      const enriched = (data || []).map((p: any) => ({
        ...p,
        targets: targetsMap[p.id] || [],
        objectives: objectivesMap[p.id] || [],
      })) as SkillProgram[];

      setPrograms(enriched);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  return { programs, loading, refetch: fetchPrograms };
}

export function usePromptLevels() {
  const [levels, setLevels] = useState<PromptLevel[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('prompt_levels')
        .select('*')
        .order('rank');
      setLevels((data || []) as unknown as PromptLevel[]);
    };
    fetch();
  }, []);

  return levels;
}

export function useSkillProgramActions(studentId: string, onSuccess?: () => void) {
  const { user } = useAuth();

  const addProgram = async (program: {
    name: string;
    domain_id: string | null;
    method: string;
    description?: string;
    status?: ProgramStatus;
    status_effective_date?: string;
    default_mastery_criteria?: string;
    notes?: string;
    prompt_counts_as_correct?: boolean | null;
    targets?: { name: string; operational_definition?: string; mastery_criteria?: string }[];
  }) => {
    const { data, error } = await supabase
      .from('skill_programs')
      .insert({
        student_id: studentId,
        name: program.name,
        domain_id: program.domain_id,
        method: program.method,
        description: program.description || null,
        status: program.status || 'baseline',
        status_effective_date: program.status_effective_date || new Date().toISOString().split('T')[0],
        default_mastery_criteria: program.default_mastery_criteria || null,
        notes: program.notes || null,
        prompt_counts_as_correct: program.prompt_counts_as_correct ?? null,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create program');
      console.error(error);
      return null;
    }

    // Record initial status
    await supabase.from('program_status_history').insert({
      program_id: data.id,
      status_to: program.status || 'baseline',
      effective_date: program.status_effective_date || new Date().toISOString().split('T')[0],
      changed_by: user?.id,
      note: 'Program created',
    });

    // Add targets if provided
    if (program.targets && program.targets.length > 0) {
      const targetRows = program.targets.map((t, i) => ({
        program_id: data.id,
        name: t.name,
        operational_definition: t.operational_definition || null,
        mastery_criteria: t.mastery_criteria || null,
        display_order: i,
      }));

      const { error: tErr } = await supabase.from('skill_targets').insert(targetRows);
      if (tErr) console.error('Error adding targets:', tErr);
    }

    toast.success('Program created');
    onSuccess?.();
    return data;
  };

  const updateProgram = async (programId: string, updates: Partial<SkillProgram>) => {
    const { error } = await supabase
      .from('skill_programs')
      .update(updates as any)
      .eq('id', programId);

    if (error) {
      toast.error('Failed to update program');
      console.error(error);
      return false;
    }
    toast.success('Program updated');
    onSuccess?.();
    return true;
  };

  const changeProgramStatus = async (programId: string, currentStatus: string, newStatus: ProgramStatus, effectiveDate: string, note?: string) => {
    const { error: updateErr } = await supabase
      .from('skill_programs')
      .update({ status: newStatus, status_effective_date: effectiveDate })
      .eq('id', programId);

    if (updateErr) {
      toast.error('Failed to update status');
      return false;
    }

    await supabase.from('program_status_history').insert({
      program_id: programId,
      status_from: currentStatus,
      status_to: newStatus,
      effective_date: effectiveDate,
      changed_by: user?.id,
      note: note || null,
    });

    toast.success(`Status changed to ${newStatus}`);
    onSuccess?.();
    return true;
  };

  const deleteProgram = async (programId: string) => {
    const { error } = await supabase
      .from('skill_programs')
      .update({ active: false })
      .eq('id', programId);

    if (error) {
      toast.error('Failed to delete program');
      return false;
    }
    toast.success('Program archived');
    onSuccess?.();
    return true;
  };

  const addTarget = async (programId: string, target: { name: string; operational_definition?: string; mastery_criteria?: string }) => {
    // Get max display order
    const { data: existing } = await supabase
      .from('skill_targets')
      .select('display_order')
      .eq('program_id', programId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].display_order + 1) : 0;

    const { error } = await supabase.from('skill_targets').insert({
      program_id: programId,
      name: target.name,
      operational_definition: target.operational_definition || null,
      mastery_criteria: target.mastery_criteria || null,
      display_order: nextOrder,
    });

    if (error) {
      toast.error('Failed to add target');
      return false;
    }
    toast.success('Target added');
    onSuccess?.();
    return true;
  };

  const updateTarget = async (targetId: string, updates: Partial<SkillTarget>) => {
    const { error } = await supabase
      .from('skill_targets')
      .update(updates as any)
      .eq('id', targetId);

    if (error) {
      toast.error('Failed to update target');
      return false;
    }
    onSuccess?.();
    return true;
  };

  const deleteTarget = async (targetId: string) => {
    const { error } = await supabase
      .from('skill_targets')
      .update({ active: false })
      .eq('id', targetId);

    if (error) {
      toast.error('Failed to delete target');
      return false;
    }
    toast.success('Target archived');
    onSuccess?.();
    return true;
  };

  const addTASteps = async (targetId: string, steps: string[]) => {
    const rows = steps.map((label, i) => ({
      target_id: targetId,
      step_number: i + 1,
      step_label: label,
    }));

    const { error } = await supabase.from('task_analysis_steps').insert(rows);
    if (error) {
      toast.error('Failed to add TA steps');
      return false;
    }
    onSuccess?.();
    return true;
  };

  return {
    addProgram,
    updateProgram,
    changeProgramStatus,
    deleteProgram,
    addTarget,
    updateTarget,
    deleteTarget,
    addTASteps,
  };
}
