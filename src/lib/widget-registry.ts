import type { WidgetDefinition } from '@/types/dashboard-widgets';

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: 'next-up',
    title: 'Today — Next Up',
    description: 'Upcoming appointments and clock-in actions',
    icon: 'CalendarClock',
    category: 'core',
    allowedRoles: [],
    defaultLayout: { w: 6, h: 4, minW: 3, minH: 3 },
  },
  {
    id: 'caseload-risk',
    title: 'Caseload Risk Overview',
    description: 'Client risk scores with trend indicators',
    icon: 'Shield',
    category: 'clinical',
    allowedRoles: [],
    requiredFeature: 'cid_enabled',
    defaultLayout: { w: 6, h: 5, minW: 4, minH: 4 },
  },
  {
    id: 'alerts-feed',
    title: 'Clinical Alerts',
    description: 'Active alerts by severity with resolution actions',
    icon: 'AlertTriangle',
    category: 'clinical',
    allowedRoles: [],
    requiredFeature: 'cid_enabled',
    defaultLayout: { w: 6, h: 5, minW: 3, minH: 3 },
  },
  {
    id: 'trending-behaviors',
    title: 'Trending Behaviors',
    description: 'Behaviors trending up or down across caseload',
    icon: 'TrendingUp',
    category: 'clinical',
    allowedRoles: [],
    requiredFeature: 'cid_enabled',
    defaultLayout: { w: 6, h: 4, minW: 3, minH: 3 },
  },
  {
    id: 'classroom-live',
    title: 'Classroom Live',
    description: 'Real-time classroom activity and supervisor signals',
    icon: 'Radio',
    category: 'classroom',
    allowedRoles: [],
    defaultLayout: { w: 6, h: 5, minW: 4, minH: 4 },
  },
  {
    id: 'supervisor-signals',
    title: 'Supervisor Signals',
    description: 'Real-time escalation and incident signals',
    icon: 'Zap',
    category: 'clinical',
    allowedRoles: ['admin', 'super_admin'],
    defaultLayout: { w: 6, h: 4, minW: 3, minH: 3 },
  },
  {
    id: 'billing-overview',
    title: 'Billing Overview',
    description: 'Revenue, claims, and billing pipeline status',
    icon: 'DollarSign',
    category: 'billing',
    allowedRoles: ['admin', 'super_admin'],
    defaultLayout: { w: 6, h: 4, minW: 3, minH: 3 },
  },
  {
    id: 'utilization',
    title: 'Authorization Utilization',
    description: 'Auth utilization rates and expiration forecasts',
    icon: 'Activity',
    category: 'billing',
    allowedRoles: ['admin', 'super_admin'],
    defaultLayout: { w: 6, h: 4, minW: 3, minH: 3 },
  },
  {
    id: 'recent-notes',
    title: 'Recent Session Notes',
    description: 'Your latest session notes with status',
    icon: 'FileText',
    category: 'clinical',
    allowedRoles: [],
    defaultLayout: { w: 6, h: 4, minW: 3, minH: 3 },
  },
  {
    id: 'parent-comms',
    title: 'Parent Communications',
    description: 'Recent messages with parents and caregivers',
    icon: 'MessageSquare',
    category: 'core',
    allowedRoles: [],
    defaultLayout: { w: 6, h: 4, minW: 3, minH: 3 },
  },
  {
    id: 'schedule-overview',
    title: 'Today\'s Schedule',
    description: 'Your appointments for today at a glance',
    icon: 'Calendar',
    category: 'core',
    allowedRoles: [],
    defaultLayout: { w: 6, h: 5, minW: 3, minH: 3 },
  },
  {
    id: 'personal-notes',
    title: 'My Notes & To-Do',
    description: 'Personal notes and task checklist',
    icon: 'StickyNote',
    category: 'core',
    allowedRoles: [],
    defaultLayout: { w: 4, h: 5, minW: 3, minH: 3 },
  },
  {
    id: 'service-requests',
    title: 'Service Requests',
    description: 'Active service requests filtered by role',
    icon: 'ClipboardList',
    category: 'admin',
    allowedRoles: [],
    defaultLayout: { w: 6, h: 4, minW: 3, minH: 3 },
  },
];

/** Role-based default widget presets */
export const ROLE_PRESETS: Record<string, string[]> = {
  // Core widgets everyone sees
  _core: ['next-up', 'schedule-overview'],
  // Role-specific additions
  super_admin: ['caseload-risk', 'alerts-feed', 'trending-behaviors', 'classroom-live', 'supervisor-signals', 'billing-overview', 'utilization', 'recent-notes'],
  admin: ['caseload-risk', 'alerts-feed', 'trending-behaviors', 'classroom-live', 'supervisor-signals', 'billing-overview', 'utilization', 'recent-notes'],
  // 'staff' is the resolved role for bcba/rbt in AuthContext
  staff: ['caseload-risk', 'alerts-feed', 'trending-behaviors', 'classroom-live', 'recent-notes'],
  bcba: ['caseload-risk', 'alerts-feed', 'trending-behaviors', 'classroom-live', 'supervisor-signals', 'recent-notes'],
  rbt: ['classroom-live', 'trending-behaviors', 'recent-notes'],
  teacher: ['classroom-live', 'parent-comms'],
  parent: ['trending-behaviors', 'parent-comms'],
  viewer: [],
};

export function getDefaultWidgetsForRole(role: string): string[] {
  const core = ROLE_PRESETS._core;
  const roleWidgets = ROLE_PRESETS[role] || [];
  return [...core, ...roleWidgets];
}

export function getAvailableWidgetsForRole(role: string): WidgetDefinition[] {
  return WIDGET_REGISTRY.filter(w => {
    if (w.allowedRoles.length === 0) return true;
    // Admins can add any widget
    if (role === 'super_admin' || role === 'admin') return true;
    return w.allowedRoles.includes(role);
  });
}
