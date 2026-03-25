import { useState } from 'react';
import { Calendar as CalendarIcon, Filter, BarChart3, Printer, Download, RotateCcw, ChevronDown, Bookmark, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { InsightsFilters, DateRangePreset, ViewMode, ComparisonMode, GroupBy } from './types';
import { DEFAULT_FILTERS } from './types';
import { useTemplateStore } from './useTemplateStore';

interface Behavior {
  id: string;
  name: string;
}

interface InsightsControlBarProps {
  filters: InsightsFilters;
  onChange: (filters: InsightsFilters) => void;
  behaviors: Behavior[];
  onPrint?: () => void;
  onExport?: () => void;
}

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_7', label: 'Last 7 Days' },
  { value: 'last_14', label: 'Last 14 Days' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'school_year', label: 'School Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'overlay', label: 'Overlay' },
  { value: 'compare', label: 'Compare' },
  { value: 'contrast', label: 'Contrast' },
  { value: 'small_multiples', label: 'Small Multiples' },
  { value: 'stacked', label: 'Stacked' },
  { value: 'grouped', label: 'Grouped' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'top_behaviors', label: 'Top Behaviors' },
  { value: 'raw', label: 'Raw All' },
];

const COMPARISON_MODES: { value: ComparisonMode; label: string }[] = [
  { value: 'none', label: 'No Comparison' },
  { value: 'prev_equivalent', label: 'Prior Equivalent' },
  { value: 'prev_week', label: 'Prior Week' },
  { value: 'prev_month', label: 'Prior Month' },
  { value: 'baseline_intervention', label: 'Baseline vs Intervention' },
];

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'No Grouping' },
  { value: 'category', label: 'Category' },
  { value: 'function', label: 'Function' },
  { value: 'severity', label: 'Severity' },
  { value: 'setting', label: 'Setting' },
  { value: 'staff', label: 'Staff' },
  { value: 'time_of_day', label: 'Time of Day' },
];

export function InsightsControlBar({ filters, onChange, behaviors, onPrint, onExport }: InsightsControlBarProps) {
  const [behaviorOpen, setBehaviorOpen] = useState(false);
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [savedViewName, setSavedViewName] = useState('');
  const [savedViewOpen, setSavedViewOpen] = useState(false);
  const { savedViews, addSavedView, removeSavedView } = useTemplateStore();

  const toggleBehavior = (id: string) => {
    const next = filters.selectedBehaviors.includes(id)
      ? filters.selectedBehaviors.filter(b => b !== id)
      : [...filters.selectedBehaviors, id];
    onChange({ ...filters, selectedBehaviors: next });
  };

  const selectAll = () => onChange({ ...filters, selectedBehaviors: behaviors.map(b => b.id) });
  const clearAll = () => onChange({ ...filters, selectedBehaviors: [] });

  const handleDatePreset = (v: string) => {
    if (v === 'custom') {
      setCustomDateOpen(true);
      onChange({ ...filters, dateRange: 'custom' });
    } else {
      onChange({ ...filters, dateRange: v as DateRangePreset });
    }
  };

  const handleSaveView = () => {
    if (!savedViewName.trim()) return;
    addSavedView({
      id: crypto.randomUUID(),
      name: savedViewName,
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    });
    setSavedViewName('');
    toast.success(`View "${savedViewName}" saved`);
  };

  const handleLoadView = (view: { filters: Record<string, any> }) => {
    onChange(view.filters as InsightsFilters);
    toast.success('View loaded');
  };

  const customStart = filters.customStart ? new Date(filters.customStart) : undefined;
  const customEnd = filters.customEnd ? new Date(filters.customEnd) : undefined;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border border-border rounded-lg p-2 space-y-2">
      {/* Row 1: Primary controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Date Range */}
        <Select value={filters.dateRange} onValueChange={handleDatePreset}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <CalendarIcon className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map(p => (
              <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Picker */}
        {filters.dateRange === 'custom' && (
          <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                {customStart && customEnd
                  ? `${format(customStart, 'M/d')} – ${format(customEnd, 'M/d')}`
                  : 'Pick dates'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: customStart, to: customEnd }}
                onSelect={(range: any) => {
                  onChange({
                    ...filters,
                    customStart: range?.from ? range.from.toISOString().slice(0, 10) : undefined,
                    customEnd: range?.to ? range.to.toISOString().slice(0, 10) : undefined,
                  });
                }}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Comparison */}
        <Select value={filters.comparison} onValueChange={v => onChange({ ...filters, comparison: v as ComparisonMode })}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Compare" />
          </SelectTrigger>
          <SelectContent>
            {COMPARISON_MODES.map(m => (
              <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Behavior Selector */}
        <Popover open={behaviorOpen} onOpenChange={setBehaviorOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Filter className="w-3.5 h-3.5" />
              Behaviors
              {filters.selectedBehaviors.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 ml-1">
                  {filters.selectedBehaviors.length}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="flex gap-2 mb-2">
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={selectAll}>Select All</Button>
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={clearAll}>Clear</Button>
            </div>
            <ScrollArea className="max-h-48">
              {behaviors.map(b => (
                <label key={b.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer text-xs">
                  <Checkbox
                    checked={filters.selectedBehaviors.includes(b.id)}
                    onCheckedChange={() => toggleBehavior(b.id)}
                  />
                  {b.name}
                </label>
              ))}
              {behaviors.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">No behaviors defined</p>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Group By */}
        <Select value={filters.groupBy} onValueChange={v => onChange({ ...filters, groupBy: v as GroupBy })}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <Layers className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            {GROUP_BY_OPTIONS.map(g => (
              <SelectItem key={g.value} value={g.value} className="text-xs">{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Mode */}
        <Select value={filters.viewMode} onValueChange={v => onChange({ ...filters, viewMode: v as ViewMode })}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <BarChart3 className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIEW_MODES.map(m => (
              <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Metric */}
        <Select value={filters.metric} onValueChange={v => onChange({ ...filters, metric: v as InsightsFilters['metric'] })}>
          <SelectTrigger className="w-[90px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count" className="text-xs">Count</SelectItem>
            <SelectItem value="rate" className="text-xs">Rate</SelectItem>
            <SelectItem value="duration" className="text-xs">Duration</SelectItem>
          </SelectContent>
        </Select>

        {/* Rollup */}
        <Select value={filters.rollup} onValueChange={v => onChange({ ...filters, rollup: v as InsightsFilters['rollup'] })}>
          <SelectTrigger className="w-[90px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily" className="text-xs">Daily</SelectItem>
            <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
            <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Saved Views */}
        <Popover open={savedViewOpen} onOpenChange={setSavedViewOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Bookmark className="w-3.5 h-3.5" />
              Views
              {savedViews.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1">{savedViews.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-2">
              <div className="flex gap-1">
                <Input
                  value={savedViewName}
                  onChange={e => setSavedViewName(e.target.value)}
                  placeholder="View name…"
                  className="h-7 text-xs"
                />
                <Button variant="default" size="sm" className="h-7 text-xs px-2" onClick={handleSaveView}>
                  Save
                </Button>
              </div>
              {savedViews.length > 0 && (
                <ScrollArea className="max-h-32">
                  {savedViews.map(v => (
                    <div key={v.id} className="flex items-center justify-between py-1 text-xs">
                      <button className="hover:underline truncate text-left flex-1" onClick={() => handleLoadView(v)}>
                        {v.name}
                      </button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeSavedView(v.id)}>
                        <span className="text-[10px]">✕</span>
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Actions */}
        {onPrint && (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onPrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        )}
        {onExport && (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onExport}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => onChange(DEFAULT_FILTERS)}>
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}
