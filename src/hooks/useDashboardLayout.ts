import { useState, useCallback, useEffect, useRef } from 'react';
import type { GridLayoutItem } from '@/types/dashboard-widgets';
import { getDefaultWidgetsForRole, WIDGET_REGISTRY } from '@/lib/widget-registry';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'nova-dashboard-layout';
const DEBOUNCE_MS = 1500;

interface StoredLayout {
  widgets: string[];
  layouts: Record<string, GridLayoutItem[]>;
}

function generateDefaultLayouts(widgetIds: string[]): Record<string, GridLayoutItem[]> {
  const cols: Record<string, number> = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
  const layouts: Record<string, GridLayoutItem[]> = {};

  for (const bp of Object.keys(cols)) {
    const bpCols = cols[bp];
    let x = 0;
    let y = 0;
    layouts[bp] = widgetIds.map((id) => {
      const def = WIDGET_REGISTRY.find(w => w.id === id);
      const w = Math.min(def?.defaultLayout.w || 6, bpCols);
      const h = def?.defaultLayout.h || 4;
      const minW = Math.min(def?.defaultLayout.minW || 2, bpCols);
      const minH = def?.defaultLayout.minH || 2;

      if (x + w > bpCols) { x = 0; y += h; }
      const layout: GridLayoutItem = { i: id, x, y, w, h, minW, minH };
      x += w;
      if (x >= bpCols) { x = 0; y += h; }
      return layout;
    });
  }
  return layouts;
}

export function useDashboardLayout() {
  const { userRole, user } = useAuth();
  const role = userRole || 'viewer';

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [layouts, setLayouts] = useState<Record<string, GridLayoutItem[]>>({});
  const [initialized, setInitialized] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Gate: only persist layout changes AFTER the user has actually interacted with the grid.
  // react-grid-layout fires onLayoutChange during initial render / compact, which causes
  // widget positions to drift on every sign-in.
  const userHasInteracted = useRef(false);

  // Reset interaction gate when user changes (sign-out/sign-in)
  useEffect(() => {
    userHasInteracted.current = false;
  }, [user]);

  // Load from DB first, fallback to localStorage, then defaults
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Try DB if authenticated
      if (user) {
        try {
          const { data } = await supabase
            .from('dashboard_layouts')
            .select('widgets, layouts')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!cancelled && data) {
            setActiveWidgets(data.widgets as string[]);
            setLayouts(data.layouts as unknown as Record<string, GridLayoutItem[]>);
            setInitialized(true);
            return;
          }
        } catch { /* fall through */ }
      }

      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && !cancelled) {
          const parsed: StoredLayout = JSON.parse(stored);
          setActiveWidgets(parsed.widgets);
          setLayouts(parsed.layouts);
          setInitialized(true);

          // Migrate localStorage to DB if authenticated
          if (user) {
            supabase.from('dashboard_layouts').upsert({
              user_id: user.id,
              widgets: parsed.widgets,
              layouts: parsed.layouts as any,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' }).then(() => {
              localStorage.removeItem(STORAGE_KEY);
            });
          }
          return;
        }
      } catch { /* silent */ }

      // Defaults
      if (!cancelled) {
        const defaults = getDefaultWidgetsForRole(role);
        setActiveWidgets(defaults);
        setLayouts(generateDefaultLayouts(defaults));
        setInitialized(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [role, user]);

  const persistToDb = useCallback((widgets: string[], newLayouts: Record<string, GridLayoutItem[]>) => {
    // Always write localStorage as immediate cache
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ widgets, layouts: newLayouts }));
    } catch { /* silent */ }

    // Debounced DB write
    if (!user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from('dashboard_layouts').upsert({
        user_id: user.id,
        widgets,
        layouts: newLayouts as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }).then(() => {
        localStorage.removeItem(STORAGE_KEY);
      });
    }, DEBOUNCE_MS);
  }, [user]);

  const onLayoutChange = useCallback((_layout: GridLayoutItem[], allLayouts: Record<string, GridLayoutItem[]>) => {
    setLayouts(allLayouts);
    // Only persist if the user has manually dragged/resized a widget.
    // This prevents the initial RGL compaction from overwriting stored positions.
    if (userHasInteracted.current) {
      persistToDb(activeWidgets, allLayouts);
    }
  }, [activeWidgets, persistToDb]);

  const addWidget = useCallback((widgetId: string) => {
    if (activeWidgets.includes(widgetId)) return;
    const newWidgets = [...activeWidgets, widgetId];
    const newLayouts = generateDefaultLayouts(newWidgets);
    for (const bp of Object.keys(layouts)) {
      if (newLayouts[bp]) {
        newLayouts[bp] = newLayouts[bp].map(l => {
          const existing = layouts[bp]?.find(e => e.i === l.i);
          return existing || l;
        });
      }
    }
    setActiveWidgets(newWidgets);
    setLayouts(newLayouts);
    persistToDb(newWidgets, newLayouts);
  }, [activeWidgets, layouts, persistToDb]);

  const removeWidget = useCallback((widgetId: string) => {
    const newWidgets = activeWidgets.filter(id => id !== widgetId);
    const newLayouts: Record<string, GridLayoutItem[]> = {};
    for (const bp of Object.keys(layouts)) {
      newLayouts[bp] = (layouts[bp] || []).filter(l => l.i !== widgetId);
    }
    setActiveWidgets(newWidgets);
    setLayouts(newLayouts);
    persistToDb(newWidgets, newLayouts);
  }, [activeWidgets, layouts, persistToDb]);

  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultWidgetsForRole(role);
    const defaultLayouts = generateDefaultLayouts(defaults);
    setActiveWidgets(defaults);
    setLayouts(defaultLayouts);
    persistToDb(defaults, defaultLayouts);
  }, [role, persistToDb]);

  const markInteraction = useCallback(() => {
    userHasInteracted.current = true;
  }, []);

  return {
    activeWidgets,
    layouts,
    initialized,
    onLayoutChange,
    addWidget,
    removeWidget,
    resetToDefaults,
    markInteraction,
  };
}
