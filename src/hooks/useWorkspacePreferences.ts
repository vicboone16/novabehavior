/**
 * useWorkspacePreferences
 *
 * Persists per-user workspace preferences to localStorage:
 *  - layout: 'grid' | 'list' | 'split'
 *  - clientTabOrder: string[] (ordered student ids; missing ids are appended)
 *  - pinnedBehaviorIds: Record<studentId, string[]> (top behaviors for the quick-tally bar)
 *
 * Server-side persistence (user_preferences table) is a future enhancement —
 * keeping this purely client-side keeps Phase D self-contained.
 */
import { useCallback, useEffect, useState } from 'react';

export type WorkspaceLayoutPref = 'grid' | 'list' | 'split';

interface WorkspacePreferences {
  layout: WorkspaceLayoutPref;
  clientTabOrder: string[];
  pinnedBehaviorIds: Record<string, string[]>;
}

const STORAGE_KEY = 'nova_workspace_prefs_v1';

const DEFAULT_PREFS: WorkspacePreferences = {
  layout: 'grid',
  clientTabOrder: [],
  pinnedBehaviorIds: {},
};

function readPrefs(): WorkspacePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      layout:
        parsed.layout && ['grid', 'list', 'split'].includes(parsed.layout)
          ? parsed.layout
          : DEFAULT_PREFS.layout,
      clientTabOrder: Array.isArray(parsed.clientTabOrder) ? parsed.clientTabOrder : [],
      pinnedBehaviorIds:
        parsed.pinnedBehaviorIds && typeof parsed.pinnedBehaviorIds === 'object'
          ? parsed.pinnedBehaviorIds
          : {},
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useWorkspacePreferences() {
  const [prefs, setPrefs] = useState<WorkspacePreferences>(() => readPrefs());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore quota errors
    }
  }, [prefs]);

  const setLayout = useCallback((layout: WorkspaceLayoutPref) => {
    setPrefs((p) => ({ ...p, layout }));
  }, []);

  /** Replace the full client tab order (used after a drag operation). */
  const setClientTabOrder = useCallback((order: string[]) => {
    setPrefs((p) => ({ ...p, clientTabOrder: order }));
  }, []);

  /**
   * Returns the active student ids ordered by the saved preference, with any
   * unsaved ids appended at the end. Stale ids (no longer active) are filtered out.
   */
  const orderClientIds = useCallback(
    (activeIds: string[]) => {
      const saved = prefs.clientTabOrder.filter((id) => activeIds.includes(id));
      const tail = activeIds.filter((id) => !saved.includes(id));
      return [...saved, ...tail];
    },
    [prefs.clientTabOrder],
  );

  const togglePinnedBehavior = useCallback(
    (studentId: string, behaviorId: string, max = 5) => {
      setPrefs((p) => {
        const current = p.pinnedBehaviorIds[studentId] ?? [];
        const next = current.includes(behaviorId)
          ? current.filter((id) => id !== behaviorId)
          : current.length >= max
          ? current
          : [...current, behaviorId];
        return {
          ...p,
          pinnedBehaviorIds: { ...p.pinnedBehaviorIds, [studentId]: next },
        };
      });
    },
    [],
  );

  const getPinnedBehaviorIds = useCallback(
    (studentId: string) => prefs.pinnedBehaviorIds[studentId] ?? [],
    [prefs.pinnedBehaviorIds],
  );

  return {
    prefs,
    setLayout,
    setClientTabOrder,
    orderClientIds,
    togglePinnedBehavior,
    getPinnedBehaviorIds,
  };
}
