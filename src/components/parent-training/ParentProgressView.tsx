import { CheckCircle2, BookOpen, Target, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ParentAssignment, ParentGoal, ParentHomeworkItem } from '@/hooks/useParentTrainingParent';

interface Props {
  assignments: ParentAssignment[];
  goals: ParentGoal[];
  homework: ParentHomeworkItem[];
  isLoading: boolean;
}

export function ParentProgressView({ assignments, goals, homework, isLoading }: Props) {
  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading progress…</div>;
  }

  const completed = assignments.filter(a => a.status === 'completed').length;
  const total = assignments.length;
  const modulePct = total > 0 ? (completed / total) * 100 : 0;

  const masteredGoals = goals.filter(g => g.status === 'mastered').length;
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const goalPct = goals.length > 0 ? (masteredGoals / goals.length) * 100 : 0;

  const reviewedHw = homework.filter(h => h.review_status === 'reviewed').length;

  if (total === 0 && goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No progress to show yet</p>
          <p className="text-xs text-muted-foreground mt-1">Your progress will appear here as you work through assigned training.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <BookOpen className="w-6 h-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{completed}</p>
            <p className="text-xs text-muted-foreground">Modules Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{masteredGoals}</p>
            <p className="text-xs text-muted-foreground">Goals Mastered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <FileText className="w-6 h-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-foreground">{homework.length}</p>
            <p className="text-xs text-muted-foreground">Homework Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-foreground">{reviewedHw}</p>
            <p className="text-xs text-muted-foreground">Reviewed</p>
          </CardContent>
        </Card>
      </div>

      {/* Module progress */}
      {total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Module Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{completed} of {total} completed</span>
              <span>{Math.round(modulePct)}%</span>
            </div>
            <Progress value={modulePct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Goal progress */}
      {goals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Goal Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{masteredGoals} mastered · {activeGoals} active</span>
              <span>{Math.round(goalPct)}%</span>
            </div>
            <Progress value={goalPct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      {homework.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {homework.slice(0, 5).map(h => (
                <div key={h.homework_id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{h.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(h.submitted_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
