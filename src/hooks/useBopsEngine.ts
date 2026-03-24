import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

// ─── Query Key Constants ───
const QK = {
  roster: ['bops-engine-roster'],
  dashboard: (sid?: string) => ['bops-intelligence-dashboard', sid],
  suggestedPrograms: (sid?: string) => ['bops-suggested-programs', sid],
  acceptedPrograms: (sid?: string) => ['bops-accepted-programs', sid],
  cfiSummary: (sid?: string) => ['bops-cfi-summary', sid],
  cfiBestFit: (sid?: string) => ['bops-cfi-best-fit', sid],
  programBankRollup: (sid?: string) => ['bops-program-bank-rollup', sid],
  programBankSummary: (sid?: string) => ['bops-program-bank-summary', sid],
  suggestedSummary: (sid?: string) => ['bops-suggested-summary', sid],
  currentPlan: (sid?: string) => ['bops-current-plan', sid],
  currentDayState: (sid?: string) => ['bops-current-day-state', sid],
  beaconDashboard: (sid?: string) => ['bops-beacon-dashboard', sid],
};

function invalidateStudent(qc: ReturnType<typeof useQueryClient>, studentId: string) {
  qc.invalidateQueries({ queryKey: QK.roster });
  qc.invalidateQueries({ queryKey: QK.dashboard(studentId) });
}

