import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

// ─── Types ───
export interface NovaAssessment {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scale_min: number;
  scale_max: number;
  scale_labels: any;
  is_active: boolean;
}

export interface NovaAssessmentDomain {
  id: string;
  assessment_id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  priority_order: number | null;
  is_profile_driving: boolean;
}

export interface NovaAssessmentItem {
  id: string;
  assessment_id: string;
  domain_id: string;
  item_number: number;
  item_code: string;
  item_text: string;
  reverse_scored: boolean;
  archetype_code: string | null;
  display_order: number;
}

export interface NovaAssessmentSession {
  id: string;
  assessment_id: string;
  student_id: string;
  evaluator_user_id: string | null;
  rater_name: string | null;
  rater_role: string | null;
  setting_name: string | null;
  confidence_level: number | null;
  administration_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface NovaAssessmentRating {
  id: string;
  session_id: string;
  item_id: string;
  raw_score: number;
  normalized_score: number | null;
  comments: string | null;
}

export interface NovaAssessmentResult {
  id: string;
  session_id: string;
  result_scope: string;
  result_key: string;
  result_label: string;
  avg_score: number | null;
  raw_total: number | null;
  band_label: string | null;
  is_primary: boolean;
  is_secondary: boolean;
  result_json: any;
}

export interface NovaReportData {
  session_id: string;
  assessment_code: string;
  assessment_name: string;
  student_id: string;
  administration_date: string;
  rater_name: string | null;
  rater_role: string | null;
  setting_name: string | null;
  confidence_level: number | null;
  domain_results: any[];
  profiles: any[];
  flags: any[];
  summary_text: string;
}

export interface NovaMasterReportData {
  student_id: string;
  sbrds_session_id: string | null;
  efdp_session_id: string | null;
  abrse_session_id: string | null;
  nap_session_id: string | null;
  sbrds_summary: string | null;
  efdp_summary: string | null;
  abrse_summary: string | null;
  nap_summary: string | null;
  sbrds_results: any[] | null;
  efdp_results: any[] | null;
  abrse_results: any[] | null;
  nap_results: any[] | null;
  master_summary: string | null;
}

export interface AbrseRecommendation {
  session_id: string;
  student_id: string;
  item_code: string;
  item_text: string;
  raw_score: number;
  normalized_score: number | null;
  target_code: string | null;
  target_label: string | null;
  behavior_function: string | null;
  replacement_behavior: string | null;
  goal_template: string | null;
  strategy_template: string | null;
  reinforcement_template: string | null;
}

export interface NovaGeneratedRecommendation {
  id: string;
  student_id: string;
  session_id: string;
  assessment_code: string;
  source_result_key: string | null;
  recommendation_type: string;
  setting_type: string;
  option_group: string | null;
  option_rank: number;
  title: string;
  generated_text: string;
  original_text: string | null;
  rationale_text: string | null;
  status: string;
  converted_from: string | null;
  created_at: string;
  updated_at: string;
}

// ─── List available assessments ───
export function useNovaAssessmentCatalog() {
  return useQuery({
    queryKey: ['nova-assessment-catalog'],
    queryFn: async () => {
      const { data, error } = await db
        .from('nova_assessments')
        .select('*')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return (data || []) as NovaAssessment[];
    },
  });
}

// ─── Get domains for an assessment ───
export function useNovaAssessmentDomains(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['nova-assessment-domains', assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('nova_assessment_domains')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('display_order');
      if (error) throw error;
      return (data || []) as NovaAssessmentDomain[];
    },
  });
}

// ─── Get items for an assessment ───
export function useNovaAssessmentItems(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['nova-assessment-items', assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('nova_assessment_items')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('display_order');
      if (error) throw error;
      return (data || []) as NovaAssessmentItem[];
    },
  });
}

// ─── Get latest sessions for student ───
export function useNovaStudentSessions(studentId: string | undefined) {
  return useQuery({
    queryKey: ['nova-student-sessions', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('nova_assessment_sessions')
        .select('*, assessment:nova_assessments(code, name)')
        .eq('student_id', studentId)
        .order('administration_date', { ascending: false });
      if (error) throw error;
      return (data || []) as (NovaAssessmentSession & { assessment: { code: string; name: string } })[];
    },
  });
}

// ─── Get a single session with ratings ───
export function useNovaAssessmentSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['nova-assessment-session', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await db
        .from('nova_assessment_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      return data as NovaAssessmentSession;
    },
  });
}

