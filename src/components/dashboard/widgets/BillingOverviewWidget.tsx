import { useAgencyContext } from '@/hooks/useAgencyContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface PipelineCounts {
  needsReview: number;
  readyForClaim: number;
  submitted: number;
  revenueMtd: number;
}

export function BillingOverviewWidget() {
  const { currentAgency } = useAgencyContext();
  const agencyId = currentAgency?.id || null;

  const { data, isLoading } = useQuery({
    queryKey: ['billing-overview', agencyId],
    enabled: !!agencyId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<PipelineCounts> => {
      const now = new Date();
      const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [needsReview, readyForClaim, submitted, revenue] = await Promise.all([
        supabase
          .from('session_postings')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId!)
          .eq('post_status', 'draft'),
        supabase
          .from('session_postings')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId!)
          .eq('post_status', 'ready_for_claim')
          .eq('is_billable', true),
        supabase
          .from('session_postings')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId!)
          .eq('post_status', 'submitted'),
        supabase
          .from('session_postings')
          .select('units, rounded_minutes')
          .eq('agency_id', agencyId!)
          .eq('is_billable', true)
          .gte('posted_at', mtdStart),
      ]);

      const totalUnits = (revenue.data || []).reduce((sum, r) => sum + (r.units || 0), 0);

      return {
        needsReview: needsReview.count || 0,
        readyForClaim: readyForClaim.count || 0,
        submitted: submitted.count || 0,
        revenueMtd: totalUnits,
      };
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const counts = data || { needsReview: 0, readyForClaim: 0, submitted: 0, revenueMtd: 0 };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">Needs Review</p>
          <p className="text-xl font-bold text-foreground">{counts.needsReview}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">Ready for Claim</p>
          <p className="text-xl font-bold text-foreground">{counts.readyForClaim}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="text-xl font-bold text-foreground">{counts.submitted}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">Units MTD</p>
          <p className="text-xl font-bold text-foreground">{counts.revenueMtd}</p>
        </div>
      </div>
    </div>
  );
}
