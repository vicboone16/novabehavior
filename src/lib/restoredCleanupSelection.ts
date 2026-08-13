/**
 * Pure selection + integrity logic for the Restored Behavior Cleanup tool.
 *
 * Kept free of Supabase / React so it can be unit tested directly and so the
 * exact same rules drive the dry-run preview, the CSV export and the delete.
 */

export interface CleanupCriteria {
  useNamePattern: boolean;
  namePattern: string;
  useReason: boolean;
  reasonPattern: string;
  useDateRange: boolean;
  fromDate: string; // yyyy-mm-dd
  toDate: string; // yyyy-mm-dd
  useMissingCanonical: boolean;
}

export interface CleanupMapRow {
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

export interface CleanupDataRow {
  id: string;
  session_id: string;
  behavior_id: string;
  behavior_name: string | null;
  frequency: number | null;
  duration_seconds: number | null;
  observation_minutes: number | null;
  created_at: string | null;
}

export interface SelectionInput {
  criteria: CleanupCriteria;
  mapRows: Omit<CleanupMapRow, never>[];
  dataRows: Omit<CleanupDataRow, 'behavior_name'>[];
  /** behavior_id -> display name (resolved from the behaviors table) */
  nameById: Map<string, string>;
  /** ids present in the canonical nt_behaviors registry */
  canonicalIds: Set<string>;
}

export interface SelectionResult {
  matchedMapRows: CleanupMapRow[];
  matchedDataRows: CleanupDataRow[];
  warnings: string[];
  totals: { freq: number; dur: number; obs: number };
  previewCount: number;
}

export function isWithinRange(
  iso: string | null | undefined,
  criteria: CleanupCriteria,
): boolean {
  if (!criteria.useDateRange) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (
    criteria.fromDate &&
    t < new Date(`${criteria.fromDate}T00:00:00`).getTime()
  )
    return false;
  if (criteria.toDate && t > new Date(`${criteria.toDate}T23:59:59`).getTime())
    return false;
  return true;
}

/** True when at least one enabled criterion matches AND the row is in range. */
export function matchesCriteria(
  label: string | null,
  row: { archived_reason?: string | null; bank_behavior_id?: string | null; behavior_id?: string | null },
  createdAt: string | null | undefined,
  criteria: CleanupCriteria,
  canonicalIds: Set<string>,
): boolean {
  const hits: boolean[] = [];
  const pat = criteria.namePattern.trim().toLowerCase();
  const reason = criteria.reasonPattern.trim().toLowerCase();

  if (criteria.useNamePattern) {
    hits.push(!!pat && (label ?? '').toLowerCase().includes(pat));
  }
  if (criteria.useReason) {
    hits.push(!!reason && (row.archived_reason ?? '').toLowerCase().includes(reason));
  }
  if (criteria.useMissingCanonical) {
    const canonicalId = row.bank_behavior_id ?? row.behavior_id ?? null;
    hits.push(!canonicalId || !canonicalIds.has(canonicalId));
  }

  if (hits.length === 0) return false; // no criteria enabled -> select nothing
  if (!hits.some(Boolean)) return false;
  return isWithinRange(createdAt, criteria);
}

export function selectRestoredRecords(input: SelectionInput): SelectionResult {
  const { criteria, mapRows, dataRows, nameById, canonicalIds } = input;

  const matchedMapRows = (mapRows as CleanupMapRow[]).filter((r) =>
    matchesCriteria(r.behavior_subtype, r, r.created_at, criteria, canonicalIds),
  );

  const matchedMapBehaviorIds = new Set(
    matchedMapRows.flatMap((m) =>
      [m.bank_behavior_id, m.behavior_entry_id].filter(Boolean),
    ) as string[],
  );

  const matchedDataRows: CleanupDataRow[] = dataRows
    .filter((r) => {
      const label = nameById.get(r.behavior_id) ?? null;
      return (
        matchedMapBehaviorIds.has(r.behavior_id) ||
        matchesCriteria(label, r, r.created_at, criteria, canonicalIds)
      );
    })
    .map((r) => ({ ...r, behavior_name: nameById.get(r.behavior_id) ?? null }));

  const warnings = buildIntegrityWarnings({
    matchedMapRows,
    matchedDataRows,
    allDataRows: dataRows,
    matchedMapBehaviorIds,
  });

  const totals = matchedDataRows.reduce(
    (acc, r) => ({
      freq: acc.freq + (r.frequency ?? 0),
      dur: acc.dur + (r.duration_seconds ?? 0),
      obs: acc.obs + Number(r.observation_minutes ?? 0),
    }),
    { freq: 0, dur: 0, obs: 0 },
  );

  return {
    matchedMapRows,
    matchedDataRows,
    warnings,
    totals,
    previewCount: matchedMapRows.length + matchedDataRows.length,
  };
}

export function buildIntegrityWarnings(args: {
  matchedMapRows: CleanupMapRow[];
  matchedDataRows: CleanupDataRow[];
  allDataRows: { id: string; behavior_id: string }[];
  matchedMapBehaviorIds: Set<string>;
}): string[] {
  const { matchedMapRows, matchedDataRows, allDataRows, matchedMapBehaviorIds } = args;
  const w: string[] = [];

  const unnamed = matchedDataRows.filter((r) => !r.behavior_name).length;
  if (unnamed > 0) {
    w.push(
      `${unnamed} session row(s) have no resolvable behavior name — they are already orphaned.`,
    );
  }

  const noCanonical = matchedMapRows.filter((m) => !m.bank_behavior_id).length;
  if (noCanonical > 0) {
    w.push(
      `${noCanonical} behavior mapping(s) have no canonical registry link (bank_behavior_id is empty).`,
    );
  }

  const matchedDataIds = new Set(matchedDataRows.map((r) => r.id));
  const survivingBehaviorIds = new Set(
    allDataRows.filter((r) => !matchedDataIds.has(r.id)).map((r) => r.behavior_id),
  );
  const orphaning = [...matchedMapBehaviorIds].filter((id) =>
    survivingBehaviorIds.has(id),
  );
  if (orphaning.length > 0) {
    w.push(
      `${orphaning.length} behavior(s) would lose their mapping while session data remains — those rows will become orphans.`,
    );
  }

  const activeMaps = matchedMapRows.filter((m) => m.active).length;
  if (activeMaps > 0) {
    w.push(
      `${activeMaps} matched mapping(s) are still marked active and may be in use by current sessions.`,
    );
  }

  const withData = matchedDataRows.filter(
    (r) => (r.frequency ?? 0) > 0 || (r.duration_seconds ?? 0) > 0,
  ).length;
  if (withData > 0) {
    w.push(`${withData} session row(s) contain real recorded frequency or duration data.`);
  }

  return w;
}

/** Simulates restoring an archived audit batch back into the live row sets. */
export function applyArchiveRestore<T extends { id: string }>(
  liveRows: T[],
  archivedPayloads: T[],
): T[] {
  const existing = new Set(liveRows.map((r) => r.id));
  return [...liveRows, ...archivedPayloads.filter((r) => !existing.has(r.id))];
}

export function isWithinRetention(
  retentionUntil: string,
  now: Date = new Date(),
): boolean {
  return new Date(retentionUntil).getTime() >= now.getTime();
}

export function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = Math.max(0, (page - 1) * pageSize);
  return rows.slice(start, start + pageSize);
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
