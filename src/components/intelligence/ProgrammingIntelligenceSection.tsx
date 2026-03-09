import { Layers, ArrowUpRight, AlertTriangle, Shield, Target, Lightbulb, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSkillMasteryIntelligence } from '@/hooks/useSkillMasteryIntelligence';
import { useReplacementBehaviorIntelligence, getReplacementStatusColor } from '@/hooks/useReplacementBehaviorIntelligence';
import { useClinicalIntelligenceAlerts } from '@/hooks/useClinicalIntelligenceAlerts';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { ClinicalIntelAlertList } from './ClinicalIntelAlertList';

interface Props {
  studentId: string;
}

const programmingSuggestions = [
  'Review mastery criteria for stalled targets',
  'Increase generalization opportunities',
  'Adjust prompting strategy for prompt-dependent targets',
  'Revisit replacement behavior selection for weak programs',
  'Schedule BCBA review for flagged programs',
];

export function ProgrammingIntelligenceSection({ studentId }: Props) {
  const { currentAgency } = useAgencyContext();
  const { flags, stats, loading: skillLoading } = useSkillMasteryIntelligence(studentId);
  const { summaries: replSummaries, stats: replStats, loading: replLoading } = useReplacementBehaviorIntelligence(studentId);
  const { alerts, loading: alertsLoading, resolveAlert } = useClinicalIntelligenceAlerts(
    currentAgency?.id || null,
    { studentId, unresolvedOnly: true }
  );

  // Filter alerts to programming-relevant domains
  const programmingAlerts = alerts.filter(a => 
    ['skill', 'behavior', 'programming'].includes(a.domain)
  );

  const loading = skillLoading || replLoading || alertsLoading;

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

  const hasData = flags.length > 0 || replSummaries.length > 0 || programmingAlerts.length > 0;

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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Programming Intelligence
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Programs Ready for Advancement */}
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

        {/* Programs Needing Review */}
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

        {/* Weak Replacements */}
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

        {/* Stalled */}
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
      {(needsReview.length > 0 || weakReplacements.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Suggested Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {programmingSuggestions
                .filter((_, i) => {
                  if (i === 0) return stats.stalled > 0;
                  if (i === 3) return weakReplacements.length > 0;
                  return needsReview.length > 0;
                })
                .map((a, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">→</span> {a}
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
