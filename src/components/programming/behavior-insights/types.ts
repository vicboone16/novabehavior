export type DateRangePreset =
  | 'today' | 'yesterday'
  | 'this_week' | 'last_week' | 'last_7' | 'last_14' | 'last_30'
  | 'this_month' | 'last_month' | 'this_quarter'
  | 'school_year' | 'all_time' | 'custom';

export type ComparisonMode =
  | 'none' | 'prev_equivalent' | 'prev_week' | 'prev_month'
  | 'baseline_intervention' | 'custom';

export type ViewMode =
  | 'overlay' | 'compare' | 'contrast' | 'small_multiples'
  | 'stacked' | 'grouped' | 'heatmap' | 'top_behaviors' | 'raw';

export type ChartMetric = 'count' | 'rate' | 'duration';
export type RollupPeriod = 'daily' | 'weekly' | 'monthly';

export type GroupBy =
  | 'none' | 'category' | 'function' | 'severity' | 'setting' | 'staff' | 'time_of_day';

export interface InsightsFilters {
  dateRange: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  comparison: ComparisonMode;
  selectedBehaviors: string[];
  viewMode: ViewMode;
  metric: ChartMetric;
  rollup: RollupPeriod;
  groupBy: GroupBy;
  showPercent: boolean;
  normalizeScale: boolean;
  includeZeroDays: boolean;
  annotateSpikes: boolean;
}

export interface BehaviorDayData {
  date: string;
  behaviorId: string;
  behaviorName: string;
  count: number;
  duration: number;
  sessions: number;
  rate: number;
}

export interface BehaviorSummaryRow {
  behaviorId: string;
  behaviorName: string;
  totalCount: number;
  pctOfTotal: number;
  avgPerDay: number;
  avgPerSession: number;
  peakDay: string;
  lastOccurrence: string;
  trendDelta: number | null;
  trendPct: number | null;
  clinicalFlag: 'increasing' | 'decreasing' | 'stable' | 'spike' | 'priority' | null;
}

export type InsightBadgeType =
  | 'spike' | 'worsening' | 'improving' | 'missing_data'
  | 'escalation' | 'co_occurring' | 'high_variability'
  | 'stable_reduction' | 'priority';

export interface InsightBadge {
  type: InsightBadgeType;
  label: string;
  behaviorId?: string;
  detail?: string;
}

export const DEFAULT_FILTERS: InsightsFilters = {
  dateRange: 'last_30',
  comparison: 'none',
  selectedBehaviors: [],
  viewMode: 'overlay',
  metric: 'count',
  rollup: 'daily',
  groupBy: 'none',
  showPercent: false,
  normalizeScale: false,
  includeZeroDays: true,
  annotateSpikes: true,
};
