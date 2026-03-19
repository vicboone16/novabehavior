import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Settings, Send, Clock, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNotificationOrchestration } from '@/hooks/usePhase4Data';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DELIVERY_STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-yellow-500', label: 'Pending' },
  sent: { color: 'bg-green-500', label: 'Sent' },
  failed: { color: 'bg-destructive', label: 'Failed' },
  scheduled: { color: 'bg-blue-500', label: 'Scheduled' },
};

export function NotificationOrchestratorPanel() {
  const orch = useNotificationOrchestration();
  const [tab, setTab] = useState('providers');
  const [providers, setProviders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, e, q] = await Promise.all([
        orch.fetchProviders(),
        orch.fetchEvents({ limit: 25 }),
        orch.fetchDispatchQueue(),
      ]);
      setProviders(p);
      setEvents(e);
      setQueue(q);
    } catch { toast.error('Failed to load notification data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggleProvider = async (id: string, active: boolean) => {
    try {
      await orch.toggleProvider(id, active);
      setProviders(prev => prev.map(p => p.id === id ? { ...p, active } : p));
      toast.success(active ? 'Provider enabled' : 'Provider disabled');
    } catch { toast.error('Failed to update provider'); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Notification Center</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Manage notification providers, view events, and monitor delivery
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="providers" className="text-xs h-6">Providers</TabsTrigger>
            <TabsTrigger value="events" className="text-xs h-6">Events</TabsTrigger>
            <TabsTrigger value="queue" className="text-xs h-6">Dispatch Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-2 mt-0">
            {providers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No notification providers configured.</p>
            ) : providers.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border">
                <div>
                  <p className="text-xs font-medium">{p.provider_name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{p.provider_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.active ? 'default' : 'secondary'} className="text-[10px] h-5">
                    {p.active ? 'Active' : 'Disabled'}
                  </Badge>
                  <Switch checked={p.active} onCheckedChange={(v) => handleToggleProvider(p.id, v)} />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="events" className="mt-0">
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No notification events recorded.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {events.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Send className="w-3 h-3 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">{e.event_type}</p>
                        {e.scope_type && (
                          <p className="text-[10px] text-muted-foreground">{e.scope_type}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(e.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="queue" className="mt-0">
            {queue.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No pending dispatches.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {queue.map((d: any) => {
                  const status = DELIVERY_STATUS_MAP[d.delivery_status] || DELIVERY_STATUS_MAP.pending;
                  return (
                    <div key={d.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                        <div>
                          <p className="text-xs font-medium">{d.channel_type} → {d.recipient_type}</p>
                          <p className="text-[10px] text-muted-foreground">{d.event_type}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-5">{status.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
