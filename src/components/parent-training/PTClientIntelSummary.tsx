import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Target, CheckCircle2, Clock, AlertTriangle, TrendingUp, Sparkles, UserX, MessageSquare } from 'lucide-react';
import {
  useParentTrainingAssignmentIntel,
  useParentTrainingIntelAlerts,
} from '@/hooks/useParentTrainingIntelligence';

interface Props {
  clientId: string;
}

const suggestedActions = [
  { condition: 'caregiver_goal_off_track', action: 'Follow up with caregiver to identify barriers', icon: MessageSquare },
  { condition: 'no_recent_parent_data', action: 'Check in on data submission — provide modeling if needed', icon: Clock },
  { condition: 'low_caregiver_engagement', action: 'Adjust expectations and offer additional support', icon: UserX },
  { condition: 'caregiver_improving', action: 'Reinforce progress and consider next module', icon: TrendingUp },
  { condition: 'caregiver_module_completed', action: 'Assign next module in curriculum sequence', icon: BookOpen },
  { condition: 'caregiver_goal_mastered', action: 'Review for generalization and maintenance planning', icon: CheckCircle2 },
];

export function PTClientIntelSummary({ clientId }: Props) {
  const { summaries, loading: sumLoading } = useParentTrainingAssignmentIntel(clientId);
  const { alerts, loading: alertLoading } = useParentTrainingIntelAlerts({ clientId, activeOnly: true });

  const loading = sumLoading || alertLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalModules = summaries.length;
  const overdueModules = summaries.filter(s => s.due_date && new Date(s.due_date) < new Date() && s.assignment_status !== 'completed').length;
  const completedModules = summaries.filter(s => s.assignment_status === 'completed').length;
  const totalGoals = summaries.reduce((sum, s) => sum + (s.total_goals || 0), 0);
  const masteredGoals = summaries.reduce((sum, s) => sum + (s.mastered_goals || 0), 0);
  const inProgressGoals = summaries.reduce((sum, s) => sum + (s.in_progress_goals || 0), 0);
  const lastDataAt = summaries.reduce((latest: string | null, s) => {
    if (!s.last_data_submission_at) return latest;
    if (!latest || s.last_data_submission_at > latest) return s.last_data_submission_at;
    return latest;
  }, null);
  const lastHomeworkAt = summaries.reduce((latest: string | null, s) => {
    if (!s.last_homework_submission_at) return latest;
    if (!latest || s.last_homework_submission_at > latest) return s.last_homework_submission_at;
    return latest;
  }, null);

  if (totalModules === 0 && alerts.length === 0) return null;

  const alertTypes = new Set(alerts.map(a => a.alert_type));
  const relevantActions = suggestedActions.filter(sa => alertTypes.has(sa.condition));

  return (
    <div className="space-y-3">
      {/* A. Summary Cards */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Caregiver Training Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Assigned Modules" value={totalModules} icon={BookOpen} />
            <MiniStat label="Overdue Modules" value={overdueModules} icon={Clock} color={overdueModules > 0 ? 'text-destructive' : undefined} />
            <MiniStat label="Active Goals" value={inProgressGoals} icon={Target} />
            <MiniStat label="Goals Mastered" value={masteredGoals} icon={CheckCircle2} color="text-emerald-500" />
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-muted-foreground">
            <span>Total Goals: {totalGoals}</span>
            <span>Completed Modules: {completedModules}</span>
            {lastDataAt && <span>Last Data: {new Date(lastDataAt).toLocaleDateString()}</span>}
            {lastHomeworkAt && <span>Last Homework: {new Date(lastHomeworkAt).toLocaleDateString()}</span>}
          </div>
        </CardContent>
      </Card>

      {/* B. Alert Panel */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Caregiver Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {alerts.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded border border-border/30">
                  <Badge variant="outline" className={`text-[8px] shrink-0 ${
                    a.severity === 'high' ? 'text-destructive border-destructive/30' :
                    a.severity === 'medium' ? 'text-amber-600 border-amber-300' :
                    'text-emerald-600 border-emerald-300'
                  }`}>{a.severity}</Badge>
                  <span className="text-foreground truncate">{a.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* C. Suggested Actions */}
      {relevantActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              Suggested Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {relevantActions.map((sa, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded border border-border/30">
                  <sa.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground">{sa.action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color?: string }) {
  return (
    <div className="text-center">
      <Icon className={`w-4 h-4 mx-auto mb-0.5 ${color || 'text-primary'}`} />
      <p className={`text-lg font-bold ${color || 'text-foreground'}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
