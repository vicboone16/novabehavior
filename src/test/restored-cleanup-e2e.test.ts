import { describe, it, expect, beforeEach } from 'vitest';
import {
  scanStudent,
  runDryRun,
  runExportAudit,
  runCleanup,
  runRestore,
  buildCleanupCsvRows,
  toCsv,
  canRunCleanup,
  type ActorContext,
  type ArchivePayload,
  type AuditInput,
  type CleanupStore,
} from '@/lib/restoredCleanupFlow';
import type { CleanupCriteria, CleanupMapRow } from '@/lib/restoredCleanupSelection';

const STUDENT = 'stu-1';
const RETENTION_DAYS = 30;

// ── In-memory backend mirroring the real tables ──────────────────
class MemoryStore implements CleanupStore {
  maps: (CleanupMapRow & { student_id: string })[] = [];
  data: any[] = [];
  canonical = new Set<string>(['canon-1', 'canon-2']);
  names = new Map<string, string>();
  audits: (AuditInput & { id: string; restored_at: string | null })[] = [];
  archives: (ArchivePayload & { retention_until: string })[] = [];
  seq = 0;

  async fetchMapRows(studentId: string) {
    return this.maps.filter((m) => m.student_id === studentId);
  }
  async fetchDataRows(studentId: string) {
    return this.data.filter((d) => d.student_id === studentId);
  }
  async fetchCanonicalIds() {
    return this.canonical;
  }
  async fetchBehaviorNames(ids: string[]) {
    return new Map(ids.filter((i) => this.names.has(i)).map((i) => [i, this.names.get(i)!]));
  }
  async fetchFullMapRows(ids: string[]) {
    return this.maps.filter((m) => ids.includes(m.id)).map((m) => ({ ...m }));
  }
  async fetchFullDataRows(ids: string[]) {
    return this.data.filter((d) => ids.includes(d.id)).map((d) => ({ ...d }));
  }
  async insertAudit(input: AuditInput) {
    const id = `audit-${++this.seq}`;
    this.audits.push({ ...input, id, restored_at: null });
    return id;
  }
  async insertArchives(rows: ArchivePayload[]) {
    const until = new Date(Date.now() + RETENTION_DAYS * 86400000).toISOString();
    rows.forEach((r) => this.archives.push({ ...r, retention_until: until }));
  }
  async deleteMapRows(ids: string[]) {
    this.maps = this.maps.filter((m) => !ids.includes(m.id));
  }
  async deleteDataRows(ids: string[]) {
    this.data = this.data.filter((d) => !ids.includes(d.id));
  }
  async restoreArchive(auditLogId: string) {
    const now = Date.now();
    const batch = this.archives.filter(
      (a) => a.audit_log_id === auditLogId && new Date(a.retention_until).getTime() >= now,
    );
    let m = 0;
    let d = 0;
    batch.forEach((a) => {
      if (a.source_table === 'student_behavior_map') {
        if (!this.maps.some((x) => x.id === a.record_id)) {
          this.maps.push(a.payload as any);
          m++;
        }
      } else if (!this.data.some((x) => x.id === a.record_id)) {
        this.data.push(a.payload);
        d++;
      }
    });
    if (batch.length > 0) {
      this.archives = this.archives.filter((a) => a.audit_log_id !== auditLogId);
      const audit = this.audits.find((a) => a.id === auditLogId);
      if (audit) audit.restored_at = new Date().toISOString();
    }
    return { restored_map_rows: m, restored_data_rows: d };
  }

  /** Mirrors the scheduled retention purge job. */
  purgeExpired(now = new Date()) {
    const before = this.archives.length;
    this.archives = this.archives.filter(
      (a) => new Date(a.retention_until).getTime() >= now.getTime(),
    );
    return before - this.archives.length;
  }
}

const admin: ActorContext = { userId: 'u-admin', email: 'admin@x.org', role: 'admin' };
const manager: ActorContext = { userId: 'u-mgr', email: 'mgr@x.org', role: 'manager' };
const staff: ActorContext = { userId: 'u-staff', email: 'staff@x.org', role: 'staff' };
const anon: ActorContext = { userId: null, email: null, role: 'admin' };

