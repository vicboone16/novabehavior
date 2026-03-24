import { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, ArrowUpRight, AlertTriangle, Shield, Target,
  Activity, Zap, Lightbulb, CheckCircle2, Hand, Loader2, Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSkillMasteryIntelligence } from '@/hooks/useSkillMasteryIntelligence';
import { useReplacementBehaviorIntelligence } from '@/hooks/useReplacementBehaviorIntelligence';
import { useBehaviorEventIntelligence, formatTrigger } from '@/hooks/useBehaviorEventIntelligence';

interface Props {
  studentId: string;
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (value < 0) return <TrendingDown className="w-3 h-3 text-destructive" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function StatCell({ label, value, icon, trend, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'flat';
  color?: string;
}) {
  const trendVal = trend === 'up' ? 1 : trend === 'down' ? -1 : 0;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-lg font-bold leading-none ${color || 'text-foreground'}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </div>
      {trend && <TrendIcon value={trendVal} />}
    </div>
  );
}

export function ProgrammingIntelligenceBanner({ studentId }: Props) {
  const { targets, flags, stats, loading: skillLoading } = useSkillMasteryIntelligence(studentId);
  const { summaries: replSummaries, loading: replLoading } = useReplacementBehaviorIntelligence(studentId);
  const { intel: behaviorIntel, summary: bxSummary, totalEvents: bxTotalEvents, loading: bxLoading } = useBehaviorEventIntelligence(studentId);

  const loading = skillLoading || replLoading || bxLoading;

  const readyToAdvance = useMemo(() => flags.filter(f => f.type === 'ready_to_advance'), [flags]);
  const needsReview = useMemo(() => flags.filter(f => f.type === 'stalled' || f.type === 'mastery_mismatch' || f.type === 'review_needed'), [flags]);
  const promptDep = useMemo(() => flags.filter(f => f.type === 'prompt_dependent'), [flags]);
  const weakReplacements = useMemo(() => replSummaries.filter(s => s.replacement_status === 'weak'), [replSummaries]);
  const strongReplacements = useMemo(() => replSummaries.filter(s => s.replacement_status === 'strong'), [replSummaries]);

  // Behavior insights
  const insights: Array<{ label: string; detail: string; severity: 'warning' | 'info' }> = useMemo(() => {
    const items: Array<{ label: string; detail: string; severity: 'warning' | 'info' }> = [];
    const hasEscape = behaviorIntel?.escape_pattern_flag || bxSummary?.escape_pattern_flag;
    const hasTransition = behaviorIntel?.transition_risk_flag || bxSummary?.transition_risk_flag;
    const topTrigger = behaviorIntel?.top_trigger_context;
    const topTriggerCount = behaviorIntel?.top_trigger_context_count;

    if (hasEscape) {
      items.push({ label: 'Escape-maintained behavior detected', detail: 'Include escape extinction or FCT for escape', severity: 'warning' });
    }
    if (hasTransition && weakReplacements.length > 0) {
      items.push({ label: 'Replacement weak during transitions', detail: 'Replacement program may not address transition settings', severity: 'warning' });
    }
    if (topTrigger && topTrigger !== 'other' && topTriggerCount && topTriggerCount > 5) {
      items.push({ label: `Concentrated in ${formatTrigger(topTrigger)} contexts`, detail: 'Revise intervention for this specific context', severity: 'info' });
    }
    if (readyToAdvance.length > 0) {
      items.push({ label: `${readyToAdvance.length} target(s) met criterion`, detail: 'Consider advancing to next phase', severity: 'info' });
    }
    if (promptDep.length > 0) {
      items.push({ label: `${promptDep.length} target(s) prompt-dependent`, detail: 'Review prompt fading strategy', severity: 'warning' });
    }
    return items;
  }, [behaviorIntel, bxSummary, weakReplacements, readyToAdvance, promptDep]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAnyData = targets.length > 0 || replSummaries.length > 0 || bxTotalEvents > 0;
  if (!hasAnyData) return null;

  // Determine trend directions based on data signals
  const masteredTrend = stats.mastered > 0 ? 'up' as const : 'flat' as const;
  const stalledTrend = stats.stalled > 0 ? 'down' as const : 'flat' as const;

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Programming Intelligence
          <Badge variant="outline" className="ml-auto text-[10px]">
            {stats.total} skills · {replSummaries.length} behaviors
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Skill + Behavior unified stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <StatCell
            label="Mastered"
            value={stats.mastered}
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            trend={masteredTrend}
            color="text-emerald-500"
          />
          <StatCell
            label="In Progress"
            value={stats.inProgress}
            icon={<Target className="w-3.5 h-3.5 text-blue-500" />}
            color="text-blue-500"
          />
          <StatCell
            label="Ready to Advance"
            value={readyToAdvance.length}
            icon={<ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />}
            color={readyToAdvance.length > 0 ? 'text-emerald-500' : undefined}
          />
          <StatCell
            label="Needs Review"
            value={needsReview.length}
            icon={<AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
            trend={needsReview.length > 0 ? 'down' : 'flat'}
            color={needsReview.length > 0 ? 'text-orange-500' : undefined}
          />
          <StatCell
            label="Weak Replacements"
            value={weakReplacements.length}
            icon={<Shield className="w-3.5 h-3.5 text-destructive" />}
            color={weakReplacements.length > 0 ? 'text-destructive' : undefined}
          />
          <StatCell
            label="Prompt Dep."
            value={promptDep.length}
            icon={<Hand className="w-3.5 h-3.5 text-yellow-500" />}
            trend={promptDep.length > 0 ? 'down' : 'flat'}
            color={promptDep.length > 0 ? 'text-yellow-500' : undefined}
          />
        </div>

        {/* Strong replacements + stalled as secondary row */}
        {(strongReplacements.length > 0 || stats.stalled > 0) && (
          <div className="flex gap-3 flex-wrap">
            {strongReplacements.length > 0 && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                <TrendingUp className="w-3 h-3 mr-1" />
                {strongReplacements.length} strong replacement(s)
              </Badge>
            )}
            {stats.stalled > 0 && (
              <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30 text-[10px]">
                <TrendingDown className="w-3 h-3 mr-1" />
                {stats.stalled} stalled target(s)
              </Badge>
            )}
          </div>
        )}

        {/* Condensed insights */}
        {insights.length > 0 && (
          <div className="flex flex-col gap-1 pt-1 border-t border-border/40">
            {insights.slice(0, 4).map((ins, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {ins.severity === 'warning' ? (
                  <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                ) : (
                  <Lightbulb className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                )}
                <span>
                  <span className="font-medium text-foreground">{ins.label}</span>
                  <span className="text-muted-foreground"> — {ins.detail}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
