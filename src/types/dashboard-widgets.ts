export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl';

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  category: 'core' | 'clinical' | 'classroom' | 'admin' | 'billing';
  /** Roles that can see this widget. Empty = everyone */
  allowedRoles: string[];
  /** Default grid layout (w, h in grid units) */
  defaultLayout: { w: number; h: number; minW?: number; minH?: number };
  /** Feature flag required (if any) */
  requiredFeature?: string;
}

export interface DashboardLayout {
  widgets: string[]; // widget IDs in order
  gridLayouts: Record<string, ReactGridLayout.Layout[]>; // breakpoint -> layouts
}

export interface UserDashboardPrefs {
  layout: DashboardLayout;
  hiddenWidgets: string[];
}
