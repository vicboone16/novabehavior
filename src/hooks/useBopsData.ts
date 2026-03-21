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

// ─── Student Programs ───
export function useStudentBopsPrograms(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-programs', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bops_program_bank')
        .select('*')
        .eq('student_id', studentId!)
        .eq('active', true)
        .order('day_state')
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

// ─── Set Day State Mutation ───
export function useSetDayState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      studentId: string;
      date: string;
      dayState: 'red' | 'yellow' | 'green';
      selectedProblems?: string[];
      teacherNote?: string;
      clinicianNote?: string;
    }) => {
      const { data, error } = await supabase
        .from('bops_student_day_state')
        .upsert({
          student_id: params.studentId,
          date: params.date,
          day_state: params.dayState,
          selected_problem_areas: params.selectedProblems || [],
          teacher_note: params.teacherNote || null,
          clinician_note: params.clinicianNote || null,
          set_by_app: 'nova_core',
        }, { onConflict: 'student_id,date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['bops-day-state', v.studentId] });
      toast.success('Day state updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Generate Daily Plan Mutation ───
export function useGenerateDailyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      studentId: string;
      date: string;
      dayState: 'red' | 'yellow' | 'green';
      selectedProblems: string[];
    }) => {
      // Fetch programs matching day state
      const { data: programs, error: pErr } = await supabase
        .from('bops_program_bank')
        .select('*')
        .eq('student_id', params.studentId)
        .eq('day_state', params.dayState)
        .eq('active', true);
      if (pErr) throw pErr;

      // Filter by selected problem areas if any
      let filtered = programs || [];
      if (params.selectedProblems.length > 0) {
        filtered = filtered.filter(p =>
          params.selectedProblems.includes(p.problem_area || '')
        );
      }
      // If nothing matched filters, use all for the day state
      if (filtered.length === 0) filtered = programs || [];

      const targets = filtered.flatMap(p => {
        const t = p.target_options;
        return Array.isArray(t) ? t : [];
      });
      const benchmarks = filtered.flatMap(p => {
        const b = p.benchmark_ladder;
        return Array.isArray(b) ? [b[0]] : [];
      });
      const antecedents = filtered.flatMap(p => {
        const a = p.antecedent_strategies;
        return Array.isArray(a) ? a : [];
      });
      const reactives = filtered.flatMap(p => {
        const r = p.reactive_strategies;
        return Array.isArray(r) ? r : [];
      });
      const reinforcements = filtered.map(p => p.reinforcement_plan).filter(Boolean);

      const teacherSummary = filtered.map(p => `• ${p.program_name}: ${p.teacher_friendly_summary}`).join('\n');
      const clinicianSummary = filtered.map(p => `• ${p.program_name}: ${p.clinician_summary}`).join('\n');

      // Check if plan exists for this student+date
      const { data: existing } = await supabase
        .from('bops_daily_plan')
        .select('id')
        .eq('student_id', params.studentId)
        .eq('date', params.date)
        .maybeSingle();

      const planData = {
        student_id: params.studentId,
        date: params.date,
        day_state: params.dayState,
        active_program_ids: filtered.map(p => p.id) as any,
        active_targets: [...new Set(targets)] as any,
        benchmark_level: benchmarks[0] || 'N/A',
        antecedent_plan: [...new Set(antecedents)].join('; '),
        reactive_plan: [...new Set(reactives)].join('; '),
        reinforcement_plan: reinforcements.join('; '),
        teacher_summary_view: teacherSummary,
        clinician_summary_view: clinicianSummary,
        status: 'published',
      };

      let data, error;
      if (existing?.id) {
        ({ data, error } = await supabase.from('bops_daily_plan').update(planData).eq('id', existing.id).select().single());
      } else {
        ({ data, error } = await supabase.from('bops_daily_plan').insert(planData).select().single());
      }
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['bops-daily-plan', v.studentId] });
      toast.success('Daily plan generated and published');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Update Sync Control ───
export function useUpdateSyncControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      updates: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from('bops_sync_controls')
        .update(params.updates)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bops-sync'] });
      toast.success('Sync control updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Beacon Submissions ───
export function useBeaconSubmissions(studentId?: string) {
  return useQuery({
    queryKey: ['beacon-submissions', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beacon_submissions')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useReviewBeaconSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status: string }) => {
      const { error } = await supabase
        .from('beacon_submissions')
        .update({ submission_status: params.status })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beacon-submissions'] });
      toast.success('Submission reviewed');
    },
  });
}

// ─── Assessment Item Responses ───
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

export function useSaveBopsResponses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      studentId: string;
      assessmentId: string;
      responses: Array<{ itemId: string; itemNumber: number; domain: string; value: number }>;
    }) => {
      // Ensure assessment header exists
      const { data: existing } = await supabase
        .from('bops_assessment_responses')
        .select('id')
        .eq('id', params.assessmentId)
        .maybeSingle();
      if (!existing) {
        const { error: hErr } = await supabase.from('bops_assessment_responses').insert({
          id: params.assessmentId,
          student_id: params.studentId,
          status: 'in_progress',
        });
        if (hErr) throw hErr;
      }
      // Save individual items
      for (const r of params.responses) {
        const { error } = await supabase.from('bops_assessment_items').upsert({
          assessment_id: params.assessmentId,
          item_id: r.itemId,
          response_value: r.value,
        }, { onConflict: 'assessment_id,item_id' });
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['bops-assessment-items', v.assessmentId] });
      toast.success('Responses saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Score Calculator ───
export function calculateBopsScores(
  responses: Array<{ domain: string; response_value: number }>,
  questions: Array<{ domain: string; item_id: string }>
) {
  const domainCounts: Record<string, { sum: number; count: number }> = {};
  questions.forEach(q => {
    if (!domainCounts[q.domain]) domainCounts[q.domain] = { sum: 0, count: 0 };
    domainCounts[q.domain].count++;
  });
  responses.forEach(r => {
    if (!domainCounts[r.domain]) domainCounts[r.domain] = { sum: 0, count: 0 };
    domainCounts[r.domain].sum += r.response_value;
  });

  const scores: Record<string, number> = {};
  Object.entries(domainCounts).forEach(([domain, { sum, count }]) => {
    scores[domain] = count > 0 ? Math.round((sum / (count * 4)) * 100) / 100 : 0;
  });

  const highDomains = Object.entries(scores).filter(([, s]) => s >= 0.7).length;
  const stormScore = Math.round((highDomains / 10) * 100) / 100;

  // Indices
  const escalationIndex = Math.round(((scores.emotion || 0) + (scores.impulse || 0) + (scores.authority || 0)) / 3 * 100) / 100;
  const hiddenNeedIndex = Math.round(((scores.withdrawal || 0) + (scores.threat || 0) + (scores.sensory || 0)) / 3 * 100) / 100;
  const sensoryLoadIndex = scores.sensory || 0;
  const powerConflictIndex = Math.round(((scores.autonomy || 0) + (scores.authority || 0)) / 2 * 100) / 100;
  const socialComplexityIndex = Math.round(((scores.social || 0) + (scores.context || 0)) / 2 * 100) / 100;
  const recoveryBurdenIndex = Math.round(((scores.emotion || 0) + (scores.withdrawal || 0)) / 2 * 100) / 100;

  // Classification
  const sorted = Object.entries(scores)
    .filter(([d]) => !['navigator', 'storm'].includes(d))
    .sort((a, b) => b[1] - a[1]);

  const primary = sorted[0]?.[0] || '';
  const secondary = sorted[1]?.[0] || '';
  const tertiary = sorted[2]?.[0] || '';

  let profileType = 'single';
  if (highDomains >= 4) profileType = 'storm';
  else if (highDomains >= 3) profileType = 'complex';
  else if (sorted.length >= 3 && sorted[2][1] >= 0.5) profileType = 'triadic';
  else if (sorted.length >= 2 && sorted[1][1] >= 0.5) profileType = 'dual';

  return {
    scores,
    stormScore,
    escalationIndex,
    hiddenNeedIndex,
    sensoryLoadIndex,
    powerConflictIndex,
    socialComplexityIndex,
    recoveryBurdenIndex,
    profileType,
    primary,
    secondary,
    tertiary,
  };
}
