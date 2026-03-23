import { useState, useEffect } from 'react';
import {
  User, FileText, Calendar, ClipboardCheck, Target, ArrowLeft,
  CheckCircle2, Clock, AlertCircle, BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Student {
  id: string;
  name: string;
  color?: string;
}

interface Props {
  student: Student;
  onClose: () => void;
}

interface EvalSummary {
  id: string;
  eval_type: string;
  status: string;
  eval_due_date: string | null;
  consent_received: boolean;
  report_finalized: boolean;
  iep_scheduled: boolean;
  observation_1_completed: boolean;
  observation_2_completed: boolean;
  observation_3_completed: boolean;
  created_at: string;
}

interface CaseItem {
  id: string;
  data_type: string;
  data: any;
  status: string;
  updated_at: string;
}

export function IEPStudentDetail({ student, onClose }: Props) {
  const [evals, setEvals] = useState<EvalSummary[]>([]);
  const [caseData, setCaseData] = useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudentIEPData = async () => {
      setIsLoading(true);
      try {
        const [evalRes, caseRes] = await Promise.all([
          supabase
            .from('iep_evaluation_tracker')
            .select('id, eval_type, status, eval_due_date, consent_received, report_finalized, iep_scheduled, observation_1_completed, observation_2_completed, observation_3_completed, created_at')
            .eq('student_id', student.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('iep_case_data')
            .select('id, data_type, data, status, updated_at')
            .eq('student_id', student.id)
            .order('updated_at', { ascending: false }),
        ]);
        if (evalRes.error) throw evalRes.error;
        if (caseRes.error) throw caseRes.error;
        setEvals((evalRes.data as any[]) || []);
        setCaseData((caseRes.data as any[]) || []);
      } catch {
        toast.error('Failed to load student IEP data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentIEPData();
  }, [student.id]);

  const activeEvals = evals.filter(e => e.status === 'active');
  const completedEvals = evals.filter(e => e.status !== 'active');
  const goals = caseData.filter(c => c.data_type === 'case_plan');
  const serviceMinutes = caseData.filter(c => c.data_type === 'service_minutes');
  const comms = caseData.filter(c => ['communication', 'meeting_notes'].includes(c.data_type));

  const totalMandated = serviceMinutes.reduce((sum, e) => sum + (e.data?.minutes_mandated || 0), 0);
  const totalDelivered = serviceMinutes.reduce((sum, e) => sum + (e.data?.minutes_delivered || 0), 0);
  const minutesPct = totalMandated > 0 ? Math.round((totalDelivered / totalMandated) * 100) : 0;

  const getEvalProgress = (ev: EvalSummary) => {
    let done = 0;
    let total = 5;
    if (ev.consent_received) done++;
    if (ev.observation_1_completed) done++;
    if (ev.observation_2_completed) done++;
    if (ev.report_finalized) done++;
    if (ev.iep_scheduled) done++;
    return { done, total, pct: Math.round((done / total) * 100) };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: student.color || 'hsl(var(--primary))' }}>
            <span className="text-sm font-bold text-white">{student.name.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{student.name}</h2>
            <p className="text-xs text-muted-foreground">IEP At-a-Glance</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Active Evals</span>
                </div>
                <p className="text-xl font-bold">{activeEvals.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">IEP Goals</span>
                </div>
                <p className="text-xl font-bold">{goals.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs text-muted-foreground">Minutes</span>
                </div>
                <p className="text-xl font-bold">{minutesPct}%</p>
                <p className="text-[10px] text-muted-foreground">{totalDelivered}/{totalMandated} min</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs text-muted-foreground">Comms</span>
                </div>
                <p className="text-xl font-bold">{comms.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Evaluations */}
          {activeEvals.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" /> Active Evaluations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeEvals.map(ev => {
                  const progress = getEvalProgress(ev);
                  return (
                    <div key={ev.id} className="p-3 rounded-lg border border-border/50 bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">{ev.eval_type}</p>
                          {ev.eval_due_date && (
                            <p className="text-xs text-muted-foreground">Due: {new Date(ev.eval_due_date).toLocaleDateString()}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={progress.pct >= 100 ? 'text-emerald-600' : progress.pct >= 50 ? 'text-amber-600' : ''}>
                          {progress.done}/{progress.total}
                        </Badge>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${progress.pct >= 100 ? 'bg-emerald-500' : progress.pct >= 50 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${progress.pct}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant={ev.consent_received ? 'default' : 'outline'} className="text-[10px] h-5">Consent</Badge>
                        <Badge variant={ev.observation_1_completed ? 'default' : 'outline'} className="text-[10px] h-5">Obs 1</Badge>
                        <Badge variant={ev.observation_2_completed ? 'default' : 'outline'} className="text-[10px] h-5">Obs 2</Badge>
                        <Badge variant={ev.report_finalized ? 'default' : 'outline'} className="text-[10px] h-5">Report</Badge>
                        <Badge variant={ev.iep_scheduled ? 'default' : 'outline'} className="text-[10px] h-5">IEP Mtg</Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Goals */}
          {goals.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" /> IEP Goals & Plans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {goals.map(g => (
                      <div key={g.id} className="flex items-center justify-between p-2 rounded border border-border/50 text-sm">
                        <div className="min-w-0">
                          <p className="truncate text-sm">{g.data?.notes || 'Case plan'}</p>
                          {g.data?.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(g.data.due_date).toLocaleDateString()}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0 ml-2">
                          {g.data?.priority || g.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Recent Communications */}
          {comms.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Recent Communications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-36">
                  <div className="space-y-2">
                    {comms.slice(0, 5).map(c => (
                      <div key={c.id} className="flex items-center gap-2 p-2 rounded border border-border/50 text-sm">
                        <Badge variant="outline" className="text-xs shrink-0">{c.data_type.replace('_', ' ')}</Badge>
                        <span className="text-xs text-muted-foreground truncate">{c.data?.notes || c.data?.summary || 'No details'}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-auto">{new Date(c.updated_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {activeEvals.length === 0 && goals.length === 0 && comms.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No IEP data for this student yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create an evaluation or case plan to get started</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
