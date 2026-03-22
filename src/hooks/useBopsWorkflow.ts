import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Student Config ───
export function useStudentBopsConfig(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-config', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_bops_config')
        .select('*')
        .eq('student_id', studentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Student Scores (latest) ───
export function useStudentBopsScores(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-scores', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_bops_scores')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Multi-Profile Resolution ───
export function useStudentBopsResolution(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-resolution', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_multi_profile_resolution')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Suggested Programs (view) ───
export function useBopsSuggestedPrograms(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-suggested-programs', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_bops_student_program_recommendations' as any)
        .select('*')
        .eq('student_id', studentId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Student Program Bank (view) ───
export function useStudentProgramBank(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-student-bank', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_student_bops_program_bank' as any)
        .select('*')
        .eq('student_id', studentId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Plan Candidates (view) ───
export function useBopsPlanCandidates(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-plan-candidates', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_student_bops_plan_candidates' as any)
        .select('*')
        .eq('student_id', studentId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Beacon Shared Plans ───
export function useBeaconSharedPlan(studentId: string | undefined) {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['beacon-shared-plan', studentId, today],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beacon_shared_plans')
        .select('*')
        .eq('student_id', studentId!)
        .eq('plan_date', today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Accept One Program ───
export function useAcceptSuggestedProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, programKey }: { studentId: string; programKey: string }) => {
      const { data, error } = await supabase.rpc('accept_bops_suggested_program', {
        p_student: studentId,
        p_program_key: programKey,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['bops-student-bank', v.studentId] });
      qc.invalidateQueries({ queryKey: ['bops-suggested-programs', v.studentId] });
      toast.success('Program accepted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Accept All Programs ───
export function useAcceptAllPrograms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId }: { studentId: string; sessionId: string }) => {
      const { data, error } = await supabase.rpc('accept_all_bops_recommended_programs', {
        p_student: studentId,
        p_session_id: sessionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['bops-student-bank', v.studentId] });
      qc.invalidateQueries({ queryKey: ['bops-suggested-programs', v.studentId] });
      toast.success('All recommended programs accepted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Update Student Program ───
export function useUpdateStudentProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ programId, updates }: { programId: string; updates: Record<string, any> }) => {
      const { data, error } = await supabase.rpc('update_student_bops_program', {
        p_program_id: programId,
        ...updates,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-student-bank'] });
      toast.success('Program updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Set Preferred Default ───
export function useSetPreferredDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      const { data, error } = await supabase.rpc('set_student_bops_preferred_default', {
        p_program_id: programId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-student-bank'] });
      qc.invalidateQueries({ queryKey: ['bops-plan-candidates'] });
      toast.success('Preferred default set');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Activate/Deactivate Programming ───
export function useActivateProgramming() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase.rpc('activate_bops_programming', {
        p_student: studentId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-config'] });
      toast.success('Programming activated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeactivateProgramming() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase.rpc('deactivate_bops_programming', {
        p_student: studentId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-config'] });
      toast.success('Programming paused');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Generate Plan via RPC ───
export function useGenerateBopsPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, dayState, selectedBy, notes }: {
      studentId: string; dayState: string; selectedBy: string; notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('set_bops_day_state_and_generate_plan', {
        p_student: studentId,
        p_state: dayState,
        p_selected_by: selectedBy,
        p_notes: notes || '',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['bops-daily-plan', v.studentId] });
      qc.invalidateQueries({ queryKey: ['beacon-shared-plan', v.studentId] });
      qc.invalidateQueries({ queryKey: ['bops-day-state', v.studentId] });
      toast.success("Today's plan generated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Disable/Enable/Duplicate/Delete student program ───
export function useDisableStudentProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.rpc('disable_student_bops_program', { p_program_id: programId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bops-student-bank'] }); toast.success('Program disabled'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useEnableStudentProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.rpc('enable_student_bops_program', { p_program_id: programId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bops-student-bank'] }); toast.success('Program enabled'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDuplicateStudentProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.rpc('duplicate_student_bops_program', { p_program_id: programId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bops-student-bank'] }); toast.success('Program duplicated'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteStudentProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.rpc('delete_student_bops_program', { p_program_id: programId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bops-student-bank'] }); toast.success('Program deleted'); },
    onError: (e: any) => toast.error(e.message),
  });
}
