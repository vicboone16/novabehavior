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
        />
        <RollupCard
          icon={<Target className="w-4 h-4" />}
          label="Stalled Targets"
          value={skillStats.stalled}
          variant={skillStats.stalled > 0 ? 'warning' : 'default'}
        />
        <RollupCard
          icon={<Hand className="w-4 h-4" />}
          label="Prompt Dependency"
          value={skillStats.promptDependent}
          variant={skillStats.promptDependent > 0 ? 'warning' : 'default'}
        />
        <RollupCard
          icon={<Shield className="w-4 h-4" />}
          label="Weak Replacements"
          value={replStats.weak}
          variant={replStats.weak > 0 ? 'destructive' : 'default'}
        />
        <RollupCard
          icon={<ArrowUpRight className="w-4 h-4" />}
          label="Ready to Advance"
          value={skillStats.readyToAdvance}
          variant={skillStats.readyToAdvance > 0 ? 'success' : 'default'}
        />
        <RollupCard
          icon={<Heart className="w-4 h-4" />}
          label="Caregiver Off Track"
          value={rollup?.caregiver_alerts ?? 0}
          variant={(rollup?.caregiver_alerts ?? 0) > 0 ? 'warning' : 'default'}
        />
        <RollupCard
          icon={<Activity className="w-4 h-4" />}
          label="High Priority"
          value={rollup?.high_priority ?? 0}
          variant={(rollup?.high_priority ?? 0) > 0 ? 'destructive' : 'default'}
        />
      </div>
    </div>
  );
}
