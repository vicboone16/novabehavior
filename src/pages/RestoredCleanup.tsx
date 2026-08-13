import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Search,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  type CleanupCriteria,
  type CleanupDataRow,
  type CleanupMapRow,
  type SelectionResult,
} from '@/lib/restoredCleanupSelection';
import {
  buildCleanupCsvRows,
  canRunCleanup,
  runCleanup,
  runDryRun,
  runExportAudit,
  runRestore,
  scanStudent,
  toCsv,
  type ActorContext,
  type ArchivePayload,
  type AuditInput,
  type CleanupStore,
} from '@/lib/restoredCleanupFlow';

const db = supabase as any;

interface StudentOpt {
  id: string;
  name: string;
}

interface AuditRow {
  id: string;
  student_id: string | null;
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
const ROW_HEIGHT = 34;
const VIRTUAL_THRESHOLD = 40;
const VIEWPORT_HEIGHT = 380;

const maskUuid = (id?: string | null) => (id ? `${id.slice(0, 8)}…` : '—');

function downloadCsvText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Supabase-backed implementation of the storage-agnostic cleanup store. */
const supabaseStore: CleanupStore = {
  async fetchMapRows(studentId) {
    const { data } = await db
      .from('student_behavior_map')
      .select(
        'id, behavior_subtype, behavior_entry_id, bank_behavior_id, archived_reason, archived_at, notes, created_at, active',
      )
      .eq('student_id', studentId);
    return (data ?? []) as CleanupMapRow[];
  },
  async fetchDataRows(studentId) {
    const { data } = await db
      .from('behavior_session_data')
      .select(
        'id, session_id, behavior_id, frequency, duration_seconds, observation_minutes, created_at',
      )
      .eq('student_id', studentId);
    return (data ?? []) as any[];
  },
  async fetchCanonicalIds() {
    const { data } = await db.from('nt_behaviors').select('id');
    return new Set<string>((data ?? []).map((r: any) => r.id));
  },
  async fetchBehaviorNames(ids) {
    const { data } = await db.from('behaviors').select('id, name').in('id', ids);
    return new Map<string, string>((data ?? []).map((d: any) => [d.id, d.name]));
  },
  async fetchFullMapRows(ids) {
    const { data } = await db.from('student_behavior_map').select('*').in('id', ids);
    return data ?? [];
  },
  async fetchFullDataRows(ids) {
    const { data } = await db.from('behavior_session_data').select('*').in('id', ids);
    return data ?? [];
  },
  async insertAudit(input: AuditInput) {
    const { data, error } = await db
      .from('cleanup_audit_logs')
      .insert(input)
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  },
  async insertArchives(rows: ArchivePayload[]) {
    const { error } = await db.from('cleanup_archived_records').insert(rows);
    if (error) throw error;
  },
  async deleteMapRows(ids) {
    const { error } = await db.from('student_behavior_map').delete().in('id', ids);
    if (error) throw error;
  },
  async deleteDataRows(ids) {
    const { error } = await db.from('behavior_session_data').delete().in('id', ids);
    if (error) throw error;
  },
  async restoreArchive(auditLogId) {
    const { data, error } = await db.rpc('restore_cleanup_archive', {
      _audit_log_id: auditLogId,
    });
    if (error) throw error;
    return {
      restored_map_rows: data?.restored_map_rows ?? 0,
      restored_data_rows: data?.restored_data_rows ?? 0,
    };
  },
};

const emptySelection: SelectionResult = {
  matchedMapRows: [],
  matchedDataRows: [],
  warnings: [],
  totals: { freq: 0, dur: 0, obs: 0 },
  previewCount: 0,
};

export default function RestoredCleanup() {
  const { userRole, roleLoading, user } = useAuth();
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [studentId, setStudentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [dryRun, setDryRun] = useState(true);
  const [softDelete, setSoftDelete] = useState(true);

  const [useNamePattern, setUseNamePattern] = useState(true);
  const [namePattern, setNamePattern] = useState('Restored');
  const [useReason, setUseReason] = useState(false);
  const [reasonPattern, setReasonPattern] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [useMissingCanonical, setUseMissingCanonical] = useState(false);

  const [selection, setSelection] = useState<SelectionResult>(emptySelection);
  const [scanned, setScanned] = useState(false);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditMode, setAuditMode] = useState('all');
  const [purpose, setPurpose] = useState('');

  const authorized = canRunCleanup(userRole);
  const actor: ActorContext = useMemo(
    () => ({ userId: user?.id ?? null, email: user?.email ?? null, role: userRole }),
    [user?.id, user?.email, userRole],
  );

  const { matchedMapRows: mapRows, matchedDataRows: dataRows, warnings, totals } =
    selection;
  const totalRecords = selection.previewCount;

  useEffect(() => {
    if (!authorized) return;
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
  }, [authorized]);

  const loadAudits = useCallback(async () => {
    const { data } = await db
      .from('cleanup_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setAudits((data ?? []) as AuditRow[]);
  }, []);

  useEffect(() => {
    if (authorized) loadAudits();
  }, [authorized, loadAudits]);

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
    if (!studentId || !authorized) return;
    setLoading(true);
    setScanned(false);
    try {
      const result = await scanStudent(supabaseStore, studentId, criteria);
      setSelection(result);
      setScanned(true);
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
  }, [studentId, authorized, criteria, criteriaRecord]);

  const exportPreviewCsv = async () => {
    try {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const csv = toCsv(
        buildCleanupCsvRows(selection, {
          exportedBy: user?.email ?? null,
          purpose: purpose.trim() || null,
        }),
      );
      downloadCsvText(
        `restored-cleanup-preview_${(selectedStudent?.name ?? 'client').replace(/\s+/g, '-')}_${stamp}.csv`,
        csv,
      );
      logDataAccess(studentId, 'export', 'behaviors', {
        surface: 'restored_cleanup_csv',
        rows: totalRecords,
        purpose: purpose.trim() || null,
      });
      await runExportAudit(supabaseStore, {
        studentId,
        studentName: selectedStudent?.name ?? null,
        actor,
        criteriaRecord,
        selection,
      });
      await loadAudits();
      toast.success('Preview exported — disclosure recorded');
    } catch (e: any) {
      toast.error(e?.message ?? 'Export failed');
    }
  };

  const doDryRun = async () => {
    if (!studentId) return;
    setBusy(true);
    try {
      const { selection: result } = await runDryRun(supabaseStore, {
        studentId,
        studentName: selectedStudent?.name ?? null,
        actor,
        criteria,
        criteriaRecord,
      });
      setSelection(result);
      setScanned(true);
      await loadAudits();
      toast.success('Dry run recorded — nothing was deleted');
    } catch (e: any) {
      toast.error(e?.message ?? 'Dry run failed');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!studentId || totalRecords === 0) return;
    setBusy(true);
    try {
      const res = await runCleanup(supabaseStore, {
        studentId,
        studentName: selectedStudent?.name ?? null,
        actor,
        criteriaRecord,
        selection,
        softDelete,
      });
      clearStudentBehaviorNameMap(studentId);
      logAuditEvent('delete', 'behavior', studentId, selectedStudent?.name, {
        mode: softDelete ? 'archive' : 'hard_delete',
        count: res.deleted,
        criteria: criteriaRecord,
        audit_log_id: res.auditId,
      });
      logDataAccess(studentId, 'edit', 'behaviors', {
        surface: 'restored_cleanup_delete',
        count: res.deleted,
      });
      await flushPendingLogs();
      toast.success(
        softDelete
          ? `Archived ${res.deleted} record${res.deleted === 1 ? '' : 's'} — restorable for ${RETENTION_DAYS} days`
          : `Permanently removed ${res.deleted} record${res.deleted === 1 ? '' : 's'}`,
      );
      setConfirmOpen(false);
      await Promise.all([scan(), loadAudits()]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Deletion failed');
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async (auditId: string) => {
    setBusy(true);
    try {
      const restored = await runRestore(supabaseStore, { auditId, actor });
      if (studentId) clearStudentBehaviorNameMap(studentId);
      logAuditEvent('unarchive', 'behavior', studentId || undefined, selectedStudent?.name, {
        audit_log_id: auditId,
        restored,
      });
      toast.success(
        restored > 0
          ? `Restored ${restored} record${restored === 1 ? '' : 's'}`
          : 'Nothing to restore — the retention window has passed',
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

  const filteredAudits = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return audits.filter((a) => {
      if (auditMode !== 'all' && a.mode !== auditMode) return false;
      if (!q) return true;
      return [
        a.student_name,
        a.performed_by_email,
        a.mode,
        describeCriteria(a.criteria),
        new Date(a.created_at).toLocaleString(),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [audits, auditSearch, auditMode]);

  const exportAuditCsv = () => {
    const rows: (string | number | null)[][] = [
      [
        'CONFIDENTIAL — FERPA compliance record. Redisclosure without written consent is prohibited (34 CFR 99.33).',
      ],
      [
        'created_at',
        'performed_by_email',
        'client',
        'mode',
        'criteria',
        'preview_count',
        'deleted_map_ids',
        'deleted_data_ids',
        'integrity_warnings',
        'restored_at',
        'audit_id',
      ],
    ];
    filteredAudits.forEach((a) =>
      rows.push([
        a.created_at,
        a.performed_by_email ?? '',
        a.student_name ?? '',
        a.mode,
        describeCriteria(a.criteria),
        a.preview_count,
        (a.deleted_map_ids ?? []).join(' '),
        (a.deleted_data_ids ?? []).join(' '),
        Array.isArray(a.integrity_warnings) ? a.integrity_warnings.join(' | ') : '',
        a.restored_at ?? '',
        a.id,
      ]),
    );
    downloadCsvText(
      `cleanup-audit-log_${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(rows),
    );
    logAuditEvent('export', 'report', undefined, 'cleanup_audit_log', {
      rows: filteredAudits.length,
      search: auditSearch || null,
      mode: auditMode,
    });
    toast.success(`Exported ${filteredAudits.length} audit record(s)`);
  };

  if (roleLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Checking permissions…</div>
    );
  }

  if (!authorized) {
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
              Dry run, export, archive, delete and restore all require an admin or
              manager role. Under FERPA least-privilege rules this tool is limited to
              staff with a legitimate educational interest in purging records.
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
          education records. Access is limited to admins and managers, every preview,
          export, deletion and restore is recorded as a disclosure with your identity and
          stated purpose, exports carry a no-redisclosure header, and archived copies are
          purged automatically by a nightly job once the {RETENTION_DAYS}-day retention
          window closes.
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
              setSelection(emptySelection);
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
              onClick={doDryRun}
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
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" /> Cleanup audit log
              <Badge variant="secondary" className="text-[10px]">
                {filteredAudits.length} of {audits.length}
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={loadAudits}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportAuditCsv}
                disabled={filteredAudits.length === 0}
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                Export compliance CSV
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search by client, user, criteria or date…"
                className="pl-8 h-9"
              />
            </div>
            <Select value={auditMode} onValueChange={setAuditMode}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="dry_run">Dry run</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="archive">Archive</SelectItem>
                <SelectItem value="hard_delete">Hard delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAudits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {audits.length === 0
                ? 'No cleanup activity yet.'
                : 'No records match this search.'}
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground sticky top-0 bg-background">
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
                  {filteredAudits.map((a) => {
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
                              onClick={() => doRestore(a.id)}
                            >
                              <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                              Restore
                            </Button>
                          ) : a.restored_at ? (
                            <span className="text-xs text-muted-foreground">
                              Restored {new Date(a.restored_at).toLocaleDateString()}
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
        onConfirm={doDelete}
        impactSummary={[
          `${mapRows.length} behavior mapping row(s) — names and definitions`,
          `${dataRows.length} session data row(s) — interval, frequency and duration`,
          `${totals.freq} total frequency events and ${totals.dur}s of duration affected`,
          softDelete
            ? `A restorable copy is kept for ${RETENTION_DAYS} days, then purged automatically`
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

interface Column<T> {
  key: string;
  header: string;
  width: string;
  align?: 'right';
  render: (row: T) => React.ReactNode;
}

/**
 * Renders a header row plus either a plain body (small sets) or a
 * windowed body that only mounts the visible rows (large sets).
 */
function VirtualTable<T extends { id: string }>({
  rows,
  columns,
}: {
  rows: T[];
  columns: Column<T>[];
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualize = rows.length > VIRTUAL_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const items = virtualizer.getVirtualItems();

  const Row = ({ row, style }: { row: T; style?: React.CSSProperties }) => (
    <div
      style={style}
      className="flex items-center border-t border-border text-sm w-full"
    >
      {columns.map((c) => (
        <div
          key={c.key}
          className={`px-2 truncate ${c.align === 'right' ? 'text-right' : ''}`}
          style={{ width: c.width, flex: `0 0 ${c.width}` }}
        >
          {c.render(row)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-w-[720px]">
      <div className="flex items-center text-xs text-muted-foreground pb-1">
        {columns.map((c) => (
          <div
            key={c.key}
            className={`px-2 ${c.align === 'right' ? 'text-right' : ''}`}
            style={{ width: c.width, flex: `0 0 ${c.width}` }}
          >
            {c.header}
          </div>
        ))}
      </div>

      {virtualize ? (
        <div
          ref={parentRef}
          className="overflow-y-auto rounded-md border border-border"
          style={{ height: VIEWPORT_HEIGHT }}
        >
          <div
            style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}
          >
            {items.map((vi) => (
              <Row
                key={rows[vi.index].id}
                row={rows[vi.index]}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: vi.size,
                  transform: `translateY(${vi.start}px)`,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          {rows.map((r) => (
            <Row key={r.id} row={r} style={{ height: ROW_HEIGHT }} />
          ))}
        </div>
      )}
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
  const mapColumns: Column<CleanupMapRow>[] = [
    {
      key: 'label',
      header: 'Label',
      width: '22%',
      render: (r) => <span className="text-foreground">{r.behavior_subtype ?? '—'}</span>,
    },
    {
      key: 'notes',
      header: 'Definition / notes',
      width: '30%',
      render: (r) => <span className="text-xs">{r.notes ?? '—'}</span>,
    },
    {
      key: 'reason',
      header: 'Archived reason',
      width: '20%',
      render: (r) => <span className="text-xs">{r.archived_reason ?? '—'}</span>,
    },
    {
      key: 'canon',
      header: 'Canonical',
      width: '14%',
      render: (r) => (
        <span className="font-mono text-xs">{maskUuid(r.bank_behavior_id)}</span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      width: '14%',
      render: (r) => (
        <span className="text-xs">
          {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
  ];

  const dataColumns: Column<CleanupDataRow>[] = [
    {
      key: 'behavior',
      header: 'Behavior',
      width: '28%',
      render: (r) => (
        <span className="text-foreground">{r.behavior_name ?? maskUuid(r.behavior_id)}</span>
      ),
    },
    {
      key: 'session',
      header: 'Session',
      width: '16%',
      render: (r) => <span className="font-mono text-xs">{maskUuid(r.session_id)}</span>,
    },
    {
      key: 'freq',
      header: 'Freq',
      width: '12%',
      align: 'right',
      render: (r) => r.frequency ?? 0,
    },
    {
      key: 'dur',
      header: 'Dur (s)',
      width: '14%',
      align: 'right',
      render: (r) => r.duration_seconds ?? 0,
    },
    {
      key: 'obs',
      header: 'Obs (min)',
      width: '14%',
      align: 'right',
      render: (r) => r.observation_minutes ?? 0,
    },
    {
      key: 'created',
      header: 'Created',
      width: '16%',
      render: (r) => (
        <span className="text-xs">
          {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Behavior names &amp; definitions ({mapRows.length})
          {mapRows.length > VIRTUAL_THRESHOLD && ' — scroll to review all rows'}
        </div>
        {mapRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <div className="overflow-x-auto">
            <VirtualTable rows={mapRows} columns={mapColumns} />
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Interval / frequency / duration data ({dataRows.length}) — {totals.freq} events,{' '}
          {totals.dur}s duration, {totals.obs} observation min
          {dataRows.length > VIRTUAL_THRESHOLD && ' — scroll to review all rows'}
        </div>
        {dataRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <div className="overflow-x-auto">
            <VirtualTable rows={dataRows} columns={dataColumns} />
          </div>
        )}
      </div>
    </div>
  );
}
