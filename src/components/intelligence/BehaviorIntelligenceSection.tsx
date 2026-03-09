import { Shield, Loader2, Lightbulb, Clock, Zap, AlertTriangle, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReplacementBehaviorIntelligence, getReplacementStatusColor } from '@/hooks/useReplacementBehaviorIntelligence';
import { useClinicalIntelligenceAlerts } from '@/hooks/useClinicalIntelligenceAlerts';
import { useBehaviorEventIntelligence, formatTimeBlock, formatTrigger, formatFunction } from '@/hooks/useBehaviorEventIntelligence';
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

const severityColors: Record<string, string> = {
  high: 'bg-destructive text-destructive-foreground',
  moderate: 'bg-orange-500 text-white',
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
};

export function BehaviorIntelligenceSection({ studentId }: Props) {
  const { currentAgency } = useAgencyContext();
  const { summaries, stats, loading: replLoading } = useReplacementBehaviorIntelligence(studentId);
  const { alerts, loading: alertsLoading, resolveAlert } = useClinicalIntelligenceAlerts(
    currentAgency?.id || null,
    { domain: 'behavior', studentId, unresolvedOnly: true }
  );
  const { intel, summary, contextAlerts, topAntecedents, topConsequences, totalEvents, loading: eventLoading } = useBehaviorEventIntelligence(studentId);

  const loading = replLoading || alertsLoading || eventLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (summaries.length === 0 && alerts.length === 0 && !intel && !summary) {
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

      {/* Context-Aware Behavior Alerts */}
      {contextAlerts.length > 0 && (
        <Card className="border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Context-Aware Signals
              <Badge variant="destructive" className="ml-auto text-[10px]">
                {contextAlerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {contextAlerts.map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-border/30">
                  <Badge className={`${severityColors[a.severity]} text-[10px] shrink-0`}>
                    {a.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{a.label}</p>
                    <p className="text-[10px] text-muted-foreground">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Pattern Summary */}
      {totalEvents > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Antecedent / Trigger Patterns */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Antecedent Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {topAntecedents.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[70%] text-foreground">{a.label}</span>
                    <Badge variant="outline" className="text-[10px]">{a.count}</Badge>
                  </div>
                ))}
                {intel.top_trigger_context && intel.top_trigger_context !== 'other' && (
                  <div className="pt-1 border-t border-border/30 mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      Top trigger: <span className="font-medium text-foreground">{formatTrigger(intel.top_trigger_context)}</span>
                      {' '}({intel.top_trigger_context_count} events)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Consequence Patterns + Function */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Consequence Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {topConsequences.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[70%] text-foreground">{c.label}</span>
                    <Badge variant="outline" className="text-[10px]">{c.count}</Badge>
                  </div>
                ))}
                {intel.primary_function_hypothesis && intel.primary_function_hypothesis !== 'undetermined' && (
                  <div className="pt-1 border-t border-border/30 mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      Primary function: <span className="font-medium text-foreground">{formatFunction(intel.primary_function_hypothesis)}</span>
                      {' '}({intel.primary_function_count} events)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* High-Risk Times & Contexts */}
      {intel && intel.total_abc_events > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Risk Context Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <ContextStat label="Peak Time" value={intel.peak_risk_time_block ? formatTimeBlock(intel.peak_risk_time_block).split(' ')[0] : '—'} count={intel.peak_risk_time_block_count} />
              <ContextStat label="Transitions" value={intel.transition_events} flag={intel.transition_risk_flag} />
              <ContextStat label="Unstructured" value={intel.unstructured_events} flag={intel.unstructured_risk_flag} />
              <ContextStat label="Lunch/Recess" value={intel.lunch_recess_events} flag={intel.lunch_recess_risk_flag} />
              <ContextStat label="Demands" value={intel.demand_events} />
            </div>
          </CardContent>
        </Card>
      )}

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
      {(stats.weak > 0 || contextAlerts.length > 0) && (
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
              {intel?.transition_risk_flag && (
                <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">→</span> Add transition supports or visual schedules
                </li>
              )}
              {intel?.unstructured_risk_flag && (
                <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">→</span> Structure free time with activity choices
                </li>
              )}
              {intel?.escape_pattern_flag && (
                <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">→</span> Review escape extinction and demand fading
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ContextStat({ label, value, count, flag }: { label: string; value: string | number; count?: number | null; flag?: boolean }) {
  return (
    <div className={`text-center p-2 rounded-md ${flag ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/30'}`}>
      <p className={`text-sm font-bold ${flag ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {count != null && <p className="text-[9px] text-muted-foreground">{count} events</p>}
    </div>
  );
}
