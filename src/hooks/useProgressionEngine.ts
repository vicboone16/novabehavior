import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CriteriaScope } from '@/types/criteriaEngine';
import type {
  BenchmarkStage,
  ProgramPathway,
  ProgramPathwayStep,
  ExtendedAutomationSettings,
} from '@/types/progression';

// ── Benchmark Stages ──
export function useBenchmarkStages(scope?: CriteriaScope, scopeId?: string | null) {
  const [stages, setStages] = useState<BenchmarkStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('benchmark_stages').select('*').eq('active', true);
    if (scope) query = query.eq('scope', scope);
    if (scopeId) query = query.eq('scope_id', scopeId);
    query = query.order('stage_order');

    const { data, error } = await query;
    if (error) console.error('Error fetching benchmark stages:', error);
    else setStages((data || []) as unknown as BenchmarkStage[]);
    setLoading(false);
  }, [scope, scopeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertStage = async (stage: Partial<BenchmarkStage> & { scope: CriteriaScope; name: string; criteria_type: string }) => {
    const { id, ...rest } = stage;
    if (id) {
      const { error } = await supabase.from('benchmark_stages').update({ ...rest, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (error) { toast.error('Failed to update stage'); return false; }
    } else {
      const { error } = await supabase.from('benchmark_stages').insert(rest as any);
      if (error) { toast.error('Failed to create stage'); return false; }
    }
    toast.success('Stage saved');
    fetch();
    return true;
  };

  const deleteStage = async (id: string) => {
    await supabase.from('benchmark_stages').update({ active: false } as any).eq('id', id);
    fetch();
  };

  const reorderStages = async (orderedIds: string[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase.from('benchmark_stages').update({ stage_order: i } as any).eq('id', orderedIds[i]);
    }
    fetch();
  };

  return { stages, loading, upsertStage, deleteStage, reorderStages, refetch: fetch };
}

// ── Program Pathways ──
export function useProgramPathways(scope?: 'global' | 'student', scopeId?: string | null) {
  const [pathways, setPathways] = useState<ProgramPathway[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('program_pathways').select('*').eq('active', true);
    if (scope) query = query.eq('scope', scope);
    if (scopeId) query = query.eq('scope_id', scopeId);

    const { data, error } = await query;
    if (error) console.error('Error fetching pathways:', error);

    const pathwaysData = (data || []) as unknown as ProgramPathway[];

    // Fetch steps for each pathway
    if (pathwaysData.length > 0) {
      const ids = pathwaysData.map(p => p.id);
      const { data: steps } = await supabase
        .from('program_pathway_steps')
        .select('*')
        .in('program_pathway_id', ids)
        .order('step_order');

      const stepsMap: Record<string, ProgramPathwayStep[]> = {};
      for (const s of (steps || []) as unknown as ProgramPathwayStep[]) {
        if (!stepsMap[s.program_pathway_id]) stepsMap[s.program_pathway_id] = [];
        stepsMap[s.program_pathway_id].push(s);
      }
      for (const p of pathwaysData) {
        p.steps = stepsMap[p.id] || [];
      }
    }

    setPathways(pathwaysData);
    setLoading(false);
  }, [scope, scopeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createPathway = async (pathway: { scope: 'global' | 'student'; scope_id?: string | null; name: string }) => {
    const { data, error } = await supabase.from('program_pathways').insert(pathway as any).select().single();
    if (error) { toast.error('Failed to create pathway'); return null; }
    toast.success('Pathway created');
    fetch();
    return data;
  };

  const addStep = async (pathwayId: string, programId: string, stepOrder: number) => {
    const { error } = await supabase.from('program_pathway_steps').insert({
      program_pathway_id: pathwayId,
      program_id: programId,
      step_order: stepOrder,
    } as any);
    if (error) { toast.error('Failed to add step'); return false; }
    fetch();
    return true;
  };

  const removeStep = async (stepId: string) => {
    await supabase.from('program_pathway_steps').delete().eq('id', stepId);
    fetch();
  };

  return { pathways, loading, createPathway, addStep, removeStep, refetch: fetch };
}

// ── Extended Automation Settings (with progression) ──
export function useProgressionSettings(scope?: CriteriaScope, scopeId?: string | null) {
  const [settings, setSettings] = useState<ExtendedAutomationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    if (scope && scope !== 'global' && scopeId) {
      const { data } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('scope', scope)
        .eq('scope_id', scopeId)
        .maybeSingle();
      if (data) {
        setSettings(data as unknown as ExtendedAutomationSettings);
        setLoading(false);
        return;
      }
    }
    const { data: global } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('scope', 'global')
      .maybeSingle();
    setSettings(global as unknown as ExtendedAutomationSettings || null);
    setLoading(false);
  }, [scope, scopeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertSettings = async (updates: Partial<ExtendedAutomationSettings> & { scope: CriteriaScope; scope_id?: string | null }) => {
    let query = supabase.from('automation_settings').select('id').eq('scope', updates.scope);
    if (updates.scope_id) query = query.eq('scope_id', updates.scope_id);
    else query = query.is('scope_id', null);

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      await supabase.from('automation_settings').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', existing.id);
    } else {
      await supabase.from('automation_settings').insert(updates as any);
    }
    toast.success('Progression settings saved');
    fetch();
  };

  return { settings, loading, upsertSettings, refetch: fetch };
}
