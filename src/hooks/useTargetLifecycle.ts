import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  TargetLifecycleStatus,
  TargetClosedReason,
  TargetActivityLogEntry,
} from '@/types/targetLifecycle';

/**
 * Hook to manage target lifecycle actions (hold, reinstate, close, reopen, discontinue, replace).
 */
export function useTargetLifecycle(targetId: string | null) {
  const [loading, setLoading] = useState(false);

  const holdTarget = async (reason?: string) => {
    if (!targetId) return false;
    setLoading(true);
    const { error } = await supabase
      .from('skill_targets')
      .update({
        lifecycle_status: 'on_hold',
        hold_at: new Date().toISOString(),
        hold_reason: reason || null,
      } as any)
      .eq('id', targetId);
    setLoading(false);
    if (error) { toast.error('Failed to hold target'); return false; }
    toast.success('Target put on hold');
    return true;
  };

  const reinstateTarget = async () => {
    if (!targetId) return false;
    setLoading(true);
    const { error } = await supabase
      .from('skill_targets')
      .update({
        lifecycle_status: 'active',
        reinstated_at: new Date().toISOString(),
      } as any)
      .eq('id', targetId);
    setLoading(false);
    if (error) { toast.error('Failed to reinstate target'); return false; }
    toast.success('Target reinstated');
    return true;
  };

  const closeTarget = async (reason: TargetClosedReason = 'mastered') => {
    if (!targetId) return false;
    setLoading(true);
    const { error } = await supabase
      .from('skill_targets')
      .update({
        lifecycle_status: 'closed',
        closed_at: new Date().toISOString(),
        closed_reason: reason,
      } as any)
      .eq('id', targetId);
    setLoading(false);
    if (error) { toast.error('Failed to close target'); return false; }
    toast.success('Target closed');
    return true;
  };

  const reopenTarget = async (phase?: string) => {
    if (!targetId) return false;
    setLoading(true);
    const updates: any = {
      lifecycle_status: 'active',
      reopened_at: new Date().toISOString(),
    };
    if (phase) updates.phase = phase;
    const { error } = await supabase
      .from('skill_targets')
      .update(updates)
      .eq('id', targetId);
    setLoading(false);
    if (error) { toast.error('Failed to reopen target'); return false; }
    toast.success('Target reopened');
    return true;
  };

  const discontinueTarget = async (reasonText?: string) => {
    if (!targetId) return false;
    setLoading(true);
    const { error } = await supabase
      .from('skill_targets')
      .update({
        lifecycle_status: 'closed',
        closed_at: new Date().toISOString(),
        closed_reason: 'discontinued',
        discontinue_reason_text: reasonText || null,
      } as any)
      .eq('id', targetId);
    setLoading(false);
    if (error) { toast.error('Failed to discontinue target'); return false; }
    toast.success('Target discontinued');
    return true;
  };

  const replaceTarget = async (newTargetName?: string) => {
    if (!targetId) return null;
    setLoading(true);

    // 1. Fetch current target
    const { data: current } = await supabase
      .from('skill_targets')
      .select('*')
      .eq('id', targetId)
      .single();

    if (!current) {
      setLoading(false);
      toast.error('Target not found');
      return null;
    }

    const versionGroupId = (current as any).version_group_id || targetId;
    const currentVersion = (current as any).version || 1;

    // 2. Create new target version
    const { data: newTarget, error: insertErr } = await supabase
      .from('skill_targets')
      .insert({
        program_id: current.program_id,
        name: newTargetName || `${current.name} (v${currentVersion + 1})`,
        operational_definition: current.operational_definition,
        mastery_criteria: current.mastery_criteria,
        mastery_percent: current.mastery_percent,
        mastery_consecutive_sessions: current.mastery_consecutive_sessions,
        phase: 'baseline',
        lifecycle_status: 'active',
        sort_order: current.sort_order,
        version: currentVersion + 1,
        version_group_id: versionGroupId,
        replaces_target_id: targetId,
        is_required: (current as any).is_required ?? true,
      } as any)
      .select()
      .single();

    if (insertErr || !newTarget) {
      setLoading(false);
      toast.error('Failed to create replacement target');
      return null;
    }

    // 3. Close old target as replaced
    await supabase
      .from('skill_targets')
      .update({
        lifecycle_status: 'closed',
        closed_at: new Date().toISOString(),
        closed_reason: 'replaced',
        replaced_by_target_id: newTarget.id,
        version_group_id: versionGroupId,
      } as any)
      .eq('id', targetId);

    setLoading(false);
    toast.success('Target replaced with new version');
    return newTarget;
  };

  return {
    loading,
    holdTarget,
    reinstateTarget,
    closeTarget,
    reopenTarget,
    discontinueTarget,
    replaceTarget,
  };
}

/**
 * Hook to fetch the activity timeline for a target.
 */
export function useTargetActivityLog(targetId: string | null) {
  const [entries, setEntries] = useState<TargetActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('target_activity_log')
      .select('*')
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching activity log:', error);
    else setEntries((data || []) as unknown as TargetActivityLogEntry[]);
    setLoading(false);
  }, [targetId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { entries, loading, refetch: fetch };
}
