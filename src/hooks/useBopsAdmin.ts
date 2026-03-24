import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export function useBopsAdminAccess() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bops-admin-access', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await db.from('bops_admin_users').select('is_admin').eq('user_id', user.id).maybeSingle();
      return data?.is_admin === true;
    },
    enabled: !!user,
  });
}

export function useBopsAdminDashboard() {
  return useQuery({
    queryKey: ['bops-admin-dashboard'],
    queryFn: async () => {
      const { data, error } = await db.from('v_bops_admin_dashboard').select('*').single();
      if (error) throw error;
      return data;
    },
  });
}

export function useBopsAdminStudents() {
  return useQuery({
    queryKey: ['bops-admin-students'],
    queryFn: async () => {
      const { data, error } = await db.from('v_bops_admin_student_operations').select('*').order('student_name');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useBopsClassroomAnalytics() {
  return useQuery({
    queryKey: ['bops-classroom-analytics'],
    queryFn: async () => {
      const { data, error } = await db.from('v_bops_classroom_analytics').select('*');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useBopsCoverageAudit() {
  return useQuery({
    queryKey: ['bops-coverage-audit'],
    queryFn: async () => {
      const { data, error } = await db.from('v_bops_profile_program_coverage_audit').select('*');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useBopsSystemQA() {
  return useQuery({
    queryKey: ['bops-system-qa'],
    queryFn: async () => {
      const { data, error } = await db.from('v_bops_system_qa').select('*');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useBopsPlacements() {
  return useQuery({
    queryKey: ['bops-placements'],
    queryFn: async () => {
      const { data, error } = await db.from('v_student_bops_latest_cfi_summary').select('*');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useBopsBestFit() {
  return useQuery({
    queryKey: ['bops-best-fit'],
    queryFn: async () => {
      const { data, error } = await db.from('v_bops_cfi_best_fit').select('*');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useBopsBeaconNovaState() {
  return useQuery({
    queryKey: ['bops-beacon-nova-state'],
    queryFn: async () => {
      const { data, error } = await db.from('v_student_behavior_intelligence_dashboard').select(
        'student_id,bops_enabled,calculated_training_name,calculated_clinical_name,current_day_state,current_state_date,teacher_summary_view,clinician_summary_view,beacon_day_state,beacon_state_date,beacon_teacher_summary,beacon_targets,beacon_antecedents,beacon_reactives,beacon_reinforcement'
      ).eq('bops_enabled', true);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useBopsCfiModels() {
  return useQuery({
    queryKey: ['bops-cfi-models'],
    queryFn: async () => {
      const { data, error } = await db.from('bops_cfi_classroom_models').select('model_key,model_name').eq('active', true);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useBopsMasterPrograms(profileKey?: string) {
  return useQuery({
    queryKey: ['bops-master-programs', profileKey],
    queryFn: async () => {
      let q = db.from('bops_master_program_library').select('*');
      if (profileKey) q = q.eq('linked_profile_key', profileKey);
      const { data, error } = await q.order('program_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileKey,
  });
}

// --- Mutations ---

function useRpcMutation(rpcName: string, invalidateKeys: string[], successMsg: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: Record<string, any>) => {
      const { data, error } = await db.rpc(rpcName, args);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(successMsg);
    },
    onError: (err: any) => toast.error(err.message || 'Action failed'),
  });
}

export function useRepairStudent() {
  return useRpcMutation('repair_bops_student_state', ['bops-admin-students', 'bops-system-qa'], 'Student repaired');
}

export function useRunCfi() {
  return useRpcMutation('calculate_bops_cfi_models', ['bops-admin-students', 'bops-placements', 'bops-best-fit'], 'CFI calculated');
}

export function useAcceptBestFit() {
  return useRpcMutation('accept_bops_best_fit_placement', ['bops-admin-students', 'bops-placements'], 'Best fit accepted');
}

export function useResetPlacement() {
  return useRpcMutation('reset_bops_placement_to_best_fit', ['bops-admin-students', 'bops-placements'], 'Placement reset');
}

export function useOverridePlacement() {
  return useRpcMutation('override_bops_placement', ['bops-admin-students', 'bops-placements'], 'Placement overridden');
}

export function useSyncTargets() {
  return useRpcMutation('assign_bops_student_programs_to_student_targets', ['bops-admin-students', 'bops-system-qa'], 'Targets synced');
}

export function useSyncProgramming() {
  return useRpcMutation('sync_bops_programs_to_programming', ['bops-admin-students', 'bops-system-qa'], 'Programming synced');
}

export function useRefreshAllViews() {
  return useRpcMutation('refresh_all_bops_system_views', ['bops-classroom-analytics', 'bops-admin-dashboard'], 'System refreshed');
}

export function useRefreshClassroomAnalytics() {
  return useRpcMutation('refresh_bops_classroom_analytics', ['bops-classroom-analytics', 'bops-admin-dashboard'], 'Analytics refreshed');
}

export function useSeedManualProfile() {
  return useRpcMutation('seed_manual_bops_profile', ['bops-admin-students', 'bops-admin-dashboard'], 'Profile seeded');
}
