import { useMemo } from 'react';
import {
  Target, AlertTriangle, Zap, ArrowUpRight, Shield,
  PauseCircle, Hand, Loader2, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCaseloadSkillIntelligence } from '@/hooks/useSkillMasteryIntelligence';
import { useCaseloadReplacementIntelligence } from '@/hooks/useReplacementBehaviorIntelligence';

function StatCard({ icon, label, value, variant = 'default', description }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  description?: string;
}) {
  const borderColor = variant === 'destructive' ? 'border-destructive/30' : variant === 'warning' ? 'border-orange-500/30' : variant === 'success' ? 'border-emerald-500/30' : 'border-border';
  const textColor = variant === 'destructive' ? 'text-destructive' : variant === 'warning' ? 'text-orange-500' : variant === 'success' ? 'text-emerald-500' : 'text-foreground';

  const cardContent = (
    <Card className={borderColor}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs flex-1">{label}</span>
          {description && <Info className="w-3 h-3 opacity-40 flex-shrink-0" />}
        </div>
        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      </CardContent>
    </Card>
  );

  if (!description) return cardContent;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface Props {
  agencyId: string | null;
  behaviorSpikeCount?: number;
  caregiverOffTrackCount?: number;
}

export function CaseloadIntelligenceCards({ agencyId, behaviorSpikeCount = 0, caregiverOffTrackCount = 0 }: Props) {
  const { stats: skillStats, flags: skillFlags, loading: skillLoading } = useCaseloadSkillIntelligence(agencyId);
  const { stats: replStats, loading: replLoading } = useCaseloadReplacementIntelligence(agencyId);

  const loading = skillLoading || replLoading;

  // Students requiring review = those with any flag
  const studentsNeedingReview = useMemo(() => {
    const studentIds = new Set(skillFlags.map(f => {
      // We don't have student_id on flags directly, but we have targetId
      return f.targetId;
    }));
    return studentIds.size;
  }, [skillFlags]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Clinical Intelligence Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard
            icon={<Target className="w-4 h-4" />}
            label="Stalled Targets"
            value={skillStats.stalled}
            variant={skillStats.stalled > 0 ? 'warning' : 'default'}
            description="Skill acquisition targets showing no measurable progress over the expected timeframe. May need updated teaching procedures, modified prompting, or revised mastery criteria."
          />
          <StatCard
            icon={<Hand className="w-4 h-4" />}
            label="Prompt Dependent"
            value={skillStats.promptDependent}
            variant={skillStats.promptDependent > 0 ? 'warning' : 'default'}
            description="Targets where the student consistently requires high-level prompts without fading progress. Consider adjusting prompt hierarchy or increasing reinforcement for independent responding."
          />
          <StatCard
            icon={<ArrowUpRight className="w-4 h-4" />}
            label="Ready to Advance"
            value={skillStats.readyToAdvance}
            variant={skillStats.readyToAdvance > 0 ? 'success' : 'default'}
            description="Targets that have met or exceeded mastery criteria and are ready to move to the next phase — maintenance, generalization, or a new acquisition target."
          />
          <StatCard
            icon={<Shield className="w-4 h-4" />}
            label="Weak Replacements"
            value={replStats.weak}
            variant={replStats.weak > 0 ? 'destructive' : 'default'}
            description="Replacement behaviors not yet occurring at functional levels. These students may still rely on problem behavior to meet their needs. Prioritize teaching and reinforcing these alternatives."
          />
          <StatCard
            icon={<Zap className="w-4 h-4" />}
            label="Behavior Spikes"
            value={behaviorSpikeCount}
            variant={behaviorSpikeCount > 0 ? 'destructive' : 'default'}
            description="Students showing a sudden increase in problem behavior frequency or intensity compared to their recent baseline. Investigate possible triggers or environmental changes."
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Caregiver Off Track"
            value={caregiverOffTrackCount}
            variant={caregiverOffTrackCount > 0 ? 'warning' : 'default'}
            description="Caregiver-related alerts such as missed training sessions, low implementation fidelity, or incomplete generalization activities. Follow up to support caregiver engagement."
          />
          <StatCard
            icon={<PauseCircle className="w-4 h-4" />}
            label="Review Needed"
            value={skillStats.reviewNeeded}
            variant={skillStats.reviewNeeded > 0 ? 'warning' : 'default'}
            description="Targets flagged for clinical review due to inconsistent data patterns, mixed progress signals, or upcoming decision points that require supervisor input."
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
