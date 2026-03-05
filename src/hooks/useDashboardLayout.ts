import { useState, useCallback, useEffect } from 'react';
import type { Layout } from 'react-grid-layout';
import { getDefaultWidgetsForRole, WIDGET_REGISTRY } from '@/lib/widget-registry';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'nova-dashboard-layout';

interface StoredLayout {
  widgets: string[];
  layouts: Record<string, Layout[]>;
}

function generateDefaultLayouts(widgetIds: string[]): Record<string, Layout[]> {
  const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
  const layouts: Record<string, Layout[]> = {};

  for (const bp of Object.keys(cols)) {
    const bpCols = cols[bp as keyof typeof cols];
    let x = 0;
    let y = 0;
    layouts[bp] = widgetIds.map((id) => {
      const def = WIDGET_REGISTRY.find(w => w.id === id);
      const w = Math.min(def?.defaultLayout.w || 6, bpCols);
      const h = def?.defaultLayout.h || 4;
      const minW = def?.defaultLayout.minW || 2;
      const minH = def?.defaultLayout.minH || 2;

      if (x + w > bpCols) { x = 0; y += h; }
      const layout: Layout = { i: id, x, y, w, h, minW, minH };
      x += w;
      if (x >= bpCols) { x = 0; y += h; }
      return layout;
    });
  }
  return layouts;
}

export function useDashboardLayout() {
  const { userRole } = useAuth();
  const role = userRole || 'viewer';

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [layouts, setLayouts] = useState<Record<string, Layout[]>>({});
  const [initialized, setInitialized] = useState(false);

  // Load from localStorage or generate defaults
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredLayout = JSON.parse(stored);
        setActiveWidgets(parsed.widgets);
        setLayouts(parsed.layouts);
      } else {
        const defaults = getDefaultWidgetsForRole(role);
        setActiveWidgets(defaults);
        setLayouts(generateDefaultLayouts(defaults));
      }
    } catch {
      const defaults = getDefaultWidgetsForRole(role);
      setActiveWidgets(defaults);
      setLayouts(generateDefaultLayouts(defaults));
    }
    setInitialized(true);
  }, [role]);

  // Persist on change
  const persist = useCallback((widgets: string[], newLayouts: Record<string, Layout[]>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ widgets, layouts: newLayouts }));
    } catch { /* silent */ }
  }, []);

  const onLayoutChange = useCallback((_layout: Layout[], allLayouts: Record<string, Layout[]>) => {
    setLayouts(allLayouts);
    persist(activeWidgets, allLayouts);
  }, [activeWidgets, persist]);

  const addWidget = useCallback((widgetId: string) => {
    if (activeWidgets.includes(widgetId)) return;
    const newWidgets = [...activeWidgets, widgetId];
    const newLayouts = generateDefaultLayouts(newWidgets);
    // Preserve existing positions for existing widgets
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
    persist(newWidgets, newLayouts);
  }, [activeWidgets, layouts, persist]);

  const removeWidget = useCallback((widgetId: string) => {
    const newWidgets = activeWidgets.filter(id => id !== widgetId);
    const newLayouts: Record<string, Layout[]> = {};
    for (const bp of Object.keys(layouts)) {
      newLayouts[bp] = (layouts[bp] || []).filter(l => l.i !== widgetId);
    }
    setActiveWidgets(newWidgets);
    setLayouts(newLayouts);
    persist(newWidgets, newLayouts);
  }, [activeWidgets, layouts, persist]);

  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultWidgetsForRole(role);
    const defaultLayouts = generateDefaultLayouts(defaults);
    setActiveWidgets(defaults);
    setLayouts(defaultLayouts);
    persist(defaults, defaultLayouts);
  }, [role, persist]);

  return {
    activeWidgets,
    layouts,
    initialized,
    onLayoutChange,
    addWidget,
    removeWidget,
    resetToDefaults,
  };
}