// ─── Roster (Global Engine Console) ───
export function useBopsEngineRoster() {
  return useQuery({
    queryKey: QK.roster,
    queryFn: async () => {
      const { data, error } = await db.from('v_bops_engine_roster').select('*');
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Student Dashboard (Intelligence View) ───
export function useStudentBopsDashboard(studentId: string | undefined) {
  return useQuery({
    queryKey: QK.dashboard(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_student_behavior_intelligence_dashboard')
        .select('*')
        .eq('student_id', studentId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

// ─── Suggested Programs ───
export function useStudentSuggestedPrograms(studentId: string | undefined) {
  return useQuery({
    queryKey: QK.suggestedPrograms(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_student_behavior_intelligence_suggested_programs')
        .select('*')
        .eq('student_id', studentId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Accepted Programs ───
export function useStudentAcceptedPrograms(studentId: string | undefined) {
  return useQuery({
    queryKey: QK.acceptedPrograms(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_student_behavior_intelligence_accepted_programs')
        .select('*')
        .eq('student_id', studentId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── CFI Summary ───
export function useStudentCfiSummary(studentId: string | undefined) {
  return useQuery({
    queryKey: QK.cfiSummary(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_student_bops_latest_cfi_summary')
        .select('*')
        .eq('student_id', studentId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── CFI Best Fit ───
export function useStudentCfiBestFit(studentId: string | undefined) {
  return useQuery({
    queryKey: QK.cfiBestFit(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_bops_cfi_best_fit')
        .select('*')
        .eq('student_id', studentId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

// ─── Program Bank Rollup ───
export function useStudentProgramBankRollup(studentId: string | undefined) {
  return useQuery({
    queryKey: QK.programBankRollup(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_student_bops_program_bank_rollup')
        .select('*')
        .eq('student_id', studentId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Current Plan ───
export function useStudentCurrentPlan(studentId: string | undefined) {
  return useQuery({
    queryKey: QK.currentPlan(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_student_bops_current_plan')
        .select('*')
        .eq('student_id', studentId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

// ─── Beacon Dashboard ───
export function useStudentBeaconDashboard(studentId: string | undefined) {
  return useQuery({
    queryKey: QK.beaconDashboard(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_beacon_teacher_dashboard')
        .select('*')
        .eq('student_id', studentId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

// ═══════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════

// ─── Toggle BOPS On/Off ───
export function useToggleBops() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, enable }: { studentId: string; enable: boolean }) => {
      const fn = enable ? 'enable_bops_for_student' : 'disable_bops_for_student';
      const { error } = await db.rpc(fn, { p_student: studentId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId, enable }) => {
      invalidateStudent(qc, studentId);
      toast.success(enable ? 'BOPS enabled' : 'BOPS disabled');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Run CFI ───
export function useRunCfi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId }: { studentId: string; sessionId: string }) => {
      const { error } = await db.rpc('calculate_bops_cfi_models', { p_session_id: sessionId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      invalidateStudent(qc, studentId);
      qc.invalidateQueries({ queryKey: QK.cfiSummary(studentId) });
      qc.invalidateQueries({ queryKey: QK.cfiBestFit(studentId) });
      toast.success('CFI models calculated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Generate Recommendations (3-step) ───
export function useGenerateRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId }: { studentId: string; sessionId: string }) => {
      const { error: e1 } = await db.rpc('refresh_bops_recommended_programs', {
        p_student: studentId, p_session_id: sessionId,
      });
      if (e1) throw e1;
      const { error: e2 } = await db.rpc('refresh_bops_recommended_programs_from_combo', {
        p_student: studentId, p_session_id: sessionId,
      });
      if (e2) throw e2;
      const { error: e3 } = await db.rpc('generate_cfi_program_recommendations', {
        p_student: studentId, p_session_id: sessionId,
      });
      if (e3) throw e3;
    },
    onSuccess: (_, { studentId }) => {
      invalidateStudent(qc, studentId);
      qc.invalidateQueries({ queryKey: QK.suggestedPrograms(studentId) });
      qc.invalidateQueries({ queryKey: QK.suggestedSummary(studentId) });
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
      const { error } = await db.rpc('accept_by_day_state_and_activate', {
        p_student: studentId, p_session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      invalidateStudent(qc, studentId);
      qc.invalidateQueries({ queryKey: QK.acceptedPrograms(studentId) });
      qc.invalidateQueries({ queryKey: QK.programBankRollup(studentId) });
      qc.invalidateQueries({ queryKey: QK.currentPlan(studentId) });
      toast.success('Programs accepted & activated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Score Assessment ───
export function useScoreAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId }: { studentId: string; sessionId: string }) => {
      const { error } = await db.rpc('score_bops_assessment', { p_session_id: sessionId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      invalidateStudent(qc, studentId);
      toast.success('Assessment re-scored');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Finalize + Unlock Programming ───
export function useFinalizeAndUnlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId }: { studentId: string; sessionId: string }) => {
      const { error } = await db.rpc('finalize_bops_and_unlock_programming', { p_session_id: sessionId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      invalidateStudent(qc, studentId);
      qc.invalidateQueries({ queryKey: QK.suggestedPrograms(studentId) });
      qc.invalidateQueries({ queryKey: QK.suggestedSummary(studentId) });
      toast.success('Assessment finalized — programming unlocked');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Accept Single Suggested Program ───
export function useAcceptSuggestedProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, programKey }: { studentId: string; programKey: string }) => {
      const { error } = await db.rpc('accept_bops_suggested_program', {
        p_student: studentId, p_program_key: programKey,
      });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: QK.acceptedPrograms(studentId) });
      qc.invalidateQueries({ queryKey: QK.programBankRollup(studentId) });
      qc.invalidateQueries({ queryKey: QK.dashboard(studentId) });
      toast.success('Program accepted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Accept All by Day State ───
export function useAcceptByDayState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId }: { studentId: string; sessionId: string }) => {
      const { error } = await db.rpc('accept_recommended_programs_by_day_state', {
        p_student: studentId, p_session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: QK.acceptedPrograms(studentId) });
      qc.invalidateQueries({ queryKey: QK.programBankRollup(studentId) });
      qc.invalidateQueries({ queryKey: QK.dashboard(studentId) });
      toast.success('All programs accepted by day state');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Accepted Program Management ───
export function useDisableProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, programId }: { studentId: string; programId: string }) => {
      const { error } = await db.rpc('disable_student_bops_program', { p_program_id: programId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: QK.acceptedPrograms(studentId) });
      qc.invalidateQueries({ queryKey: QK.programBankRollup(studentId) });
      qc.invalidateQueries({ queryKey: QK.dashboard(studentId) });
      toast.success('Program disabled');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useEnableProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, programId }: { studentId: string; programId: string }) => {
      const { error } = await db.rpc('enable_student_bops_program', { p_program_id: programId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: QK.acceptedPrograms(studentId) });
      qc.invalidateQueries({ queryKey: QK.programBankRollup(studentId) });
      qc.invalidateQueries({ queryKey: QK.dashboard(studentId) });
      toast.success('Program enabled');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDuplicateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, programId }: { studentId: string; programId: string }) => {
      const { error } = await db.rpc('duplicate_student_bops_program', { p_program_id: programId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: QK.acceptedPrograms(studentId) });
      qc.invalidateQueries({ queryKey: QK.programBankRollup(studentId) });
      toast.success('Program duplicated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, programId }: { studentId: string; programId: string }) => {
      const { error } = await db.rpc('delete_student_bops_program', { p_program_id: programId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: QK.acceptedPrograms(studentId) });
      qc.invalidateQueries({ queryKey: QK.programBankRollup(studentId) });
      qc.invalidateQueries({ queryKey: QK.dashboard(studentId) });
      toast.success('Program deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSetPreferredDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, programId }: { studentId: string; programId: string }) => {
      const { error } = await db.rpc('set_student_bops_preferred_default', { p_program_id: programId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: QK.acceptedPrograms(studentId) });
      qc.invalidateQueries({ queryKey: QK.programBankRollup(studentId) });
      qc.invalidateQueries({ queryKey: QK.dashboard(studentId) });
      toast.success('Set as preferred default');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Activate / Deactivate Programming ───
export function useActivateProgramming() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      const { error } = await db.rpc('activate_bops_programming', { p_student: studentId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      invalidateStudent(qc, studentId);
      qc.invalidateQueries({ queryKey: QK.currentPlan(studentId) });
      toast.success('Programming activated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeactivateProgramming() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      const { error } = await db.rpc('deactivate_bops_programming', { p_student: studentId });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      invalidateStudent(qc, studentId);
      toast.success('Programming paused');
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
      const { error } = await db.rpc('set_bops_day_state_and_generate_plan', {
        p_student: params.studentId,
        p_state: params.dayState,
        p_selected_by: params.selectedBy || 'Staff',
        p_notes: params.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      invalidateStudent(qc, v.studentId);
      qc.invalidateQueries({ queryKey: QK.currentDayState(v.studentId) });
      qc.invalidateQueries({ queryKey: QK.currentPlan(v.studentId) });
      toast.success('Day state set & plan generated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
