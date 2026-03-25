import { useState } from 'react';
import { Calendar, Filter, BarChart3, Printer, Download, RotateCcw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { InsightsFilters, DateRangePreset, ViewMode } from './types';
import { DEFAULT_FILTERS } from './types';

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

export function InsightsControlBar({ filters, onChange, behaviors, onPrint, onExport }: InsightsControlBarProps) {
  const [behaviorOpen, setBehaviorOpen] = useState(false);

  const toggleBehavior = (id: string) => {
    const next = filters.selectedBehaviors.includes(id)
      ? filters.selectedBehaviors.filter(b => b !== id)
      : [...filters.selectedBehaviors, id];
    onChange({ ...filters, selectedBehaviors: next });
  };

  const selectAll = () => onChange({ ...filters, selectedBehaviors: behaviors.map(b => b.id) });
  const clearAll = () => onChange({ ...filters, selectedBehaviors: [] });

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border border-border rounded-lg p-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Date Range */}
        <Select value={filters.dateRange} onValueChange={v => onChange({ ...filters, dateRange: v as DateRangePreset })}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map(p => (
              <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
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
