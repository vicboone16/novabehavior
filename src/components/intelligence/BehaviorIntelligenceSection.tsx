import { Shield, Loader2, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReplacementBehaviorIntelligence, getReplacementStatusColor } from '@/hooks/useReplacementBehaviorIntelligence';
import { useClinicalIntelligenceAlerts } from '@/hooks/useClinicalIntelligenceAlerts';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { ClinicalIntelAlertList } from './ClinicalIntelAlertList';

interface Props {
  studentId: string;
}

const suggestedActions = [
  'Strengthen replacement reinforcement schedule',
  'Increase replacement teaching opportunities',
  'Review intervention fidelity',
  'Reassess triggers or setting events',
];

export function BehaviorIntelligenceSection({ studentId }: Props) {
  const { currentAgency } = useAgencyContext();
  const { summaries, stats, loading: replLoading } = useReplacementBehaviorIntelligence(studentId);
  const { alerts, loading: alertsLoading, resolveAlert } = useClinicalIntelligenceAlerts(
    currentAgency?.id || null,
    { domain: 'behavior', studentId, unresolvedOnly: true }
  );

  const loading = replLoading || alertsLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (summaries.length === 0 && alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No replacement behavior analysis available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Behavior Intelligence
      </h3>

      {/* Replacement Behavior Strength */}
      {summaries.length > 0 && (
        <Card className={stats.weak > 0 ? 'border-destructive/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Replacement Behavior Strength
              {stats.weak > 0 && (
                <Badge variant="destructive" className="ml-auto text-[10px]">
                  {stats.weak} weak
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summaries.map(s => (
                <div key={s.plan_link_id} className="flex items-center gap-2 p-2 rounded-md border border-border/30">
                  <Badge className={`${getReplacementStatusColor(s.replacement_status)} text-[10px] shrink-0`}>
                    {s.replacement_status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{s.problem_behavior_name || 'Unnamed'}</p>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
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

      {/* Behavior Alerts */}
      {alerts.length > 0 && (
        <ClinicalIntelAlertList
          alerts={alerts}
          loading={false}
          resolveAlert={resolveAlert}
          showFilters={false}
          compact
          emptyMessage="No behavior alerts"
        />
      )}

      {/* Suggested Actions */}
      {stats.weak > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Suggested Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {suggestedActions.map((a, i) => (
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
