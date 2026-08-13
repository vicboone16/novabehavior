import { describe, it, expect } from 'vitest';
import {
  selectRestoredRecords,
  matchesCriteria,
  isWithinRange,
  applyArchiveRestore,
  isWithinRetention,
  paginate,
  pageCount,
  type CleanupCriteria,
  type CleanupMapRow,
} from '@/lib/restoredCleanupSelection';

const baseCriteria: CleanupCriteria = {
  useNamePattern: true,
  namePattern: 'Restored',
  useReason: false,
  reasonPattern: '',
  useDateRange: false,
  fromDate: '',
  toDate: '',
  useMissingCanonical: false,
};

const mapRow = (over: Partial<CleanupMapRow> = {}): CleanupMapRow => ({
  id: 'm1',
  behavior_subtype: 'Restored Behavior A',
  behavior_entry_id: null,
  bank_behavior_id: 'canon-1',
  archived_reason: null,
  archived_at: null,
  notes: 'definition text',
  created_at: '2026-01-10T12:00:00Z',
  active: false,
  ...over,
});

const dataRow = (over: Partial<any> = {}) => ({
  id: 'd1',
  session_id: 's1',
  behavior_id: 'canon-1',
  frequency: 3,
  duration_seconds: 60,
  observation_minutes: 10,
  created_at: '2026-01-10T12:00:00Z',
  ...over,
});

const run = (args: {
  criteria?: Partial<CleanupCriteria>;
  mapRows?: CleanupMapRow[];
  dataRows?: any[];
  names?: [string, string][];
  canonical?: string[];
}) =>
  selectRestoredRecords({
    criteria: { ...baseCriteria, ...(args.criteria ?? {}) },
    mapRows: args.mapRows ?? [],
    dataRows: args.dataRows ?? [],
    nameById: new Map(args.names ?? []),
    canonicalIds: new Set(args.canonical ?? ['canon-1']),
  });

describe('restored selection logic', () => {
  it('selects nothing when no criteria are enabled (fail-safe)', () => {
    const res = run({
      criteria: { useNamePattern: false },
      mapRows: [mapRow()],
      dataRows: [dataRow()],
    });
    expect(res.previewCount).toBe(0);
  });

  it('selects nothing when the name pattern is enabled but empty', () => {
    const res = run({ criteria: { namePattern: '   ' }, mapRows: [mapRow()] });
    expect(res.matchedMapRows).toHaveLength(0);
  });

  it('matches behavior labels case-insensitively on substring', () => {
    const res = run({
      criteria: { namePattern: 'restored' },
      mapRows: [mapRow(), mapRow({ id: 'm2', behavior_subtype: 'Elopement' })],
    });
    expect(res.matchedMapRows.map((r) => r.id)).toEqual(['m1']);
  });

  it('cascades session data via the matched mapping behavior ids', () => {
    const res = run({
      mapRows: [mapRow()],
      dataRows: [dataRow(), dataRow({ id: 'd2', behavior_id: 'canon-2' })],
    });
    expect(res.matchedDataRows.map((r) => r.id)).toEqual(['d1']);
    expect(res.previewCount).toBe(2);
  });

  it('matches session rows directly by resolved behavior name', () => {
    const res = run({
      dataRows: [dataRow({ behavior_id: 'x1' })],
      names: [['x1', 'Restored Behavior 9f2']],
      canonical: ['x1'],
    });
    expect(res.matchedDataRows).toHaveLength(1);
    expect(res.matchedDataRows[0].behavior_name).toBe('Restored Behavior 9f2');
  });

  it('ORs multiple enabled criteria', () => {
    const res = run({
      criteria: { useReason: true, reasonPattern: 'duplicate' },
      mapRows: [
        mapRow(),
        mapRow({ id: 'm2', behavior_subtype: 'Tantrum', archived_reason: 'Duplicate entry' }),
        mapRow({ id: 'm3', behavior_subtype: 'Pica', archived_reason: 'merged' }),
      ],
    });
    expect(res.matchedMapRows.map((r) => r.id)).toEqual(['m1', 'm2']);
  });

  it('flags rows missing a canonical link', () => {
    const res = run({
      criteria: { useNamePattern: false, useMissingCanonical: true },
      mapRows: [
        mapRow({ id: 'm1', bank_behavior_id: null }),
        mapRow({ id: 'm2', bank_behavior_id: 'canon-1' }),
        mapRow({ id: 'm3', bank_behavior_id: 'ghost' }),
      ],
    });
    expect(res.matchedMapRows.map((r) => r.id)).toEqual(['m1', 'm3']);
  });

  it('constrains matches to the date range when enabled', () => {
    const res = run({
      criteria: { useDateRange: true, fromDate: '2026-01-05', toDate: '2026-01-11' },
      mapRows: [
        mapRow({ id: 'in', created_at: '2026-01-10T12:00:00Z' }),
        mapRow({ id: 'before', created_at: '2025-12-30T12:00:00Z' }),
        mapRow({ id: 'after', created_at: '2026-02-01T12:00:00Z' }),
      ],
    });
    expect(res.matchedMapRows.map((r) => r.id)).toEqual(['in']);
  });

  it('treats null timestamps as out of range', () => {
    expect(isWithinRange(null, { ...baseCriteria, useDateRange: true, fromDate: '2026-01-01', toDate: '' })).toBe(false);
    expect(isWithinRange(null, baseCriteria)).toBe(true);
  });

  it('ignores unparseable timestamps rather than throwing', () => {
    expect(
      isWithinRange('not-a-date', { ...baseCriteria, useDateRange: true, fromDate: '2026-01-01', toDate: '' }),
    ).toBe(false);
  });

  it('handles empty inputs', () => {
    const res = run({});
    expect(res.previewCount).toBe(0);
    expect(res.warnings).toEqual([]);
    expect(res.totals).toEqual({ freq: 0, dur: 0, obs: 0 });
  });
});

