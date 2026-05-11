import { useEffect, useMemo, useState } from 'react';
import { Users, Play, Square, Plus, Save, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StudentOpt {
  id: string;
  name: string;
}
interface BehaviorOpt {
  id: string;
  name: string;
}
interface PairConfig {
  studentId: string;
  behaviorId: string;
  totalMin: number;
  intervalSec: number;
  samplingSec: number;
  autoStopSec: number;
  frequency: number;
  durationSec: number;
  timerStart: number | null;
}

const newSessionId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

function validate(c: Pick<PairConfig, 'totalMin' | 'intervalSec' | 'samplingSec' | 'autoStopSec'>) {
  const issues: string[] = [];
  if (c.totalMin <= 0) issues.push('Total time must be > 0');
  if (c.intervalSec <= 0) issues.push('Interval must be > 0');
  if (c.samplingSec <= 0) issues.push('Sampling window must be > 0');
  if (c.samplingSec > c.intervalSec)
    issues.push('Sampling window cannot exceed interval');
  if (c.autoStopSec < 0) issues.push('Auto-stop must be ≥ 0');
  if (c.totalMin * 60 < c.intervalSec)
    issues.push('Total time shorter than one interval');
  return issues;
}

export default function MultiStudentCapture() {
  const { toast } = useToast();
  const [sessionId] = useState(newSessionId);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [behaviors, setBehaviors] = useState<Map<string, BehaviorOpt[]>>(new Map());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [pairs, setPairs] = useState<PairConfig[]>([]);
  const [, force] = useState(0);
  const [saving, setSaving] = useState(false);

  // tick to refresh running timers
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Load caseload
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('students')
        .select('id, name, first_name, last_name, is_archived')
        .eq('is_archived', false)
        .order('name');
      const opts = (data ?? []).map((s: any) => ({
        id: s.id,
        name:
          s.name ||
          [s.first_name, s.last_name].filter(Boolean).join(' ') ||
          s.id.slice(0, 8),
      }));
      setStudents(opts);
    })();
  }, []);

  // Load canonical behaviors per selected student
  useEffect(() => {
    (async () => {
      const ids = Array.from(selectedStudents);
      if (!ids.length) return;
      const { data } = await supabase
        .from('nt_learner_behavior_assignments')
        .select(
          'learner_id, behavior_id, resolved_behavior_id, behavior_name_snapshot, status',
        )
        .in('learner_id', ids)
        .eq('status', 'active');
      const map = new Map<string, BehaviorOpt[]>();
      (data ?? []).forEach((r: any) => {
        const arr = map.get(r.learner_id) ?? [];
        arr.push({
          id: r.resolved_behavior_id ?? r.behavior_id,
          name: r.behavior_name_snapshot ?? 'Behavior',
        });
        map.set(r.learner_id, arr);
      });
      setBehaviors(map);
    })();
  }, [selectedStudents]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setPairs((p) => p.filter((x) => x.studentId !== id));
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addPair = (studentId: string, behaviorId: string) => {
    if (pairs.some((p) => p.studentId === studentId && p.behaviorId === behaviorId))
      return;
    setPairs((p) => [
      ...p,
      {
        studentId,
        behaviorId,
        totalMin: 10,
        intervalSec: 30,
        samplingSec: 10,
        autoStopSec: 0,
        frequency: 0,
        durationSec: 0,
        timerStart: null,
      },
    ]);
  };

  const updatePair = (idx: number, patch: Partial<PairConfig>) => {
    setPairs((p) => p.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const removePair = (idx: number) => {
    setPairs((p) => p.filter((_, i) => i !== idx));
  };

  const tick = (p: PairConfig) =>
    p.timerStart ? p.durationSec + Math.floor((Date.now() - p.timerStart) / 1000) : p.durationSec;

  const toggleTimer = (idx: number) => {
    setPairs((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        if (p.timerStart) {
          const elapsed = Math.floor((Date.now() - p.timerStart) / 1000);
          return { ...p, timerStart: null, durationSec: p.durationSec + elapsed };
        }
        return { ...p, timerStart: Date.now() };
      }),
    );
  };

  const studentName = (id: string) =>
    students.find((s) => s.id === id)?.name ?? id.slice(0, 8);
  const behaviorName = (sid: string, bid: string) =>
    behaviors.get(sid)?.find((b) => b.id === bid)?.name ?? bid.slice(0, 8);

  const allIssues = useMemo(
    () =>
      pairs.map((p) => validate(p)),
    [pairs],
  );
  const hasErrors = allIssues.some((i) => i.length > 0);

  const finalize = async () => {
    if (!pairs.length) return;
    if (hasErrors) {
      toast({
        title: 'Fix validation issues first',
        description: 'Some interval configs are invalid.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error('Not signed in');
      const studentIds = Array.from(selectedStudents);

      // Create one session
      const { data: ses, error: sesErr } = await supabase
        .from('sessions')
        .insert({
          name: 'Batch capture',
          status: 'ended',
          attendance_outcome: 'occurred',
          service_type: 'direct_therapy',
          service_setting: 'school',
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          user_id: uid,
          student_ids: studentIds,
          interval_length_seconds: Math.max(
            ...pairs.map((p) => p.intervalSec),
            15,
          ),
        })
        .select('id')
        .single();
      if (sesErr) throw sesErr;

      const rows = pairs.map((p) => ({
        session_id: ses.id,
        student_id: p.studentId,
        behavior_id: p.behaviorId,
        frequency: p.frequency,
        duration_seconds: tick(p),
        observation_minutes: p.totalMin,
        notes: `Batch capture | sampling ${p.samplingSec}s every ${p.intervalSec}s | client_session_ref=${sessionId}`,
      }));
      const { error: bsdErr } = await supabase
        .from('behavior_session_data')
        .insert(rows);
      if (bsdErr) throw bsdErr;

      toast({
        title: 'Saved',
        description: `Captured ${rows.length} records across ${studentIds.length} students.`,
      });
      // Reset counters but keep config
      setPairs((p) =>
        p.map((x) => ({ ...x, frequency: 0, durationSec: 0, timerStart: null })),
      );
    } catch (e: any) {
      toast({
        title: 'Save failed',
        description: e?.message ?? 'Could not save records',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Multi-Student Capture
            </h1>
            <p className="text-sm text-muted-foreground">
              Batch-select students, configure interval sampling per behavior,
              and enter data in one workflow.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Session ref: {sessionId.slice(0, 8)}…
        </Badge>
      </div>

      {/* 1. Select students */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Select students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {students.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 p-2 rounded border border-border hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedStudents.has(s.id)}
                  onCheckedChange={() => toggleStudent(s.id)}
                />
                <span className="text-sm text-foreground truncate">{s.name}</span>
              </label>
            ))}
            {students.length === 0 && (
              <div className="text-sm text-muted-foreground col-span-full p-4 text-center">
                No active students found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Pick behaviors */}
      {selectedStudents.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Add behaviors per student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from(selectedStudents).map((sid) => {
              const opts = behaviors.get(sid) ?? [];
              return (
                <div key={sid} className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground min-w-32">
                    {studentName(sid)}
                  </span>
                  {opts.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No canonical behaviors assigned
                    </span>
                  )}
                  {opts.map((b) => {
                    const active = pairs.some(
                      (p) => p.studentId === sid && p.behaviorId === b.id,
                    );
                    return (
                      <Button
                        key={b.id}
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        onClick={() =>
                          active
                            ? removePair(
                                pairs.findIndex(
                                  (p) =>
                                    p.studentId === sid && p.behaviorId === b.id,
                                ),
                              )
                            : addPair(sid, b.id)
                        }
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {b.name}
                      </Button>
                    );
                  })}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 3. Capture grid */}
      {pairs.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">3. Configure & capture</CardTitle>
            <Button onClick={finalize} disabled={saving || hasErrors}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving…' : `Finalize ${pairs.length} record(s)`}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {pairs.map((p, idx) => {
              const issues = allIssues[idx];
              const elapsed = tick(p);
              return (
                <div
                  key={`${p.studentId}|${p.behaviorId}`}
                  className="border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-medium text-foreground">
                      {studentName(p.studentId)} —{' '}
                      <span className="text-primary">
                        {behaviorName(p.studentId, p.behaviorId)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removePair(idx)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <NumField
                      label="Total time (min)"
                      value={p.totalMin}
                      onChange={(v) => updatePair(idx, { totalMin: v })}
                    />
                    <NumField
                      label="Interval (sec)"
                      value={p.intervalSec}
                      onChange={(v) => updatePair(idx, { intervalSec: v })}
                    />
                    <NumField
                      label="Sampling (sec)"
                      value={p.samplingSec}
                      onChange={(v) => updatePair(idx, { samplingSec: v })}
                    />
                    <NumField
                      label="Auto-stop (sec)"
                      value={p.autoStopSec}
                      onChange={(v) => updatePair(idx, { autoStopSec: v })}
                    />
                  </div>

                  {issues.length > 0 && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/30 rounded p-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <ul className="space-y-0.5">
                        {issues.map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() =>
                        updatePair(idx, { frequency: p.frequency + 1 })
                      }
                    >
                      Frequency: <span className="ml-2 font-bold">{p.frequency}</span>
                    </Button>
                    <Button
                      size="lg"
                      variant={p.timerStart ? 'destructive' : 'default'}
                      onClick={() => toggleTimer(idx)}
                    >
                      {p.timerStart ? (
                        <Square className="w-4 h-4 mr-2" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Duration: {elapsed}s
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
