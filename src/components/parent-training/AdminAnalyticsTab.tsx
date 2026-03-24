import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { ParentTrainingProgress, ParentTrainingAssignment } from '@/types/parentTraining';
import { useProfileNameResolver } from '@/hooks/useProfileNameResolver';

interface Props {
  progress: ParentTrainingProgress[];
  assignments: ParentTrainingAssignment[];
  isLoading: boolean;
  onRefreshProgress: () => void;
  onRefreshAssignments: () => void;
}

export function AdminAnalyticsTab({ progress, assignments, isLoading, onRefreshProgress, onRefreshAssignments }: Props) {
  useEffect(() => {
    onRefreshProgress();
    onRefreshAssignments();
  }, [onRefreshProgress, onRefreshAssignments]);

  const userIds = useMemo(() => progress.map(p => p.parent_user_id).filter(Boolean), [progress]);
  const { getName } = useProfileNameResolver(userIds);

  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const inProgress = assignments.filter(a => a.status === 'in_progress').length;
    const overdue = assignments.filter(a => a.status === 'overdue').length;
    const avgTime = progress.length > 0
      ? Math.round(progress.reduce((s, p) => s + p.time_spent_seconds, 0) / progress.length / 60)
      : 0;
    const avgScore = progress.filter(p => p.quiz_score_percent != null).length > 0
      ? Math.round(progress.filter(p => p.quiz_score_percent != null).reduce((s, p) => s + (p.quiz_score_percent || 0), 0) / progress.filter(p => p.quiz_score_percent != null).length)
      : null;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, overdue, avgTime, avgScore, completionRate };
  }, [assignments, progress]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Training Analytics</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <BarChart3 className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.completionRate}%</p>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.completed}/{stats.total}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-accent-foreground mb-2" />
            <p className="text-2xl font-bold">{stats.avgTime}m</p>
            <p className="text-xs text-muted-foreground">Avg Time Spent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <XCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
            <p className="text-2xl font-bold">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {stats.avgScore !== null && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Average Quiz Score</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-3 flex-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.avgScore}%` }} />
              </div>
              <span className="text-sm font-semibold">{stats.avgScore}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent progress table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Progress</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Quiz</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : progress.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No progress data yet.</TableCell></TableRow>
              ) : progress.slice(0, 20).map(p => (
                <TableRow key={p.progress_id}>
                  <TableCell className="text-xs text-muted-foreground">{getName(p.parent_user_id) || p.parent_user_id.slice(0, 8) + '…'}</TableCell>
                  <TableCell>
                    <Badge variant={p.completed_at ? 'default' : 'secondary'}>
                      {p.completed_at ? 'Completed' : p.started_at ? 'In Progress' : 'Not Started'}
                    </Badge>
                  </TableCell>
                  <TableCell>{Math.round(p.time_spent_seconds / 60)}m</TableCell>
                  <TableCell>{p.quiz_score_percent != null ? `${p.quiz_score_percent}%` : '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.started_at ? new Date(p.started_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.completed_at ? new Date(p.completed_at).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
