import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Trophy, Cog, RefreshCw, TrendingUp, Calendar, School } from 'lucide-react';
import { useDistrictReporting } from '@/hooks/usePhase4Data';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  scopeType?: string;
  scopeId?: string;
}

export function DistrictReportingPanel({ scopeType, scopeId }: Props) {
  const reporting = useDistrictReporting();
  const [tab, setTab] = useState('snapshots');
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [leaderboards, setLeaderboards] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [periodType, setPeriodType] = useState('weekly');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        reporting.fetchSnapshots({ scopeType, scopeId }),
        reporting.fetchAutomationRules(scopeType, scopeId),
      ];
      if (scopeType && scopeId) {
        promises.push(reporting.fetchLeaderboards(scopeType, scopeId, periodType));
      }
      const [s, r, l] = await Promise.all(promises);
      setSnapshots(s);
      setRules(r);
      if (l) setLeaderboards(l);
    } catch { toast.error('Failed to load reporting data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [scopeType, scopeId, periodType]);

  const handleToggleRule = async (ruleId: string, active: boolean) => {
    try {
      await reporting.toggleAutomationRule(ruleId, active);
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, active } : r));
      toast.success(active ? 'Rule enabled' : 'Rule disabled');
    } catch { toast.error('Failed to update rule'); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">District & School Reporting</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3 h-3" /></Button>
        </div>
        <CardDescription className="text-xs">
          Reporting snapshots, leaderboards, and automation rules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="snapshots" className="text-xs h-6">Snapshots</TabsTrigger>
            <TabsTrigger value="leaderboards" className="text-xs h-6">Leaderboards</TabsTrigger>
            <TabsTrigger value="automation" className="text-xs h-6">Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="snapshots" className="mt-0">
            {snapshots.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No reporting snapshots available.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {snapshots.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium capitalize">{s.scope_type} Snapshot</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(s.snapshot_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {Object.keys(s.metrics_json || {}).length} metrics
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboards" className="mt-0 space-y-2">
            <div className="flex items-center gap-2">
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {leaderboards.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No leaderboard data for this period.</p>
            ) : (
              <div className="space-y-2">
                {leaderboards.map((lb: any) => {
                  const entries = (lb.leaderboard_json?.entries || []) as any[];
                  return (
                    <div key={lb.id} className="p-2 rounded-md bg-muted/50 border border-border space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                          <p className="text-xs font-medium capitalize">{lb.leaderboard_type}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(lb.generated_at), 'MMM d')}
                        </span>
                      </div>
                      {entries.length > 0 && (
                        <div className="space-y-0.5 ml-5">
                          {entries.slice(0, 5).map((e: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                              <span>#{i + 1} {e.name || e.label || `Entry ${i + 1}`}</span>
                              <span className="font-medium">{e.score || e.points || e.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="automation" className="mt-0">
            {rules.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No automation rules configured.</p>
            ) : (
              <div className="space-y-2">
                {rules.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <Cog className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">{r.rule_name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{r.rule_type}{r.scope_type ? ` · ${r.scope_type}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.active ? 'default' : 'secondary'} className="text-[10px] h-5">
                        {r.active ? 'Active' : 'Off'}
                      </Badge>
                      <Switch checked={r.active} onCheckedChange={(v) => handleToggleRule(r.id, v)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
