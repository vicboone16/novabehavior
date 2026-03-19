import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Link2, RefreshCw, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useBehaviorDecodedBridge } from '@/hooks/usePhase4Data';
import { toast } from 'sonner';

interface Props {
  studentId: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: any }> = {
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  revoked: { label: 'Revoked', variant: 'destructive', icon: XCircle },
  expired: { label: 'Expired', variant: 'secondary', icon: AlertCircle },
};

export function BehaviorDecodedPanel({ studentId }: Props) {
  const bridge = useBehaviorDecodedBridge();
  const [links, setLinks] = useState<any[]>([]);
  const [syncLog, setSyncLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [l, s] = await Promise.all([
        bridge.fetchLinks(studentId),
        bridge.fetchSyncLog(studentId),
      ]);
      setLinks(l);
      setSyncLog(s);
    } catch (err: any) {
      toast.error('Failed to load Behavior Decoded data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [studentId]);

  const handleStatusChange = async (linkId: string, status: string) => {
    try {
      await bridge.updateLinkStatus(linkId, status);
      toast.success('Link status updated');
      load();
    } catch { toast.error('Failed to update status'); }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Behavior Decoded</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Loading...</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Behavior Decoded</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Parent portal connections and data sync status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Links */}
        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No Behavior Decoded links created yet.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Portal Links</p>
            {links.map((link: any) => {
              const cfg = STATUS_CONFIG[link.portal_status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={link.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">Parent Link</p>
                      <p className="text-[10px] text-muted-foreground">
                        Mode: {link.link_mode} · Created {new Date(link.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cfg.variant} className="text-[10px] h-5">{cfg.label}</Badge>
                    <Select value={link.portal_status} onValueChange={(v) => handleStatusChange(link.id, v)}>
                      <SelectTrigger className="h-6 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="revoked">Revoked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sync Log */}
        {syncLog.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Syncs</p>
              {syncLog.slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${entry.sync_status === 'completed' ? 'bg-green-500' : entry.sync_status === 'failed' ? 'bg-destructive' : 'bg-yellow-500'}`} />
                    <span className="text-xs">{entry.sync_type}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
