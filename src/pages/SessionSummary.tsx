import { useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface AggRow {
  student_id: string;
  behavior_id: string;
  total_freq: number;
  total_duration: number;
  row_count: number;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export default function SessionSummary() {
  const today = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [from, setFrom] = useState(isoDate(weekAgo));
  const [to, setTo] = useState(isoDate(today));
  const [studentFilter, setStudentFilter] = useState('');
  const [behaviorFilter, setBehaviorFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AggRow[]>([]);
  const [studentNames, setStudentNames] = useState<Map<string, string>>(new Map());
  const [behaviorNames, setBehaviorNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fromIso = new Date(from + 'T00:00:00').toISOString();
      const toIso = new Date(to + 'T23:59:59').toISOString();
      const { data, error } = await supabase
        .from('behavior_session_data')
        .select('student_id, behavior_id, frequency, duration_seconds')
        .gte('created_at', fromIso)
        .lte('created_at', toIso);
      if (error) throw error;
      const map = new Map<string, AggRow>();
      (data ?? []).forEach((r: any) => {
        if (!r.student_id || !r.behavior_id) return;
        const k = `${r.student_id}|${r.behavior_id}`;
        const cur =
          map.get(k) ?? {
            student_id: r.student_id,
            behavior_id: r.behavior_id,
            total_freq: 0,
            total_duration: 0,
            row_count: 0,
          };
        cur.total_freq += r.frequency ?? 0;
        cur.total_duration += r.duration_seconds ?? 0;
        cur.row_count += 1;
        map.set(k, cur);
      });
      const agg = Array.from(map.values());
      setRows(agg);

      const sids = Array.from(new Set(agg.map((r) => r.student_id)));
      const bids = Array.from(new Set(agg.map((r) => r.behavior_id)));
      if (sids.length) {
        const { data: students } = await supabase
          .from('students')
          .select('id, name, first_name, last_name')
          .in('id', sids);
        const sMap = new Map<string, string>();
        (students ?? []).forEach((s: any) => {
          sMap.set(
            s.id,
            s.name ||
              [s.first_name, s.last_name].filter(Boolean).join(' ') ||
              s.id.slice(0, 8),
          );
        });
        setStudentNames(sMap);
      }
      if (bids.length) {
        const [{ data: nt }, { data: legacy }] = await Promise.all([
          supabase.from('nt_behaviors').select('id, name').in('id', bids),
          supabase.from('behaviors').select('id, name').in('id', bids),
        ]);
        const bMap = new Map<string, string>();
        (legacy ?? []).forEach((b: any) => bMap.set(b.id, b.name));
        (nt ?? []).forEach((b: any) => bMap.set(b.id, b.name));
        setBehaviorNames(bMap);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const sf = studentFilter.toLowerCase().trim();
    const bf = behaviorFilter.toLowerCase().trim();
    return rows.filter((r) => {
      const s = (studentNames.get(r.student_id) ?? '').toLowerCase();
      const b = (behaviorNames.get(r.behavior_id) ?? '').toLowerCase();
      return (!sf || s.includes(sf)) && (!bf || b.includes(bf));
    });
  }, [rows, studentFilter, behaviorFilter, studentNames, behaviorNames]);

  const totals = useMemo(
    () =>
      visible.reduce(
        (a, r) => ({
          freq: a.freq + r.total_freq,
          dur: a.dur + r.total_duration,
          rows: a.rows + r.row_count,
        }),
        { freq: 0, dur: 0, rows: 0 },
      ),
    [visible],
  );

  const exportCsv = () => {
    const header = ['Student', 'Behavior', 'Total Frequency', 'Total Duration (s)', 'Rows'];
    const lines = [header.join(',')];
    visible.forEach((r) => {
      const s = (studentNames.get(r.student_id) ?? r.student_id).replace(/"/g, '""');
      const b = (behaviorNames.get(r.behavior_id) ?? r.behavior_id).replace(/"/g, '""');
      lines.push(
        `"${s}","${b}",${r.total_freq},${r.total_duration},${r.row_count}`,
      );
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-summary-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Session Summary</h1>
          <p className="text-sm text-muted-foreground">
            Total frequency and duration per student × behavior for the selected
            interval.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sf">Student name contains</Label>
              <Input
                id="sf"
                placeholder="e.g. Kathan"
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bf">Behavior name contains</Label>
              <Input
                id="bf"
                placeholder="e.g. Noncompliance"
                value={behaviorFilter}
                onChange={(e) => setBehaviorFilter(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={load} disabled={loading} className="flex-1">
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                />
                Run
              </Button>
              <Button
                onClick={exportCsv}
                variant="outline"
                disabled={!visible.length}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="py-2 px-4">Student</th>
                  <th className="py-2 px-4">Behavior</th>
                  <th className="py-2 px-4 text-right">Total Frequency</th>
                  <th className="py-2 px-4 text-right">Total Duration (s)</th>
                  <th className="py-2 px-4 text-right">Rows</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-6 px-4 text-center text-muted-foreground" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td className="py-6 px-4 text-center text-muted-foreground" colSpan={5}>
                      No data for selected filters.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => (
                    <tr key={`${r.student_id}|${r.behavior_id}`} className="border-t border-border">
                      <td className="py-2 px-4 text-foreground">
                        {studentNames.get(r.student_id) ?? r.student_id.slice(0, 8) + '…'}
                      </td>
                      <td className="py-2 px-4">
                        {behaviorNames.get(r.behavior_id) ?? r.behavior_id.slice(0, 8) + '…'}
                      </td>
                      <td className="py-2 px-4 text-right">{r.total_freq}</td>
                      <td className="py-2 px-4 text-right">{r.total_duration}</td>
                      <td className="py-2 px-4 text-right">{r.row_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {visible.length > 0 && (
                <tfoot className="bg-muted/50 font-semibold">
                  <tr>
                    <td className="py-2 px-4" colSpan={2}>
                      Totals ({visible.length} pairs)
                    </td>
                    <td className="py-2 px-4 text-right">{totals.freq}</td>
                    <td className="py-2 px-4 text-right">{totals.dur}</td>
                    <td className="py-2 px-4 text-right">{totals.rows}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
