import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BookOpen, Target, FileText, ClipboardList, BarChart3, AlertTriangle, TrendingUp, Clock, UserX, CheckCircle2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PTAssignmentDashboard, PTHomework, PTSessionLog, PTGoalAssignment } from '@/hooks/useParentTrainingAdmin';
import { usePTIntelKPIs, useParentTrainingIntelAlerts } from '@/hooks/useParentTrainingIntelligence';

interface Props {
  assignments: PTAssignmentDashboard[];
  homework: PTHomework[];
  sessionLogs: PTSessionLog[];
  goalAssignments: PTGoalAssignment[];
  isLoading: boolean;
  onRefresh: () => void;
}

const alertTypeIcons: Record<string, React.ReactNode> = {
  caregiver_goal_off_track: <AlertTriangle className="w-3.5 h-3.5 text-destructive" />,
  no_recent_parent_data: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  caregiver_improving: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />,
  caregiver_goal_mastered: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  overdue_caregiver_module: <BookOpen className="w-3.5 h-3.5 text-destructive" />,
  low_caregiver_engagement: <UserX className="w-3.5 h-3.5 text-amber-500" />,
  caregiver_module_completed: <BookOpen className="w-3.5 h-3.5 text-emerald-500" />,
};

const severityColors: Record<string, string> = {
  high: 'text-destructive border-destructive/30',
  medium: 'text-amber-600 border-amber-300',
  low: 'text-emerald-600 border-emerald-300',
};

export function PTDashboardTab({ assignments, homework, sessionLogs, goalAssignments, isLoading, onRefresh }: Props) {
  useEffect(() => { onRefresh(); }, [onRefresh]);

  const kpis = usePTIntelKPIs();
  const { alerts } = useParentTrainingIntelAlerts({ activeOnly: true });

  const activeFamilies = new Set(assignments.filter(a => a.status !== 'completed').map(a => a.parent_user_id)).size;
  const assignedModules = assignments.filter(a => a.status !== 'completed').length;
  const activeGoals = goalAssignments.filter(g => g.status === 'active').length;
  const pendingHomework = homework.filter(h => h.review_status === 'pending').length;
  const recentLogs = sessionLogs.filter(l => {
    const d = new Date(l.session_date);
    return d >= new Date(Date.now() - 30 * 86400000);
  }).length;
  const overdueAssignments = assignments.filter(a => a.due_at && new Date(a.due_at) < new Date() && a.status !== 'completed').length;

  const operationalCards = [
    { label: 'Active Families', value: activeFamilies, icon: Users, color: 'text-primary' },
    { label: 'Assigned Modules', value: assignedModules, icon: BookOpen, color: 'text-primary' },
    { label: 'Active Goals', value: activeGoals, icon: Target, color: 'text-primary' },
    { label: 'Homework Pending', value: pendingHomework, icon: FileText, color: pendingHomework > 0 ? 'text-destructive' : 'text-primary' },
    { label: 'Recent Session Logs', value: recentLogs, icon: ClipboardList, color: 'text-primary' },
    { label: 'Overdue', value: overdueAssignments, icon: BarChart3, color: overdueAssignments > 0 ? 'text-destructive' : 'text-primary' },
  ];

  const intelCards = [
    { label: 'Goals Off Track', value: kpis.goalsOffTrack, icon: AlertTriangle, color: kpis.goalsOffTrack > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'No Recent Data', value: kpis.noRecentData, icon: Clock, color: kpis.noRecentData > 0 ? 'text-amber-500' : 'text-muted-foreground' },
    { label: 'Improving', value: kpis.improving, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Modules Overdue', value: kpis.modulesOverdue, icon: BookOpen, color: kpis.modulesOverdue > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Low Engagement', value: kpis.lowEngagement, icon: UserX, color: kpis.lowEngagement > 0 ? 'text-amber-500' : 'text-muted-foreground' },
    { label: 'Goals Met', value: kpis.goalsMet, icon: CheckCircle2, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Parent Training Dashboard</h2>

      {/* Operational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {operationalCards.map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 text-center">
              <c.icon className={`w-7 h-7 mx-auto mb-2 ${c.color}`} />
              <p className="text-2xl font-bold text-foreground">{isLoading ? '…' : c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Intelligence Summary */}
      {!kpis.loading && (kpis.goalsOffTrack + kpis.noRecentData + kpis.improving + kpis.modulesOverdue + kpis.lowEngagement + kpis.goalsMet > 0) && (
        <>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Caregiver Intelligence</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {intelCards.map(c => (
              <Card key={c.label}>
                <CardContent className="pt-3 pb-3 text-center">
                  <c.icon className={`w-5 h-5 mx-auto mb-1 ${c.color}`} />
                  <p className="text-xl font-bold text-foreground">{c.value}</p>
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Intelligence Alert List */}
      {alerts.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Caregiver Intelligence Alerts
            </h3>
            <div className="space-y-1.5">
              {alerts.slice(0, 15).map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2 rounded border border-border/40 text-xs">
                  <div className="shrink-0 mt-0.5">
                    {alertTypeIcons[a.alert_type || ''] || <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{a.title}</span>
                      <Badge variant="outline" className={`text-[8px] shrink-0 ${severityColors[a.severity || ''] || ''}`}>
                        {a.severity}
                      </Badge>
                    </div>
                    {a.summary && <p className="text-muted-foreground line-clamp-1 mt-0.5">{a.summary}</p>}
                    {a.recommended_action && <p className="text-primary/80 mt-0.5 italic">{a.recommended_action}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Assignments */}
      {overdueAssignments > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold text-destructive mb-2">Overdue Assignments</h3>
            <div className="space-y-1">
              {assignments.filter(a => a.due_at && new Date(a.due_at) < new Date() && a.status !== 'completed').slice(0, 5).map(a => (
                <div key={a.assignment_id} className="flex justify-between text-sm">
                  <span className="text-foreground">{a.module_title || 'Module'}</span>
                  <span className="text-muted-foreground text-xs">{a.parent_user_id.slice(0, 8)}… — Due {new Date(a.due_at!).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Homework */}
      {pendingHomework > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Homework Pending Review ({pendingHomework})</h3>
            <div className="space-y-1">
              {homework.filter(h => h.review_status === 'pending').slice(0, 5).map(h => (
                <div key={h.homework_id} className="flex justify-between text-sm">
                  <span className="text-foreground">{h.title}</span>
                  <span className="text-muted-foreground text-xs">{new Date(h.submitted_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
