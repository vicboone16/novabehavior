import { useSupervisorSignals } from '@/hooks/useSupervisorSignals';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { Loader2, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export function ClassroomLiveWidget() {
  const { agencyId } = useAgencyContext();
  const { signals, loading } = useSupervisorSignals();

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const activeSignals = signals.filter(s => !s.resolved_at);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Radio className="w-4 h-4 text-emerald-500" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Live Feed
        </span>
        <Badge variant="secondary" className="text-xs ml-auto">
          {activeSignals.length} active
        </Badge>
      </div>

      {activeSignals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No active classroom signals</p>
      ) : (
        <div className="space-y-2">
          {activeSignals.slice(0, 6).map(signal => (
            <div key={signal.id} className="p-2 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{signal.signal_type?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{signal.message}</p>
                </div>
                <Badge
                  className={`text-[10px] shrink-0 ${
                    signal.severity === 'critical' ? 'bg-destructive text-destructive-foreground' :
                    signal.severity === 'high' ? 'bg-orange-500 text-white' :
                    'bg-yellow-500 text-white'
                  }`}
                >
                  {signal.severity}
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">
                {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
