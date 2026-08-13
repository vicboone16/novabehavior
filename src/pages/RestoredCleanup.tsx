import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Trash2,
  RefreshCw,
  Filter,
  ShieldAlert,
  Users,
  Download,
  Archive,
  Undo2,
  AlertTriangle,
  FlaskConical,
  History,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent, logDataAccess, flushPendingLogs } from '@/lib/auditLogger';
import {
  selectRestoredRecords,
  paginate,
  pageCount,
  type CleanupCriteria,
  type CleanupMapRow,
  type CleanupDataRow,
} from '@/lib/restoredCleanupSelection';

const db = supabase as any;

interface StudentOpt {
  id: string;
  name: string;
}

interface AuditRow {
  id: string;
  student_name: string | null;
  performed_by_email: string | null;
  mode: string;
  criteria: any;
  preview_count: number;
  deleted_map_ids: string[] | null;
  deleted_data_ids: string[] | null;
  integrity_warnings: any;
  restored_at: string | null;
  created_at: string;
}

const RETENTION_DAYS = 30;
const PAGE_SIZES = [25, 50, 100, 250];
/** Roles permitted to view or purge education records under FERPA least-privilege. */
const ALLOWED_ROLES = ['super_admin', 'admin'];

const maskUuid = (id?: string | null) => (id ? `${id.slice(0, 8)}…` : '—');

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const body = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RestoredCleanup() {
  const { userRole, roleLoading, user } = useAuth();
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [studentId, setStudentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Modes ─────────────────────────────────────────────────────
  const [dryRun, setDryRun] = useState(true);
  const [softDelete, setSoftDelete] = useState(true);

  // ── "Restored" definition filters ─────────────────────────────
  const [useNamePattern, setUseNamePattern] = useState(true);
  const [namePattern, setNamePattern] = useState('Restored');
  const [useReason, setUseReason] = useState(false);
  const [reasonPattern, setReasonPattern] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [useMissingCanonical, setUseMissingCanonical] = useState(false);

  const [mapRows, setMapRows] = useState<CleanupMapRow[]>([]);
  const [dataRows, setDataRows] = useState<CleanupDataRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [totals, setTotals] = useState({ freq: 0, dur: 0, obs: 0 });
  const [scanned, setScanned] = useState(false);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [purpose, setPurpose] = useState('');

  const allowed = ALLOWED_ROLES.includes(userRole ?? '');

  useEffect(() => {
    if (!allowed) return;
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
  }, [allowed]);

  const loadAudits = useCallback(async () => {
    const { data } = await db
      .from('cleanup_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25);
    setAudits((data ?? []) as AuditRow[]);
  }, []);

  useEffect(() => {
    if (allowed) loadAudits();
  }, [allowed, loadAudits]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId],
  );

  const criteria: CleanupCriteria = useMemo(
    () => ({
      useNamePattern,
      namePattern,
      useReason,
      reasonPattern,
      useDateRange,
      fromDate,
      toDate,
      useMissingCanonical,
    }),
    [
      useNamePattern,
      namePattern,
      useReason,
      reasonPattern,
      useDateRange,
      fromDate,
      toDate,
      useMissingCanonical,
    ],
  );

  const criteriaRecord = useMemo(
    () => ({
      name_pattern: useNamePattern ? namePattern.trim() : null,
      archived_reason_contains: useReason ? reasonPattern.trim() : null,
      created_from: useDateRange ? fromDate || null : null,
      created_to: useDateRange ? toDate || null : null,
      missing_canonical_link: useMissingCanonical,
      purpose: purpose.trim() || null,
    }),
    [
      useNamePattern,
      namePattern,
      useReason,
      reasonPattern,
      useDateRange,
      fromDate,
      toDate,
      useMissingCanonical,
      purpose,
    ],
  );

  const scan = useCallback(async () => {
    if (!studentId || !allowed) return;
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

      const canonicalIds = new Set<string>((canon ?? []).map((r: any) => r.id));

      const behaviorIds = [
        ...new Set((bsd ?? []).map((r: any) => r.behavior_id).filter(Boolean)),
      ] as string[];
      const nameById = new Map<string, string>();
      if (behaviorIds.length > 0) {
        const { data: defs } = await db
          .from('behaviors')
          .select('id, name')
          .in('id', behaviorIds);
        (defs ?? []).forEach((d: any) => nameById.set(d.id, d.name));
      }

      const result = selectRestoredRecords({
        criteria,
        mapRows: (sbm ?? []) as CleanupMapRow[],
        dataRows: (bsd ?? []) as any[],
        nameById,
        canonicalIds,
      });

      setWarnings(result.warnings);
      setMapRows(result.matchedMapRows);
      setDataRows(result.matchedDataRows);
      setTotals(result.totals);
      setScanned(true);

      // FERPA: every look at an education record is a logged disclosure.
      logDataAccess(studentId, 'view', 'behaviors', {
        surface: 'restored_cleanup_preview',
        criteria: criteriaRecord,
        matched: result.previewCount,
      });
    } catch (e: any) {
      toast.error(e?.message ?? 'Scan failed');
    } finally {
      setLoading(false);
    }
  }, [studentId, allowed, criteria, criteriaRecord]);

  const totalRecords = mapRows.length + dataRows.length;

  const exportPreviewCsv = async () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const rows: (string | number | null)[][] = [
      [
        'CONFIDENTIAL — FERPA-protected education record. Redisclosure without written consent is prohibited (34 CFR 99.33).',
      ],
      [
        `Exported by ${user?.email ?? 'unknown'} on ${new Date().toISOString()} — purpose: ${purpose.trim() || 'not stated'}`,
      ],
      [
        'record_type',
        'record_id',
        'behavior_label',
        'definition_notes',
        'archived_reason',
        'canonical_id',
        'session_id',
        'frequency',
        'duration_seconds',
        'observation_minutes',
        'created_at',
      ],
    ];
    mapRows.forEach((r) =>
      rows.push([
        'student_behavior_map',
        r.id,
        r.behavior_subtype ?? '',
        r.notes ?? '',
        r.archived_reason ?? '',
        r.bank_behavior_id ?? '',
        '',
        '',
        '',
        '',
        r.created_at ?? '',
      ]),
    );
    dataRows.forEach((r) =>
      rows.push([
        'behavior_session_data',
        r.id,
        r.behavior_name ?? r.behavior_id,
        '',
        '',
        r.behavior_id,
        r.session_id,
        r.frequency ?? 0,
        r.duration_seconds ?? 0,
        r.observation_minutes ?? 0,
        r.created_at ?? '',
      ]),
    );
    downloadCsv(
      `restored-cleanup-preview_${(selectedStudent?.name ?? 'client').replace(/\s+/g, '-')}_${stamp}.csv`,
      rows,
    );

    // FERPA §99.32 disclosure record for the export itself.
    logDataAccess(studentId, 'export', 'behaviors', {
      surface: 'restored_cleanup_csv',
      rows: totalRecords,
      purpose: purpose.trim() || null,
    });
    try {
      await writeAudit('export');
      await loadAudits();
    } catch {
      /* export already succeeded — audit failure is surfaced by the logger */
    }
    toast.success('Preview exported — disclosure recorded');
  };

  const writeAudit = async (mode: string) => {
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await db
      .from('cleanup_audit_logs')
      .insert({
        student_id: studentId || null,
        student_name: selectedStudent?.name ?? null,
        performed_by: auth?.user?.id ?? null,
        performed_by_email: auth?.user?.email ?? null,
        mode,
        criteria: criteriaRecord,
        preview_count: totalRecords,
        deleted_map_ids: mapRows.map((r) => r.id),
        deleted_data_ids: dataRows.map((r) => r.id),
        integrity_warnings: warnings,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { auditId: data.id as string, userId: auth?.user?.id ?? null };
  };

  const runDryRun = async () => {
    if (!studentId) return;
    setBusy(true);
    try {
      await scan();
      await writeAudit('dry_run');
      await loadAudits();
      toast.success('Dry run recorded — nothing was deleted');
    } catch (e: any) {
      toast.error(e?.message ?? 'Dry run failed');
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    if (!studentId || totalRecords === 0) return;
    setBusy(true);
    try {
      const { auditId, userId } = await writeAudit(
        softDelete ? 'archive' : 'hard_delete',
      );

      if (softDelete) {
        const archives: any[] = [];
        if (mapRows.length > 0) {
          const { data: full } = await db
            .from('student_behavior_map')
            .select('*')
            .in(
              'id',
              mapRows.map((r) => r.id),
            );
          (full ?? []).forEach((row: any) =>
            archives.push({
              audit_log_id: auditId,
              student_id: studentId,
              source_table: 'student_behavior_map',
              record_id: row.id,
              payload: row,
              archived_by: userId,
            }),
          );
        }
        if (dataRows.length > 0) {
          const { data: full } = await db
            .from('behavior_session_data')
            .select('*')
            .in(
              'id',
              dataRows.map((r) => r.id),
            );
          (full ?? []).forEach((row: any) =>
            archives.push({
              audit_log_id: auditId,
              student_id: studentId,
              source_table: 'behavior_session_data',
              record_id: row.id,
              payload: row,
              archived_by: userId,
            }),
          );
        }
        if (archives.length > 0) {
          const { error } = await db.from('cleanup_archived_records').insert(archives);
          if (error) throw error;
        }
      }

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
      logAuditEvent(
        'delete',
        'behavior',
        studentId,
        selectedStudent?.name,
        {
          mode: softDelete ? 'archive' : 'hard_delete',
          count: totalRecords,
          criteria: criteriaRecord,
          audit_log_id: auditId,
        },
      );
      logDataAccess(studentId, 'edit', 'behaviors', {
        surface: 'restored_cleanup_delete',
        count: totalRecords,
      });
      await flushPendingLogs();

      toast.success(
        softDelete
          ? `Archived ${totalRecords} record${totalRecords === 1 ? '' : 's'} — restorable for ${RETENTION_DAYS} days`
          : `Permanently removed ${totalRecords} record${totalRecords === 1 ? '' : 's'}`,
      );
      setConfirmOpen(false);
      await Promise.all([scan(), loadAudits()]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Deletion failed');
    } finally {
      setBusy(false);
    }
  };

  const restoreAudit = async (auditId: string) => {
    setBusy(true);
    try {
      const { data, error } = await db.rpc('restore_cleanup_archive', {
        _audit_log_id: auditId,
      });
      if (error) throw error;
      const restored =
        (data?.restored_map_rows ?? 0) + (data?.restored_data_rows ?? 0);
      if (studentId) clearStudentBehaviorNameMap(studentId);
      logAuditEvent('unarchive', 'behavior', studentId || undefined, selectedStudent?.name, {
        audit_log_id: auditId,
        restored,
      });
      toast.success(
        restored > 0
          ? `Restored ${restored} record${restored === 1 ? '' : 's'}`
          : 'Nothing to restore — retention window may have passed',
      );
      await Promise.all([loadAudits(), studentId ? scan() : Promise.resolve()]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Restore failed');
    } finally {
      setBusy(false);
    }
  };

  const describeCriteria = (c: any) => {
    if (!c) return '—';
    const parts: string[] = [];
    if (c.name_pattern) parts.push(`name ~ "${c.name_pattern}"`);
    if (c.archived_reason_contains)
      parts.push(`reason ~ "${c.archived_reason_contains}"`);
    if (c.created_from || c.created_to)
      parts.push(`created ${c.created_from || '…'} → ${c.created_to || '…'}`);
    if (c.missing_canonical_link) parts.push('missing canonical link');
    if (c.purpose) parts.push(`purpose: ${c.purpose}`);
    return parts.length ? parts.join(' · ') : 'no criteria';
  };

  if (roleLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Checking permissions…</div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-destructive" />
              Restricted — education records
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              This tool permanently removes student education records. Under FERPA
              least-privilege rules it is limited to administrators with a legitimate
              educational interest.
            </p>
            <p>Ask an administrator if you need records cleaned up for a client.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
        <Lock className="w-3.5 h-3.5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          <strong className="text-foreground">FERPA notice.</strong> These are protected
          education records. Access is limited to the minimum necessary, every preview,
          export and deletion is recorded as a disclosure with your identity and stated
          purpose, exports carry a no-redisclosure header, and archived records are
          purged automatically after {RETENTION_DAYS} days.
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" /> Client
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={studentId || '__none__'}
            onValueChange={(v) => {
              setStudentId(v === '__none__' ? '' : v);
              setScanned(false);
              setMapRows([]);
              setDataRows([]);
              setWarnings([]);
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
          <div className="space-y-1.5 max-w-sm">
            <Label htmlFor="purpose" className="text-xs">
              Legitimate educational interest (recorded with the disclosure)
            </Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. removing duplicate restored behaviors before IEP review"
            />
          </div>
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

          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label htmlFor="m-dry" className="text-sm flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5" /> Dry run only
                </Label>
                <p className="text-xs text-muted-foreground">
                  Run the selection logic and record it — nothing is deleted.
                </p>
              </div>
              <Switch id="m-dry" checked={dryRun} onCheckedChange={setDryRun} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label htmlFor="m-soft" className="text-sm flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5" /> Reversible archive
                </Label>
                <p className="text-xs text-muted-foreground">
                  Keep a restorable copy for {RETENTION_DAYS} days instead of a hard
                  delete.
                </p>
              </div>
              <Switch
                id="m-soft"
                checked={softDelete}
                onCheckedChange={setSoftDelete}
                disabled={dryRun}
              />
            </div>
          </div>

          <div className="pt-1 flex flex-wrap gap-2">
            <Button onClick={scan} disabled={!studentId || loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Preview matches
            </Button>
            <Button
              variant="outline"
              onClick={runDryRun}
              disabled={!studentId || busy || loading}
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              Run dry run
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={totalRecords === 0}
                onClick={exportPreviewCsv}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={totalRecords === 0 || dryRun}
                onClick={() => setConfirmOpen(true)}
              >
                {softDelete ? (
                  <Archive className="w-4 h-4 mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {softDelete ? 'Archive matched records' : 'Delete matched records'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dryRun && totalRecords > 0 && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Dry run is on — deletion is disabled. Turn it off to archive or delete.
              </div>
            )}

            {warnings.length > 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Integrity warnings
                </div>
                <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {totalRecords === 0 ? (
              <p className="text-sm text-muted-foreground">
                No records match the current definition of "restored".
              </p>
            ) : (
              <PreviewTables mapRows={mapRows} dataRows={dataRows} totals={totals} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4" /> Cleanup audit log
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadAudits}>
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cleanup activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-4">When</th>
                    <th className="py-1.5 pr-4">Who</th>
                    <th className="py-1.5 pr-4">Client</th>
                    <th className="py-1.5 pr-4">Mode</th>
                    <th className="py-1.5 pr-4">Criteria</th>
                    <th className="py-1.5 pr-4 text-right">Preview</th>
                    <th className="py-1.5 pr-4 text-right">Records</th>
                    <th className="py-1.5 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => {
                    const ids =
                      (a.deleted_map_ids?.length ?? 0) + (a.deleted_data_ids?.length ?? 0);
                    return (
                      <tr key={a.id} className="border-t border-border align-top">
                        <td className="py-1.5 pr-4 text-xs">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                        <td className="py-1.5 pr-4 text-xs">
                          {a.performed_by_email ?? '—'}
                        </td>
                        <td className="py-1.5 pr-4">{a.student_name ?? '—'}</td>
                        <td className="py-1.5 pr-4">
                          <Badge
                            variant={
                              a.mode === 'hard_delete'
                                ? 'destructive'
                                : a.mode === 'dry_run'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="text-[10px]"
                          >
                            {a.mode}
                          </Badge>
                        </td>
                        <td className="py-1.5 pr-4 text-xs max-w-[18rem]">
                          {describeCriteria(a.criteria)}
                        </td>
                        <td className="py-1.5 pr-4 text-right">{a.preview_count}</td>
                        <td className="py-1.5 pr-4 text-right text-xs">{ids}</td>
                        <td className="py-1.5 pr-4 text-right">
                          {a.mode === 'archive' && !a.restored_at ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => restoreAudit(a.id)}
                            >
                              <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                              Restore
                            </Button>
                          ) : a.restored_at ? (
                            <span className="text-xs text-muted-foreground">
                              Restored{' '}
                              {new Date(a.restored_at).toLocaleDateString()}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <GuardedDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        subjectName={selectedStudent?.name ?? ''}
        recordCount={totalRecords}
        title={
          softDelete
            ? 'Archive restored behavior records'
            : 'Delete restored behavior records'
        }
        busy={busy}
        onConfirm={runDelete}
        impactSummary={[
          `${mapRows.length} behavior mapping row(s) — names and definitions`,
          `${dataRows.length} session data row(s) — interval, frequency and duration`,
          `${totals.freq} total frequency events and ${totals.dur}s of duration affected`,
          softDelete
            ? `A restorable copy is kept for ${RETENTION_DAYS} days`
            : 'No copy is kept — this cannot be undone',
          'This action is recorded against your account as a FERPA disclosure.',
          ...warnings,
        ]}
        preview={
          <PreviewTables mapRows={mapRows} dataRows={dataRows} totals={totals} />
        }
      />
    </div>
  );
}

function Pager({
  total,
  page,
  pageSize,
  onPage,
  onPageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const pages = pageCount(total, pageSize);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
      <span>
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
          <SelectTrigger className="h-7 w-[92px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[10000]">
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function PreviewTables({
  mapRows,
  dataRows,
  totals,
}: {
  mapRows: CleanupMapRow[];
  dataRows: CleanupDataRow[];
  totals: { freq: number; dur: number; obs: number };
}) {
  const [mapPage, setMapPage] = useState(1);
  const [mapSize, setMapSize] = useState(25);
  const [dataPage, setDataPage] = useState(1);
  const [dataSize, setDataSize] = useState(50);

  useEffect(() => setMapPage(1), [mapRows, mapSize]);
  useEffect(() => setDataPage(1), [dataRows, dataSize]);

  const visibleMaps = useMemo(
    () => paginate(mapRows, mapPage, mapSize),
    [mapRows, mapPage, mapSize],
  );
  const visibleData = useMemo(
    () => paginate(dataRows, dataPage, dataSize),
    [dataRows, dataPage, dataSize],
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Behavior names & definitions ({mapRows.length})
        </div>
        {mapRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <>
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
                  {visibleMaps.map((r) => (
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
            <Pager
              total={mapRows.length}
              page={mapPage}
              pageSize={mapSize}
              onPage={setMapPage}
              onPageSize={setMapSize}
            />
          </>
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
          <>
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
                  {visibleData.map((r) => (
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
            <Pager
              total={dataRows.length}
              page={dataPage}
              pageSize={dataSize}
              onPage={setDataPage}
              onPageSize={setDataSize}
            />
          </>
        )}
      </div>
    </div>
  );
}
