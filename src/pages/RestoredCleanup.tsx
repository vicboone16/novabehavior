import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, RefreshCw, Filter, ShieldAlert, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GuardedDeleteDialog } from '@/components/cleanup/GuardedDeleteDialog';
import { clearStudentBehaviorNameMap } from '@/lib/behaviorNameResolver';

const db = supabase as any;

interface StudentOpt {
  id: string;
  name: string;
}

interface MapRow {
  id: string;
  behavior_subtype: string | null;
  behavior_entry_id: string | null;
  bank_behavior_id: string | null;
  archived_reason: string | null;
  archived_at: string | null;
  notes: string | null;
  created_at: string;
  active: boolean;
}

interface DataRow {
  id: string;
  session_id: string;
  behavior_id: string;
  behavior_name: string | null;
  frequency: number | null;
  duration_seconds: number | null;
  observation_minutes: number | null;
  created_at: string | null;
}

const maskUuid = (id?: string | null) => (id ? `${id.slice(0, 8)}…` : '—');

export default function RestoredCleanup() {
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [studentId, setStudentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── "Restored" definition filters ─────────────────────────────
  const [useNamePattern, setUseNamePattern] = useState(true);
  const [namePattern, setNamePattern] = useState('Restored');
  const [useReason, setUseReason] = useState(false);
  const [reasonPattern, setReasonPattern] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [useMissingCanonical, setUseMissingCanonical] = useState(false);

  const [mapRows, setMapRows] = useState<MapRow[]>([]);
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    db.from('students')
      .select('id, name, first_name, last_name, is_archived')
      .order('first_name')
      .then(({ data }: any) => {
        setStudents(
          (data ?? []).map((s: any) => ({
            id: s.id,
            name:
              s.name ||
              [s.first_name, s.last_name].filter(Boolean).join(' ') ||
              maskUuid(s.id),
          })),
        );
      });
  }, []);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId],
  );

  const inRange = useCallback(
    (iso?: string | null) => {
      if (!useDateRange) return true;
      if (!iso) return false;
      const t = new Date(iso).getTime();
      if (fromDate && t < new Date(`${fromDate}T00:00:00`).getTime()) return false;
      if (toDate && t > new Date(`${toDate}T23:59:59`).getTime()) return false;
      return true;
    },
    [useDateRange, fromDate, toDate],
  );

  const scan = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setScanned(false);
    try {
      const [{ data: sbm }, { data: bsd }, { data: canon }] = await Promise.all([
        db
          .from('student_behavior_map')
          .select(
            'id, behavior_subtype, behavior_entry_id, bank_behavior_id, archived_reason, archived_at, notes, created_at, active',
          )
          .eq('student_id', studentId),
        db
          .from('behavior_session_data')
          .select(
            'id, session_id, behavior_id, frequency, duration_seconds, observation_minutes, created_at',
          )
          .eq('student_id', studentId),
        db.from('nt_behaviors').select('id'),
      ]);

      const canonIds = new Set((canon ?? []).map((r: any) => r.id));

      const behaviorIds = [
        ...new Set((bsd ?? []).map((r: any) => r.behavior_id).filter(Boolean)),
      ] as string[];
      let nameById = new Map<string, string>();
      if (behaviorIds.length > 0) {
        const { data: defs } = await db
          .from('behaviors')
          .select('id, name')
          .in('id', behaviorIds);
        (defs ?? []).forEach((d: any) => nameById.set(d.id, d.name));
      }

      const pat = namePattern.trim().toLowerCase();
      const reason = reasonPattern.trim().toLowerCase();

      const matchesFilters = (label: string | null, r: any, created?: string | null) => {
        // at least one active criterion must be selected
        const criteria: boolean[] = [];
        if (useNamePattern) {
          criteria.push(!!pat && (label ?? '').toLowerCase().includes(pat));
        }
        if (useReason) {
          criteria.push(
            !!reason && (r?.archived_reason ?? '').toLowerCase().includes(reason),
          );
        }
        if (useMissingCanonical) {
          const canonicalId = r?.bank_behavior_id ?? r?.behavior_id ?? null;
          criteria.push(!canonicalId || !canonIds.has(canonicalId));
        }
        if (criteria.length === 0) return false;
        if (!criteria.some(Boolean)) return false;
        return inRange(created ?? r?.created_at ?? null);
      };

      const matchedMaps: MapRow[] = (sbm ?? []).filter((r: any) =>
        matchesFilters(r.behavior_subtype, r, r.created_at),
      );

      const matchedMapBehaviorIds = new Set(
        matchedMaps.flatMap((m) =>
          [m.bank_behavior_id, m.behavior_entry_id].filter(Boolean),
        ) as string[],
      );

      const matchedData: DataRow[] = (bsd ?? [])
        .filter((r: any) => {
          const label = nameById.get(r.behavior_id) ?? null;
          return (
            matchedMapBehaviorIds.has(r.behavior_id) ||
            matchesFilters(label, r, r.created_at)
          );
        })
        .map((r: any) => ({
          ...r,
          behavior_name: nameById.get(r.behavior_id) ?? null,
        }));

      setMapRows(matchedMaps);
      setDataRows(matchedData);
      setScanned(true);
    } catch (e: any) {
      toast.error(e?.message ?? 'Scan failed');
    } finally {
      setLoading(false);
    }
  }, [
    studentId,
    namePattern,
    reasonPattern,
    useNamePattern,
    useReason,
    useMissingCanonical,
    inRange,
  ]);

  const totalRecords = mapRows.length + dataRows.length;

  const totals = useMemo(() => {
    let freq = 0;
    let dur = 0;
    let obs = 0;
    dataRows.forEach((r) => {
      freq += r.frequency ?? 0;
      dur += r.duration_seconds ?? 0;
      obs += Number(r.observation_minutes ?? 0);
    });
    return { freq, dur, obs };
  }, [dataRows]);

  const runDelete = async () => {
    if (!studentId || totalRecords === 0) return;
    setBusy(true);
    try {
      if (dataRows.length > 0) {
        const { error } = await db
          .from('behavior_session_data')
          .delete()
          .in(
            'id',
            dataRows.map((r) => r.id),
          );
        if (error) throw error;
      }
      if (mapRows.length > 0) {
        const { error } = await db
          .from('student_behavior_map')
          .delete()
          .in(
            'id',
            mapRows.map((r) => r.id),
          );
        if (error) throw error;
      }
      clearStudentBehaviorNameMap(studentId);
      toast.success(
        `Removed ${totalRecords} record${totalRecords === 1 ? '' : 's'} for ${selectedStudent?.name}`,
      );
      setConfirmOpen(false);
      await scan();
    } catch (e: any) {
      toast.error(e?.message ?? 'Deletion failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-destructive/10">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Restored Behavior Cleanup
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose what "restored" means, preview exactly what will be removed,
              then confirm in two steps.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={scan} disabled={!studentId || loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Scan
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" /> Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={studentId || '__none__'}
            onValueChange={(v) => {
              setStudentId(v === '__none__' ? '' : v);
              setScanned(false);
              setMapRows([]);
              setDataRows([]);
            }}
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              <SelectItem value="__none__">Select a client…</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4" /> What counts as "restored"?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="f-name"
              checked={useNamePattern}
              onCheckedChange={(c) => setUseNamePattern(!!c)}
            />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="f-name" className="text-sm">
                Name pattern
              </Label>
              <Input
                value={namePattern}
                onChange={(e) => setNamePattern(e.target.value)}
                disabled={!useNamePattern}
                placeholder="e.g. Restored"
                className="max-w-sm"
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="f-reason"
              checked={useReason}
              onCheckedChange={(c) => setUseReason(!!c)}
            />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="f-reason" className="text-sm">
                Archived reason contains
              </Label>
              <Input
                value={reasonPattern}
                onChange={(e) => setReasonPattern(e.target.value)}
                disabled={!useReason}
                placeholder="e.g. restore, duplicate"
                className="max-w-sm"
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="f-date"
              checked={useDateRange}
              onCheckedChange={(c) => setUseDateRange(!!c)}
            />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="f-date" className="text-sm">
                Created within date range
              </Label>
              <div className="flex gap-2 max-w-sm">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  disabled={!useDateRange}
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  disabled={!useDateRange}
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="f-canon"
              checked={useMissingCanonical}
              onCheckedChange={(c) => setUseMissingCanonical(!!c)}
            />
            <div className="flex-1">
              <Label htmlFor="f-canon" className="text-sm">
                Missing canonical link
              </Label>
              <p className="text-xs text-muted-foreground">
                Entries with no canonical registry match (source flag).
              </p>
            </div>
          </div>

          <div className="pt-1">
            <Button onClick={scan} disabled={!studentId || loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Preview matches
            </Button>
          </div>
        </CardContent>
      </Card>

      {scanned && (
        <Card className={totalRecords > 0 ? 'border-destructive/40' : ''}>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">
              Preview{' '}
              <Badge variant={totalRecords > 0 ? 'destructive' : 'secondary'} className="ml-2">
                {totalRecords} record{totalRecords === 1 ? '' : 's'}
              </Badge>
            </CardTitle>
            <Button
              variant="destructive"
              size="sm"
              disabled={totalRecords === 0}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete matched records
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalRecords === 0 ? (
              <p className="text-sm text-muted-foreground">
                No records match the current definition of "restored".
              </p>
            ) : (
              <PreviewTables
                mapRows={mapRows}
                dataRows={dataRows}
                totals={totals}
              />
            )}
          </CardContent>
        </Card>
      )}

      <GuardedDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        subjectName={selectedStudent?.name ?? ''}
        recordCount={totalRecords}
        title="Delete restored behavior records"
        busy={busy}
        onConfirm={runDelete}
        impactSummary={[
          `${mapRows.length} behavior mapping row(s) — names and definitions`,
          `${dataRows.length} session data row(s) — interval, frequency and duration`,
          `${totals.freq} total frequency events and ${totals.dur}s of duration will be lost`,
        ]}
        preview={
          <PreviewTables mapRows={mapRows} dataRows={dataRows} totals={totals} />
        }
      />
    </div>
  );
}

function PreviewTables({
  mapRows,
  dataRows,
  totals,
}: {
  mapRows: MapRow[];
  dataRows: DataRow[];
  totals: { freq: number; dur: number; obs: number };
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Behavior names & definitions ({mapRows.length})
        </div>
        {mapRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-4">Label</th>
                  <th className="py-1.5 pr-4">Definition / notes</th>
                  <th className="py-1.5 pr-4">Archived reason</th>
                  <th className="py-1.5 pr-4">Canonical</th>
                  <th className="py-1.5 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {mapRows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-1.5 pr-4 text-foreground">
                      {r.behavior_subtype ?? '—'}
                    </td>
                    <td className="py-1.5 pr-4 text-xs max-w-[16rem] truncate">
                      {r.notes ?? '—'}
                    </td>
                    <td className="py-1.5 pr-4 text-xs">{r.archived_reason ?? '—'}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">
                      {maskUuid(r.bank_behavior_id)}
                    </td>
                    <td className="py-1.5 pr-4 text-xs">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Interval / frequency / duration data ({dataRows.length}) — {totals.freq} events,{' '}
          {totals.dur}s duration, {totals.obs} observation min
        </div>
        {dataRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-4">Behavior</th>
                  <th className="py-1.5 pr-4">Session</th>
                  <th className="py-1.5 pr-4 text-right">Freq</th>
                  <th className="py-1.5 pr-4 text-right">Dur (s)</th>
                  <th className="py-1.5 pr-4 text-right">Obs (min)</th>
                  <th className="py-1.5 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {dataRows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-1.5 pr-4 text-foreground">
                      {r.behavior_name ?? maskUuid(r.behavior_id)}
                    </td>
                    <td className="py-1.5 pr-4 font-mono text-xs">
                      {maskUuid(r.session_id)}
                    </td>
                    <td className="py-1.5 pr-4 text-right">{r.frequency ?? 0}</td>
                    <td className="py-1.5 pr-4 text-right">{r.duration_seconds ?? 0}</td>
                    <td className="py-1.5 pr-4 text-right">
                      {r.observation_minutes ?? 0}
                    </td>
                    <td className="py-1.5 pr-4 text-xs">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
