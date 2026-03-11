import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, BrainCircuit, MessageSquarePlus } from 'lucide-react';

interface Props {
  behaviorSummary: any[];
  intelligenceContext: any;
  studentId: string;
  onAddTalkingPoint?: (category: string, text: string) => void;
}

export function IEPBehaviorIntelligenceSection({ behaviorSummary, intelligenceContext, studentId, onAddTalkingPoint }: Props) {
  const navigate = useNavigate();

  const askNovaAI = (prompt: string) => {
    const params = new URLSearchParams();
    params.set('prompt', prompt);
    params.set('clientId', studentId);
    params.set('context', 'iep_behavior');
    navigate(`/nova-ai?${params.toString()}`);
  };

  const ctx = intelligenceContext || {};

  return (
    <div className="space-y-3">
      {/* Context Signals */}
      {ctx.student_id && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Behavior Alerts', value: ctx.behavior_alert_count, color: 'text-destructive' },
            { label: 'Skill Alerts', value: ctx.skill_alert_count, color: 'text-warning' },
            { label: 'Stalled Targets', value: ctx.stalled_target_count, color: 'text-destructive' },
            { label: 'Ready to Advance', value: ctx.ready_to_advance_count, color: 'text-success' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pattern Flags */}
      {(ctx.escape_pattern_flag || ctx.attention_pattern_flag || ctx.transition_risk_flag) && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 flex flex-wrap gap-2">
            {ctx.escape_pattern_flag && <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Escape Pattern</Badge>}
            {ctx.attention_pattern_flag && <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Attention Pattern</Badge>}
            {ctx.transition_risk_flag && <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">Transition Risk</Badge>}
            {ctx.unstructured_time_risk_flag && <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Unstructured Time Risk</Badge>}
            {ctx.lunch_time_risk_flag && <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Lunch Risk</Badge>}
          </CardContent>
        </Card>
      )}

      {/* Behavior Cards */}
      {behaviorSummary.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No behavior data available for this student.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {behaviorSummary.map((b, i) => (
            <Card key={i} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <span className="text-xs font-semibold truncate">{b.problem_behavior_name || 'Behavior'}</span>
                      {b.replacement_to_problem_ratio != null && (
                        <Badge variant={b.replacement_to_problem_ratio >= 1 ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                          {b.replacement_to_problem_ratio >= 1 ? 'Strong' : b.replacement_to_problem_ratio >= 0.5 ? 'Emerging' : 'Weak'} Replacement
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                      <div>
                        <p className="text-sm font-bold text-destructive">{b.problem_behavior_count ?? 0}</p>
                        <p className="text-[9px] text-muted-foreground">Problem</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-success">{b.replacement_behavior_count ?? 0}</p>
                        <p className="text-[9px] text-muted-foreground">Replacement</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{b.replacement_to_problem_ratio?.toFixed(2) ?? '—'}</p>
                        <p className="text-[9px] text-muted-foreground">Ratio</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => askNovaAI(`Explain behavior trend for: ${b.problem_behavior_name}. Problem count: ${b.problem_behavior_count}, replacement count: ${b.replacement_behavior_count}.`)}>
                      <BrainCircuit className="w-3 h-3" />
                    </Button>
                    {onAddTalkingPoint && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddTalkingPoint('behavior', `${b.problem_behavior_name}: ${b.problem_behavior_count} incidents, replacement ratio ${b.replacement_to_problem_ratio?.toFixed(2) ?? 'N/A'}`)}>
                        <MessageSquarePlus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
