import { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, ArrowUpRight, AlertTriangle, Shield, Target,
  Activity, Zap, Lightbulb, CheckCircle2, Hand, Loader2, Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSkillMasteryIntelligence } from '@/hooks/useSkillMasteryIntelligence';
import { useReplacementBehaviorIntelligence } from '@/hooks/useReplacementBehaviorIntelligence';
import { useBehaviorEventIntelligence, formatTrigger } from '@/hooks/useBehaviorEventIntelligence';
import { useDataStore } from '@/store/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useStudentBopsPrograms } from '@/hooks/useBopsData';

interface Props {
  studentId: string;
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (value < 0) return <TrendingDown className="w-3 h-3 text-destructive" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

type MasteredMode = 'targets' | 'skills' | 'programs';
type InProgressMode = 'targets' | 'skills' | 'programs';

function ToggleStatCell({ label, value, icon, color, modes, currentMode, onToggle }: {
  label: string;
  value: Record<string, number>;
  icon: React.ReactNode;
  color?: string;
  modes: { key: string; label: string }[];
  currentMode: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-left min-w-0"
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-base font-bold leading-none ${color || 'text-foreground'}`}>{value[currentMode] ?? 0}</p>
        <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
          {modes.find(m => m.key === currentMode)?.label || label}
        </p>
      </div>
    </button>
  );
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
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/40">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-base font-bold leading-none ${color || 'text-foreground'}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
      {trend && <TrendIcon value={trendVal} />}
    </div>
  );
}

export function ProgrammingIntelligenceBanner({ studentId }: Props) {
  const [masteredMode, setMasteredMode] = useState<MasteredMode>('targets');
  const [inProgressMode, setInProgressMode] = useState<InProgressMode>('targets');

  const { targets, flags, stats, loading: skillLoading } = useSkillMasteryIntelligence(studentId);
  const { summaries: replSummaries, loading: replLoading } = useReplacementBehaviorIntelligence(studentId);
  const { intel: behaviorIntel, summary: bxSummary, totalEvents: bxTotalEvents, loading: bxLoading } = useBehaviorEventIntelligence(studentId);

  // Get actual counts from store
  const students = useDataStore(useShallow((state) => state.students));
  const student = students.find(s => s.id === studentId);
  const { data: bopsPrograms } = useStudentBopsPrograms(studentId);
  const bopsCount = bopsPrograms?.length || 0;

  const storeSkillCount = (student?.skillTargets || []).length + bopsCount;
  const storeBehaviorCount = student?.behaviors?.length || 0;

  const loading = skillLoading || replLoading || bxLoading;

  const readyToAdvance = useMemo(() => flags.filter(f => f.type === 'ready_to_advance'), [flags]);
  const needsReview = useMemo(() => flags.filter(f => f.type === 'stalled' || f.type === 'mastery_mismatch' || f.type === 'review_needed'), [flags]);
  const promptDep = useMemo(() => flags.filter(f => f.type === 'prompt_dependent'), [flags]);
  const weakReplacements = useMemo(() => replSummaries.filter(s => s.replacement_status === 'weak'), [replSummaries]);
  const strongReplacements = useMemo(() => replSummaries.filter(s => s.replacement_status === 'strong'), [replSummaries]);

  // Compute mastered/inProgress by granularity
  const masteredValues = useMemo(() => {
    const masteredTargets = targets.filter(t => t.mastery_status === 'mastered' || t.target_status === 'mastered');
    // Skills = unique program/skill groupings that have at least one mastered target
    const masteredSkillIds = new Set(masteredTargets.map(t => (t as any).program_id || t.student_target_id));
    // Programs = unique top-level programs with all targets mastered (approximate)
    return {
      targets: stats.mastered,
      skills: masteredSkillIds.size,
      programs: Math.max(0, Math.floor(stats.mastered / Math.max(1, targets.length) * (student?.skillTargets?.length || 0))),
    };
  }, [targets, stats, student]);

  const inProgressValues = useMemo(() => {
    // Use actual target data: count targets with not_started status that belong to active programs
    // as "in progress" since the programs are in acquisition
    const actualInProgress = stats.inProgress;
    // If mastery engine returned 0 in-progress but we have active targets, use those
    const storeTargetCount = (student?.skillTargets || []).filter(
      (t: any) => t.status !== 'mastered' && t.status !== 'discontinued' && t.lifecycle_status !== 'closed'
    ).length;
    const effectiveInProgress = actualInProgress > 0 ? actualInProgress : storeTargetCount;
    return {
      targets: effectiveInProgress,
      skills: effectiveInProgress,
      programs: new Set(
        (student?.skillTargets || [])
          .filter((t: any) => t.status !== 'mastered' && t.status !== 'discontinued')
          .map((t: any) => t.program_id)
      ).size || 0,
    };
  }, [stats, student]);

  const masteredModes: { key: string; label: string }[] = [
    { key: 'targets', label: 'Targets Mastered' },
    { key: 'skills', label: 'Skills Mastered' },
    { key: 'programs', label: 'Programs Mastered' },
  ];

  const inProgressModes: { key: string; label: string }[] = [
    { key: 'targets', label: 'Targets In Progress' },
    { key: 'skills', label: 'Skills In Progress' },
    { key: 'programs', label: 'Programs In Progress' },
  ];

  const cycleMastered = () => {
    const order: MasteredMode[] = ['targets', 'skills', 'programs'];
    const idx = order.indexOf(masteredMode);
    setMasteredMode(order[(idx + 1) % order.length]);
  };

  const cycleInProgress = () => {
    const order: InProgressMode[] = ['targets', 'skills', 'programs'];
    const idx = order.indexOf(inProgressMode);
    setInProgressMode(order[(idx + 1) % order.length]);
  };

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

  const hasAnyData = storeSkillCount > 0 || storeBehaviorCount > 0 || targets.length > 0 || replSummaries.length > 0 || bxTotalEvents > 0;
  if (!hasAnyData) return null;

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Programming Intelligence
          <Badge variant="outline" className="ml-auto text-[10px]">
            {storeSkillCount} skills · {storeBehaviorCount} behaviors
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Skill + Behavior unified stats — smaller cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
          <ToggleStatCell
            label="Mastered"
            value={masteredValues}
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            color="text-emerald-500"
            modes={masteredModes}
            currentMode={masteredMode}
            onToggle={cycleMastered}
          />
          <ToggleStatCell
            label="In Progress"
            value={inProgressValues}
            icon={<Target className="w-3.5 h-3.5 text-blue-500" />}
            color="text-blue-500"
            modes={inProgressModes}
            currentMode={inProgressMode}
            onToggle={cycleInProgress}
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
