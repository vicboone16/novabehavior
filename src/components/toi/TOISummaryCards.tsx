import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, CalendarDays, CalendarRange } from 'lucide-react';
import { formatDuration } from '@/types/toi';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface TOISummary {
  totalMinutes: number;
  episodes: number;
  avgDuration: number;
  longestEpisode: number;
}

interface TOISummaryCardsProps {
  todaySummary: TOISummary;
  weekSummary: TOISummary;
  getRangeSummary: (start: Date, end: Date) => TOISummary;
}

export function TOISummaryCards({ 
  todaySummary, 
  weekSummary, 
  getRangeSummary 
}: TOISummaryCardsProps) {
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [customSummary, setCustomSummary] = useState<TOISummary | null>(null);

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range) return;
    setCustomRange(range);
    if (range.from && range.to) {
      const endOfDay = new Date(range.to);
      endOfDay.setHours(23, 59, 59, 999);
      setCustomSummary(getRangeSummary(range.from, endOfDay));
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Today */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground">TOI Today</p>
              <p className="text-2xl font-bold">{formatDuration(todaySummary.totalMinutes)}</p>
              <p className="text-xs text-muted-foreground">
                {todaySummary.episodes} episode{todaySummary.episodes !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <CalendarDays className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground">TOI This Week</p>
              <p className="text-2xl font-bold">{formatDuration(weekSummary.totalMinutes)}</p>
              <p className="text-xs text-muted-foreground">
                {weekSummary.episodes} episode{weekSummary.episodes !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Range */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent">
              <CalendarRange className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground">Custom Range</p>
              {customSummary ? (
                <>
                  <p className="text-2xl font-bold">{formatDuration(customSummary.totalMinutes)}</p>
                  <p className="text-xs text-muted-foreground">
                    {customSummary.episodes} episode{customSummary.episodes !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select dates</p>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {customRange?.from && customRange?.to
                    ? `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}`
                    : 'Pick range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={handleRangeSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