// ─── Get ratings for a session ───
export function useNovaSessionRatings(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['nova-session-ratings', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await db
        .from('nova_assessment_ratings')
        .select('*')
        .eq('session_id', sessionId);
      if (error) throw error;
      return (data || []) as NovaAssessmentRating[];
    },
  });
}

// ─── Get results for a session ───
export function useNovaSessionResults(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['nova-session-results', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await db
        .from('nova_assessment_results')
        .select('*')
        .eq('session_id', sessionId)
        .order('result_scope, result_key');
      if (error) throw error;
      return (data || []) as NovaAssessmentResult[];
    },
  });
}

// ─── Get report data for a session ───
export function useNovaAssessmentReport(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['nova-assessment-report', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_nova_assessment_report')
        .select('*')
        .eq('session_id', sessionId)
        .single();
      if (error) throw error;
      return data as NovaReportData;
    },
  });
}

// ─── Get ABRSE recommendations ───
export function useNovaAbrseRecommendations(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['nova-abrse-recommendations', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_nova_abrse_recommendations')
        .select('*')
        .eq('session_id', sessionId);
      if (error) throw error;
      return (data || []) as AbrseRecommendation[];
    },
  });
}

// ─── Get master report ───
export function useNovaMasterReport(studentId: string | undefined) {
  return useQuery({
    queryKey: ['nova-master-report', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_nova_master_report_full')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();
      if (error) throw error;
      return data as NovaMasterReportData | null;
    },
  });
}

// ─── Create session ───
export function useCreateNovaSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      assessmentId: string;
      studentId: string;
      raterName?: string;
      raterRole?: string;
      settingName?: string;
      confidenceLevel?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await db
        .from('nova_assessment_sessions')
        .insert({
          assessment_id: params.assessmentId,
          student_id: params.studentId,
          evaluator_user_id: user?.id || null,
          rater_name: params.raterName || null,
          rater_role: params.raterRole || null,
          setting_name: params.settingName || null,
          confidence_level: params.confidenceLevel || null,
          administration_date: new Date().toISOString().split('T')[0],
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data as NovaAssessmentSession;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['nova-student-sessions', vars.studentId] });
      toast.success('Assessment session created');
    },
    onError: (err: any) => {
      toast.error('Failed to create session: ' + err.message);
    },
  });
}

// ─── Save ratings (upsert) ───
export function useSaveNovaRatings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      ratings: { itemId: string; rawScore: number; comments?: string }[];
    }) => {
      const rows = params.ratings.map(r => ({
        session_id: params.sessionId,
        item_id: r.itemId,
        raw_score: r.rawScore,
        comments: r.comments || null,
      }));

      // Upsert one at a time to handle the unique constraint
      for (const row of rows) {
        const { error } = await db
          .from('nova_assessment_ratings')
          .upsert(row, { onConflict: 'session_id,item_id' });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['nova-session-ratings', vars.sessionId] });
    },
  });
}

// ─── Auto-score session ───
export function useAutoScoreNovaSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await db.rpc('nova_score_session', { p_session_id: sessionId });
      if (error) throw error;
    },
    onSuccess: (_, sessionId) => {
      qc.invalidateQueries({ queryKey: ['nova-session-results', sessionId] });
      qc.invalidateQueries({ queryKey: ['nova-assessment-report', sessionId] });
      toast.success('Assessment scored successfully');
    },
    onError: (err: any) => {
      toast.error('Scoring failed: ' + err.message);
    },
  });
}

// ─── Finalize session ───
export function useFinalizeNovaSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { sessionId: string; studentId: string }) => {
      const { error } = await db
        .from('nova_assessment_sessions')
        .update({ status: 'final', updated_at: new Date().toISOString() })
        .eq('id', params.sessionId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['nova-student-sessions', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['nova-assessment-session', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['nova-master-report', vars.studentId] });
      toast.success('Assessment finalized');
    },
    onError: (err: any) => {
      toast.error('Failed to finalize: ' + err.message);
    },
  });
}

// ─── Update session metadata ───
export function useUpdateNovaSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      updates: Partial<Pick<NovaAssessmentSession, 'rater_name' | 'rater_role' | 'setting_name' | 'confidence_level' | 'administration_date'>>;
    }) => {
      const { error } = await db
        .from('nova_assessment_sessions')
        .update({ ...params.updates, updated_at: new Date().toISOString() })
        .eq('id', params.sessionId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['nova-assessment-session', vars.sessionId] });
    },
  });
}

// ─── Get generated recommendations for a session ───
export function useNovaRecommendations(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['nova-recommendations', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await db
        .from('nova_generated_recommendations')
        .select('*')
        .eq('session_id', sessionId)
        .order('recommendation_type, option_group, option_rank');
      if (error) throw error;
      return (data || []) as NovaGeneratedRecommendation[];
    },
  });
}

