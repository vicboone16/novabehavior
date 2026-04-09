import { useMemo } from 'react';
import { useBopsSystemQA, useRepairStudent, useSyncTargets, useSyncProgramming, useRefreshAllViews } from '@/hooks/useBopsAdmin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Wrench, Link, ArrowDownToLine } from 'lucide-react';
import { useClientNameResolver } from '@/hooks/useProfileNameResolver';

export function BopsAdminQA() {
  const { data: issues, isLoading } = useBopsSystemQA();
  const repair = useRepairStudent();
  const syncTargets = useSyncTargets();
  const syncProg = useSyncProgramming();
  const refreshAll = useRefreshAllViews();
  const studentIds = useMemo(() => (issues || []).map((q: any) => q.student_id).filter(Boolean), [issues]);
  const { getName: getStudentName } = useClientNameResolver(studentIds);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{(issues || []).length} issue(s) found</p>
        <Button variant="outline" size="sm" disabled={refreshAll.isPending} onClick={() => refreshAll.mutate({})}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshAll.isPending ? 'animate-spin' : ''}`} /> Global Refresh
        </Button>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Programs</TableHead>
              <TableHead>Targets</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(issues || []).map((q: any) => (
              <TableRow key={q.student_id} className="bg-destructive/5">
                <TableCell className="text-xs font-medium">{getStudentName(q.student_id) || 'Unknown'}</TableCell>
                <TableCell className="text-xs">{q.bops_assessment_status}</TableCell>
                <TableCell>{q.active_bops_program_count}</TableCell>
                <TableCell>{q.bops_target_count}</TableCell>
                <TableCell><Badge variant="destructive" className="text-xs">{q.qa_issue}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={repair.isPending} onClick={() => repair.mutate({ p_student: q.student_id })}>
                      <Wrench className="w-3 h-3 mr-1" /> Repair
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={syncTargets.isPending} onClick={() => syncTargets.mutate({ p_student: q.student_id })}>
                      <Link className="w-3 h-3 mr-1" /> Targets
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={syncProg.isPending} onClick={() => syncProg.mutate({ p_student: q.student_id })}>
                      <ArrowDownToLine className="w-3 h-3 mr-1" /> Prog
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(issues || []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No QA issues found. System is healthy.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
