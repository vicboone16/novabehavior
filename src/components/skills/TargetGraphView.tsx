import { useState, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { BarChart3, Download, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTargetGraph, type DateRange } from '@/hooks/useTargetGraph';
import type { SkillTarget, SkillProgram } from '@/types/skillPrograms';
import { PHASE_LABELS, PHASE_COLORS, type TargetPhase } from '@/types/criteriaEngine';
import { format } from 'date-fns';

interface TargetGraphViewProps {
  target: SkillTarget;
  program: SkillProgram;
  onClose: () => void;
}

export function TargetGraphView({ target, program, onClose }: TargetGraphViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const { sessions, phaseChanges, loading } = useTargetGraph(target.id, dateRange);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExportCSV = () => {
    if (sessions.length === 0) return;
    const header = 'Date,% Correct,% Independent,Total Trials,Correct,Independent,Notes';
    const rows = sessions.map(s =>
      `${format(new Date(s.date), 'yyyy-MM-dd')},${s.percentCorrect},${s.percentIndependent},${s.totalTrials},${s.correct},${s.independent},"${(s.notes || '').replace(/"/g, '""')}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target.name.replace(/[^a-z0-9]/gi, '_')}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="ml-8 mr-3 mb-2 border-primary/20">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">{target.name} — Progress</CardTitle>
            {(target as any).phase && (
              <Badge className={`${PHASE_COLORS[(target as any).phase as TargetPhase] || 'bg-slate-500'} text-white text-[10px]`}>
                {PHASE_LABELS[(target as any).phase as TargetPhase] || (target as any).phase}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={v => setDateRange(v as DateRange)}>
              <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {loading && <p className="text-xs text-muted-foreground py-4 text-center">Loading chart data…</p>}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No session data yet. Record data to see progress.</p>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <>
            <div ref={chartRef} className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sessions} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="dateLabel" className="text-[10px]" />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} className="text-[10px]" />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs">
                        <p className="font-medium">{label}</p>
                        <p className="text-emerald-600">Correct: {data?.percentCorrect}% ({data?.correct}/{data?.totalTrials})</p>
                        <p className="text-blue-600">Independent: {data?.percentIndependent}%</p>
                        {data?.notes && <p className="text-muted-foreground mt-1">{data.notes}</p>}
                      </div>
                    );
                  }} />
                  <Legend />
                  {phaseChanges.map((pc, i) => (
                    <ReferenceLine key={i} x={pc.label} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={pc.label} />
                  ))}
                  <Line type="monotone" dataKey="percentCorrect" name="% Correct" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="percentIndependent" name="% Independent" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex gap-4 text-xs text-muted-foreground">
              <p>Sessions: <span className="font-medium text-foreground">{sessions.length}</span></p>
              <p>Last % Correct: <span className="font-medium text-foreground">{sessions[sessions.length - 1]?.percentCorrect}%</span></p>
              <p>Avg % Correct: <span className="font-medium text-foreground">{Math.round(sessions.reduce((s, d) => s + d.percentCorrect, 0) / sessions.length)}%</span></p>
            </div>

            <Separator />

            <div className="max-h-[200px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Trials</TableHead>
                    <TableHead className="text-xs">% Correct</TableHead>
                    <TableHead className="text-xs">% Indep.</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...sessions].reverse().map((s, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell>{format(new Date(s.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{s.totalTrials}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${s.percentCorrect >= 80 ? 'text-emerald-600' : s.percentCorrect >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {s.percentCorrect}%
                        </span>
                      </TableCell>
                      <TableCell>{s.percentIndependent}%</TableCell>
                      <TableCell className="max-w-[150px] truncate">{s.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExportCSV}>
                <Download className="w-3 h-3 mr-1" /> Export CSV
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