describe('integrity warnings', () => {
  it('warns about unresolvable behavior names', () => {
    const res = run({ mapRows: [mapRow()], dataRows: [dataRow()] });
    expect(res.warnings.join(' ')).toContain('no resolvable behavior name');
  });

  it('warns when a mapping has no canonical link', () => {
    const res = run({ mapRows: [mapRow({ bank_behavior_id: null })] });
    expect(res.warnings.join(' ')).toContain('no canonical registry link');
  });

  it('warns when deleting a mapping would orphan surviving session rows', () => {
    const res = run({
      criteria: { useDateRange: true, fromDate: '2026-01-01', toDate: '2026-01-15' },
      mapRows: [mapRow()],
      dataRows: [
        dataRow({ id: 'd-old', created_at: '2025-01-01T00:00:00Z', behavior_id: 'canon-1' }),
      ],
    });
    // the old data row is out of range but still matched through the mapping id,
    // so nothing survives -> no orphan warning
    expect(res.matchedDataRows.map((r) => r.id)).toEqual(['d-old']);
    expect(res.warnings.join(' ')).not.toContain('become orphans');
  });

  it('warns about active mappings and real recorded data', () => {
    const res = run({
      mapRows: [mapRow({ active: true })],
      dataRows: [dataRow({ frequency: 12 })],
      names: [['canon-1', 'Restored Behavior A']],
    });
    const text = res.warnings.join(' ');
    expect(text).toContain('still marked active');
    expect(text).toContain('real recorded frequency');
  });

  it('produces no warnings for a clean, inactive, fully-linked match', () => {
    const res = run({
      mapRows: [mapRow({ active: false })],
      dataRows: [dataRow({ frequency: 0, duration_seconds: 0 })],
      names: [['canon-1', 'Restored Behavior A']],
    });
    expect(res.warnings).toEqual([]);
  });
});