// ─── Get all recommendations for a student (across sessions) ───
export function useNovaStudentRecommendations(studentId: string | undefined) {
  return useQuery({
    queryKey: ['nova-student-recommendations', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('nova_generated_recommendations')
        .select('*')
        .eq('student_id', studentId)
        .in('status', ['accepted', 'edited', 'manual'])
        .order('assessment_code, recommendation_type, title');
      if (error) throw error;
      return (data || []) as NovaGeneratedRecommendation[];
    },
  });
}

// ─── Generate recommendations for a session ───
export function useGenerateNovaRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { sessionId: string; settingType?: string }) => {
      const { error } = await db.rpc('nova_generate_recommendations_for_session', {
        p_session_id: params.sessionId,
        p_setting_type: params.settingType || 'school',
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['nova-recommendations', vars.sessionId] });
      toast.success('Recommendations generated');
    },
    onError: (err: any) => {
      toast.error('Failed to generate recommendations: ' + err.message);
    },
  });
}

// ─── Update a recommendation (accept/edit/reject/swap/convert) ───
export function useUpdateNovaRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      sessionId: string;
      updates: Partial<Pick<NovaGeneratedRecommendation, 'status' | 'generated_text' | 'recommendation_type' | 'converted_from' | 'setting_type'>>;
    }) => {
      const { error } = await db
        .from('nova_generated_recommendations')
        .update({ ...params.updates, updated_at: new Date().toISOString() })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['nova-recommendations', vars.sessionId] });
    },
  });
}

// ─── Add a custom recommendation ───
export function useAddCustomRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      studentId: string;
      sessionId: string;
      assessmentCode: string;
      recommendationType: string;
      settingType: string;
      title: string;
      text: string;
      rationale?: string;
    }) => {
      const { error } = await db
        .from('nova_generated_recommendations')
        .insert({
          student_id: params.studentId,
          session_id: params.sessionId,
          assessment_code: params.assessmentCode,
          recommendation_type: params.recommendationType,
          setting_type: params.settingType,
          title: params.title,
          generated_text: params.text,
          original_text: params.text,
          rationale_text: params.rationale || null,
          status: 'manual',
          option_rank: 1,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['nova-recommendations', vars.sessionId] });
      toast.success('Custom recommendation added');
    },
  });
}

// ─── Get full narrative for a session ───
export function useNovaFullNarrative(sessionId: string | undefined, audience: string = 'clinical') {
  return useQuery({
    queryKey: ['nova-full-narrative', sessionId, audience],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await db.rpc('nova_generate_full_narrative', {
        p_session_id: sessionId,
        p_audience: audience,
      });
      if (error) throw error;
      return data as string;
    },
  });
}

// ─── Instance Goals ───
export interface InstanceGeneratedGoal {
  id: string;
  session_id: string;
  source_goal_id: string | null;
  goal_type: string;
  goal_domain: string | null;
  title: string;
  goal_text: string;
  measurable_text: string | null;
  mastery_criteria: string | null;
  progress_monitoring: string | null;
  implementation_notes: string | null;
  is_selected: boolean;
  is_custom: boolean;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useInstanceGoals(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['instance-goals', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await db
        .from('instance_generated_goals')
        .select('*')
        .eq('session_id', sessionId)
        .order('goal_type, sort_order');
      if (error) throw error;
      return (data || []) as InstanceGeneratedGoal[];
    },
  });
}

export function useGenerateInstanceGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { sessionId: string; assessmentSlug: string }) => {
      // Fetch matching goals from the bank
      const { data: bankGoals, error: bankErr } = await db
        .from('generated_goal_bank')
        .select('*')
        .eq('assessment_slug', params.assessmentSlug);
      if (bankErr) throw bankErr;
      if (!bankGoals || bankGoals.length === 0) return 0;

      // Insert goals not already generated
      const { data: existing } = await db
        .from('instance_generated_goals')
        .select('source_goal_id')
        .eq('session_id', params.sessionId);
      const existingIds = new Set((existing || []).map((e: any) => e.source_goal_id));

      const newGoals = (bankGoals as any[])
        .filter(g => !existingIds.has(g.id))
        .map((g, i) => ({
          session_id: params.sessionId,
          source_goal_id: g.id,
          goal_type: g.goal_type,
          goal_domain: g.goal_domain,
          title: g.title,
          goal_text: g.goal_text,
          measurable_text: g.measurable_text,
          mastery_criteria: g.mastery_criteria,
          progress_monitoring: g.progress_monitoring,
          implementation_notes: g.implementation_notes,
          is_selected: true,
          is_custom: false,
          status: 'draft',
          sort_order: i,
        }));

      if (newGoals.length > 0) {
        const { error } = await db.from('instance_generated_goals').insert(newGoals);
        if (error) throw error;
      }
      return newGoals.length;
    },
    onSuccess: (count, vars) => {
      qc.invalidateQueries({ queryKey: ['instance-goals', vars.sessionId] });
      toast.success(`${count} goals generated`);
    },
    onError: (err: any) => {
      toast.error('Failed to generate goals: ' + err.message);
    },
  });
}

