import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ Types ============

export interface CanonicalBehavior {
  id: string;
  name: string;
  definition: string | null;
  status: string;
  is_selectable: boolean;
  domain_id: string | null;
  domain_name: string | null;
}

export interface ResolvedBehaviorAssignment {
  id: string;
  learner_id: string;
  original_behavior_id: string | null;
  effective_behavior_id: string | null;
  behavior_name_snapshot: string;
  domain_name_snapshot: string | null;
  assignment_status: string;
  assigned_at: string;
  ended_at: string | null;
  current_behavior_name: string | null;
  current_behavior_status: string | null;
  current_domain_name: string | null;
}

export type EntityStatus = 
  | 'active' 
  | 'archived' 
  | 'merged' 
  | 'deprecated' 
  | 'draft'
  | 'historical'
  | 'needs_mapping'
  | 'detached_custom';

export interface StatusDisplay {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  description?: string;
  successorName?: string;
}

// ============ Status Helpers ============

export function getStatusDisplay(
  status: string | null,
  originalId?: string | null,
  effectiveId?: string | null,
  successorName?: string | null,
): StatusDisplay {
  if (status === 'merged' && successorName) {
    return {
      label: `Merged → ${successorName}`,
      variant: 'secondary',
      description: 'This item was merged into a successor',
      successorName: successorName,
    };
  }
  if (status === 'archived') {
    return {
      label: 'Archived',
      variant: 'outline',
      description: 'This item is archived but historical data is preserved',
    };
  }
  if (status === 'deprecated') {
    return {
      label: 'Deprecated',
      variant: 'destructive',
      description: 'This item is deprecated and should be replaced',
    };
  }
  if (originalId && effectiveId && originalId !== effectiveId) {
    return {
      label: 'Resolved',
      variant: 'secondary',
      description: 'This assignment was resolved to a successor item',
    };
  }
  if (status === 'active') {
    return { label: 'Active', variant: 'default' };
  }
  if (status === 'draft') {
    return { label: 'Draft', variant: 'outline' };
  }
  if (status === 'needs_mapping') {
    return { label: 'Needs Mapping', variant: 'destructive', description: 'This item needs to be mapped to a canonical entry' };
  }
  if (status === 'detached_custom') {
    return { label: 'Custom', variant: 'outline', description: 'Locally created item not yet in the canonical library' };
  }
  if (status === 'historical') {
    return { label: 'Historical', variant: 'secondary', description: 'This item is retained for historical records only' };
  }
  return { label: status || 'Unknown', variant: 'outline' };
}

// ============ Hook: Selectable Behaviors ============

export function useSelectableBehaviors() {
  const [behaviors, setBehaviors] = useState<CanonicalBehavior[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_nt_selectable_behaviors' as any)
      .select('*');

    if (error) {
      console.error('Error fetching selectable behaviors:', error);
    } else {
      setBehaviors((data || []) as unknown as CanonicalBehavior[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { behaviors, loading, refetch: fetch };
}

// ============ Hook: Learner Behavior Assignments (Resolved) ============

export function useLearnerBehaviorAssignments(learnerId: string) {
  const [assignments, setAssignments] = useState<ResolvedBehaviorAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!learnerId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('v_nt_learner_behavior_assignments_resolved' as any)
      .select('*')
      .eq('learner_id', learnerId);

    if (error) {
      console.error('Error fetching behavior assignments:', error);
    } else {
      setAssignments((data || []) as unknown as ResolvedBehaviorAssignment[]);
    }
    setLoading(false);
  }, [learnerId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { assignments, loading, refetch: fetch };
}

// ============ Hook: Archive / Merge Operations ============

export function useBehaviorOperations() {
  const [operating, setOperating] = useState(false);

  const archiveBehavior = useCallback(async (behaviorId: string) => {
    setOperating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('nt_archive_behavior', {
        p_behavior_id: behaviorId,
        p_archived_by: user?.id || null,
      });
      if (error) throw error;
      toast.success('Behavior archived');
    } catch (err) {
      toast.error(`Archive failed: ${err}`);
    } finally {
      setOperating(false);
    }
  }, []);

  const mergeBehavior = useCallback(async (
    oldBehaviorId: string,
    newBehaviorId: string,
    reason?: string,
    migrateAssignments = true,
  ) => {
    setOperating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('nt_merge_behavior', {
        p_old_behavior_id: oldBehaviorId,
        p_new_behavior_id: newBehaviorId,
        p_merge_reason: reason || null,
        p_created_by: user?.id || null,
        p_migrate_active_assignments: migrateAssignments,
      });
      if (error) throw error;
      toast.success('Behavior merged successfully');
    } catch (err) {
      toast.error(`Merge failed: ${err}`);
    } finally {
      setOperating(false);
    }
  }, []);

  const archiveProgram = useCallback(async (programId: string) => {
    setOperating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('nt_archive_program', {
        p_program_id: programId,
        p_archived_by: user?.id || null,
      });
      if (error) throw error;
      toast.success('Program archived');
    } catch (err) {
      toast.error(`Archive failed: ${err}`);
    } finally {
      setOperating(false);
    }
  }, []);

  const mergeProgram = useCallback(async (
    oldProgramId: string,
    newProgramId: string,
    reason?: string,
    migrateAssignments = true,
  ) => {
    setOperating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('nt_merge_program', {
        p_old_program_id: oldProgramId,
        p_new_program_id: newProgramId,
        p_merge_reason: reason || null,
        p_created_by: user?.id || null,
        p_migrate_active_assignments: migrateAssignments,
      });
      if (error) throw error;
      toast.success('Program merged successfully');
    } catch (err) {
      toast.error(`Merge failed: ${err}`);
    } finally {
      setOperating(false);
    }
  }, []);

  return { operating, archiveBehavior, mergeBehavior, archiveProgram, mergeProgram };
}
