import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface ReportableGoalItem {
  student_id: string;
  client_id: string;
  domain: string;
  domain_label?: string;
  source_object_type: string;
  source_object_id: string;
  item_title: string;
  item_status: string | null;
  last_data_date: string | null;
  graph_available: boolean;
  table_available: boolean;
  summary_available: boolean;
}

export interface ReportGoalInclusion {
  id: string;
  report_id: string | null;
  client_id: string | null;
  student_id: string | null;
  domain: string;
  source_object_type: string;
  source_object_id: string;
  item_title: string | null;
  include_in_report: boolean;
  include_summary: boolean;
  include_table: boolean;
  include_graph: boolean;
  display_order: number | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */
export function useReportGoalInclusions(reportId: string | null) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<ReportableGoalItem[]>([]);
  const [inclusions, setInclusions] = useState<ReportGoalInclusion[]>([]);
  const [loading, setLoading] = useState(false);

  /** Load the full catalog for a client */
  const loadCatalog = useCallback(async (clientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('v_reportable_goal_catalog_detailed')
        .select('*')
        .eq('client_id', clientId);
      if (error) throw error;
      setCatalog((data || []) as ReportableGoalItem[]);
    } catch (err: any) {
      console.error('[ReportGoalCatalog] Error:', err);
      toast.error('Failed to load reportable goals');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Seed inclusions for a report + client via RPC */
  const seedInclusions = useCallback(async (rptId: string, clientId: string) => {
    try {
      const { data, error } = await db.rpc('seed_report_goal_inclusions', {
        p_report_id: rptId,
        p_client_id: clientId,
        p_created_by: user?.id || null,
      });
      if (error) throw error;
      return data as number;
    } catch (err: any) {
      console.error('[SeedInclusions] Error:', err);
      toast.error('Failed to seed report items');
      return 0;
    }
  }, [user]);

  /** Load saved inclusions for a report */
  const loadInclusions = useCallback(async (rptId: string) => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('report_goal_inclusions')
        .select('*')
        .eq('report_id', rptId)
        .order('display_order', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setInclusions((data || []) as ReportGoalInclusion[]);
    } catch (err: any) {
      console.error('[LoadInclusions] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Load selected-only inclusions */
  const loadSelectedInclusions = useCallback(async (rptId: string) => {
    try {
      const { data } = await db
        .from('v_selected_report_goal_inclusions')
        .select('*')
        .eq('report_id', rptId)
        .order('display_order', { ascending: true, nullsFirst: false });
      return (data || []) as ReportGoalInclusion[];
    } catch {
      return [];
    }
  }, []);

  /** Update a single inclusion's toggles */
  const updateInclusion = useCallback(async (
    inclusionId: string,
    updates: {
      include_in_report?: boolean;
      include_summary?: boolean;
      include_table?: boolean;
      include_graph?: boolean;
      display_order?: number;
    }
  ) => {
    try {
      const { error } = await db.rpc('update_report_goal_inclusion', {
        p_inclusion_id: inclusionId,
        p_include_in_report: updates.include_in_report ?? null,
        p_include_summary: updates.include_summary ?? null,
        p_include_table: updates.include_table ?? null,
        p_include_graph: updates.include_graph ?? null,
        p_display_order: updates.display_order ?? null,
      });
      if (error) throw error;
      // Update local state
      setInclusions(prev =>
        prev.map(inc =>
          inc.id === inclusionId
            ? {
                ...inc,
                include_in_report: updates.include_in_report ?? inc.include_in_report,
                include_summary: updates.include_summary ?? inc.include_summary,
                include_table: updates.include_table ?? inc.include_table,
                include_graph: updates.include_graph ?? inc.include_graph,
                display_order: updates.display_order ?? inc.display_order,
              }
            : inc
        )
      );
    } catch (err: any) {
      toast.error('Failed to update inclusion');
    }
  }, []);

  /** Initialize: seed + load */
  const initialize = useCallback(async (rptId: string, clientId: string) => {
    await seedInclusions(rptId, clientId);
    await Promise.all([loadCatalog(clientId), loadInclusions(rptId)]);
  }, [seedInclusions, loadCatalog, loadInclusions]);

  // Derived grouped data
  const inclusionsByDomain = inclusions.reduce<Record<string, ReportGoalInclusion[]>>((acc, inc) => {
    const d = inc.domain || 'other';
    if (!acc[d]) acc[d] = [];
    acc[d].push(inc);
    return acc;
  }, {});

  const selectedCount = inclusions.filter(i => i.include_in_report).length;

  return {
    catalog,
    inclusions,
    inclusionsByDomain,
    selectedCount,
    loading,
    loadCatalog,
    seedInclusions,
    loadInclusions,
    loadSelectedInclusions,
    updateInclusion,
    initialize,
  };
}
