import { Target, Hand, AlertTriangle, ArrowUpRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSkillMasteryIntelligence, type MasteryTargetSummary } from '@/hooks/useSkillMasteryIntelligence';
import { useClinicalIntelligenceAlerts } from '@/hooks/useClinicalIntelligenceAlerts';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { ClinicalIntelAlertList } from './ClinicalIntelAlertList';

interface Props {
  studentId: string;
}

function getMasteryStatusBadge(status: string | null) {
  switch (status) {
    case 'mastered': return <Badge className="bg-emerald-500 text-white text-[10px]">Mastered</Badge>;
    case 'in_progress': return <Badge className="bg-blue-500 text-white text-[10px]">In Progress</Badge>;
    default: return <Badge className="bg-muted text-muted-foreground text-[10px]">Not Started</Badge>;
  }
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

export function SkillIntelligenceSection({ studentId }: Props) {
  const { currentAgency } = useAgencyContext();
  const { targets, flags, stats, loading: skillLoading } = useSkillMasteryIntelligence(studentId);
  const { alerts, loading: alertsLoading, resolveAlert } = useClinicalIntelligenceAlerts(
    currentAgency?.id || null,
    { domain: 'skill', studentId, unresolvedOnly: true }
  );

  const loading = skillLoading || alertsLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (targets.length === 0 && alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No skill intelligence data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Skill Intelligence
      </h3>

      {/* Stats Row */}
      {targets.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <MiniStat label="Total" value={stats.total} />
          <MiniStat label="Mastered" value={stats.mastered} color="text-emerald-500" />
          <MiniStat label="In Progress" value={stats.inProgress} color="text-blue-500" />
          <MiniStat label="Stalled" value={stats.stalled} color="text-orange-500" />
          <MiniStat label="Prompt Dep." value={stats.promptDependent} color="text-yellow-500" />
          <MiniStat label="Ready ↑" value={stats.readyToAdvance} color="text-emerald-500" />
        </div>
      )}

      {/* Smart Mastery Cards */}
      {targets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Smart Mastery Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {targets.slice(0, 15).map(t => (
                <div key={t.student_target_id} className="flex items-center gap-3 p-2 rounded-md border border-border/30 hover:bg-muted/30 transition-colors">
                  {getMasteryStatusBadge(t.mastery_status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.target_title}</p>
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {t.current_accuracy != null && <span>Accuracy: {Math.round(t.current_accuracy)}%</span>}
                      {t.current_prompt_independence != null && <span>Indep: {Math.round(t.current_prompt_independence)}%</span>}
                      {t.current_latency != null && <span>Latency: {Math.round(t.current_latency)}s</span>}
                      {t.current_duration != null && <span>Duration: {Math.round(t.current_duration)}s</span>}
                      {t.consecutive_sessions_at_criterion != null && t.consecutive_sessions_at_criterion > 0 && (
                        <span>{t.consecutive_sessions_at_criterion}/{t.required_consecutive_sessions ?? 2} sessions</span>
                      )}
                      {t.percent_to_mastery != null && <span>Progress: {Math.round(t.percent_to_mastery)}%</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {flags.filter(f => f.targetId === t.student_target_id).map(flag => (
                      <FlagBadge key={flag.type} type={flag.type} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill Alerts */}
      {alerts.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Skill Alerts</h4>
          <ClinicalIntelAlertList
            alerts={alerts}
            loading={false}
            resolveAlert={resolveAlert}
            showFilters={false}
            compact
            emptyMessage="No skill alerts"
          />
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-2 rounded-md bg-muted/30">
      <p className={`text-lg font-bold ${color || 'text-foreground'}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
