import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CalendarIcon, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Minus,
  Save,
} from 'lucide-react';
import { format, eachDayOfInterval, startOfDay, subDays, parseISO, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTOIDailyLogs } from '@/hooks/useTOIDailyLogs';
import { useTOIEvents } from '@/hooks/useTOIEvents';
import { toast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';
import type { 
  TOIDailyStatus, 
  TOIDailyLogInput, 
  TOIDailyDisplayStatus 
} from '@/types/toiDailyLog';
import {
  TOI_DISPLAY_STATUS_LABELS,
  TOI_DISPLAY_STATUS_COLORS,
} from '@/types/toiDailyLog';

interface BulkTOIDailyStatusProps {
  studentId: string;
  studentName: string;
  onClose?: () => void;
}

type CellStatus = TOIDailyDisplayStatus;

interface DateCellState {
  date: string; // YYYY-MM-DD
  originalStatus: CellStatus;
  currentStatus: CellStatus;
  hasTOIEvents: boolean; // true if there are actual TOI events for this day
  isModified: boolean;
}

export function BulkTOIDailyStatus({ studentId, studentName, onClose }: BulkTOIDailyStatusProps) {
  // Date range - default to last 14 days
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 13),
    to: new Date(),
  });

  // Cell states
  const [cellStates, setCellStates] = useState<Map<string, DateCellState>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch daily logs and TOI events
  const { 
    logs, 
    loading: logsLoading, 
    bulkUpsert, 
    deleteLogByDate,
    refetch: refetchLogs 
  } = useTOIDailyLogs({
    studentId,
    dateRange: dateRange.from && dateRange.to ? { start: dateRange.from, end: dateRange.to } : undefined,
  });

  const { 
    events, 
    loading: eventsLoading 
  } = useTOIEvents({
    studentId,
    dateRange: dateRange.from && dateRange.to ? { start: dateRange.from, end: dateRange.to } : undefined,
  });

  // Generate dates for the grid
  const dates = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    return eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  }, [dateRange]);

  // Build a map of dates that have TOI events
  const datesWithTOI = useMemo(() => {
    const map = new Set<string>();
    events.forEach(event => {
      const dateStr = format(parseISO(event.start_time), 'yyyy-MM-dd');
      map.add(dateStr);
    });
    return map;
  }, [events]);

  // Build a map of dates to daily log status
  const logsByDate = useMemo(() => {
    const map = new Map<string, TOIDailyStatus>();
    logs.forEach(log => {
      map.set(log.log_date, log.status);
    });
    return map;
  }, [logs]);

  // Initialize cell states when data loads
  useEffect(() => {
    const newStates = new Map<string, DateCellState>();
    
    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasTOI = datesWithTOI.has(dateStr);
      const logStatus = logsByDate.get(dateStr);

      let displayStatus: CellStatus;
      if (hasTOI) {
        displayStatus = 'has_toi';
      } else if (logStatus) {
        displayStatus = logStatus;
      } else {
        displayStatus = 'blank';
      }

      newStates.set(dateStr, {
        date: dateStr,
        originalStatus: displayStatus,
        currentStatus: displayStatus,
        hasTOIEvents: hasTOI,
        isModified: false,
      });
    });

    setCellStates(newStates);
  }, [dates, datesWithTOI, logsByDate]);

  // Toggle cell status
  const toggleCellStatus = useCallback((dateStr: string) => {
    setCellStates(prev => {
      const newStates = new Map(prev);
      const cell = newStates.get(dateStr);
      if (!cell) return prev;

      // If this date has TOI events, it's read-only (display as "has_toi")
      if (cell.hasTOIEvents) {
        toast({
          title: 'Cannot modify',
          description: 'This date has TOI events recorded. Edit or delete the events instead.',
          variant: 'destructive',
        });
        return prev;
      }

      // Cycle through: blank -> observed_none -> not_observed -> blank
      let newStatus: CellStatus;
      switch (cell.currentStatus) {
        case 'blank':
          newStatus = 'observed_none';
          break;
        case 'observed_none':
          newStatus = 'not_observed';
          break;
        case 'not_observed':
          newStatus = 'blank';
          break;
        default:
          newStatus = 'blank';
      }

      newStates.set(dateStr, {
        ...cell,
        currentStatus: newStatus,
        isModified: newStatus !== cell.originalStatus,
      });

      return newStates;
    });
  }, []);

  // Set all cells to a specific status
  const setAllCells = useCallback((status: CellStatus | 'blank') => {
    setCellStates(prev => {
      const newStates = new Map(prev);
      
      newStates.forEach((cell, dateStr) => {
        // Skip dates that have TOI events - they're read-only
        if (cell.hasTOIEvents) return;
        // Skip weekends optionally
        
        newStates.set(dateStr, {
          ...cell,
          currentStatus: status,
          isModified: status !== cell.originalStatus,
        });
      });

      return newStates;
    });
  }, []);

  // Count modified cells
  const modifiedCount = useMemo(() => {
    let count = 0;
    cellStates.forEach(cell => {
      if (cell.isModified) count++;
    });
    return count;
  }, [cellStates]);

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);

    try {
      const toUpsert: TOIDailyLogInput[] = [];
      const toDelete: string[] = [];

      cellStates.forEach(cell => {
        if (!cell.isModified) return;

        if (cell.currentStatus === 'blank') {
          // If changed to blank, delete the log
          toDelete.push(cell.date);
        } else if (cell.currentStatus === 'observed_none' || cell.currentStatus === 'not_observed') {
          // Upsert the log
          toUpsert.push({
            student_id: studentId,
            log_date: cell.date,
            status: cell.currentStatus as TOIDailyStatus,
          });
        }
      });

      // Process deletions
      for (const dateStr of toDelete) {
        await deleteLogByDate(studentId, dateStr);
      }

      // Process upserts
      if (toUpsert.length > 0) {
        await bulkUpsert(toUpsert);
      }

      // Refetch and update states
      await refetchLogs();

      toast({
        title: 'Changes Saved',
        description: `Updated ${modifiedCount} entries`,
      });

      // Reset modified flags
      setCellStates(prev => {
        const newStates = new Map(prev);
        newStates.forEach((cell, dateStr) => {
          newStates.set(dateStr, {
            ...cell,
            originalStatus: cell.currentStatus,
            isModified: false,
          });
        });
        return newStates;
      });
    } catch (error: any) {
      toast({
        title: 'Error saving changes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = logsLoading || eventsLoading;

  // Group dates by week for display
  const datesByWeek = useMemo(() => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    dates.forEach((date, index) => {
      currentWeek.push(date);
      // End week on Saturday or last date
      if (date.getDay() === 6 || index === dates.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return weeks;
  }, [dates]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Daily TOI Status - {studentName}</span>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Track observation status for each day. Click a cell to cycle through: Blank → Observed (No TOI) → No Observation → Blank.
          Days with actual TOI events are shown in yellow and cannot be modified here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Picker & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from && dateRange.to
                  ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                  : 'Select date range'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  if (range) setDateRange(range);
                }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Set all to:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllCells('observed_none')}
              className="gap-1"
            >
              <CheckCircle className="h-3 w-3 text-primary" />
              Observed
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllCells('not_observed')}
              className="gap-1"
            >
              <Minus className="h-3 w-3 text-muted-foreground" />
              No Obs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllCells('blank')}
              className="gap-1"
            >
              <XCircle className="h-3 w-3" />
              Clear
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <div className={cn('w-6 h-6 rounded border', TOI_DISPLAY_STATUS_COLORS.has_toi)} />
            <span>TOI Occurred</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-6 h-6 rounded border', TOI_DISPLAY_STATUS_COLORS.observed_none)} />
            <span>Observed - No TOI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-6 h-6 rounded border', TOI_DISPLAY_STATUS_COLORS.not_observed)} />
            <span>No Observation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-6 h-6 rounded border', TOI_DISPLAY_STATUS_COLORS.blank)} />
            <span>Blank (unset)</span>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Week</TableHead>
                  <TableHead className="text-center">Sun</TableHead>
                  <TableHead className="text-center">Mon</TableHead>
                  <TableHead className="text-center">Tue</TableHead>
                  <TableHead className="text-center">Wed</TableHead>
                  <TableHead className="text-center">Thu</TableHead>
                  <TableHead className="text-center">Fri</TableHead>
                  <TableHead className="text-center">Sat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datesByWeek.map((week, weekIndex) => {
                  // Pad the week to always have 7 days
                  const paddedWeek: (Date | null)[] = [];
                  const firstDayOfWeek = week[0].getDay();
                  
                  // Add empty cells before the first day
                  for (let i = 0; i < firstDayOfWeek; i++) {
                    paddedWeek.push(null);
                  }
                  
                  // Add the actual days
                  paddedWeek.push(...week);
                  
                  // Add empty cells after the last day
                  while (paddedWeek.length < 7) {
                    paddedWeek.push(null);
                  }

                  return (
                    <TableRow key={weekIndex}>
                      <TableCell className="font-medium text-sm text-muted-foreground">
                        {format(week[0], 'MMM d')}
                      </TableCell>
                      {paddedWeek.map((date, dayIndex) => {
                        if (!date) {
                          return <TableCell key={dayIndex} className="text-center p-1" />;
                        }

                        const dateStr = format(date, 'yyyy-MM-dd');
                        const cell = cellStates.get(dateStr);
                        const status = cell?.currentStatus || 'blank';
                        const isModified = cell?.isModified || false;
                        const hasTOI = cell?.hasTOIEvents || false;

                        return (
                          <TableCell key={dayIndex} className="text-center p-1">
                            <button
                              type="button"
                              onClick={() => toggleCellStatus(dateStr)}
                              disabled={hasTOI}
                              className={cn(
                                'w-full min-w-[60px] h-12 rounded border-2 transition-all',
                                'flex flex-col items-center justify-center gap-0.5',
                                'hover:ring-2 hover:ring-primary/50',
                                'focus:outline-none focus:ring-2 focus:ring-primary',
                                TOI_DISPLAY_STATUS_COLORS[status],
                                isModified && 'ring-2 ring-primary',
                                hasTOI && 'cursor-not-allowed opacity-80'
                              )}
                              title={`${format(date, 'MMM d, yyyy')}: ${TOI_DISPLAY_STATUS_LABELS[status]}`}
                            >
                              <span className="text-xs font-medium">
                                {format(date, 'd')}
                              </span>
                              {status === 'has_toi' && (
                                <AlertCircle className="h-3 w-3" />
                              )}
                              {status === 'observed_none' && (
                                <CheckCircle className="h-3 w-3" />
                              )}
                              {status === 'not_observed' && (
                                <Minus className="h-3 w-3" />
                              )}
                            </button>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {modifiedCount > 0 ? (
              <span className="text-primary font-medium">
                {modifiedCount} unsaved change{modifiedCount !== 1 ? 's' : ''}
              </span>
            ) : (
              <span>No changes</span>
            )}
          </div>
          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={modifiedCount === 0 || isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : `Save Changes`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
