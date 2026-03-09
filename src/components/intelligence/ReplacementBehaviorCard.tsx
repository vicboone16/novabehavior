import { Shield, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReplacementBehaviorIntelligence, getReplacementStatusColor } from '@/hooks/useReplacementBehaviorIntelligence';

interface Props {
  studentId: string | null | undefined;
}

/**
 * Compact replacement behavior intelligence card for embedding in Behavior Dashboard.
 */
export function ReplacementBehaviorCard({ studentId }: Props) {
  const { summaries, stats, loading } = useReplacementBehaviorIntelligence(studentId);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (summaries.length === 0) return null;

  return (
    <Card className={stats.weak > 0 ? 'border-destructive/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Replacement Behavior Strength
          {stats.weak > 0 && (
            <Badge variant="destructive" className="ml-auto text-[10px]">
              {stats.weak} weak
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {summaries.map(s => (
            <div key={s.plan_link_id} className="flex items-center gap-2 p-1.5 rounded border border-border/30">
              <Badge className={`${getReplacementStatusColor(s.replacement_status)} text-[10px] shrink-0`}>
                {s.replacement_status}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{s.problem_behavior_name || 'Unnamed'}</p>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <span>P: {s.problem_behavior_count}</span>
                  <span>R: {s.replacement_behavior_count}</span>
                  {s.replacement_to_problem_ratio !== null && (
                    <span>Ratio: {s.replacement_to_problem_ratio}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
