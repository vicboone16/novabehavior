import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  CriteriaTemplate,
  CriteriaScope,
  CriteriaType,
  CriteriaRuleJson,
  CriteriaEvaluation,
  PromptSet,
  PromptLevelEntry,
  AutomationSettings,
  ReviewQueueItem,
  ReviewStatus,
} from '@/types/criteriaEngine';

// ── Criteria Templates ──
export function useCriteriaTemplates(scope?: CriteriaScope, scopeId?: string | null) {
  const [templates, setTemplates] = useState<CriteriaTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('criteria_templates').select('*').eq('active', true);
    if (scope) query = query.eq('scope', scope);
    if (scopeId) query = query.eq('scope_id', scopeId);
    
    const { data, error } = await query.order('created_at');
    if (error) console.error('Error fetching criteria:', error);
    else setTemplates((data || []) as unknown as CriteriaTemplate[]);
    setLoading(false);
  }, [scope, scopeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertTemplate = async (template: Partial<CriteriaTemplate> & { criteria_type: CriteriaType; scope: CriteriaScope }) => {
    const { id, ...rest } = template;
    if (id) {
      const { error } = await supabase.from('criteria_templates').update(rest as any).eq('id', id);
      if (error) { toast.error('Failed to update criteria'); return false; }
    } else {
      const { error } = await supabase.from('criteria_templates').insert(rest as any);
      if (error) { toast.error('Failed to create criteria'); return false; }
    }
    toast.success('Criteria saved');
    fetch();
    return true;
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from('criteria_templates').update({ active: false } as any).eq('id', id);
    fetch();
  };

  return { templates, loading, refetch: fetch, upsertTemplate, deleteTemplate };
}

// ── Resolved criteria for a target ──
export function useResolvedCriteria(targetId: string | null) {
  const [resolved, setResolved] = useState<Record<CriteriaType, CriteriaTemplate | null>>({
    mastery: null, probe: null, generalization: null, maintenance: null,
  });

  useEffect(() => {
    if (!targetId) return;
    const fetchResolved = async () => {
      const types: CriteriaType[] = ['mastery', 'probe', 'generalization', 'maintenance'];
      const results: Record<string, CriteriaTemplate | null> = {};

      for (const type of types) {
        const { data } = await supabase.rpc('resolve_criteria', {
          _target_id: targetId,
          _criteria_type: type,
        });
        if (data) {
          const { data: template } = await supabase
            .from('criteria_templates')
            .select('*')
            .eq('id', data)
            .single();
          results[type] = template as unknown as CriteriaTemplate || null;
        } else {
          results[type] = null;
        }
      }
      setResolved(results as any);
    };
    fetchResolved();
  }, [targetId]);

  return resolved;
}