const criteria = (over: Partial<CleanupCriteria> = {}): CleanupCriteria => ({
  useNamePattern: true,
  namePattern: 'Restored',
  useReason: false,
  reasonPattern: '',
  useDateRange: false,
  fromDate: '',
  toDate: '',
  useMissingCanonical: false,
  ...over,
});

const criteriaRecord = { name_pattern: 'Restored', purpose: 'duplicate cleanup' };

function seed(store: MemoryStore) {
  store.maps = [
    {
      id: 'm1',
      student_id: STUDENT,
      behavior_subtype: 'Restored Behavior A',
      behavior_entry_id: null,
      bank_behavior_id: 'canon-1',
      archived_reason: 'restore duplicate',
      archived_at: null,
      notes: 'def A',
      created_at: '2026-01-10T00:00:00Z',
      active: false,
    },
    {
      id: 'm2',
      student_id: STUDENT,
      behavior_subtype: 'Elopement',
      behavior_entry_id: null,
      bank_behavior_id: 'canon-2',
      archived_reason: null,
      archived_at: null,
      notes: 'keep',
      created_at: '2026-01-11T00:00:00Z',
      active: true,
    },
    {
      id: 'm3',
      student_id: 'other-student',
      behavior_subtype: 'Restored Behavior Z',
      behavior_entry_id: null,
      bank_behavior_id: null,
      archived_reason: null,
      archived_at: null,
      notes: null,
      created_at: '2026-01-10T00:00:00Z',
      active: false,
    },
  ];
  store.data = [
    {
      id: 'd1',
      student_id: STUDENT,
      session_id: 'sess-1',
      behavior_id: 'canon-1',
      frequency: 4,
      duration_seconds: 120,
      observation_minutes: 30,
      created_at: '2026-01-10T00:00:00Z',
    },
    {
      id: 'd2',
      student_id: STUDENT,
      session_id: 'sess-1',
      behavior_id: 'canon-2',
      frequency: 2,
      duration_seconds: 30,
      observation_minutes: 30,
      created_at: '2026-01-11T00:00:00Z',
    },
    {
      id: 'd3',
      student_id: 'other-student',
      session_id: 'sess-9',
      behavior_id: 'canon-1',
      frequency: 9,
      duration_seconds: 90,
      observation_minutes: 10,
      created_at: '2026-01-10T00:00:00Z',
    },
  ];
  store.names = new Map([
    ['canon-1', 'Restored Behavior A'],
    ['canon-2', 'Elopement'],
  ]);
}

