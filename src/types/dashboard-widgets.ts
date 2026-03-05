export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl';

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'core' | 'clinical' | 'classroom' | 'admin' | 'billing';
  allowedRoles: string[];
  defaultLayout: { w: number; h: number; minW?: number; minH?: number };
  requiredFeature?: string;
}

/** react-grid-layout Layout item */
export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface DashboardLayout {
  widgets: string[];
  gridLayouts: Record<string, GridLayoutItem[]>;
}

export interface UserDashboardPrefs {
  layout: DashboardLayout;
  hiddenWidgets: string[];
}
