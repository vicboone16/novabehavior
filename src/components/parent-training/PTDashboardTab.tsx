import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BookOpen, Target, FileText, ClipboardList, BarChart3 } from 'lucide-react';
import type { PTAssignmentDashboard, PTHomework, PTSessionLog, PTGoalAssignment } from '@/hooks/useParentTrainingAdmin';

interface Props {
  assignments: PTAssignmentDashboard[];
  homework: PTHomework[];
  sessionLogs: PTSessionLog[];
  goalAssignments: PTGoalAssignment[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function PTDashboardTab({ assignments, homework, sessionLogs, goalAssignments, isLoading, onRefresh }: Props) {
  useEffect(() => { onRefresh(); }, [onRefresh]);

  const activeFamilies = new Set(assignments.filter(a => a.status !== 'completed').map(a => a.parent_user_id)).size;
  const assignedModules = assignments.filter(a => a.status !== 'completed').length;
  const activeGoals = goalAssignments.filter(g => g.status === 'active').length;
  const pendingHomework = homework.filter(h => h.review_status === 'pending').length;
  const recentLogs = sessionLogs.filter(l => {
    const d = new Date(l.session_date);
    return d >= new Date(Date.now() - 30 * 86400000);
  }).length;
  const overdueAssignments = assignments.filter(a => a.due_at && new Date(a.due_at) < new Date() && a.status !== 'completed').length;

  const cards = [
    { label: 'Active Families', value: activeFamilies, icon: Users, color: 'text-primary' },
    { label: 'Assigned Modules', value: assignedModules, icon: BookOpen, color: 'text-primary' },
    { label: 'Active Goals', value: activeGoals, icon: Target, color: 'text-primary' },
    { label: 'Homework Pending', value: pendingHomework, icon: FileText, color: pendingHomework > 0 ? 'text-destructive' : 'text-primary' },
    { label: 'Recent Session Logs', value: recentLogs, icon: ClipboardList, color: 'text-primary' },
    { label: 'Overdue', value: overdueAssignments, icon: BarChart3, color: overdueAssignments > 0 ? 'text-destructive' : 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Parent Training Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 text-center">
              <c.icon className={`w-7 h-7 mx-auto mb-2 ${c.color}`} />
              <p className="text-2xl font-bold text-foreground">{isLoading ? '…' : c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
