import { useAgencyContext } from '@/hooks/useAgencyContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UtilStats {
  overall: number;
  onTrack: number;
  atRisk: number;
  critical: number;
}

export function UtilizationWidget() {
  const { currentAgency } = useAgencyContext();
  const agencyId = currentAgency?.id || null;

  const { data, isLoading } = useQuery({
    queryKey: ['auth-utilization-widget', agencyId],
    enabled: !!agencyId,
    refetchInterval: 120_000,
    queryFn: async (): Promise<UtilStats> => {
      // Get authorizations for agency's students
      const { data: auths } = await supabase
        .from('v_authorization_utilization')
        .select('authorization_id, units_approved, units_used, units_remaining, units_reserved');

      if (!auths || auths.length === 0) {
        return { overall: 0, onTrack: 0, atRisk: 0, critical: 0 };
      }

      let totalApproved = 0;
      let totalUsed = 0;
      let onTrack = 0;
      let atRisk = 0;
      let critical = 0;

      for (const auth of auths) {
        const approved = auth.units_approved || 0;
        const used = auth.units_used || 0;
        totalApproved += approved;
        totalUsed += used;

        if (approved === 0) continue;
        const pct = (used / approved) * 100;
        if (pct >= 90) critical++;
        else if (pct >= 70) atRisk++;
        else onTrack++;
      }

      const overall = totalApproved > 0 ? Math.round((totalUsed / totalApproved) * 100) : 0;

      return { overall, onTrack, atRisk, critical };
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const stats = data || { overall: 0, onTrack: 0, atRisk: 0, critical: 0 };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Overall Auth Utilization</span>
          <span className="font-medium">{stats.overall}%</span>
        </div>
        <Progress value={stats.overall} className="h-2" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-[10px] text-muted-foreground">On Track</p>
          <p className="text-lg font-bold text-emerald-500">{stats.onTrack}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-[10px] text-muted-foreground">At Risk</p>
          <p className="text-lg font-bold text-orange-500">{stats.atRisk}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-[10px] text-muted-foreground">Critical</p>
          <p className="text-lg font-bold text-destructive">{stats.critical}</p>
        </div>
      </div>
    </div>
  );
}
