import {
  AlertTriangle, Target, Hand, Shield, Heart, Zap, ArrowUpRight, Loader2, Activity, Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCIAlertRollup, type CIAlertRollup } from '@/hooks/useClinicalIntelligenceAlerts';
import { useCaseloadSkillIntelligence } from '@/hooks/useSkillMasteryIntelligence';
import { useCaseloadReplacementIntelligence } from '@/hooks/useReplacementBehaviorIntelligence';

function RollupCard({ icon, label, value, variant = 'default', description }: {
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
}

export function AlertRollupCards({ agencyId }: Props) {
  const { rollup, loading: rollupLoading } = useCIAlertRollup(agencyId);
  const { stats: skillStats, loading: skillLoading } = useCaseloadSkillIntelligence(agencyId);
  const { stats: replStats, loading: replLoading } = useCaseloadReplacementIntelligence(agencyId);

  const loading = rollupLoading || skillLoading || replLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Clinical Intelligence Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <RollupCard
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Students Requiring Review"
            value={rollup?.total_open ?? 0}
            variant={(rollup?.total_open ?? 0) > 0 ? 'warning' : 'default'}
            description="Students with one or more unresolved clinical alerts across skill, behavior, or caregiver domains. Review these students to update plans or address emerging concerns."
          />
          <RollupCard
            icon={<Target className="w-4 h-4" />}
            label="Stalled Targets"
            value={skillStats.stalled}
            variant={skillStats.stalled > 0 ? 'warning' : 'default'}
            description="Skill acquisition targets showing no measurable progress over the expected timeframe. May need updated teaching procedures, modified prompting, or revised mastery criteria."
          />
          <RollupCard
            icon={<Hand className="w-4 h-4" />}
            label="Prompt Dependency"
            value={skillStats.promptDependent}
            variant={skillStats.promptDependent > 0 ? 'warning' : 'default'}
            description="Targets where the student consistently requires high-level prompts without fading progress. Consider adjusting prompt hierarchy or increasing reinforcement for independent responding."
          />
          <RollupCard
            icon={<Shield className="w-4 h-4" />}
            label="Weak Replacements"
            value={replStats.weak}
            variant={replStats.weak > 0 ? 'destructive' : 'default'}
            description="Replacement behaviors not yet occurring at functional levels. These students may still rely on problem behavior to meet their needs. Prioritize teaching and reinforcing these alternatives."
          />
          <RollupCard
            icon={<ArrowUpRight className="w-4 h-4" />}
            label="Ready to Advance"
            value={skillStats.readyToAdvance}
            variant={skillStats.readyToAdvance > 0 ? 'success' : 'default'}
            description="Targets that have met or exceeded mastery criteria and are ready to move to the next phase — maintenance, generalization, or a new acquisition target."
          />
          <RollupCard
            icon={<Heart className="w-4 h-4" />}
            label="Caregiver Off Track"
            value={rollup?.caregiver_alerts ?? 0}
            variant={(rollup?.caregiver_alerts ?? 0) > 0 ? 'warning' : 'default'}
            description="Caregiver-related alerts such as missed training sessions, low implementation fidelity, or incomplete generalization activities. Follow up to support caregiver engagement."
          />
          <RollupCard
            icon={<Activity className="w-4 h-4" />}
            label="High Priority"
            value={rollup?.high_priority ?? 0}
            variant={(rollup?.high_priority ?? 0) > 0 ? 'destructive' : 'default'}
            description="Critical alerts requiring immediate clinical attention — escalation spikes, safety concerns, or significant regression in key target areas."
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
