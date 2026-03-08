import { Target, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ParentGoal } from '@/hooks/useParentTrainingParent';

interface Props {
  goals: ParentGoal[];
  isLoading: boolean;
}

function progressPercent(current: number | null, baseline: number | null, target: number | null): number {
  if (current == null || target == null) return 0;
  const base = baseline ?? 0;
  const range = target - base;
  if (range <= 0) return current >= (target ?? 0) ? 100 : 0;
  return Math.min(100, Math.max(0, ((current - base) / range) * 100));
}

function friendlyMastery(text: string | null): string {
  if (!text) return '';
  // Simplify clinical phrasing for parents
  return text
    .replace(/across\s+\d+\s+consecutive\s+sessions/gi, 'consistently')
    .replace(/with\s+\d+%\s+accuracy/gi, 'accurately')
    .replace(/per\s+observation\s+period/gi, 'regularly');
}

export function ParentGoalsView({ goals, isLoading }: Props) {
  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading goals…</div>;
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground font-medium">No goals assigned yet</p>
          <p className="text-xs text-muted-foreground mt-1">Your provider will add goals as part of your training plan.</p>
        </CardContent>
      </Card>
    );
  }

  const mastered = goals.filter(g => g.status === 'mastered').length;
  const active = goals.filter(g => g.status === 'active').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Target className="w-4 h-4" /> {active} active</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-600" /> {mastered} mastered</span>
      </div>

      <div className="space-y-3">
        {goals.map(g => {
          const pct = progressPercent(g.current_value, g.baseline_value, g.target_value);
          const isMastered = g.status === 'mastered';
          return (
            <Card key={g.goal_assignment_id} className={isMastered ? 'opacity-70' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{g.title}</CardTitle>
                  <Badge variant={isMastered ? 'default' : 'secondary'} className="text-xs capitalize">
                    {g.status}
                  </Badge>
                </div>
                {g.module_title && <CardDescription className="text-xs">From: {g.module_title}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2">
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}

                {g.target_value != null && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{g.current_value ?? 0} / {g.target_value} {g.unit}</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                )}

                {g.target_text && !g.target_value && (
                  <div className="bg-muted/30 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Target: </span>{g.target_text}
                  </div>
                )}

                {g.mastery_criteria && (
                  <p className="text-xs text-muted-foreground italic">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {friendlyMastery(g.mastery_criteria)}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
