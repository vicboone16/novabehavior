import { useMemo } from 'react';
import { AlertTriangle, Target, Hand, ArrowUpRight, Shield, Zap, Lightbulb, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCaseloadSkillIntelligence, type MasteryFlag } from '@/hooks/useSkillMasteryIntelligence';
import { useCaseloadReplacementIntelligence } from '@/hooks/useReplacementBehaviorIntelligence';

interface ClinicalAlert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  icon: React.ReactNode;
  message: string;
  suggestion: string;
  studentId?: string;
  targetId?: string;
}

function alertFromFlag(flag: MasteryFlag): ClinicalAlert {
  const iconMap: Record<string, React.ReactNode> = {
    stalled: <Target className="w-4 h-4 text-orange-500" />,
    prompt_dependent: <Hand className="w-4 h-4 text-yellow-500" />,
    ready_to_advance: <ArrowUpRight className="w-4 h-4 text-emerald-500" />,
    mastery_mismatch: <AlertTriangle className="w-4 h-4 text-orange-500" />,
    review_needed: <Lightbulb className="w-4 h-4 text-yellow-500" />,
  };

  const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'info'> = {
    stalled: 'high',
    prompt_dependent: 'medium',
    ready_to_advance: 'info',
    mastery_mismatch: 'medium',
    review_needed: 'medium',
  };

  const suggestionMap: Record<string, string> = {
    stalled: 'Review teaching procedure or target difficulty',
    prompt_dependent: 'Review prompt fading strategy',
    ready_to_advance: 'Consider advancing to next phase',
    mastery_mismatch: 'Increase generalization training',
    review_needed: 'Schedule BCBA review',
  };

  return {
    id: `${flag.type}-${flag.targetId}`,
    type: flag.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    severity: severityMap[flag.type] || 'medium',
    icon: iconMap[flag.type] || <AlertTriangle className="w-4 h-4" />,
    message: flag.message,
    suggestion: suggestionMap[flag.type] || '',
    targetId: flag.targetId,
  };
}

const severityColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  info: 'bg-blue-500 text-white',
};

interface Props {
  agencyId: string | null;
}

export function ClinicalAlertsPanel({ agencyId }: Props) {
  const { flags: skillFlags, loading: skillLoading } = useCaseloadSkillIntelligence(agencyId);
  const { summaries: replSummaries, loading: replLoading } = useCaseloadReplacementIntelligence(agencyId);

  const alerts = useMemo(() => {
    const all: ClinicalAlert[] = [];

    // Skill mastery flags
    for (const flag of skillFlags) {
      all.push(alertFromFlag(flag));
    }

    // Weak replacement behaviors
    for (const s of replSummaries) {
      if (s.replacement_status === 'weak' && s.problem_behavior_name) {
        all.push({
          id: `weak-repl-${s.plan_link_id}`,
          type: 'Weak Replacement',
          severity: 'high',
          icon: <Shield className="w-4 h-4 text-destructive" />,
          message: `${s.problem_behavior_name}: Replacement behavior not competing effectively (ratio: ${s.replacement_to_problem_ratio ?? 0})`,
          suggestion: 'Review replacement behavior strategy and reinforcement schedule',
          studentId: s.student_id,
        });
      }
    }

    // Sort by severity
    const order = { critical: 0, high: 1, medium: 2, info: 3 };
    return all.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));
  }, [skillFlags, replSummaries]);

  const loading = skillLoading || replLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Lightbulb className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm">No clinical intelligence alerts. Your caseload is looking good!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Clinical Intelligence Alerts
        </h3>
        <Badge variant="outline" className="text-xs">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {alerts.slice(0, 20).map(alert => (
        <Card key={alert.id} className={alert.severity === 'critical' ? 'border-destructive/40' : alert.severity === 'high' ? 'border-orange-500/40' : ''}>
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">{alert.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`${severityColors[alert.severity] || 'bg-muted'} text-[10px]`}>
                    {alert.type}
                  </Badge>
                </div>
                <p className="text-sm">{alert.message}</p>
                {alert.suggestion && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    → {alert.suggestion}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
