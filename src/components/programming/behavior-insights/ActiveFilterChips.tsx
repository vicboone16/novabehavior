import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InsightsFilters, DateRangePreset, ComparisonMode, GroupBy, ViewMode } from './types';
import { DEFAULT_FILTERS } from './types';

interface ActiveFilterChipsProps {
  filters: InsightsFilters;
  onChange: (filters: InsightsFilters) => void;
  behaviorCount: number;
}

const DATE_LABELS: Record<DateRangePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  last_week: 'Last Week',
  last_7: 'Last 7 Days',
  last_14: 'Last 14 Days',
  last_30: 'Last 30 Days',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  school_year: 'School Year',
  all_time: 'All Time',
  custom: 'Custom Range',
};

const COMPARE_LABELS: Record<ComparisonMode, string> = {
  none: '',
  prev_equivalent: 'vs Prior Equivalent',
  prev_week: 'vs Prior Week',
  prev_month: 'vs Prior Month',
  baseline_intervention: 'Baseline vs Intervention',
  custom: 'Custom Comparison',
};

const GROUP_LABELS: Record<GroupBy, string> = {
  none: '',
  category: 'By Category',
  function: 'By Function',
  severity: 'By Severity',
  setting: 'By Setting',
  staff: 'By Staff',
  time_of_day: 'By Time of Day',
};

const VIEW_LABELS: Record<ViewMode, string> = {
  overlay: 'Overlay',
  compare: 'Compare',
  contrast: 'Contrast',
  small_multiples: 'Small Multiples',
  stacked: 'Stacked',
  grouped: 'Grouped',
  heatmap: 'Heatmap',
  top_behaviors: 'Top Behaviors',
  raw: 'Raw All',
};

function Chip({ label, onClear }: { label: string; onClear?: () => void }) {
  return (
    <Badge variant="secondary" className="text-[10px] gap-1 pl-2 pr-1 py-0.5 font-medium">
      {label}
      {onClear && (
        <button
          onClick={onClear}
          className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5 transition-colors"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </Badge>
  );
}

export function ActiveFilterChips({ filters, onChange, behaviorCount }: ActiveFilterChipsProps) {
  const chips: { label: string; onClear?: () => void }[] = [];

  // Date range (always shown)
  chips.push({
    label: DATE_LABELS[filters.dateRange] || 'Last 30 Days',
    onClear: filters.dateRange !== DEFAULT_FILTERS.dateRange
      ? () => onChange({ ...filters, dateRange: DEFAULT_FILTERS.dateRange, customStart: undefined, customEnd: undefined })
      : undefined,
  });

  // Comparison
  if (filters.comparison !== 'none') {
    chips.push({
      label: COMPARE_LABELS[filters.comparison],
      onClear: () => onChange({ ...filters, comparison: 'none' }),
    });
  }

  // Behaviors
  if (filters.selectedBehaviors.length > 0) {
    chips.push({
      label: `${filters.selectedBehaviors.length} behavior${filters.selectedBehaviors.length > 1 ? 's' : ''} selected`,
      onClear: () => onChange({ ...filters, selectedBehaviors: [] }),
    });
  }

  // Group by
  if (filters.groupBy !== 'none') {
    chips.push({
      label: GROUP_LABELS[filters.groupBy],
      onClear: () => onChange({ ...filters, groupBy: 'none' }),
    });
  }

  // View mode (only if non-default)
  if (filters.viewMode !== DEFAULT_FILTERS.viewMode) {
    chips.push({
      label: VIEW_LABELS[filters.viewMode],
      onClear: () => onChange({ ...filters, viewMode: DEFAULT_FILTERS.viewMode }),
    });
  }

  // Metric (only if non-default)
  if (filters.metric !== 'count') {
    chips.push({
      label: filters.metric === 'rate' ? 'Rate' : 'Duration',
      onClear: () => onChange({ ...filters, metric: 'count' }),
    });
  }

  // Rollup (only if non-default)
  if (filters.rollup !== 'daily') {
    chips.push({
      label: filters.rollup === 'weekly' ? 'Weekly' : 'Monthly',
      onClear: () => onChange({ ...filters, rollup: 'daily' }),
    });
  }

  if (chips.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-1">
      <span className="text-[10px] text-muted-foreground font-medium mr-0.5">Active:</span>
      {chips.map((chip, i) => (
        <Chip key={i} label={chip.label} onClear={chip.onClear} />
      ))}
    </div>
  );
}
