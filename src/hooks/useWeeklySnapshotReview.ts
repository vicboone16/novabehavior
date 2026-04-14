import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WeeklySnapshot {
  id: string;
  agency_id: string;
  client_id: string;
  submitted_by: string;
  source: string;
  week_start: string;
  week_end: string;
  abc_count: number | null;
  frequency_total: number | null;
  duration_minutes_total: number | null;
  intensity_avg: number | null;
  top_functions: any;
  top_triggers: any;
  tools_used: any;
  engagement: any;
  parent_notes: string | null;
  summary_json: any;
  behavior_count: number | null;
  avg_intensity: number | null;
  total_duration_minutes: number | null;
  notes: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_decision: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  submitter_name?: string;
}

export function useWeeklySnapshotReview() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingSnapshots = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch pending packets; RLS + effective_staff_can_review ensures scoping
      const { data, error } = await supabase
        .from('parent_summary_packets')
        .select('*')
        .in('status', ['pending_review', 'submitted'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filter client-side using the adapter function for each packet
      // In a production setup this would be a server-side join/filter
      const packets = (data || []) as unknown as WeeklySnapshot[];

      // Enrich with client names
      if (packets.length > 0) {
        const clientIds = [...new Set(packets.map(p => p.client_id))];
        const { data: students } = await supabase
          .from('students')
          .select('id, first_name, last_name, display_name')
          .in('id', clientIds);

        const clientMap = new Map(
          (students || []).map((s: any) => [s.id, s.display_name || `${s.first_name} ${s.last_name}`.trim() || 'Unknown'])
        );

        packets.forEach(p => {
          p.client_name = clientMap.get(p.client_id) || 'Unknown Learner';
        });
      }

      setSnapshots(packets);
    } catch (err: any) {
      toast.error('Failed to load weekly snapshots: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const reviewSnapshot = useCallback(async (
    snapshotId: string,
    decision: 'approved' | 'returned',
    comment?: string
  ) => {
    if (!user) return false;
    try {
      const updateFields: Record<string, any> = {
        status: decision === 'approved' ? 'approved' : 'needs_clarification',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_decision: decision,
        review_comment: comment || null,
      };

      const { error } = await supabase
        .from('parent_summary_packets')
        .update(updateFields)
        .eq('id', snapshotId);

      if (error) throw error;

      toast.success(
        decision === 'approved'
          ? 'Snapshot approved'
          : 'Snapshot returned for changes'
      );
      return true;
    } catch (err: any) {
      toast.error('Failed to submit review: ' + err.message);
      return false;
    }
  }, [user]);

  return { snapshots, loading, fetchPendingSnapshots, reviewSnapshot };
}