// ── Prompt Sets ──
export function usePromptSets(scope?: CriteriaScope, scopeId?: string | null) {
  const [sets, setSets] = useState<PromptSet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('prompt_sets').select('*').eq('active', true);
    if (scope) query = query.eq('scope', scope);
    if (scopeId) query = query.eq('scope_id', scopeId);

    const { data, error } = await query.order('created_at');
    if (error) console.error('Error fetching prompt sets:', error);
    
    const setsData = (data || []) as unknown as PromptSet[];
    
    // Fetch levels for each set
    if (setsData.length > 0) {
      const setIds = setsData.map(s => s.id);
      const { data: levels } = await supabase
        .from('prompt_levels')
        .select('*')
        .in('prompt_set_id', setIds)
        .order('rank');
      
      const levelsMap: Record<string, PromptLevelEntry[]> = {};
      for (const l of (levels || []) as unknown as PromptLevelEntry[]) {
        if (l.prompt_set_id) {
          if (!levelsMap[l.prompt_set_id]) levelsMap[l.prompt_set_id] = [];
          levelsMap[l.prompt_set_id].push(l);
        }
      }
      for (const s of setsData) {
        s.levels = levelsMap[s.id] || [];
      }
    }
    
    setSets(setsData);
    setLoading(false);
  }, [scope, scopeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createSet = async (set: { scope: CriteriaScope; scope_id?: string | null; name: string }) => {
    const { data, error } = await supabase.from('prompt_sets').insert(set as any).select().single();
    if (error) { toast.error('Failed to create prompt set'); return null; }
    toast.success('Prompt set created');
    fetch();
    return data;
  };

  const addLevel = async (promptSetId: string, level: { name: string; abbreviation: string; rank: number; counts_as_prompted: boolean }) => {
    const { error } = await supabase.from('prompt_levels').insert({
      ...level,
      prompt_set_id: promptSetId,
      is_default: false,
    } as any);
    if (error) { toast.error('Failed to add prompt level'); return false; }
    fetch();
    return true;
  };

  const updateLevel = async (levelId: string, updates: Partial<PromptLevelEntry>) => {
    const { error } = await supabase.from('prompt_levels').update(updates as any).eq('id', levelId);
    if (error) { toast.error('Failed to update prompt level'); return false; }
    fetch();
    return true;
  };

  const deleteLevel = async (levelId: string) => {
    const { error } = await supabase.from('prompt_levels').update({ is_active: false } as any).eq('id', levelId);
    if (error) { toast.error('Failed to remove prompt level'); return false; }
    fetch();
    return true;
  };

  return { sets, loading, refetch: fetch, createSet, addLevel, updateLevel, deleteLevel };
}

// ── Automation Settings ──
export function useAutomationSettings(scope?: CriteriaScope, scopeId?: string | null) {
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    // Resolve: specific scope first, then global
    if (scope && scope !== 'global' && scopeId) {
      const { data } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('scope', scope)
        .eq('scope_id', scopeId)
        .maybeSingle();
      if (data) {
        setSettings(data as unknown as AutomationSettings);
        setLoading(false);
        return;
      }
    }
    // Fallback to global
    const { data: global } = await supabase
      .from('automation_settings')
      .select('*')
      .eq('scope', 'global')
      .maybeSingle();
    setSettings(global as unknown as AutomationSettings || null);
    setLoading(false);
  }, [scope, scopeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertSettings = async (updates: Partial<AutomationSettings> & { scope: CriteriaScope; scope_id?: string | null }) => {
    // Check if exists
    let query = supabase.from('automation_settings').select('id').eq('scope', updates.scope);
    if (updates.scope_id) query = query.eq('scope_id', updates.scope_id);
    else query = query.is('scope_id', null);

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      await supabase.from('automation_settings').update(updates as any).eq('id', existing.id);
    } else {
      await supabase.from('automation_settings').insert(updates as any);
    }
    toast.success('Automation settings saved');
    fetch();
  };

  return { settings, loading, upsertSettings, refetch: fetch };
}

// ── Review Queue ──
export function useReviewQueue(studentId?: string) {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('review_queue').select('*').eq('status', 'pending');
    if (studentId) query = query.eq('student_id', studentId);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) console.error('Error fetching review queue:', error);
    else setItems((data || []) as unknown as ReviewQueueItem[]);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateItem = async (id: string, status: ReviewStatus, note?: string) => {
    const { error } = await supabase.from('review_queue').update({
      status,
      review_note: note || null,
      reviewed_at: new Date().toISOString(),
    } as any).eq('id', id);
    if (error) { toast.error('Failed to update'); return false; }
    fetch();
    return true;
  };

  return { items, loading, refetch: fetch, updateItem };
}

// ── Criteria Evaluations ──
export function useCriteriaEvaluations(targetId: string | null) {
  const [evaluations, setEvaluations] = useState<CriteriaEvaluation[]>([]);

  useEffect(() => {
    if (!targetId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('criteria_evaluations')
        .select('*')
        .eq('target_id', targetId);
      setEvaluations((data || []) as unknown as CriteriaEvaluation[]);
    };
    fetch();
  }, [targetId]);

  return evaluations;
}
