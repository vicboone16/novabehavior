import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ParentSummaryPacket {
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
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_decision: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
}

export function useParentSummaryPackets() {
  const { user } = useAuth();
  const [packets, setPackets] = useState<ParentSummaryPacket[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPackets = useCallback(async (params: {
    clientId?: string;
    status?: string;
    agencyId?: string;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('parent_summary_packets')
        .select('*')
        .order('week_start', { ascending: false });

      if (params.clientId) query = query.eq('client_id', params.clientId);
      if (params.status) query = query.eq('status', params.status);
      if (params.agencyId) query = query.eq('agency_id', params.agencyId);

      const { data, error } = await query;
      if (error) throw error;
      setPackets((data || []) as unknown as ParentSummaryPacket[]);
    } catch (err: any) {
      toast.error('Failed to load parent summary packets: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingForReview = useCallback(async (agencyId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('parent_summary_packets')
        .select('*')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true });

      if (agencyId) query = query.eq('agency_id', agencyId);

      const { data, error } = await query;
      if (error) throw error;
      setPackets((data || []) as unknown as ParentSummaryPacket[]);
    } catch (err: any) {
      toast.error('Failed to load pending packets: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reviewPacket = useCallback(async (packetId: string, decision: string, comment?: string) => {
    try {
      const { data, error } = await supabase.rpc('review_parent_summary_packet', {
        _packet_id: packetId,
        _decision: decision,
        _comment: comment || null,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) {
        toast.error(result.error);
        return false;
      }
      toast.success(`Packet ${decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'returned for clarification'}`);
      return true;
    } catch (err: any) {
      toast.error('Failed to review packet: ' + err.message);
      return false;
    }
  }, []);

  return { packets, loading, fetchPackets, fetchPendingForReview, reviewPacket };
}
