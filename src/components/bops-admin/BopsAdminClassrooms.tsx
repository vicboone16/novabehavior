import { useBopsClassroomAnalytics, useRefreshClassroomAnalytics } from '@/hooks/useBopsAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function BopsAdminClassrooms() {
  const { data: classrooms, isLoading } = useBopsClassroomAnalytics();
  const refresh = useRefreshClassroomAnalytics();

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const riskBadge = (label: string, value: number | null, threshold: number, invert = false) => {
    if (value == null) return null;
    const isHigh = invert ? value < threshold : value > threshold;
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{label}:</span>
        <Badge variant={isHigh ? 'destructive' : 'secondary'} className="text-xs">{(value * 100).toFixed(0)}%</Badge>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled={refresh.isPending} onClick={() => refresh.mutate({})}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refresh.isPending ? 'animate-spin' : ''}`} /> Refresh Analytics
        </Button>
      </div>

      {(!classrooms || classrooms.length === 0) ? (
        <p className="text-sm text-muted-foreground p-4">No classroom data yet. Add students to classroom rosters and run genome refresh.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classrooms.map((c: any) => (
            <Card key={c.classroom_id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Classroom {String(c.classroom_id).slice(0, 8)}</span>
                  <Badge variant="outline">{c.total_students ?? 0} students</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {c.dominant_archetype && <Badge variant="secondary">Dominant: {c.dominant_archetype}</Badge>}
                  {c.storm_count > 0 && <Badge variant="destructive">{c.storm_count} Storm</Badge>}
                  {c.high_red_state_count > 0 && <Badge variant="destructive">{c.high_red_state_count} Red State</Badge>}
                </div>
                <div className="flex flex-wrap gap-3">
                  {riskBadge('Volatility', c.volatility_index, 0.70)}
                  {riskBadge('Contagion', c.contagion_risk, 0.70)}
                  {riskBadge('Balance', c.balance_score, 0.40, true)}
                  {riskBadge('Hidden Need', c.hidden_need_concentration, 0.70)}
                </div>

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs">View Distribution</Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {['fortress', 'ghost', 'reactor', 'volcano', 'sprinter', 'negotiator', 'challenger', 'rule_keeper', 'social_explorer', 'chameleon', 'storm'].map(a => {
                        const count = c[`${a}_count`];
                        return count > 0 ? <div key={a} className="flex justify-between"><span className="capitalize">{a.replace('_', ' ')}</span><span className="font-medium">{count}</span></div> : null;
                      })}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs border-t pt-2">
                      {['threat', 'withdrawal', 'sensory', 'emotion', 'impulse', 'autonomy', 'authority', 'rigidity', 'social', 'context'].map(d => {
                        const val = c[`avg_${d}`];
                        return val != null ? <div key={d} className="flex justify-between"><span className="capitalize">{d}</span><span>{Number(val).toFixed(2)}</span></div> : null;
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
