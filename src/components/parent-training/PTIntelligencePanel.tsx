import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, TrendingUp, CheckCircle2, Clock, UserX, BookOpen, Target, Sparkles } from 'lucide-react';
import {
  useParentTrainingIntelAlerts,
  usePTIntelKPIs,
  type PTIntelAlert,
} from '@/hooks/useParentTrainingIntelligence';

interface Props {
  clientId?: string;
}

const alertTypeIcons: Record<string, React.ReactNode> = {
  caregiver_goal_off_track: <AlertTriangle className="w-4 h-4 text-destructive" />,
  no_recent_parent_data: <Clock className="w-4 h-4 text-amber-500" />,
  caregiver_improving: <TrendingUp className="w-4 h-4 text-emerald-500" />,
  caregiver_goal_mastered: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  overdue_caregiver_module: <BookOpen className="w-4 h-4 text-destructive" />,
  low_caregiver_engagement: <UserX className="w-4 h-4 text-amber-500" />,
  caregiver_module_completed: <BookOpen className="w-4 h-4 text-emerald-500" />,
};

const severityColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
};

export function PTIntelligencePanel({ clientId }: Props) {
  const { alerts, loading: alertsLoading } = useParentTrainingIntelAlerts({ clientId, activeOnly: true });
  const kpis = usePTIntelKPIs();

  const loading = alertsLoading || kpis.loading;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasKPIs = kpis.goalsOffTrack + kpis.noRecentData + kpis.improving + kpis.goalsMet +
    kpis.modulesOverdue + kpis.lowEngagement + kpis.modulesCompleted > 0;

  if (!hasKPIs && alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Caregiver intelligence signals will appear as data becomes available</p>
        </CardContent>
      </Card>
    );
  }

  const kpiCards = [
    { label: 'Goals Off Track', value: kpis.goalsOffTrack, icon: AlertTriangle, color: kpis.goalsOffTrack > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'No Recent Data', value: kpis.noRecentData, icon: Clock, color: kpis.noRecentData > 0 ? 'text-amber-500' : 'text-muted-foreground' },
    { label: 'Improving', value: kpis.improving, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Modules Overdue', value: kpis.modulesOverdue, icon: BookOpen, color: kpis.modulesOverdue > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Low Engagement', value: kpis.lowEngagement, icon: UserX, color: kpis.lowEngagement > 0 ? 'text-amber-500' : 'text-muted-foreground' },
    { label: 'Goals Met', value: kpis.goalsMet, icon: CheckCircle2, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Summary Cards */}
      {hasKPIs && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map(c => (
            <Card key={c.label}>
              <CardContent className="pt-3 pb-3 text-center">
                <c.icon className={`w-5 h-5 mx-auto mb-1 ${c.color}`} />
                <p className="text-xl font-bold text-foreground">{c.value}</p>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Alert List */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Caregiver Intelligence Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 20).map((alert, i) => (
                <AlertRow key={i} alert={alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertRow({ alert }: { alert: PTIntelAlert }) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-md border border-border/40 hover:border-border/60 transition-colors">
      <div className="shrink-0 mt-0.5">
        {alertTypeIcons[alert.alert_type || ''] || <Sparkles className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
          <Badge variant="outline" className={`text-[9px] shrink-0 ${severityColors[alert.severity || ''] || ''}`}>
            {alert.severity}
          </Badge>
        </div>
        {alert.summary && <p className="text-xs text-muted-foreground line-clamp-2">{alert.summary}</p>}
        {alert.recommended_action && (
          <p className="text-[10px] text-primary/80 mt-1 italic">{alert.recommended_action}</p>
        )}
      </div>
    </div>
  );
}

/** Compact version for client profile sidebar */
export function PTIntelligenceCompact({ clientId }: { clientId: string }) {
  const { alerts, loading } = useParentTrainingIntelAlerts({ clientId, activeOnly: true });

  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />;
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        Caregiver Intelligence
      </h4>
      {alerts.slice(0, 5).map((alert, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          {alertTypeIcons[alert.alert_type || ''] || <Sparkles className="w-3 h-3" />}
          <span className="text-foreground truncate">{alert.title}</span>
          <Badge variant="outline" className={`text-[8px] ml-auto shrink-0 ${severityColors[alert.severity || ''] || ''}`}>
            {alert.severity}
          </Badge>
        </div>
      ))}
    </div>
  );
}
