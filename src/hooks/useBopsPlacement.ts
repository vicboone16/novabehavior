import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Placement Panel (best fit + all results) ───
export function useBopsPlacementPanel(studentId?: string) {
  return useQuery({
    queryKey: ['bops-placement-panel', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_student_bops_placement_panel' as any)
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

// ─── All CFI results ranked ───
export function useBopsCfiResults(studentId?: string) {
  return useQuery({
    queryKey: ['bops-cfi-results', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_bops_cfi_latest_results' as any)
        .select('*')
        .eq('student_id', studentId)
        .order('recommended_rank' as any);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

// ─── CFI Explanations ───
export function useBopsCfiExplanations(studentId?: string) {
  return useQuery({
    queryKey: ['bops-cfi-explanations', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_bops_cfi_explanations' as any)
        .select('*')
        .eq('student_id', studentId)
        .order('session_id' as any, { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

// ─── CFI Program Recommendations ───
export function useBopsCfiPrograms(studentId?: string) {
  return useQuery({
    queryKey: ['bops-cfi-programs', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_student_bops_cfi_programs' as any)
        .select('*')
        .eq('student_id', studentId);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

// ─── Placement Mismatch ───
export function useBopsPlacementMismatch(studentId?: string) {
  return useQuery({
    queryKey: ['bops-placement-mismatch', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_bops_placement_mismatch' as any)
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

// ─── Multi-profile resolution ───
export function useBopsProfileResolution(studentId?: string) {
  return useQuery({
    queryKey: ['bops-profile-resolution', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_multi_profile_resolution')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Latest scores ───
export function useBopsLatestScores(studentId?: string) {
  return useQuery({
    queryKey: ['bops-latest-scores', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_bops_scores')
        .select('*')
        .eq('student_id', studentId)
        .order('assessment_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Select placement ───
export function useSelectPlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, modelKey }: { studentId: string; modelKey: string }) => {
      const { error } = await supabase
        .from('student_bops_config')
        .update({ selected_cfi_model: modelKey } as any)
        .eq('student_id', studentId);
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      toast.success('Placement selected');
      qc.invalidateQueries({ queryKey: ['bops-placement-panel', studentId] });
      qc.invalidateQueries({ queryKey: ['student-bops-config', studentId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Accept Placement + Programs ───
export function useAcceptPlacementAndPrograms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId, modelKey }: { studentId: string; sessionId: string; modelKey: string }) => {
      // Set placement
      const { error: e1 } = await supabase
        .from('student_bops_config')
        .update({ selected_cfi_model: modelKey } as any)
        .eq('student_id', studentId);
      if (e1) throw e1;

      // Generate CFI program recommendations
      const { error: e2 } = await supabase.rpc('generate_cfi_program_recommendations', {
        p_student: studentId,
        p_session: sessionId,
      } as any);
      if (e2) throw e2;

      // Accept and activate
      const { error: e3 } = await supabase.rpc('accept_by_day_state_and_activate', {
        p_student: studentId,
        p_session_id: sessionId,
      });
      if (e3) throw e3;
    },
    onSuccess: (_, { studentId }) => {
      toast.success('Placement accepted and programs activated');
      qc.invalidateQueries({ queryKey: ['bops-placement-panel', studentId] });
      qc.invalidateQueries({ queryKey: ['student-bops-config', studentId] });
      qc.invalidateQueries({ queryKey: ['bops-student-program-bank', studentId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
