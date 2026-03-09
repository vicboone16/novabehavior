import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Printer, Copy, Save, BarChart3, Target, BookOpen, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type ReportType = 'goal_sheet' | 'progress_report' | 'homework_summary' | 'insurance_summary' | 'module_completion';

const REPORT_TYPES: { value: ReportType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'goal_sheet', label: 'Caregiver Goal Sheet', icon: <Target className="w-4 h-4" />, description: 'Printable summary of currently assigned caregiver goals' },
  { value: 'progress_report', label: 'Progress Report', icon: <BarChart3 className="w-4 h-4" />, description: 'Training engagement and progress over time' },
  { value: 'homework_summary', label: 'Homework Summary', icon: <ClipboardList className="w-4 h-4" />, description: 'Parent homework completion summary' },
  { value: 'insurance_summary', label: '97156 Training Summary', icon: <FileText className="w-4 h-4" />, description: 'Insurance-ready caregiver training documentation' },
  { value: 'module_completion', label: 'Module Completion', icon: <BookOpen className="w-4 h-4" />, description: 'Module assignment and completion snapshot' },
];

interface Props {
  onBuildGoalSheet: (clientId: string, caregiverId: string) => Promise<any>;
  onBuildProgressReport: (clientId: string, caregiverId: string) => Promise<any>;
  onBuildHomeworkSummary: (clientId: string, caregiverId: string) => Promise<any>;
  onBuildInsuranceSummary: (clientId: string, startDate?: string, endDate?: string) => Promise<any>;
  onFetchModuleCompletion: (clientId?: string, caregiverId?: string) => Promise<any[]>;
  onSaveSnapshot: (clientId: string, caregiverId: string, reportType: string, title: string, payload: any) => Promise<any>;
  isLoading: boolean;
}

