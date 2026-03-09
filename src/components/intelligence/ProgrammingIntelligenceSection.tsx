import { Layers, ArrowUpRight, AlertTriangle, Shield, Target, Lightbulb, Loader2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSkillMasteryIntelligence } from '@/hooks/useSkillMasteryIntelligence';
import { useReplacementBehaviorIntelligence, getReplacementStatusColor } from '@/hooks/useReplacementBehaviorIntelligence';
import { useClinicalIntelligenceAlerts } from '@/hooks/useClinicalIntelligenceAlerts';
import { useBehaviorEventIntelligence, formatTrigger } from '@/hooks/useBehaviorEventIntelligence';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { ClinicalIntelAlertList } from './ClinicalIntelAlertList';

interface Props {
  studentId: string;
}

export function ProgrammingIntelligenceSection({ studentId }: Props) {
  const { currentAgency } = useAgencyContext();
  const { flags, stats, loading: skillLoading } = useSkillMasteryIntelligence(studentId);
  const { summaries: replSummaries, stats: replStats, loading: replLoading } = useReplacementBehaviorIntelligence(studentId);
  const { alerts, loading: alertsLoading, resolveAlert } = useClinicalIntelligenceAlerts(
    currentAgency?.id || null,
    { studentId, unresolvedOnly: true }
  );
  const { intel: behaviorIntel, summary: bxSummary, contextAlerts: bxContextAlerts, totalEvents: bxTotalEvents, loading: bxLoading } = useBehaviorEventIntelligence(studentId);

  const programmingAlerts = alerts.filter(a => 
    ['skill', 'behavior', 'programming'].includes(a.domain)
  );

  const loading = skillLoading || replLoading || alertsLoading || bxLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const readyToAdvance = flags.filter(f => f.type === 'ready_to_advance');
  const needsReview = flags.filter(f => f.type === 'stalled' || f.type === 'mastery_mismatch' || f.type === 'review_needed');
  const weakReplacements = replSummaries.filter(s => s.replacement_status === 'weak');

  const hasData = flags.length > 0 || replSummaries.length > 0 || programmingAlerts.length > 0 || bxTotalEvents > 0;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No programming intelligence data yet</p>
        </CardContent>
      </Card>
    );
  }

  // Behavior-programming context insights
  const bxProgrammingInsights: Array<{ label: string; detail: string }> = [];
  if (behaviorIntel) {
    if (behaviorIntel.transition_risk_flag && weakReplacements.length > 0) {
      bxProgrammingInsights.push({
        label: 'Replacement weak during transitions',
        detail: 'Behavior is context-specific to transitions but replacement program may not address this setting',
      });
    }
    if (behaviorIntel.escape_pattern_flag) {
      bxProgrammingInsights.push({
        label: 'Escape-maintained behavior detected',
        detail: 'Programming should include escape extinction or functional communication training for escape',
      });
    }
    if (behaviorIntel.top_trigger_context && behaviorIntel.top_trigger_context !== 'other' && behaviorIntel.top_trigger_context_count && behaviorIntel.top_trigger_context_count > 5) {
      bxProgrammingInsights.push({
        label: `Behavior concentrated in ${formatTrigger(behaviorIntel.top_trigger_context)} contexts`,
        detail: 'Intervention may need revision to target this specific context',
      });
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Programming Intelligence
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={readyToAdvance.length > 0 ? 'border-emerald-500/30' : ''}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-xs">Ready to Advance</span>
            </div>
            <p className={`text-2xl font-bold ${readyToAdvance.length > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
              {readyToAdvance.length}
            </p>
          </CardContent>
        </Card>

        <Card className={needsReview.length > 0 ? 'border-orange-500/30' : ''}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Needs Review</span>
            </div>
            <p className={`text-2xl font-bold ${needsReview.length > 0 ? 'text-orange-500' : 'text-foreground'}`}>
              {needsReview.length}
            </p>
          </CardContent>
        </Card>

        <Card className={weakReplacements.length > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Weak Replacements</span>
            </div>
            <p className={`text-2xl font-bold ${weakReplacements.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {weakReplacements.length}
            </p>
          </CardContent>
        </Card>

        <Card className={stats.stalled > 0 ? 'border-orange-500/30' : ''}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs">Weak Momentum</span>
            </div>
            <p className={`text-2xl font-bold ${stats.stalled > 0 ? 'text-orange-500' : 'text-foreground'}`}>
              {stats.stalled}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Behavior-Programming Context Insights */}
      {bxProgrammingInsights.length > 0 && (
        <Card className="border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Behavior-Programming Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {bxProgrammingInsights.map((insight, i) => (
                <div key={i} className="p-2 rounded-md border border-border/30">
                  <p className="text-xs font-medium text-foreground">{insight.label}</p>
                  <p className="text-[10px] text-muted-foreground">{insight.detail}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Programming Alerts */}
      {programmingAlerts.length > 0 && (
        <ClinicalIntelAlertList
          alerts={programmingAlerts}
          loading={false}
          resolveAlert={resolveAlert}
          showFilters={false}
          compact
          maxItems={5}
          emptyMessage="No programming alerts"
        />
      )}

      {/* Suggested Actions */}
      {(needsReview.length > 0 || weakReplacements.length > 0 || bxProgrammingInsights.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Suggested Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {stats.stalled > 0 && (
                <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">→</span> Review mastery criteria for stalled targets
                </li>
              )}
              {needsReview.length > 0 && (
                <>
                  <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">→</span> Increase generalization opportunities
                  </li>
                  <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">→</span> Adjust prompting strategy for prompt-dependent targets
                  </li>
                </>
              )}
              {weakReplacements.length > 0 && (
                <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">→</span> Revisit replacement behavior selection for weak programs
                </li>
              )}
              {bxProgrammingInsights.length > 0 && (
                <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">→</span> Revise intervention to target context-specific behavior patterns
                </li>
              )}
              <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">→</span> Schedule BCBA review for flagged programs
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
