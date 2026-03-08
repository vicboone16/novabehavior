import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import type { PTGoalAssignment, PTSessionLog, PTAssignmentDashboard } from '@/hooks/useParentTrainingAdmin';

interface Props {
  goalAssignments: PTGoalAssignment[];
  sessionLogs: PTSessionLog[];
  assignments: PTAssignmentDashboard[];
  isLoading: boolean;
  onBuildSummary: (clientId: string, startDate?: string, endDate?: string) => Promise<any>;
}

export function PTReportsTab({ goalAssignments, sessionLogs, assignments, isLoading, onBuildSummary }: Props) {
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const result = await onBuildSummary(clientId, startDate || undefined, endDate || undefined);
      setSummary(result);
    } catch {} finally { setLoading(false); }
  };

  const copyToClipboard = () => {
    if (!summary) return;
    const text = formatSummaryText(summary);
    navigator.clipboard.writeText(text);
  };

  const formatSummaryText = (s: any) => {
    let text = `PARENT TRAINING SUMMARY\nPeriod: ${s.period_start} — ${s.period_end}\nTotal Sessions: ${s.total_sessions}\nTotal Minutes: ${s.total_minutes}\n\n`;
    if (s.goals?.length) {
      text += 'GOALS:\n';
      s.goals.forEach((g: any) => { text += `• ${g.title} — Baseline: ${g.baseline ?? '—'}, Current: ${g.current ?? '—'}, Target: ${g.target ?? '—'} (${g.status})\n`; });
      text += '\n';
    }
    if (s.sessions?.length) {
      text += 'SESSION LOGS:\n';
      s.sessions.forEach((sl: any) => { text += `• ${sl.date} — ${sl.service_code} — ${sl.duration_minutes}min — ${sl.summary || 'No summary'}\n`; });
    }
    return text;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Reports & Insurance Summaries</h2>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Generate Insurance-Ready Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div><Label>Client ID</Label><Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="UUID" /></div>
            <div><Label>Start Date</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div><Label>End Date</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          </div>
          <Button onClick={handleGenerate} disabled={!clientId || loading}>{loading ? 'Generating…' : 'Generate Summary'}</Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm">Summary Preview</CardTitle>
              <Button size="sm" variant="outline" onClick={copyToClipboard} className="gap-1"><Download className="w-3 h-3" /> Copy</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center"><p className="text-2xl font-bold text-foreground">{summary.total_sessions}</p><p className="text-xs text-muted-foreground">Sessions</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-foreground">{summary.total_minutes}</p><p className="text-xs text-muted-foreground">Total Minutes</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-foreground">{summary.goals?.length || 0}</p><p className="text-xs text-muted-foreground">Active Goals</p></div>
            </div>

            {summary.goals?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Goals</h4>
                <div className="space-y-2">
                  {summary.goals.map((g: any, i: number) => (
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

            {summary.sessions?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Session Logs</h4>
                <div className="space-y-1">
                  {summary.sessions.map((sl: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{sl.date}</span>
                      <Badge variant="outline" className="text-xs">{sl.service_code}</Badge>
                      <span className="text-xs">{sl.duration_minutes}m</span>
                      <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{sl.summary || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