export function PTReportsTab({
  onBuildGoalSheet, onBuildProgressReport, onBuildHomeworkSummary,
  onBuildInsuranceSummary, onFetchModuleCompletion, onSaveSnapshot, isLoading,
}: Props) {
  const [clientId, setClientId] = useState('');
  const [caregiverId, setCaregiverId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<ReportType>('goal_sheet');
  const [report, setReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!clientId) { toast.error('Client ID is required'); return; }
    setGenerating(true);
    setReport(null);
    try {
      let result: any;
      switch (reportType) {
        case 'goal_sheet':
          if (!caregiverId) { toast.error('Caregiver ID is required'); setGenerating(false); return; }
          result = await onBuildGoalSheet(clientId, caregiverId);
          break;
        case 'progress_report':
          if (!caregiverId) { toast.error('Caregiver ID is required'); setGenerating(false); return; }
          result = await onBuildProgressReport(clientId, caregiverId);
          break;
        case 'homework_summary':
          if (!caregiverId) { toast.error('Caregiver ID is required'); setGenerating(false); return; }
          result = await onBuildHomeworkSummary(clientId, caregiverId);
          break;
        case 'insurance_summary':
          result = await onBuildInsuranceSummary(clientId, startDate || undefined, endDate || undefined);
          break;
        case 'module_completion':
          const modules = await onFetchModuleCompletion(clientId, caregiverId || undefined);
          result = { client_id: clientId, caregiver_id: caregiverId, modules };
          break;
      }
      setReport(result);
    } catch (e: any) {
      toast.error('Report generation failed: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!report) return;
    const text = formatReportText(reportType, report);
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSnapshot = async () => {
    if (!report || !clientId) return;
    const title = `${REPORT_TYPES.find(r => r.value === reportType)?.label} — ${format(new Date(), 'PPP')}`;
    await onSaveSnapshot(clientId, caregiverId, reportType, title, report);
  };

  const needsCaregiver = reportType !== 'insurance_summary';
  const needsDates = reportType === 'insurance_summary';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Reports & Exports</h2>
        <p className="text-sm text-muted-foreground">Generate, preview, and export parent training reports</p>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {REPORT_TYPES.map(rt => (
          <Card
            key={rt.value}
            className={`cursor-pointer transition-all hover:shadow-md ${reportType === rt.value ? 'ring-2 ring-primary border-primary' : ''}`}
            onClick={() => { setReportType(rt.value); setReport(null); }}
          >
            <CardContent className="p-4 text-center">
              <div className={`mx-auto mb-2 w-8 h-8 rounded-full flex items-center justify-center ${reportType === rt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {rt.icon}
              </div>
              <p className="text-xs font-medium">{rt.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Client ID *</Label>
              <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="UUID" className="text-sm" />
            </div>
            {needsCaregiver && (
              <div>
                <Label className="text-xs">Caregiver ID *</Label>
                <Input value={caregiverId} onChange={e => setCaregiverId(e.target.value)} placeholder="UUID" className="text-sm" />
              </div>
            )}
            {needsDates && (
              <>
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
                </div>
              </>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleGenerate} disabled={!clientId || generating}>
              {generating ? 'Generating…' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      {report && (
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="print:pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{REPORT_TYPES.find(r => r.value === reportType)?.label} Preview</CardTitle>
              <div className="flex gap-2 print:hidden">
                <Button size="sm" variant="outline" onClick={copyToClipboard}><Copy className="w-3 h-3 mr-1" /> Copy</Button>
                <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-3 h-3 mr-1" /> Print</Button>
                <Button size="sm" variant="outline" onClick={handleSaveSnapshot}><Save className="w-3 h-3 mr-1" /> Save</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {reportType === 'goal_sheet' && <GoalSheetPreview data={report} />}
            {reportType === 'progress_report' && <ProgressReportPreview data={report} />}
            {reportType === 'homework_summary' && <HomeworkSummaryPreview data={report} />}
            {reportType === 'insurance_summary' && <InsuranceSummaryPreview data={report} />}
            {reportType === 'module_completion' && <ModuleCompletionPreview data={report} />}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!report && !generating && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Select a report type and enter filters to generate a preview</p>
        </div>
      )}
    </div>
  );
}

/* ── Sub-Previews ── */

function MasteryBadge({ status }: { status: string | null }) {
  if (!status || status === 'not_started') return <Badge variant="outline" className="text-xs">Not Started</Badge>;
  if (status === 'in_progress') return <Badge variant="secondary" className="text-xs">In Progress</Badge>;
  if (status === 'mastered') return <Badge variant="default" className="text-xs">Mastered</Badge>;
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
}

function GoalSheetPreview({ data }: { data: any }) {
  const goals = data?.goals || [];
  if (!goals.length) return <p className="text-sm text-muted-foreground">No caregiver goals assigned yet.</p>;
  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-3">
        <h3 className="text-base font-bold text-foreground">CAREGIVER GOAL SHEET</h3>
        <p className="text-xs text-muted-foreground">Generated {format(new Date(), 'PPP')}</p>
      </div>
      <div className="space-y-3">
        {goals.map((g: any, i: number) => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{g.goal_title || 'Untitled Goal'}</p>
                <p className="text-xs text-muted-foreground">{g.goal_description}</p>
              </div>
              <div className="flex items-center gap-2">
                <GoalSourceBadge source={g.goal_source} />
                <MasteryBadge status={g.mastery_status} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-muted-foreground">Baseline:</span> {g.baseline_value ?? '—'}</div>
              <div><span className="text-muted-foreground">Target:</span> {g.target_value ?? '—'}</div>
              <div><span className="text-muted-foreground">Current:</span> {g.current_value ?? '—'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Method:</span> {g.measurement_method || '—'}</div>
              <div><span className="text-muted-foreground">Mastery:</span> {g.mastery_criteria || '—'}</div>
            </div>
            {g.percent_to_goal != null && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, g.percent_to_goal)}%` }} />
                </div>
                <span className="text-xs font-medium text-foreground">{Math.round(g.percent_to_goal)}%</span>
              </div>
            )}
            {g.notes && <p className="text-xs text-muted-foreground italic">Note: {g.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressReportPreview({ data }: { data: any }) {
  const s = data?.summary || {};
  const modules = data?.modules || [];
  const goals = data?.goals || [];
  const hw = data?.homework || [];
  const sessions = data?.session_logs || [];

  return (
    <div className="space-y-5">
      <div className="text-center border-b pb-3">
        <h3 className="text-base font-bold text-foreground">PARENT TRAINING PROGRESS REPORT</h3>
        <p className="text-xs text-muted-foreground">Generated {format(new Date(), 'PPP')}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Assigned Modules" value={s.assigned_module_count ?? 0} />
        <StatCard label="Completed" value={s.completed_module_count ?? 0} />
        <StatCard label="Total Goals" value={s.total_goal_count ?? 0} />
        <StatCard label="Mastered" value={s.mastered_goal_count ?? 0} />
      </div>

      {/* Modules */}
      {modules.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Assigned Modules</h4>
          <div className="space-y-1">
            {modules.map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                <span className="font-medium">{m.module_title || m.module_key}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === 'completed' ? 'default' : 'outline'} className="text-xs">{m.status}</Badge>
                  <span className="text-xs text-muted-foreground">{m.assigned_goal_count} goals</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Goal Progress</h4>
          <div className="space-y-1">
            {goals.map((g: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                <span className="font-medium">{g.goal_title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">B:{g.baseline_value ?? '—'} → C:{g.current_value ?? '—'} → T:{g.target_value ?? '—'}</span>
                  <MasteryBadge status={g.mastery_status} />
                  <span className="text-xs text-muted-foreground">{g.data_points} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions */}
      {sessions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Recent Sessions ({sessions.length})</h4>
          <div className="space-y-1">
            {sessions.slice(0, 10).map((sl: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                <span className="text-muted-foreground">{sl.session_date}</span>
                <Badge variant="outline" className="text-xs">{sl.service_code}</Badge>
                <span className="text-xs">{sl.duration_minutes}m</span>
                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{sl.session_summary || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!modules.length && !goals.length && !sessions.length && (
        <p className="text-sm text-muted-foreground text-center py-4">No parent training data found for this client/caregiver pair.</p>
      )}
    </div>
  );
}

function HomeworkSummaryPreview({ data }: { data: any }) {
  const hw = data?.homework || [];
  if (!hw.length) return <p className="text-sm text-muted-foreground text-center py-4">No homework submissions yet.</p>;
  return (
    <div className="space-y-3">
      <div className="text-center border-b pb-3">
        <h3 className="text-base font-bold text-foreground">HOMEWORK COMPLETION SUMMARY</h3>
        <p className="text-xs text-muted-foreground">Generated {format(new Date(), 'PPP')}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2">Module</th>
            <th className="py-2">Title</th>
            <th className="py-2">Type</th>
            <th className="py-2">Submitted</th>
            <th className="py-2">File</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {hw.map((h: any, i: number) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 text-xs">{h.module_title || '—'}</td>
              <td className="py-2 text-xs font-medium">{h.homework_title || '—'}</td>
              <td className="py-2"><Badge variant="outline" className="text-xs">{h.submission_type || '—'}</Badge></td>
              <td className="py-2 text-xs text-muted-foreground">{h.submitted_at ? format(new Date(h.submitted_at), 'PP') : '—'}</td>
              <td className="py-2 text-xs">{h.file_url ? '✓' : '—'}</td>
              <td className="py-2"><Badge variant={h.review_status === 'reviewed' ? 'default' : 'outline'} className="text-xs">{h.review_status || 'pending'}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsuranceSummaryPreview({ data }: { data: any }) {
  if (!data) return <p className="text-sm text-muted-foreground text-center py-4">No insurance summary data available.</p>;
  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-3">
        <h3 className="text-base font-bold text-foreground">97156 CAREGIVER TRAINING SUMMARY</h3>
        <p className="text-xs text-muted-foreground">
          Period: {data.period_start || '—'} — {data.period_end || '—'} | Generated {format(new Date(), 'PPP')}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Sessions" value={data.total_sessions ?? 0} />
        <StatCard label="Total Minutes" value={data.total_minutes ?? 0} />
        <StatCard label="Active Goals" value={data.goals?.length ?? 0} />
      </div>

      {data.goals?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Goals Addressed</h4>
          <div className="space-y-2">
            {data.goals.map((g: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                <span className="text-sm font-medium">{g.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">B:{g.baseline ?? '—'} → C:{g.current ?? '—'} → T:{g.target ?? '—'}</span>
                  <Badge variant={g.status === 'active' ? 'default' : 'secondary'} className="text-xs">{g.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.sessions?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Session Documentation</h4>
          <div className="space-y-2">
            {data.sessions.map((sl: any, i: number) => (
              <div key={i} className="border rounded-md p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{sl.date}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{sl.service_code}</Badge>
                    <span className="text-xs">{sl.duration_minutes}min</span>
                  </div>
                </div>
                {sl.summary && <p className="text-xs text-muted-foreground">{sl.summary}</p>}
                {sl.caregiver_response && <p className="text-xs"><span className="font-medium">Caregiver Response:</span> {sl.caregiver_response}</p>}
                {sl.homework_assigned && <p className="text-xs"><span className="font-medium">Homework:</span> {sl.homework_assigned}</p>}
                {sl.next_steps && <p className="text-xs"><span className="font-medium">Next Steps:</span> {sl.next_steps}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!data.goals?.length && !data.sessions?.length && (
        <p className="text-sm text-muted-foreground text-center py-4">No caregiver training sessions logged yet.</p>
      )}
    </div>
  );
}

function ModuleCompletionPreview({ data }: { data: any }) {
  const modules = data?.modules || [];
  if (!modules.length) return <p className="text-sm text-muted-foreground text-center py-4">No parent training assignments yet.</p>;
  return (
    <div className="space-y-3">
      <div className="text-center border-b pb-3">
        <h3 className="text-base font-bold text-foreground">MODULE COMPLETION SUMMARY</h3>
        <p className="text-xs text-muted-foreground">Generated {format(new Date(), 'PPP')}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2">Module</th>
            <th className="py-2">Status</th>
            <th className="py-2">Assigned</th>
            <th className="py-2">Due</th>
            <th className="py-2">Goals</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m: any, i: number) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 text-xs font-medium">{m.module_title || m.module_key || '—'}</td>
              <td className="py-2"><Badge variant={m.status === 'completed' ? 'default' : 'outline'} className="text-xs">{m.status}</Badge></td>
              <td className="py-2 text-xs text-muted-foreground">{m.assigned_at ? format(new Date(m.assigned_at), 'PP') : '—'}</td>
              <td className="py-2 text-xs text-muted-foreground">{m.due_date ? format(new Date(m.due_date), 'PP') : '—'}</td>
              <td className="py-2 text-xs">{m.assigned_goal_count ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GoalSourceBadge({ source }: { source: string | null }) {
  if (!source || source === 'library') return <Badge variant="outline" className="text-xs">Library</Badge>;
  if (source === 'modified_library') return <Badge variant="secondary" className="text-xs">Modified</Badge>;
  if (source === 'custom') return <Badge variant="default" className="text-xs">Custom</Badge>;
  return <Badge variant="secondary" className="text-xs">{source}</Badge>;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center bg-muted/30 rounded-lg p-3">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── Text Formatter ── */

function formatReportText(type: ReportType, data: any): string {
  const header = `${REPORT_TYPES.find(r => r.value === type)?.label?.toUpperCase()}\nGenerated: ${format(new Date(), 'PPP')}\n\n`;

  switch (type) {
    case 'goal_sheet': {
      const goals = data?.goals || [];
      if (!goals.length) return header + 'No goals assigned.';
      return header + goals.map((g: any) =>
        `• ${g.goal_title || 'Untitled'}\n  ${g.goal_description || ''}\n  Method: ${g.measurement_method || '—'}\n  Baseline: ${g.baseline_value ?? '—'} | Target: ${g.target_value ?? '—'} | Current: ${g.current_value ?? '—'}\n  Mastery: ${g.mastery_criteria || '—'}\n  Status: ${g.mastery_status || 'not_started'}\n`
      ).join('\n');
    }
    case 'progress_report': {
      const s = data?.summary || {};
      let text = header;
      text += `Modules: ${s.assigned_module_count ?? 0} assigned, ${s.completed_module_count ?? 0} completed\n`;
      text += `Goals: ${s.total_goal_count ?? 0} total, ${s.mastered_goal_count ?? 0} mastered, ${s.in_progress_goal_count ?? 0} in progress\n`;
      text += `Homework: ${s.homework_submission_count ?? 0} submissions\n`;
      text += `Sessions: ${s.session_log_count ?? 0} logged\n\n`;
      const goals = data?.goals || [];
      if (goals.length) {
        text += 'GOALS:\n';
        goals.forEach((g: any) => { text += `• ${g.goal_title} — B:${g.baseline_value ?? '—'} C:${g.current_value ?? '—'} T:${g.target_value ?? '—'} (${g.mastery_status})\n`; });
      }
      return text;
    }
    case 'homework_summary': {
      const hw = data?.homework || [];
      if (!hw.length) return header + 'No homework submissions.';
      return header + hw.map((h: any) =>
        `• ${h.module_title || '—'} — ${h.homework_title || '—'} — ${h.submission_type || '—'} — ${h.submitted_at ? format(new Date(h.submitted_at), 'PP') : '—'} — ${h.review_status || 'pending'}`
      ).join('\n');
    }
    case 'insurance_summary': {
      let text = header;
      text += `Period: ${data.period_start || '—'} — ${data.period_end || '—'}\n`;
      text += `Total Sessions: ${data.total_sessions ?? 0}\nTotal Minutes: ${data.total_minutes ?? 0}\n\n`;
      if (data.goals?.length) {
        text += 'GOALS:\n';
        data.goals.forEach((g: any) => { text += `• ${g.title} — B:${g.baseline ?? '—'} C:${g.current ?? '—'} T:${g.target ?? '—'} (${g.status})\n`; });
        text += '\n';
      }
      if (data.sessions?.length) {
        text += 'SESSIONS:\n';
        data.sessions.forEach((sl: any) => { text += `• ${sl.date} — ${sl.service_code} — ${sl.duration_minutes}min — ${sl.summary || '—'}\n`; });
      }
      return text;
    }
    case 'module_completion': {
      const mods = data?.modules || [];
      if (!mods.length) return header + 'No modules assigned.';
      return header + mods.map((m: any) =>
        `• ${m.module_title || m.module_key || '—'} — ${m.status} — Goals: ${m.assigned_goal_count ?? 0}`
      ).join('\n');
    }
    default:
      return header + JSON.stringify(data, null, 2);
  }
}
