import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Rocket, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const db = supabase as any;

const CATEGORY_ORDER = ['core_ux', 'game', 'rewards', 'communication', 'engagement', 'performance', 'polish'];
const CATEGORY_LABELS: Record<string, string> = {
  core_ux: 'Core UX',
  game: 'Game System',
  rewards: 'Rewards',
  communication: 'Communication',
  engagement: 'Engagement',
  performance: 'Performance',
  polish: 'Polish',
};

export default function LaunchReadiness() {
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    db.from('launch_readiness_checks')
      .select('*')
      .order('category')
      .order('item')
      .then(({ data }: any) => { setChecks(data || []); setLoading(false); });
  }, []);

  const totalWeight = checks.reduce((s: number, c: any) => s + c.weight, 0);
  const completedWeight = checks.filter((c: any) => c.is_complete).reduce((s: number, c: any) => s + c.weight, 0);
  const score = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 110) : 0;
  const pct = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  const scoreColor = score < 60 ? 'text-destructive' : score < 90 ? 'text-amber-500' : 'text-emerald-500';
  const barColor = score < 60 ? '[&>div]:bg-destructive' : score < 90 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500';

  async function toggleCheck(id: string, current: boolean) {
    const updated = checks.map(c => c.id === id ? { ...c, is_complete: !current } : c);
    setChecks(updated);
    const { error } = await db.from('launch_readiness_checks').update({ is_complete: !current }).eq('id', id);
    if (error) {
      setChecks(checks); // rollback
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }

  const grouped = CATEGORY_ORDER.map(cat => ({
    key: cat,
    label: CATEGORY_LABELS[cat] || cat,
    items: checks.filter(c => c.category === cat),
  })).filter(g => g.items.length > 0);

  const missingGaps = grouped
    .map(g => ({ ...g, incomplete: g.items.filter(i => !i.is_complete) }))
    .filter(g => g.incomplete.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Rocket className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Launch Readiness</h1>
          <p className="text-sm text-muted-foreground">Real-time product readiness score</p>
        </div>
      </div>

      {/* Score card */}
      <Card className="border-primary/20">
        <CardContent className="py-6 px-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-4xl font-bold tracking-tight">
                <span className={scoreColor}>{score}</span>
                <span className="text-muted-foreground text-lg font-normal"> / 110</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {score >= 100 ? '🚀 Launch ready!' :
                 score >= 90 ? '✨ Almost ready' :
                 score >= 60 ? '⚠️ Getting there' :
                 '🔴 Needs work'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{checks.filter(c => c.is_complete).length} / {checks.length} items</span>
            </div>
          </div>
          <Progress value={pct} className={`h-3 ${barColor}`} />
        </CardContent>
      </Card>

      {/* Missing gaps */}
      {missingGaps.length > 0 && score < 100 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Priority Gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="space-y-1.5">
              {missingGaps.slice(0, 5).map(g => (
                <div key={g.key} className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium">{g.label}</span>
                  <span className="text-muted-foreground">{g.incomplete.length} item{g.incomplete.length > 1 ? 's' : ''} remaining</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklists by category */}
      {grouped.map(group => {
        const catComplete = group.items.filter(i => i.is_complete).length;
        const catTotal = group.items.length;
        return (
          <Card key={group.key}>
            <CardHeader className="py-3 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-foreground">{group.label}</CardTitle>
                <Badge variant={catComplete === catTotal ? 'default' : 'outline'} className="text-[10px]">
                  {catComplete === catTotal ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}
                  {catComplete} / {catTotal}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="space-y-2">
                {group.items.map((item: any) => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                    <Checkbox
                      checked={item.is_complete}
                      onCheckedChange={() => toggleCheck(item.id, item.is_complete)}
                    />
                    <span className={`text-sm flex-1 ${item.is_complete ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.item}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.weight}pt</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