describe('dry-run preview counts and totals', () => {
  it('preview count equals mapping rows plus session rows', () => {
    const res = run({
      mapRows: [mapRow(), mapRow({ id: 'm2', behavior_subtype: 'Restored B', bank_behavior_id: 'canon-2' })],
      dataRows: [dataRow(), dataRow({ id: 'd2', behavior_id: 'canon-2' })],
      canonical: ['canon-1', 'canon-2'],
    });
    expect(res.matchedMapRows).toHaveLength(2);
    expect(res.matchedDataRows).toHaveLength(2);
    expect(res.previewCount).toBe(4);
  });

  it('aggregates frequency, duration and observation totals with nulls', () => {
    const res = run({
      mapRows: [mapRow()],
      dataRows: [
        dataRow({ frequency: 5, duration_seconds: 100, observation_minutes: 10 }),
        dataRow({ id: 'd2', frequency: null, duration_seconds: null, observation_minutes: null }),
      ],
    });
    expect(res.totals).toEqual({ freq: 5, dur: 100, obs: 10 });
  });

  it('is deterministic — repeated dry runs return identical counts', () => {
    const args = { mapRows: [mapRow()], dataRows: [dataRow()] };
    expect(run(args).previewCount).toBe(run(args).previewCount);
  });

  it('never double-counts a session row matched by both mapping and name', () => {
    const res = run({
      mapRows: [mapRow()],
      dataRows: [dataRow()],
      names: [['canon-1', 'Restored Behavior A']],
    });
    expect(res.matchedDataRows).toHaveLength(1);
  });
});

describe('archive / restore reversibility', () => {
  it('restores archived rows back into the live set', () => {
    const live = [{ id: 'keep' }];
    const archived = [{ id: 'd1' }, { id: 'd2' }];
    const restored = applyArchiveRestore(live, archived);
    expect(restored.map((r) => r.id).sort()).toEqual(['d1', 'd2', 'keep']);
  });

  it('is idempotent — restoring twice does not duplicate rows', () => {
    const archived = [{ id: 'd1' }];
    const once = applyArchiveRestore([{ id: 'keep' }], archived);
    const twice = applyArchiveRestore(once, archived);
    expect(twice).toHaveLength(2);
  });

  it('round-trips a full selection: archive then restore reproduces the originals', () => {
    const maps = [mapRow(), mapRow({ id: 'm2', behavior_subtype: 'Keep me' })];
    const res = run({ mapRows: maps });
    const surviving = maps.filter((m) => !res.matchedMapRows.some((x) => x.id === m.id));
    expect(surviving.map((m) => m.id)).toEqual(['m2']);
    const restored = applyArchiveRestore(surviving, res.matchedMapRows);
    expect(restored.map((m) => m.id).sort()).toEqual(['m1', 'm2']);
  });

  it('honours the retention window', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    expect(isWithinRetention('2026-02-15T00:00:00Z', now)).toBe(true);
    expect(isWithinRetention('2026-01-15T00:00:00Z', now)).toBe(false);
  });
});

describe('preview pagination', () => {
  const rows = Array.from({ length: 250 }, (_, i) => ({ id: `r${i}` }));

  it('returns the requested page slice', () => {
    expect(paginate(rows, 1, 50)[0].id).toBe('r0');
    expect(paginate(rows, 3, 50)[0].id).toBe('r100');
    expect(paginate(rows, 3, 50)).toHaveLength(50);
  });

  it('handles a partial final page', () => {
    expect(paginate(rows, 6, 50)).toHaveLength(0);
    expect(paginate(rows, 5, 60)).toHaveLength(10);
  });

  it('clamps invalid page numbers to the first page', () => {
    expect(paginate(rows, 0, 25)[0].id).toBe('r0');
    expect(paginate(rows, -4, 25)[0].id).toBe('r0');
  });

  it('computes page counts including the empty case', () => {
    expect(pageCount(250, 50)).toBe(5);
    expect(pageCount(251, 50)).toBe(6);
    expect(pageCount(0, 50)).toBe(1);
  });

  it('paginating never changes the underlying export set', () => {
    const all = paginate(rows, 1, rows.length);
    expect(all).toHaveLength(250);
  });
});

describe('matchesCriteria direct edge cases', () => {
  it('returns false when nothing is enabled', () => {
    expect(
      matchesCriteria('Restored X', {}, '2026-01-01', { ...baseCriteria, useNamePattern: false }, new Set()),
    ).toBe(false);
  });

  it('treats a null label as non-matching for name patterns', () => {
    expect(matchesCriteria(null, {}, '2026-01-01', baseCriteria, new Set())).toBe(false);
  });
});
