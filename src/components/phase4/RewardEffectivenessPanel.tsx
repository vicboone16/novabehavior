import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, TrendingUp, TrendingDown, Minus, RefreshCw, GripVertical, Award } from 'lucide-react';
import { useRewardEffectiveness } from '@/hooks/usePhase4Data';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  studentId: string;
}

export function RewardEffectivenessPanel({ studentId }: Props) {
  const rewards = useRewardEffectiveness();
  const [tab, setTab] = useState('summary');
  const [summary, setSummary] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, o, p] = await Promise.all([
        rewards.fetchEffectivenessSummary(studentId),
        rewards.fetchObservations(studentId),
        rewards.fetchPreferences(studentId),
      ]);
      setSummary(s);
      setObservations(o);
      setPreferences(p);
    } catch { toast.error('Failed to load reward data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [studentId]);

  const deltaIcon = (val: number | null) => {
    if (val == null || val === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
    return val > 0
      ? <TrendingUp className="w-3 h-3 text-green-600" />
      : <TrendingDown className="w-3 h-3 text-destructive" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Reward Effectiveness</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3 h-3" /></Button>
        </div>
        <CardDescription className="text-xs">
          Track which rewards work best and manage reinforcer preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="summary" className="text-xs h-6">Effectiveness</TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs h-6">Preferences</TabsTrigger>
            <TabsTrigger value="observations" className="text-xs h-6">Observations</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-0">
            {summary.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No effectiveness data available yet.</p>
            ) : (
              <div className="space-y-2">
                {summary.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-yellow-500" />
                      <div>
                        <p className="text-xs font-medium">Reward {String(s.reward_id).slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground">{s.observations} observations</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        {deltaIcon(s.avg_engagement_delta)}
                        <span>Engage: {s.avg_engagement_delta != null ? Number(s.avg_engagement_delta).toFixed(1) : '—'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {deltaIcon(s.avg_behavior_delta)}
                        <span>Behavior: {s.avg_behavior_delta != null ? Number(s.avg_behavior_delta).toFixed(1) : '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preferences" className="mt-0">
            {preferences.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No reinforcer preferences set.</p>
            ) : (
              <div className="space-y-1">
                {preferences.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border">
                    <span className="text-xs font-bold text-primary w-5 text-center">#{p.preference_rank}</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium">{p.preference_label || 'Unnamed Reward'}</p>
                    </div>
                    <Badge variant={p.active ? 'default' : 'secondary'} className="text-[10px] h-5">
                      {p.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="observations" className="mt-0">
            {observations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No reward observations recorded.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {observations.map((o: any) => (
                  <div key={o.id} className="p-2 rounded-md bg-muted/50 border border-border">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">
                        {format(new Date(o.observation_window_start), 'MMM d')} – {format(new Date(o.observation_window_end), 'MMM d, yyyy')}
                      </p>
                      <div className="flex items-center gap-2 text-[10px]">
                        {o.engagement_delta != null && (
                          <span className="flex items-center gap-0.5">
                            {deltaIcon(o.engagement_delta)} {Number(o.engagement_delta).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    {o.notes && <p className="text-[10px] text-muted-foreground mt-1">{o.notes}</p>}
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
