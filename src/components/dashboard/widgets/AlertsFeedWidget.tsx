import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useCIAlertFeed } from '@/hooks/useClinicalIntelligence';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const severityColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  action: 'bg-orange-500 text-white',
  high: 'bg-orange-500 text-white',
  watch: 'bg-yellow-500 text-white',
  medium: 'bg-yellow-500 text-white',
  info: 'bg-blue-500 text-white',
};

export function AlertsFeedWidget() {
  const { currentAgency } = useAgencyContext();
  const { user } = useAuth();
  const { alerts, loading, resolveAlert } = useCIAlertFeed(currentAgency?.id || null);

  const handleResolve = async (alertId: string) => {
    if (!user) return;
    const ok = await resolveAlert(alertId, user.id);
    if (ok) toast.success('Alert resolved');
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  
  const unresolved = alerts.filter(a => !a.resolved_at);
  if (unresolved.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No active alerts 🎉</p>;

  return (
    <div className="space-y-2">
      {unresolved.slice(0, 10).map(alert => (
        <div key={alert.alert_id} className="flex items-start gap-2 p-2 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
          <Badge className={`${severityColors[alert.severity] || 'bg-muted'} text-[10px] shrink-0 mt-0.5`}>
            {alert.severity}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-tight">{alert.message}</p>
            <div className="flex items-center gap-2 mt-1">
              {alert.client_name && <span className="text-xs text-muted-foreground">{alert.client_name}</span>}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleResolve(alert.alert_id)}>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