export function useUpdateInstanceGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      sessionId: string;
      updates: Partial<Omit<InstanceGeneratedGoal, 'id' | 'session_id' | 'created_at' | 'updated_at'>>;
    }) => {
      const { error } = await db
        .from('instance_generated_goals')
        .update({ ...params.updates, updated_at: new Date().toISOString() })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['instance-goals', vars.sessionId] });
    },
  });
}

export function useAddCustomGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      goalType: string;
      goalDomain: string;
      title: string;
      goalText: string;
      measurableText?: string;
      masteryCriteria?: string;
    }) => {
      const { error } = await db
        .from('instance_generated_goals')
        .insert({
          session_id: params.sessionId,
          goal_type: params.goalType,
          goal_domain: params.goalDomain,
          title: params.title,
          goal_text: params.goalText,
          measurable_text: params.measurableText || null,
          mastery_criteria: params.masteryCriteria || null,
          is_selected: true,
          is_custom: true,
          status: 'draft',
          sort_order: 999,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['instance-goals', vars.sessionId] });
      toast.success('Custom goal added');
    },
  });
}

export function useDuplicateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { goal: InstanceGeneratedGoal }) => {
      const { id, created_at, updated_at, ...rest } = params.goal;
      const { error } = await db
        .from('instance_generated_goals')
        .insert({ ...rest, is_custom: true, title: rest.title + ' (copy)', sort_order: rest.sort_order + 1 });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['instance-goals', vars.goal.session_id] });
      toast.success('Goal duplicated');
    },
  });
}

// ─── Master Report Instances ───
export interface MasterReportInstance {
  id: string;
  student_id: string;
  agency_id: string;
  title: string;
  tone: string;
  report_length: string;
  include_iep_language: boolean;
  include_parent_friendly: boolean;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterReportSection {
  id: string;
  master_report_id: string;
  section_key: string;
  section_title: string | null;
  generated_text: string | null;
  sort_order: number;
}

export function useMasterReportInstances(studentId: string | undefined) {
  return useQuery({
    queryKey: ['master-report-instances', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('master_report_instances')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MasterReportInstance[];
    },
  });
}

export function useMasterReportSections(reportId: string | undefined) {
  return useQuery({
    queryKey: ['master-report-sections', reportId],
    enabled: !!reportId,
    queryFn: async () => {
      const { data, error } = await db
        .from('master_report_sections')
        .select('*')
        .eq('master_report_id', reportId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as MasterReportSection[];
    },
  });
}

export function useCreateMasterReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      studentId: string;
      agencyId: string;
      tone: string;
      reportLength: string;
      includeIepLanguage: boolean;
      includeParentFriendly: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await db
        .from('master_report_instances')
        .insert({
          student_id: params.studentId,
          agency_id: params.agencyId,
          tone: params.tone,
          report_length: params.reportLength,
          include_iep_language: params.includeIepLanguage,
          include_parent_friendly: params.includeParentFriendly,
          created_by: user?.id || null,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data as MasterReportInstance;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['master-report-instances', vars.studentId] });
      toast.success('Master report created');
    },
  });
}

export function useUpdateMasterReportSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      reportId: string;
      sectionKey: string;
      sectionTitle: string;
      generatedText: string;
      sortOrder: number;
    }) => {
      const { error } = await db
        .from('master_report_sections')
        .upsert({
          master_report_id: params.reportId,
          section_key: params.sectionKey,
          section_title: params.sectionTitle,
          generated_text: params.generatedText,
          sort_order: params.sortOrder,
        }, { onConflict: 'master_report_id,section_key' });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['master-report-sections', vars.reportId] });
    },
  });
}
  return useQuery({
    queryKey: ['nova-full-narrative', sessionId, audience],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await db.rpc('nova_generate_full_narrative', {
        p_session_id: sessionId,
        p_audience: audience,
      });
      if (error) throw error;
      return data as string;
    },
  });
}