describe('restored cleanup end-to-end flow', () => {
  let store: MemoryStore;
  beforeEach(() => {
    store = new MemoryStore();
    seed(store);
  });

  it('runs dry run -> export -> archive -> restore without data loss', async () => {
    // 1. Dry run
    const dry = await runDryRun(store, {
      studentId: STUDENT,
      studentName: 'Lorenzo',
      actor: admin,
      criteria: criteria(),
      criteriaRecord,
    });
    expect(dry.selection.previewCount).toBe(2); // m1 + d1
    expect(store.maps).toHaveLength(3); // nothing deleted
    expect(store.data).toHaveLength(3);
    expect(store.audits[0].mode).toBe('dry_run');

    // 2. CSV export (and its disclosure record)
    const csv = toCsv(
      buildCleanupCsvRows(dry.selection, {
        exportedBy: admin.email,
        purpose: 'duplicate cleanup',
        exportedAt: '2026-02-01T00:00:00Z',
      }),
    );
    expect(csv).toContain('FERPA-protected education record');
    expect(csv).toContain('student_behavior_map,m1');
    expect(csv).toContain('behavior_session_data,d1');
    expect(csv).not.toContain(',m2,');
    await runExportAudit(store, {
      studentId: STUDENT,
      studentName: 'Lorenzo',
      actor: admin,
      criteriaRecord,
      selection: dry.selection,
    });
    expect(store.audits.map((a) => a.mode)).toEqual(['dry_run', 'export']);

    // 3. Archive (soft delete)
    const res = await runCleanup(store, {
      studentId: STUDENT,
      studentName: 'Lorenzo',
      actor: admin,
      criteriaRecord,
      selection: dry.selection,
      softDelete: true,
    });
    expect(res.archived).toBe(2);
    expect(store.maps.map((m) => m.id).sort()).toEqual(['m2', 'm3']);
    expect(store.data.map((d) => d.id).sort()).toEqual(['d2', 'd3']);

    // 4. Restore
    const restored = await runRestore(store, { auditId: res.auditId, actor: admin });
    expect(restored).toBe(2);
    expect(store.maps.map((m) => m.id).sort()).toEqual(['m1', 'm2', 'm3']);
    expect(store.data.map((d) => d.id).sort()).toEqual(['d1', 'd2', 'd3']);

    // 5. A re-scan finds the same set again — the round trip is lossless
    const after = await scanStudent(store, STUDENT, criteria());
    expect(after.previewCount).toBe(dry.selection.previewCount);
    expect(after.matchedMapRows[0].notes).toBe('def A');
    expect(after.matchedDataRows[0].frequency).toBe(4);
  });

  it('never touches records belonging to another student', async () => {
    const sel = await scanStudent(store, STUDENT, criteria());
    await runCleanup(store, {
      studentId: STUDENT,
      studentName: 'Lorenzo',
      actor: admin,
      criteriaRecord,
      selection: sel,
      softDelete: false,
    });
    expect(store.maps.some((m) => m.id === 'm3')).toBe(true);
    expect(store.data.some((d) => d.id === 'd3')).toBe(true);
  });

  it('hard delete leaves nothing to restore', async () => {
    const sel = await scanStudent(store, STUDENT, criteria());
    const res = await runCleanup(store, {
      studentId: STUDENT,
      studentName: 'Lorenzo',
      actor: admin,
      criteriaRecord,
      selection: sel,
      softDelete: false,
    });
    expect(store.archives).toHaveLength(0);
    await expect(runRestore(store, { auditId: res.auditId, actor: admin })).resolves.toBe(0);
    expect(store.maps.some((m) => m.id === 'm1')).toBe(false);
  });

  it('refuses to run when nothing is selected', async () => {
    const empty = await scanStudent(store, STUDENT, criteria({ namePattern: 'zzz' }));
    await expect(
      runCleanup(store, {
        studentId: STUDENT,
        studentName: 'Lorenzo',
        actor: admin,
        criteriaRecord,
        selection: empty,
        softDelete: true,
      }),
    ).rejects.toThrow(/Nothing selected/);
  });

  describe('edge-case criteria inputs', () => {
    it('archived-reason criterion selects the reason match and cascades its data', async () => {
      const sel = await scanStudent(
        store,
        STUDENT,
        criteria({ useNamePattern: false, useReason: true, reasonPattern: 'duplicate' }),
      );
      expect(sel.matchedMapRows.map((r) => r.id)).toEqual(['m1']);
      expect(sel.matchedDataRows.map((r) => r.id)).toEqual(['d1']);
    });

    it('date range excludes rows created outside the window', async () => {
      const sel = await scanStudent(
        store,
        STUDENT,
        criteria({ useDateRange: true, fromDate: '2026-01-01', toDate: '2026-01-05' }),
      );
      expect(sel.previewCount).toBe(0);
    });

    it('missing-canonical criterion on a student with only linked rows selects nothing', async () => {
      const sel = await scanStudent(
        store,
        STUDENT,
        criteria({ useNamePattern: false, useMissingCanonical: true }),
      );
      expect(sel.previewCount).toBe(0);
    });

    it('missing-canonical criterion catches unlinked rows', async () => {
      store.canonical = new Set(['canon-2']);
      const sel = await scanStudent(
        store,
        STUDENT,
        criteria({ useNamePattern: false, useMissingCanonical: true }),
      );
      expect(sel.matchedMapRows.map((r) => r.id)).toEqual(['m1']);
      expect(sel.warnings.length).toBeGreaterThan(0);
    });

    it('no criteria enabled is a no-op safety net', async () => {
      const sel = await scanStudent(store, STUDENT, criteria({ useNamePattern: false }));
      expect(sel.previewCount).toBe(0);
    });

    it('combined criteria widen the match and the archive round-trips all of it', async () => {
      store.canonical = new Set(['canon-2']);
      const sel = await scanStudent(
        store,
        STUDENT,
        criteria({ useMissingCanonical: true, useReason: true, reasonPattern: 'restore' }),
      );
      const res = await runCleanup(store, {
        studentId: STUDENT,
        studentName: 'Lorenzo',
        actor: manager,
        criteriaRecord,
        selection: sel,
        softDelete: true,
      });
      expect(res.deleted).toBe(sel.previewCount);
      const restored = await runRestore(store, { auditId: res.auditId, actor: manager });
      expect(restored).toBe(res.deleted);
    });

    it('handles a very large matched set', async () => {
      store.data = Array.from({ length: 5000 }, (_, i) => ({
        id: `big-${i}`,
        student_id: STUDENT,
        session_id: 'sess-big',
        behavior_id: 'canon-1',
        frequency: 1,
        duration_seconds: 2,
        observation_minutes: 1,
        created_at: '2026-01-10T00:00:00Z',
      }));
      const sel = await scanStudent(store, STUDENT, criteria());
      expect(sel.matchedDataRows).toHaveLength(5000);
      expect(sel.totals.freq).toBe(5000);
      const res = await runCleanup(store, {
        studentId: STUDENT,
        studentName: 'Lorenzo',
        actor: admin,
        criteriaRecord,
        selection: sel,
        softDelete: true,
      });
      expect(store.data).toHaveLength(0);
      expect(await runRestore(store, { auditId: res.auditId, actor: admin })).toBe(
        res.deleted,
      );
    });
  });

  describe('retention purge', () => {
    it('restores inside the window and fails closed after it', async () => {
      const sel = await scanStudent(store, STUDENT, criteria());
      const res = await runCleanup(store, {
        studentId: STUDENT,
        studentName: 'Lorenzo',
        actor: admin,
        criteriaRecord,
        selection: sel,
        softDelete: true,
      });
      const purgedEarly = store.purgeExpired(new Date(Date.now() + 5 * 86400000));
      expect(purgedEarly).toBe(0);

      const purged = store.purgeExpired(new Date(Date.now() + 31 * 86400000));
      expect(purged).toBe(2);
      expect(await runRestore(store, { auditId: res.auditId, actor: admin })).toBe(0);
    });
  });

  describe('role authorization', () => {
    it('allows admin, super_admin and manager only', () => {
      expect(canRunCleanup('admin')).toBe(true);
      expect(canRunCleanup('super_admin')).toBe(true);
      expect(canRunCleanup('manager')).toBe(true);
      expect(canRunCleanup('staff')).toBe(false);
      expect(canRunCleanup('teacher')).toBe(false);
      expect(canRunCleanup(null)).toBe(false);
    });

    it('blocks unauthorized roles from every action', async () => {
      const sel = await scanStudent(store, STUDENT, criteria());
      await expect(
        runDryRun(store, {
          studentId: STUDENT,
          studentName: 'L',
          actor: staff,
          criteria: criteria(),
          criteriaRecord,
        }),
      ).rejects.toThrow(/admin or manager/);
      await expect(
        runExportAudit(store, {
          studentId: STUDENT,
          studentName: 'L',
          actor: staff,
          criteriaRecord,
          selection: sel,
        }),
      ).rejects.toThrow(/admin or manager/);
      await expect(
        runCleanup(store, {
          studentId: STUDENT,
          studentName: 'L',
          actor: staff,
          criteriaRecord,
          selection: sel,
          softDelete: true,
        }),
      ).rejects.toThrow(/admin or manager/);
      await expect(runRestore(store, { auditId: 'x', actor: staff })).rejects.toThrow(
        /admin or manager/,
      );
      // nothing was written or removed
      expect(store.audits).toHaveLength(0);
      expect(store.maps).toHaveLength(3);
    });

    it('blocks signed-out actors even with an admin role claim', async () => {
      await expect(
        runDryRun(store, {
          studentId: STUDENT,
          studentName: 'L',
          actor: anon,
          criteria: criteria(),
          criteriaRecord,
        }),
      ).rejects.toThrow(/signed in/);
    });
  });
});
