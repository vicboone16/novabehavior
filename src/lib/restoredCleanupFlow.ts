/**
 * Storage-agnostic orchestration for the Restored Behavior Cleanup flow.
 *
 * The page supplies a Supabase-backed store; tests supply an in-memory store,
 * so the exact same code path is exercised end-to-end: scan -> dry run ->
 * CSV export -> archive -> delete -> restore.
 */
import {
  selectRestoredRecords,
  type CleanupCriteria,
  type CleanupDataRow,
  type CleanupMapRow,
  type SelectionResult,
} from './restoredCleanupSelection';

export type CleanupMode = 'dry_run' | 'export' | 'archive' | 'hard_delete';

export interface ArchivePayload {
  audit_log_id: string;
  student_id: string;
  source_table: 'student_behavior_map' | 'behavior_session_data';
  record_id: string;
  payload: Record<string, any>;
  archived_by: string | null;
}

export interface AuditInput {
  student_id: string;
  student_name: string | null;
  performed_by: string | null;
  performed_by_email: string | null;
  mode: CleanupMode;
  criteria: Record<string, any>;
  preview_count: number;
  deleted_map_ids: string[];
  deleted_data_ids: string[];
  integrity_warnings: string[];
}

export interface CleanupStore {
  fetchMapRows(studentId: string): Promise<CleanupMapRow[]>;
  fetchDataRows(studentId: string): Promise<Omit<CleanupDataRow, 'behavior_name'>[]>;
  fetchCanonicalIds(): Promise<Set<string>>;
  fetchBehaviorNames(ids: string[]): Promise<Map<string, string>>;
  fetchFullMapRows(ids: string[]): Promise<Record<string, any>[]>;
  fetchFullDataRows(ids: string[]): Promise<Record<string, any>[]>;
  insertAudit(input: AuditInput): Promise<string>;
  insertArchives(rows: ArchivePayload[]): Promise<void>;
  deleteMapRows(ids: string[]): Promise<void>;
  deleteDataRows(ids: string[]): Promise<void>;
  restoreArchive(auditLogId: string): Promise<{ restored_map_rows: number; restored_data_rows: number }>;
}

export interface ActorContext {
  userId: string | null;
  email: string | null;
  role: string | null;
}

/** Roles allowed to run any destructive or disclosure-generating action. */
export const CLEANUP_ROLES = ['super_admin', 'admin', 'manager'] as const;

export function canRunCleanup(role: string | null | undefined): boolean {
  return CLEANUP_ROLES.includes((role ?? '') as (typeof CLEANUP_ROLES)[number]);
}

export function assertCleanupAuthorized(actor: ActorContext, action: CleanupMode) {
  if (!actor.userId) {
    throw new Error('You must be signed in to run cleanup actions.');
  }
  if (!canRunCleanup(actor.role)) {
    throw new Error(
      `Not authorized: ${action.replace('_', ' ')} requires an admin or manager role.`,
    );
  }
}

export async function scanStudent(
  store: CleanupStore,
  studentId: string,
  criteria: CleanupCriteria,
): Promise<SelectionResult> {
  const [mapRows, dataRows, canonicalIds] = await Promise.all([
    store.fetchMapRows(studentId),
    store.fetchDataRows(studentId),
    store.fetchCanonicalIds(),
  ]);
  const behaviorIds = [...new Set(dataRows.map((r) => r.behavior_id).filter(Boolean))];
  const nameById =
    behaviorIds.length > 0 ? await store.fetchBehaviorNames(behaviorIds) : new Map();
  return selectRestoredRecords({ criteria, mapRows, dataRows, nameById, canonicalIds });
}

