/**
 * Three-way merge for Multi-Student Session drafts.
 *
 * When a draft is edited offline on one device while another device (or tab)
 * also edits the same session, a blind last-write-wins upsert silently discards
 * the other side's work. Instead we keep the last snapshot we successfully
 * synced (the "base") and merge local + server against it:
 *
 *  - chosenStudents / chosenBehaviors: set union, minus items intentionally
 *    removed on exactly one side (removal wins over an unchanged side).
 *  - configs: per (student × behavior) key. If only one side changed the config
 *    relative to base, that side wins. If both changed, the newer snapshot wins.
 */

export interface DraftSnapshot {
  chosenStudents: string[];
  chosenBehaviors: Record<string, string[]>;
  configs: Record<string, unknown>;
  updatedAt: number;
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Merge a list: keep items present on either side unless one side removed them. */
function mergeList(base: string[] | undefined, local: string[], server: string[]): string[] {
  const b = new Set(base ?? []);
  const l = new Set(local);
  const s = new Set(server);
  const all = new Set([...local, ...server]);
  const out: string[] = [];
  for (const item of all) {
    const removedLocally = b.has(item) && !l.has(item);
    const removedOnServer = b.has(item) && !s.has(item);
    if (removedLocally || removedOnServer) continue;
    out.push(item);
  }
  // Preserve local ordering first, then server-only additions.
  const ordered = [...local.filter((x) => out.includes(x)), ...out.filter((x) => !local.includes(x))];
  return ordered;
}

export function mergeDrafts(
  base: DraftSnapshot | null,
  local: DraftSnapshot,
  server: DraftSnapshot | null
): DraftSnapshot {
  if (!server) return local;
  if (!base) {
    // No shared ancestor: union everything, newer side wins on conflicting configs.
    base = { chosenStudents: [], chosenBehaviors: {}, configs: {}, updatedAt: 0 };
  }

  const chosenStudents = mergeList(base.chosenStudents, local.chosenStudents, server.chosenStudents);

  const chosenBehaviors: Record<string, string[]> = {};
  for (const sid of chosenStudents) {
    chosenBehaviors[sid] = mergeList(
      base.chosenBehaviors?.[sid],
      local.chosenBehaviors?.[sid] ?? [],
      server.chosenBehaviors?.[sid] ?? []
    );
  }

  const configs: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(local.configs ?? {}), ...Object.keys(server.configs ?? {})]);
  const localNewer = local.updatedAt >= server.updatedAt;
  for (const k of keys) {
    const bv = base.configs?.[k];
    const lv = local.configs?.[k];
    const sv = server.configs?.[k];
    const localChanged = !eq(lv, bv);
    const serverChanged = !eq(sv, bv);

    let winner: unknown;
    if (localChanged && !serverChanged) winner = lv;
    else if (!localChanged && serverChanged) winner = sv;
    else winner = localNewer ? lv ?? sv : sv ?? lv;

    if (winner !== undefined) configs[k] = winner;
  }

  // Drop configs for pairs that no longer exist after the merge.
  const validKeys = new Set(
    chosenStudents.flatMap((sid) => (chosenBehaviors[sid] || []).map((bid) => `${sid}::${bid}`))
  );
  for (const k of Object.keys(configs)) {
    if (validKeys.size > 0 && !validKeys.has(k)) delete configs[k];
  }

  return {
    chosenStudents,
    chosenBehaviors,
    configs,
    updatedAt: Math.max(local.updatedAt, server.updatedAt),
  };
}
