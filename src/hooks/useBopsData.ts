import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Domains ───
export function useBopsDomains() {
  return useQuery({
    queryKey: ['bops-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_domains')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

// ─── Archetypes ───
export function useBopsArchetypes() {
  return useQuery({
    queryKey: ['bops-archetypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_archetypes')
        .select('*')
        .eq('active', true)
        .order('archetype_name');
      if (error) throw error;
      return data;
    },
  });
}

// ─── Constellations ───
export function useBopsConstellations() {
  return useQuery({
    queryKey: ['bops-constellations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_constellations')
        .select('*')
        .eq('active', true)
        .order('constellation_id');
      if (error) throw error;
      return data;
    },
  });
}

// ─── Question Bank ───
export function useBopsQuestions() {
  return useQuery({
    queryKey: ['bops-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_question_bank')
        .select('*')
        .eq('active', true)
        .order('item_number');
      if (error) throw error;
      return data;
    },
  });
}

// ─── Classroom Types ───
export function useBopsClassroomTypes() {
  return useQuery({
    queryKey: ['bops-classroom-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_classroom_types')
        .select('*')
        .eq('active', true);
      if (error) throw error;
      return data;
    },
  });
}

// ─── Student Profile ───
export function useStudentBopsProfile(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-profile', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_bops_profiles')
        .select('*')
        .eq('student_id', studentId!)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Student Programs (Unified programming-page source) ───
export function useStudentBopsPrograms(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-programs', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_student_bops_programming_page')
        .select('*')
        .eq('student_id', studentId!)
        .eq('active', true)
        .eq('visible_on_programming_page', true)
        .order('domain')
        .order('program_name');
      if (error) throw error;
      return data;
    },
  });
}

// ─── Sync Controls ───
export function useStudentSyncControls(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-sync', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_sync_controls')
        .select('*')
        .eq('student_id', studentId!);
      if (error) throw error;
      return data;
    },
  });
}

// ─── Day State ───
export function useStudentDayState(studentId: string | undefined, date?: string) {
  const d = date || new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['bops-day-state', studentId, d],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_student_day_state')
        .select('*')
        .eq('student_id', studentId!)
        .eq('date', d)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Daily Plan ───
export function useStudentDailyPlan(studentId: string | undefined, date?: string) {
  const d = date || new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['bops-daily-plan', studentId, d],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_daily_plan')
        .select('*')
        .eq('student_id', studentId!)
        .eq('date', d)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Suggested Programs ───
export function useStudentSuggestedPrograms(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-suggested-programs', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_student_behavior_intelligence_suggested_programs')
        .select('*')
        .eq('student_id', studentId!);
      if (error) throw error;
      return data;
    },
  });
}

// ─── Accepted Programs (from program bank) ───
export function useStudentAcceptedPrograms(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-accepted-programs', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_program_bank')
        .select('*')
        .eq('student_id', studentId!)
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Assessment Items ───
export function useBopsAssessmentItems(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-assessment-items', assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_assessment_items')
        .select('*')
        .eq('assessment_id', assessmentId!);
      if (error) throw error;
      return data;
    },
  });
}

// ─── Beacon Shared Plan ───
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

// ─── Score Calculator ───
export function calculateBopsScores(
  responses: Array<{ item_number: number; value: number; domain?: string }>,
  questions: Array<{ item_number: number; linked_domain: string }>
) {
  const domainScores: Record<string, { total: number; count: number }> = {};
  for (const r of responses) {
    const q = questions.find(qq => qq.item_number === r.item_number);
    const domain = r.domain || q?.linked_domain || 'unknown';
    if (!domainScores[domain]) domainScores[domain] = { total: 0, count: 0 };
    domainScores[domain].total += r.value;
    domainScores[domain].count += 1;
  }

  const scores: Record<string, number> = {};
  for (const [d, v] of Object.entries(domainScores)) {
    scores[d] = v.count > 0 ? v.total / (v.count * 4) : 0;
  }

  const sorted = Object.entries(scores)
    .filter(([d]) => !['navigator', 'storm'].includes(d))
    .sort((a, b) => b[1] - a[1]);

  return {
    scores,
    primary: sorted[0]?.[0] || 'unknown',
    secondary: sorted[1]?.[0] || 'unknown',
    profileType: (scores.navigator || 0) >= 0.5 ? 'navigator' : 'non-navigator',
    stormScore: scores.storm || 0,
    escalationIndex: ((scores.impulse || 0) + (scores.emotion || 0)) / 2,
    hiddenNeedIndex: ((scores.withdrawal || 0) + (scores.sensory || 0)) / 2,
    sensoryLoadIndex: scores.sensory || 0,
    powerConflictIndex: ((scores.authority || 0) + (scores.autonomy || 0)) / 2,
    socialComplexityIndex: ((scores.social || 0) + (scores.context || 0)) / 2,
    recoveryBurdenIndex: ((scores.rigidity || 0) + (scores.emotion || 0)) / 2,
  };
}

// ─── Mutations ───
export function useSetDayState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, dayState, date, teacherName, note }: {
      studentId: string;
      dayState: string;
      date: string;
      teacherName?: string;
      note?: string;
    }) => {
      const { error } = await supabase.rpc('generate_beacon_teacher_plan', {
        p_student: studentId,
        p_date: date,
        p_state: dayState,
        p_teacher_name: teacherName || 'Teacher',
        p_classroom_id: null,
        p_optional_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bops-day-state', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['bops-daily-plan', vars.studentId] });
      toast.success('Day state updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update day state'),
  });
}

export function useGenerateDailyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, state, currentUserName, notes }: {
      studentId: string;
      state: string;
      currentUserName?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.rpc('set_bops_day_state_and_generate_plan', {
        p_student: studentId,
        p_state: state,
        p_current_user_name: currentUserName || 'User',
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bops-daily-plan', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['bops-programs', vars.studentId] });
      toast.success('Daily plan generated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to generate daily plan'),
  });
}

export function useSaveBopsResponses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, assessmentId, responses }: {
      studentId: string;
      assessmentId: string;
      responses: Array<{ itemId: string; itemNumber: number; domain: string; value: number }>;
    }) => {
      const rows = responses.map(r => ({
        assessment_id: assessmentId,
        student_id: studentId,
        item_id: r.itemId,
        item_number: r.itemNumber,
        domain: r.domain,
        value: r.value,
      }));
      const { error } = await supabase.from('bops_assessment_items').upsert(rows, { onConflict: 'assessment_id,item_id' });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Assessment responses saved'),
    onError: (e: any) => toast.error(e.message || 'Failed to save responses'),
  });
}

export function useReviewBeaconSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('beacon_submissions')
        .update({ submission_status: status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beacon-submissions-all'] });
      toast.success('Submission reviewed');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to review submission'),
  });
}

export function useUpdateSyncControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('bops_sync_controls')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-sync'] });
      toast.success('Sync control updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update sync control'),
  });
}
