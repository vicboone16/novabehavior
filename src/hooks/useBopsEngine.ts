import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Engine Roster ───
export function useBopsEngineRoster() {
  return useQuery({
    queryKey: ['bops-engine-roster'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_bops_engine_roster' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Student Intelligence Dashboard ───
export function useStudentBopsDashboard(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-intelligence-dashboard', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_student_behavior_intelligence_dashboard' as any)
        .select('*')
        .eq('student_id', studentId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

// ─── Enable/Disable BOPS ───
export function useToggleBops() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, enable }: { studentId: string; enable: boolean }) => {
      const fn = enable ? 'enable_bops_for_student' : 'disable_bops_for_student';
      const { error } = await supabase.rpc(fn, { p_student: studentId });
      if (error) throw error;
    },
    onSuccess: (_, { enable }) => {
      qc.invalidateQueries({ queryKey: ['bops-engine-roster'] });
      qc.invalidateQueries({ queryKey: ['bops-intelligence-dashboard'] });
      qc.invalidateQueries({ queryKey: ['bops-profile'] });
      toast.success(enable ? 'BOPS enabled' : 'BOPS disabled');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Run CFI ───
export function useRunCfi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { error } = await supabase.rpc('calculate_bops_cfi_models', { p_session_id: sessionId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-intelligence-dashboard'] });
      toast.success('CFI models calculated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Generate Recommendations ───
export function useGenerateRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId }: { studentId: string; sessionId: string }) => {
      const { error: e1 } = await supabase.rpc('refresh_bops_recommended_programs', {
        p_student_id: studentId,
        p_session_id: sessionId,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.rpc('refresh_bops_recommended_programs_from_combo', {
        p_student_id: studentId,
        p_session_id: sessionId,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-intelligence-dashboard'] });
      toast.success('Recommendations generated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Accept + Activate ───
export function useAcceptAndActivate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId }: { studentId: string; sessionId: string }) => {
      const { error } = await supabase.rpc('accept_all_bops_recommended_programs', {
        p_student_id: studentId,
        p_session_id: sessionId,
      });
      if (error) throw error;
      const { error: e2 } = await supabase.rpc('activate_bops_programming', {
        p_student_id: studentId,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-intelligence-dashboard'] });
      qc.invalidateQueries({ queryKey: ['bops-engine-roster'] });
      toast.success('Programs accepted & activated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Set Day State + Generate Plan ───
export function useSetDayStateAndPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      studentId: string;
      dayState: string;
      selectedBy?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.rpc('set_bops_day_state_and_generate_plan', {
        p_student_id: params.studentId,
        p_day_state: params.dayState,
        p_selected_by: params.selectedBy || 'Staff',
        p_notes: params.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['bops-intelligence-dashboard', v.studentId] });
      qc.invalidateQueries({ queryKey: ['bops-day-state'] });
      qc.invalidateQueries({ queryKey: ['bops-daily-plan'] });
      toast.success('Day state set & plan generated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Activate / Deactivate Programming ───
export function useActivateProgramming() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      const { error } = await supabase.rpc('activate_bops_programming', { p_student_id: studentId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-intelligence-dashboard'] });
      toast.success('Programming activated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeactivateProgramming() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      const { error } = await supabase.rpc('deactivate_bops_programming', { p_student_id: studentId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-intelligence-dashboard'] });
      toast.success('Programming paused');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
