import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

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

// ─── Generate AI-powered master report via edge function ───
export function useGenerateMasterReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      reportType = 'master_clinical',
    }: {
      studentId: string;
      reportType?: string;
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

      const result = await resp.json();
      return result;
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ['bops-reports', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['clinical-narrative-text', vars.studentId] });
      toast.success('Master report generated');
    },
    onError: (err: any) => {
      if (!err.message?.includes('Rate limited') && !err.message?.includes('Credits depleted')) {
        toast.error('Report generation failed: ' + err.message);
      }
    },
  });
}
