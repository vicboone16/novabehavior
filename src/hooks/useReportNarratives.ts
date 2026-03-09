import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export interface ReportNarrative {
  narrative_id: string;
  report_id: string;
  inclusion_id: string;
  source_object_type: string;
  source_object_id: string;
  domain: string;
  auto_narrative: string | null;
  edited_narrative: string | null;
  use_edited_version: boolean;
  active_narrative: string | null;
}

export function useReportNarratives(reportId: string | null) {
  const { user } = useAuth();
  const [narratives, setNarratives] = useState<ReportNarrative[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const seedNarratives = useCallback(async (rptId: string) => {
    setGenerating(true);
    try {
      const { data, error } = await db.rpc('seed_report_goal_narratives', {
        p_report_id: rptId,
        p_created_by: user?.id || null,
      });
      if (error) throw error;
      return data as number;
    } catch (err: any) {
      console.error('[SeedNarratives] Error:', err);
      toast.error('Failed to generate narratives');
      return 0;
    } finally {
      setGenerating(false);
    }
  }, [user]);

  const loadNarratives = useCallback(async (rptId: string) => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('v_selected_report_goal_narratives')
        .select('*')
        .eq('report_id', rptId);
      if (error) throw error;
      setNarratives((data || []).map((n: any) => ({
        narrative_id: n.narrative_id,
        report_id: n.report_id,
        inclusion_id: n.inclusion_id,
        source_object_type: n.source_object_type,
        source_object_id: n.source_object_id,
        domain: n.domain,
        auto_narrative: n.auto_narrative,
        edited_narrative: n.edited_narrative,
        use_edited_version: n.use_edited_version ?? false,
        active_narrative: n.active_narrative,
      })));
    } catch (err: any) {
      console.error('[LoadNarratives] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateNarrative = useCallback(async (
    narrativeId: string,
    updates: { edited_narrative?: string; use_edited_version?: boolean }
  ) => {
    try {
      const { error } = await db
        .from('report_goal_narratives')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', narrativeId);
      if (error) throw error;
      setNarratives(prev => prev.map(n =>
        n.narrative_id === narrativeId
          ? {
              ...n,
              ...updates,
              active_narrative: (updates.use_edited_version ?? n.use_edited_version)
                ? (updates.edited_narrative ?? n.edited_narrative)
                : n.auto_narrative,
            }
          : n
      ));
    } catch (err: any) {
      toast.error('Failed to update narrative');
    }
  }, []);

  const getNarrativeForInclusion = useCallback((inclusionId: string) => {
    return narratives.find(n => n.inclusion_id === inclusionId) || null;
  }, [narratives]);

  return {
    narratives,
    loading,
    generating,
    seedNarratives,
    loadNarratives,
    updateNarrative,
    getNarrativeForInclusion,
  };
}
