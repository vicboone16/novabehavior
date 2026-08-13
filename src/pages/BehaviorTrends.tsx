import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, RefreshCw, Download } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

const ALL = '__all__';
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

interface BsdRow {
  student_id: string;
  behavior_id: string;
  frequency: number | null;
  duration_seconds: number | null;
  observation_minutes: number | null;
  created_at: string;
}

interface AbcRow {
  client_id: string | null;
  behavior: string | null;
  antecedent: string | null;
  consequence: string | null;
  logged_at: string | null;
  created_at: string;
}

export default function BehaviorTrends() {
  const today = new Date();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [from, setFrom] = useState(isoDate(monthAgo));
  const [to, setTo] = useState(isoDate(today));
  const [studentId, setStudentId] = useState<string>(ALL);
  const [behaviorId, setBehaviorId] = useState<string>(ALL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bsd, setBsd] = useState<BsdRow[]>([]);
  const [abc, setAbc] = useState<AbcRow[]>([]);
  const [studentNames, setStudentNames] = useState<Map<string, string>>(new Map());
  const [behaviorNames, setBehaviorNames] = useState<Map<string, string>>(new Map());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fromIso = new Date(from + 'T00:00:00').toISOString();
      const toIso = new Date(to + 'T23:59:59').toISOString();

      const [{ data: bsdData, error: bsdErr }, { data: abcData }] = await Promise.all([
        supabase
          .from('behavior_session_data')
          .select(
            'student_id, behavior_id, frequency, duration_seconds, observation_minutes, created_at',
          )
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .order('created_at', { ascending: true })
          .limit(5000),
        supabase
          .from('abc_logs')
          .select('client_id, behavior, antecedent, consequence, logged_at, created_at')
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .limit(5000),
      ]);
      if (bsdErr) throw bsdErr;

      const rows = (bsdData ?? []) as BsdRow[];
      setBsd(rows);
      setAbc((abcData ?? []) as AbcRow[]);

      const sids = Array.from(
        new Set([
          ...rows.map((r) => r.student_id),
          ...((abcData ?? []) as AbcRow[]).map((r) => r.client_id ?? ''),
        ]),
      ).filter(Boolean) as string[];
      const bids = Array.from(new Set(rows.map((r) => r.behavior_id))).filter(Boolean);

      if (sids.length) {
        const { data: students } = await supabase
          .from('students')
          .select('id, name, first_name, last_name')
          .in('id', sids);
        const sMap = new Map<string, string>();
        (students ?? []).forEach((s: any) =>
          sMap.set(
            s.id,
            s.name ||
              [s.first_name, s.last_name].filter(Boolean).join(' ') ||
              s.id.slice(0, 8),
          ),
        );
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
      setError(e?.message ?? 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const studentOptions = useMemo(
    () =>
      Array.from(new Set(bsd.map((r) => r.student_id)))
        .filter(Boolean)
        .map((id) => ({ id, label: studentNames.get(id) ?? id.slice(0, 8) + '…' }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [bsd, studentNames],
  );

  const behaviorOptions = useMemo(() => {
    const scoped = bsd.filter((r) => studentId === ALL || r.student_id === studentId);
    return Array.from(new Set(scoped.map((r) => r.behavior_id)))
      .filter(Boolean)
      .map((id) => ({ id, label: behaviorNames.get(id) ?? id.slice(0, 8) + '…' }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [bsd, behaviorNames, studentId]);

  const filtered = useMemo(
    () =>
      bsd.filter(
        (r) =>
          (studentId === ALL || r.student_id === studentId) &&
          (behaviorId === ALL || r.behavior_id === behaviorId),
      ),
    [bsd, studentId, behaviorId],
  );

  const daily = useMemo(() => {
    const map = new Map<
      string,
      { date: string; frequency: number; durationMin: number; rate: number; obsMin: number }
    >();
    filtered.forEach((r) => {
      const d = r.created_at.slice(0, 10);
      const cur =
        map.get(d) ?? { date: d, frequency: 0, durationMin: 0, rate: 0, obsMin: 0 };
      cur.frequency += r.frequency ?? 0;
      cur.durationMin += (r.duration_seconds ?? 0) / 60;
      cur.obsMin += Number(r.observation_minutes ?? 0);
      map.set(d, cur);
    });
    return Array.from(map.values())
      .map((d) => ({
        ...d,
        durationMin: Math.round(d.durationMin * 10) / 10,
        rate: d.obsMin > 0 ? Math.round((d.frequency / d.obsMin) * 600) / 10 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const perBehavior = useMemo(() => {
    const map = new Map<
      string,
      { key: string; student: string; behavior: string; frequency: number; durationMin: number; sessions: number }
    >();
    filtered.forEach((r) => {
      const k = `${r.student_id}|${r.behavior_id}`;
      const cur =
        map.get(k) ?? {
          key: k,
          student: studentNames.get(r.student_id) ?? r.student_id.slice(0, 8) + '…',
          behavior: behaviorNames.get(r.behavior_id) ?? r.behavior_id.slice(0, 8) + '…',
          frequency: 0,
          durationMin: 0,
          sessions: 0,
        };
      cur.frequency += r.frequency ?? 0;
      cur.durationMin += (r.duration_seconds ?? 0) / 60;
      cur.sessions += 1;
      map.set(k, cur);
    });
    return Array.from(map.values())
      .map((r) => ({ ...r, durationMin: Math.round(r.durationMin * 10) / 10 }))
      .sort((a, b) => b.frequency - a.frequency);
  }, [filtered, studentNames, behaviorNames]);

  const abcFiltered = useMemo(
    () => abc.filter((r) => studentId === ALL || r.client_id === studentId),
    [abc, studentId],
  );

  const topOf = (field: 'antecedent' | 'consequence') => {
    const map = new Map<string, number>();
    abcFiltered.forEach((r) => {
      const v = (r[field] ?? '').trim();
      if (!v) return;
      map.set(v, (map.get(v) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, count]) => ({ label: label.length > 32 ? label.slice(0, 32) + '…' : label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const antecedents = useMemo(() => topOf('antecedent'), [abcFiltered]);
  const consequences = useMemo(() => topOf('consequence'), [abcFiltered]);

  const abcDaily = useMemo(() => {
    const map = new Map<string, { date: string; incidents: number }>();
    abcFiltered.forEach((r) => {
      const d = (r.logged_at ?? r.created_at).slice(0, 10);
      const cur = map.get(d) ?? { date: d, incidents: 0 };
      cur.incidents += 1;
      map.set(d, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [abcFiltered]);

  const totals = useMemo(
    () => ({
      frequency: perBehavior.reduce((s, r) => s + r.frequency, 0),
      durationMin: Math.round(perBehavior.reduce((s, r) => s + r.durationMin, 0) * 10) / 10,
      sessions: perBehavior.reduce((s, r) => s + r.sessions, 0),
      abc: abcFiltered.length,
    }),
    [perBehavior, abcFiltered],
  );

  const exportCsv = () => {
    const header = 'Student,Behavior,Total Frequency,Total Duration (min),Sessions\n';
    const body = perBehavior
      .map(
        (r) =>
          `"${r.student.replace(/"/g, '""')}","${r.behavior.replace(/"/g, '""')}",${r.frequency},${r.durationMin},${r.sessions}`,
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `behavior-trends-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Behavior Trends Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Frequency, duration, and ABC patterns per student and behavior over time.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={!perBehavior.length}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Student</Label>
            <Select
              value={studentId}
              onValueChange={(v) => {
                setStudentId(v);
                setBehaviorId(ALL);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All students</SelectItem>
                {studentOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Behavior</Label>
            <Select value={behaviorId} onValueChange={setBehaviorId}>
              <SelectTrigger>
                <SelectValue placeholder="All behaviors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All behaviors</SelectItem>
                {behaviorOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total frequency', value: totals.frequency },
          { label: 'Total duration (min)', value: totals.durationMin },
          { label: 'Data rows', value: totals.sessions },
          { label: 'ABC incidents', value: totals.abc },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-bold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="trend">
        <TabsList>
          <TabsTrigger value="trend">Trend over time</TabsTrigger>
          <TabsTrigger value="breakdown">Per behavior</TabsTrigger>
          <TabsTrigger value="abc">ABC patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Frequency & duration by day</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {daily.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis yAxisId="l" fontSize={11} />
                    <YAxis yAxisId="r" orientation="right" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="l"
                      type="monotone"
                      dataKey="frequency"
                      name="Frequency"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="r"
                      type="monotone"
                      dataKey="durationMin"
                      name="Duration (min)"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No behavior data captured for this range.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rate per hour of observation</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {daily.some((d) => d.rate > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="rate" name="Per hour" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Observation minutes are required to compute rate.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Totals per student and behavior</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2">Student</th>
                    <th>Behavior</th>
                    <th className="text-right">Frequency</th>
                    <th className="text-right">Duration (min)</th>
                    <th className="text-right">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {perBehavior.map((r) => (
                    <tr key={r.key} className="border-t border-border">
                      <td className="py-2">{r.student}</td>
                      <td>{r.behavior}</td>
                      <td className="text-right">{r.frequency}</td>
                      <td className="text-right">{r.durationMin}</td>
                      <td className="text-right">{r.sessions}</td>
                    </tr>
                  ))}
                  {!perBehavior.length && (
                    <tr>
                      <td colSpan={5} className="py-4 text-muted-foreground">
                        No matching records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ABC incidents by day</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {abcDaily.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={abcDaily}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="incidents"
                      name="Incidents"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No ABC logs in this range.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: 'Top antecedents', rows: antecedents },
              { title: 'Top consequences', rows: consequences },
            ].map((panel) => (
              <Card key={panel.title}>
                <CardHeader>
                  <CardTitle className="text-base">{panel.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {panel.rows.length ? (
                    panel.rows.map((r) => (
                      <div key={r.label} className="flex items-center justify-between text-sm">
                        <span className="truncate pr-2">{r.label}</span>
                        <span className="font-semibold">{r.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No data.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
