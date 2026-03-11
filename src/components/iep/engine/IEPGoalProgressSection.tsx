import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, BrainCircuit, MessageSquarePlus, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  goalProgress: any[];
  studentId: string;
  onAddTalkingPoint?: (category: string, text: string) => void;
}

const STATUS_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  mastered: { icon: <CheckCircle2 className="w-3 h-3 text-success" />, color: 'text-success' },
  on_track: { icon: <TrendingUp className="w-3 h-3 text-primary" />, color: 'text-primary' },
  stalled: { icon: <AlertCircle className="w-3 h-3 text-destructive" />, color: 'text-destructive' },
  emerging: { icon: <TrendingUp className="w-3 h-3 text-warning" />, color: 'text-warning' },
};

export function IEPGoalProgressSection({ goalProgress, studentId, onAddTalkingPoint }: Props) {
  const navigate = useNavigate();

  const askNovaAI = (prompt: string) => {
    const params = new URLSearchParams();
    params.set('prompt', prompt);
    params.set('clientId', studentId);
    params.set('context', 'iep_goal_progress');
    navigate(`/nova-ai?${params.toString()}`);
  };

  if (goalProgress.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No goal progress data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {goalProgress.map((g, i) => {
        const st = STATUS_STYLES[g.mastery_status] || STATUS_STYLES.emerging;
        const pct = g.percent_to_mastery ?? 0;
        return (
          <Card key={i} className="hover:border-primary/20 transition-colors">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs font-semibold truncate">{g.student_target_id?.slice(0, 8) || 'Goal'}</span>
                    {g.mastery_status && (
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${st.color}`}>
                        {st.icon} <span className="ml-1">{g.mastery_status?.replace(/_/g, ' ')}</span>
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Progress to Mastery</span>
                      <span className="text-[10px] font-medium">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                    {g.current_accuracy != null && <span>Accuracy: {g.current_accuracy}%</span>}
                    {g.current_prompt_independence != null && <span>Independence: {g.current_prompt_independence}%</span>}
                    {g.consecutive_sessions_at_criterion != null && <span>Consecutive: {g.consecutive_sessions_at_criterion}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => askNovaAI(`Draft goal progress language for target with ${pct}% progress to mastery, accuracy ${g.current_accuracy}%, status ${g.mastery_status}.`)}>
                    <BrainCircuit className="w-3 h-3" />
                  </Button>
                  {onAddTalkingPoint && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddTalkingPoint('goals', `Goal ${g.student_target_id?.slice(0, 8)}: ${pct}% to mastery, status: ${g.mastery_status}`)}>
                      <MessageSquarePlus className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
