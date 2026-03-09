import { useMemo } from 'react';
import {
  Target, CheckCircle2, AlertTriangle, Hand, ArrowUpRight,
  TrendingUp, TrendingDown, Minus, Loader2, Shield, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSkillMasteryIntelligence, type MasteryTargetSummary } from '@/hooks/useSkillMasteryIntelligence';
import { useReplacementBehaviorIntelligence, getReplacementStatusColor } from '@/hooks/useReplacementBehaviorIntelligence';

function getMasteryBadge(target: MasteryTargetSummary) {
  const status = target.mastery_status;
  if (status === 'mastered') return <Badge className="bg-emerald-500 text-white text-[10px]">Mastered</Badge>;
  if (status === 'in_progress') return <Badge className="bg-blue-500 text-white text-[10px]">In Progress</Badge>;
  return <Badge className="bg-muted text-muted-foreground text-[10px]">Not Started</Badge>;
}

function MetricRow({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{Math.round(value)}{suffix || ''}</span>
    </div>
  );
}

interface Props {
  studentId: string | null | undefined;
}

export function StudentIntelligencePanel({ studentId }: Props) {
  const { targets, flags, stats, loading: skillLoading } = useSkillMasteryIntelligence(studentId);
  const { summaries: replSummaries, stats: replStats, loading: replLoading } = useReplacementBehaviorIntelligence(studentId);

  const loading = skillLoading || replLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = targets.length > 0 || replSummaries.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm">No intelligence data available yet. Data will appear once skill targets and behavior plans are configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Skill Acquisition Summary */}
      {targets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Skill Acquisition Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <MiniStat label="Total" value={stats.total} />
              <MiniStat label="Mastered" value={stats.mastered} color="text-emerald-500" />
              <MiniStat label="In Progress" value={stats.inProgress} color="text-blue-500" />
              <MiniStat label="Not Started" value={stats.notStarted} />
              <MiniStat label="Stalled" value={stats.stalled} color="text-orange-500" />
              <MiniStat label="Prompt Dep." value={stats.promptDependent} color="text-yellow-500" />
            </div>

            {/* Target cards */}
            <div className="space-y-2 mt-3">
              {targets.slice(0, 10).map(target => (
                <div key={target.student_target_id} className="flex items-center gap-3 p-2 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
                  {getMasteryBadge(target)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{target.target_title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <MetricRow label="Accuracy" value={target.current_accuracy} suffix="%" />
                      <MetricRow label="Independent" value={target.current_prompt_independence} suffix="%" />
                      {target.consecutive_sessions_at_criterion !== null && target.consecutive_sessions_at_criterion > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {target.consecutive_sessions_at_criterion}/{target.required_consecutive_sessions ?? 2} sessions
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {flags.filter(f => f.targetId === target.student_target_id).map(flag => (
                      <FlagBadge key={flag.type} type={flag.type} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flags / Recommended Actions */}
      {flags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Recommended Actions
              <Badge variant="outline" className="ml-auto text-xs">{flags.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {flags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/30">
                  <FlagBadge type={flag.type} />
                  <p>{flag.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Replacement Behavior Summary */}
      {replSummaries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Replacement Behavior Strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <MiniStat label="Strong" value={replStats.strong} color="text-emerald-500" />
              <MiniStat label="Emerging" value={replStats.emerging} color="text-yellow-500" />
              <MiniStat label="Weak" value={replStats.weak} color="text-destructive" />
              <MiniStat label="Not Started" value={replStats.notStarted} />
            </div>
            <div className="space-y-2">
              {replSummaries.map(s => (
                <div key={s.plan_link_id} className="flex items-center gap-3 p-2 rounded-md border border-border/50">
                  <Badge className={`${getReplacementStatusColor(s.replacement_status)} text-[10px]`}>
                    {s.replacement_status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.problem_behavior_name || 'Unnamed behavior'}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>Problem: {s.problem_behavior_count}</span>
                      <span>Replacement: {s.replacement_behavior_count}</span>
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
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${color || 'text-foreground'}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FlagBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    stalled: { label: 'Stalled', className: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
    prompt_dependent: { label: 'Prompt Dep.', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
    ready_to_advance: { label: 'Ready ↑', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
    mastery_mismatch: { label: 'Mismatch', className: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
    review_needed: { label: 'Review', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
  };
  const c = config[type] || { label: type, className: 'bg-muted' };
  return <Badge variant="outline" className={`text-[9px] ${c.className}`}>{c.label}</Badge>;
}
