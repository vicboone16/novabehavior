import { useSupervisorSignals } from '@/hooks/useSupervisorSignals';
import { Loader2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function SupervisorSignalsWidget() {
  const { signals, loading, resolveSignal } = useSupervisorSignals();

  const handleResolve = async (id: string) => {
    await resolveSignal(id);
    toast.success('Signal resolved');
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const unresolved = signals.filter(s => !s.resolved_at);

  if (unresolved.length === 0) {
    return (
      <div className="text-center py-4">
        <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No active supervisor signals</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {unresolved.slice(0, 6).map(signal => (
        <div key={signal.id} className="flex items-start gap-2 p-2 rounded-md border border-border/50">
          <Badge
            className={`text-[10px] shrink-0 mt-0.5 ${
              signal.severity === 'critical' ? 'bg-destructive text-destructive-foreground' :
              signal.severity === 'high' ? 'bg-orange-500 text-white' :
              'bg-yellow-500 text-white'
            }`}
          >
            {signal.severity}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-tight">{signal.message}</p>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-xs shrink-0" onClick={() => handleResolve(signal.id)}>
            Resolve
          </Button>
        </div>
      ))}
    </div>
  );
}
