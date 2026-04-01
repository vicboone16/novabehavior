import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

// ─── Report type definitions ───
export const REPORT_TYPES = [
  { key: 'master_clinical', label: 'Master Clinical Report', description: 'Integrated narrative across all 5 tools', icon: 'brain' },
  { key: 'full_clinical', label: 'Full Clinical / FBA', description: 'Comprehensive behavioral assessment', icon: 'file-text' },
  { key: 'iep', label: 'IEP Summary', description: 'Condensed IEP-compliant format', icon: 'graduation-cap' },
  { key: 'parent', label: 'Parent Summary', description: 'Warm, accessible parent version', icon: 'heart' },
  { key: 'clinician_quick', label: 'Clinician Quick (SOAP)', description: 'Terse SOAP-style summary', icon: 'stethoscope' },
  { key: 'masking_camouflage', label: 'Masking & Camouflage Index™', description: 'Standalone masking report', icon: 'eye-off' },
  { key: 'archetype_profiler', label: 'Neurodivergent Archetype Profiler™', description: 'Standalone archetype report', icon: 'users' },
  { key: 'misinterpretation_index', label: 'Behavior Misinterpretation Index™', description: 'Standalone misinterpretation report', icon: 'alert-triangle' },
  { key: 'parent_effectiveness', label: 'Parent Effectiveness Formula™', description: 'Standalone parent effectiveness report', icon: 'home' },
  { key: 'bcba_ptce', label: 'BCBA Parent Training Competency™', description: 'Standalone PTCE report', icon: 'clipboard-check' },
] as const;

export type ClinicalReportType = typeof REPORT_TYPES[number]['key'];

// ─── Get clinical narrative text (server-generated) ───
export function useClinicalNarrativeText(studentId: string | undefined) {
  return useQuery({
    queryKey: ['clinical-narrative-text', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db.rpc('generate_clinical_narrative_text', {
        p_student_id: studentId,
      });
      if (error) throw error;
      return data as string;
    },
  });
}

// ─── Get clinical recommendations ───
export function useClinicalRecommendations(studentId: string | undefined) {
  return useQuery({
    queryKey: ['clinical-recommendations', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db.rpc('generate_clinical_recommendations', {
        p_student_id: studentId,
      });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

// ─── Get master report view data ───
export function useClinicalNarrativeMasterReport(studentId: string | undefined) {
  return useQuery({
    queryKey: ['clinical-narrative-master', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_clinical_narrative_master_report')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

// ─── Generate any report type via edge function ───
export function useGenerateMasterReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      reportType = 'master_clinical',
    }: {
      studentId: string;
      reportType?: ClinicalReportType | string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-bops-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            student_id: studentId,
            report_type: reportType,
            include_narrative: true,
          }),
        },
      );

      if (resp.status === 429) {
        toast.error('Rate limit exceeded. Please wait and try again.');
        throw new Error('Rate limited');
      }
      if (resp.status === 402) {
        toast.error('AI credits depleted. Add credits in workspace settings.');
        throw new Error('Credits depleted');
      }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Report generation failed');
      }

      return await resp.json();
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ['bops-reports', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['clinical-narrative-text', vars.studentId] });
      const typeLabel = REPORT_TYPES.find(r => r.key === vars.reportType)?.label || 'Report';
      toast.success(`${typeLabel} generated`);
    },
    onError: (err: any) => {
      if (!err.message?.includes('Rate limited') && !err.message?.includes('Credits depleted')) {
        toast.error('Report generation failed: ' + err.message);
      }
    },
  });
}
