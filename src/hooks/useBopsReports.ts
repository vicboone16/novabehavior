import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

const QK = {
  reports: (studentId?: string) => ['bops-reports', studentId],
  workspace: (reportId?: string) => ['bops-report-workspace', reportId],
  versions: (sectionId?: string) => ['bops-report-versions', sectionId],
};

// ─── List reports for a student ───
export function useBopsReports(studentId: string | undefined) {
  return useQuery({
    queryKey: QK.reports(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_bops_reports')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Load report workspace (report + sections) ───
export function useBopsReportWorkspace(reportId: string | undefined) {
  return useQuery({
    queryKey: QK.workspace(reportId),
    enabled: !!reportId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_bops_report_workspace')
        .select('*')
        .eq('report_id', reportId!)
        .order('section_order', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Section version history ───
export function useBopsReportSectionVersions(sectionId: string | undefined) {
  return useQuery({
    queryKey: QK.versions(sectionId),
    enabled: !!sectionId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_bops_report_section_versions')
        .select('*')
        .eq('section_id', sectionId!)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Create report ───
export function useCreateBopsReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, title }: { studentId: string; title?: string }) => {
      const { data, error } = await db.rpc('create_bops_report', {
        p_student_id: studentId,
        p_title: title || 'BOPS Behavioral Intelligence Report',
      });
      if (error) throw error;
      return data as string; // report_id
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.reports(vars.studentId) });
      toast.success('Report created');
    },
    onError: (err: any) => toast.error('Failed to create report: ' + err.message),
  });
}

// ─── Generate full report (active session) ───
export function useGenerateBopsReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      const { data, error } = await db.rpc('generate_bops_full_report', {
        p_student_id: studentId,
      });
      if (error) throw error;
      return data as string; // report_id
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.reports(vars.studentId) });
      toast.success('Report generated');
    },
    onError: (err: any) => toast.error('Failed to generate report: ' + err.message),
  });
}

// ─── Generate report for a specific session ───
export function useGenerateBopsReportForSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId }: { studentId: string; sessionId: string }) => {
      const { data, error } = await db.rpc('generate_bops_full_report_for_session', {
        p_student_id: studentId,
        p_session_id: sessionId,
      });
      if (error) throw error;
      return data as string; // report_id
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.reports(vars.studentId) });
      toast.success('Report generated from session');
    },
    onError: (err: any) => toast.error('Failed to generate report: ' + err.message),
  });
}

// ─── Fetch session history for a student (for session picker) ───
export function useBopsSessionList(studentId: string | undefined) {
  return useQuery({
    queryKey: ['bops-session-list', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_student_bops_session_history')
        .select('*')
        .eq('student_id', studentId!)
        .order('assessment_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Save section edit ───
export function useSaveBopsReportSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sectionId,
      editedText,
      changeSummary,
    }: {
      sectionId: string;
      reportId: string;
      editedText: string;
      changeSummary?: string;
    }) => {
      const { error } = await db.rpc('save_bops_report_section', {
        p_section_id: sectionId,
        p_edited_text: editedText,
        p_change_summary: changeSummary || 'Manual edit',
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.workspace(vars.reportId) });
    },
  });
}

// ─── Import into section ───
export function useImportIntoBopsSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sectionId,
      reportId,
      sourceType,
      sourceRecordId,
      insertedText,
      importMode,
    }: {
      sectionId: string;
      reportId: string;
      sourceType: string;
      sourceRecordId: string;
      insertedText: string;
      importMode: string;
    }) => {
      const { error } = await db.rpc('import_into_bops_report_section', {
        p_section_id: sectionId,
        p_source_type: sourceType,
        p_source_record_id: sourceRecordId,
        p_inserted_text: insertedText,
        p_import_mode: importMode,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.workspace(vars.reportId) });
      toast.success('Content imported into section');
    },
    onError: (err: any) => toast.error('Import failed: ' + err.message),
  });
}

// ─── Revert section ───
export function useRevertBopsReportSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sectionId, reportId }: { sectionId: string; reportId: string }) => {
      const { error } = await db.rpc('revert_bops_report_section_to_generated', {
        p_section_id: sectionId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.workspace(vars.reportId) });
      toast.success('Section reverted to generated content');
    },
    onError: (err: any) => toast.error('Revert failed: ' + err.message),
  });
}

// ─── Manual BOPS Score Entry ───
export function useInsertManualBopsScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      assessmentDate,
      scores,
      sourceNote,
      overwriteExistingManual,
    }: {
      studentId: string;
      assessmentDate: string;
      scores: Record<string, number>;
      sourceNote?: string;
      overwriteExistingManual?: boolean;
    }) => {
      const { data, error } = await db.rpc('insert_manual_bops_scores_v2', {
        p_student: studentId,
        p_assessment_date: assessmentDate,
        p_emotion: scores.emotion,
        p_authority: scores.authority,
        p_autonomy: scores.autonomy,
        p_impulse: scores.impulse,
        p_threat: scores.threat,
        p_withdrawal: scores.withdrawal,
        p_sensory: scores.sensory,
        p_rigidity: scores.rigidity,
        p_social: scores.social,
        p_context: scores.context,
        p_navigator: scores.navigator,
        p_source_note: sourceNote || null,
        p_overwrite_existing_manual: overwriteExistingManual || false,
      });
      if (error) throw error;
      return data as string; // session_id
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['bops-intelligence-dashboard', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['bops-engine-roster'] });
      toast.success('Manual BOPS scores saved and profile calculated');
    },
    onError: (err: any) => toast.error('Failed to save scores: ' + err.message),
  });
}