export function buildCleanupCsvRows(
  selection: Pick<SelectionResult, 'matchedMapRows' | 'matchedDataRows'>,
  meta: { exportedBy: string | null; purpose: string | null; exportedAt?: string },
): (string | number | null)[][] {
  const rows: (string | number | null)[][] = [
    [
      'CONFIDENTIAL — FERPA-protected education record. Redisclosure without written consent is prohibited (34 CFR 99.33).',
    ],
    [
      `Exported by ${meta.exportedBy ?? 'unknown'} on ${meta.exportedAt ?? new Date().toISOString()} — purpose: ${meta.purpose || 'not stated'}`,
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
  selection.matchedMapRows.forEach((r) =>
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
  selection.matchedDataRows.forEach((r) =>
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
  return rows;
}

export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

async function recordAudit(
  store: CleanupStore,
  args: {
    studentId: string;
    studentName: string | null;
    actor: ActorContext;
    mode: CleanupMode;
    criteria: Record<string, any>;
    selection: SelectionResult;
  },
): Promise<string> {
  return store.insertAudit({
    student_id: args.studentId,
    student_name: args.studentName,
    performed_by: args.actor.userId,
    performed_by_email: args.actor.email,
    mode: args.mode,
    criteria: args.criteria,
    preview_count: args.selection.previewCount,
    deleted_map_ids: args.selection.matchedMapRows.map((r) => r.id),
    deleted_data_ids: args.selection.matchedDataRows.map((r) => r.id),
    integrity_warnings: args.selection.warnings,
  });
}

export async function runDryRun(
  store: CleanupStore,
  args: {
    studentId: string;
    studentName: string | null;
    actor: ActorContext;
    criteria: CleanupCriteria;
    criteriaRecord: Record<string, any>;
  },
): Promise<{ auditId: string; selection: SelectionResult }> {
  assertCleanupAuthorized(args.actor, 'dry_run');
  const selection = await scanStudent(store, args.studentId, args.criteria);
  const auditId = await recordAudit(store, {
    studentId: args.studentId,
    studentName: args.studentName,
    actor: args.actor,
    mode: 'dry_run',
    criteria: args.criteriaRecord,
    selection,
  });
  return { auditId, selection };
}

export async function runExportAudit(
  store: CleanupStore,
  args: {
    studentId: string;
    studentName: string | null;
    actor: ActorContext;
    criteriaRecord: Record<string, any>;
    selection: SelectionResult;
  },
): Promise<string> {
  assertCleanupAuthorized(args.actor, 'export');
  return recordAudit(store, { ...args, mode: 'export', criteria: args.criteriaRecord });
}

export async function runCleanup(
  store: CleanupStore,
  args: {
    studentId: string;
    studentName: string | null;
    actor: ActorContext;
    criteriaRecord: Record<string, any>;
    selection: SelectionResult;
    softDelete: boolean;
  },
): Promise<{ auditId: string; archived: number; deleted: number }> {
  const mode: CleanupMode = args.softDelete ? 'archive' : 'hard_delete';
  assertCleanupAuthorized(args.actor, mode);

  const mapIds = args.selection.matchedMapRows.map((r) => r.id);
  const dataIds = args.selection.matchedDataRows.map((r) => r.id);
  if (mapIds.length === 0 && dataIds.length === 0) {
    throw new Error('Nothing selected — run a preview first.');
  }

  const auditId = await recordAudit(store, {
    studentId: args.studentId,
    studentName: args.studentName,
    actor: args.actor,
    mode,
    criteria: args.criteriaRecord,
    selection: args.selection,
  });

  let archived = 0;
  if (args.softDelete) {
    const archives: ArchivePayload[] = [];
    if (mapIds.length > 0) {
      (await store.fetchFullMapRows(mapIds)).forEach((row) =>
        archives.push({
          audit_log_id: auditId,
          student_id: args.studentId,
          source_table: 'student_behavior_map',
          record_id: row.id,
          payload: row,
          archived_by: args.actor.userId,
        }),
      );
    }
    if (dataIds.length > 0) {
      (await store.fetchFullDataRows(dataIds)).forEach((row) =>
        archives.push({
          audit_log_id: auditId,
          student_id: args.studentId,
          source_table: 'behavior_session_data',
          record_id: row.id,
          payload: row,
          archived_by: args.actor.userId,
        }),
      );
    }
    if (archives.length > 0) await store.insertArchives(archives);
    archived = archives.length;
  }

  if (dataIds.length > 0) await store.deleteDataRows(dataIds);
  if (mapIds.length > 0) await store.deleteMapRows(mapIds);

  return { auditId, archived, deleted: mapIds.length + dataIds.length };
}

export async function runRestore(
  store: CleanupStore,
  args: { auditId: string; actor: ActorContext },
): Promise<number> {
  assertCleanupAuthorized(args.actor, 'archive');
  const res = await store.restoreArchive(args.auditId);
  return (res?.restored_map_rows ?? 0) + (res?.restored_data_rows ?? 0);
}
