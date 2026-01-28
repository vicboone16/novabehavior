import { useMemo, useState, useCallback } from 'react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { 
  TrendingUp, TrendingDown, Minus, Activity, Calendar, 
  BarChart3, Clock, Filter, Download, FileSpreadsheet, FileText, LineChart as LineChartIcon
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Behavior, FrequencyEntry, DurationEntry, ABCEntry, IntervalEntry, Session, METHOD_LABELS } from '@/types/behavior';
import { ChevronDown, PieChart as PieChartIcon } from 'lucide-react';

interface StudentBehaviorsOverviewProps {
  studentId: string;
  studentName: string;
  studentColor: string;
  behaviors: Behavior[];
  frequencyEntries: FrequencyEntry[];
  durationEntries: DurationEntry[];
  abcEntries: ABCEntry[];
  intervalEntries: IntervalEntry[];
  sessions: Session[];
  historicalData?: any[];
}

const DATE_RANGE_PRESETS = [
  { label: 'Last 5 Days', value: 'last5', days: 5 },
  { label: 'Last 7 Days', value: 'last7', days: 7 },
  { label: 'Last 14 Days', value: 'last14', days: 14 },
  { label: 'Last 30 Days', value: 'last30', days: 30 },
  { label: 'Last 90 Days', value: 'last90', days: 90 },
  { label: 'All Time', value: 'all', days: null },
  { label: 'Custom Range', value: 'custom', days: null },
];

const CHART_COLORS = [
  'hsl(199, 89%, 48%)',
  'hsl(173, 58%, 49%)',
  'hsl(262, 83%, 68%)',
  'hsl(38, 92%, 60%)',
  'hsl(0, 72%, 61%)',
  'hsl(280, 65%, 70%)',
  'hsl(142, 71%, 45%)',
];

interface BehaviorWithStats extends Behavior {
  frequencyCount: number;
  filteredFrequencyCount: number;
  totalDuration: number;
  filteredDuration: number;
  abcCount: number;
  filteredAbcCount: number;
  intervalOccurred: number;
  intervalTotal: number;
  recentTrend: 'up' | 'flat' | 'down' | null;
  trendPercentage: number;
  ratePerHour: number | null;
}

export function StudentBehaviorsOverview({
  studentId,
  studentName,
  studentColor,
  behaviors,
  frequencyEntries,
  durationEntries,
  abcEntries,
  intervalEntries,
  sessions,
  historicalData = [],
}: StudentBehaviorsOverviewProps) {
  const [dateRangePreset, setDateRangePreset] = useState<string>('last30');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());
  const [selectedBehavior, setSelectedBehavior] = useState<string>('all');
  const [expandedBehaviors, setExpandedBehaviors] = useState<Set<string>>(new Set());

  // Calculate date range
  const dateRange = useMemo(() => {
    if (dateRangePreset === 'custom') {
      return {
        start: customStartDate ? startOfDay(customStartDate) : subDays(new Date(), 30),
        end: customEndDate ? endOfDay(customEndDate) : endOfDay(new Date()),
      };
    }
    
    const preset = DATE_RANGE_PRESETS.find(p => p.value === dateRangePreset);
    if (!preset || preset.days === null) {
      return null; // All time
    }
    
    return {
      start: startOfDay(subDays(new Date(), preset.days)),
      end: endOfDay(new Date()),
    };
  }, [dateRangePreset, customStartDate, customEndDate]);

  // Filter entries by date range and student
  const filterByDateRange = useCallback(<T extends Record<string, any>>(entries: T[], dateField: keyof T = 'timestamp' as keyof T): T[] => {
    const studentEntries = entries.filter((e: any) => e.studentId === studentId);
    if (!dateRange) return studentEntries;
    return studentEntries.filter(e => {
      const entryDate = new Date(e[dateField] as string | Date);
      return isWithinInterval(entryDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [studentId, dateRange]);

  // Get behaviors with calculated stats
  const behaviorsWithStats: BehaviorWithStats[] = useMemo(() => {
    return behaviors.map(behavior => {
      // Frequency stats
      const behaviorFrequency = frequencyEntries.filter(e => e.studentId === studentId && e.behaviorId === behavior.id);
      const filteredFrequency = filterByDateRange(behaviorFrequency);
      const frequencyCount = behaviorFrequency.reduce((sum, e) => sum + e.count, 0);
      const filteredFrequencyCount = filteredFrequency.reduce((sum, e) => sum + e.count, 0);

      // Duration stats
      const behaviorDuration = durationEntries.filter(e => e.studentId === studentId && e.behaviorId === behavior.id);
      const filteredDurationEntries = filterByDateRange(behaviorDuration, 'startTime');
      const totalDuration = behaviorDuration.reduce((sum, e) => sum + e.duration, 0);
      const filteredDuration = filteredDurationEntries.reduce((sum, e) => sum + e.duration, 0);

      // ABC stats
      const behaviorABC = abcEntries.filter(e => e.studentId === studentId && e.behaviorId === behavior.id);
      const filteredABC = filterByDateRange(behaviorABC);
      const abcCount = behaviorABC.length;
      const filteredAbcCount = filteredABC.length;

      // Interval stats
      const behaviorIntervals = intervalEntries.filter(e => e.studentId === studentId && e.behaviorId === behavior.id);
      const filteredIntervals = filterByDateRange(behaviorIntervals);
      const intervalOccurred = filteredIntervals.filter(e => e.occurred).length;
      const intervalTotal = filteredIntervals.length;

      // Calculate trend from frequency over time
      let recentTrend: 'up' | 'flat' | 'down' | null = null;
      let trendPercentage = 0;

      if (filteredFrequency.length >= 4) {
        const sorted = [...filteredFrequency].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const halfIndex = Math.floor(sorted.length / 2);
        const firstHalf = sorted.slice(0, halfIndex);
        const secondHalf = sorted.slice(halfIndex);
        
        const avgFirst = firstHalf.reduce((s, e) => s + e.count, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s, e) => s + e.count, 0) / secondHalf.length;
        
        trendPercentage = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;
        
        if (trendPercentage >= 10) {
          recentTrend = 'up';
        } else if (trendPercentage <= -10) {
          recentTrend = 'down';
        } else {
          recentTrend = 'flat';
        }
      }

      // Calculate rate per hour from historical data if available
      let ratePerHour: number | null = null;
      const histEntries = historicalData.filter((h: any) => h.behaviorId === behavior.id);
      if (histEntries.length > 0) {
        const withDuration = histEntries.filter((h: any) => h.observationDurationMinutes);
        if (withDuration.length > 0) {
          const totalCount = withDuration.reduce((s: number, h: any) => s + h.count, 0);
          const totalMinutes = withDuration.reduce((s: number, h: any) => s + h.observationDurationMinutes, 0);
          ratePerHour = totalMinutes > 0 ? (totalCount / (totalMinutes / 60)) : null;
        }
      }

      return {
        ...behavior,
        frequencyCount,
        filteredFrequencyCount,
        totalDuration,
        filteredDuration,
        abcCount,
        filteredAbcCount,
        intervalOccurred,
        intervalTotal,
        recentTrend,
        trendPercentage,
        ratePerHour,
      };
    });
  }, [behaviors, frequencyEntries, durationEntries, abcEntries, intervalEntries, historicalData, studentId, filterByDateRange]);

  // Filter behaviors
  const filteredBehaviors = useMemo(() => {
    if (selectedBehavior === 'all') return behaviorsWithStats;
    return behaviorsWithStats.filter(b => b.id === selectedBehavior);
  }, [behaviorsWithStats, selectedBehavior]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalFrequency = filteredBehaviors.reduce((s, b) => s + b.filteredFrequencyCount, 0);
    const totalDuration = filteredBehaviors.reduce((s, b) => s + b.filteredDuration, 0);
    const totalABC = filteredBehaviors.reduce((s, b) => s + b.filteredAbcCount, 0);
    const totalIntervals = filteredBehaviors.reduce((s, b) => s + b.intervalTotal, 0);
    const occurredIntervals = filteredBehaviors.reduce((s, b) => s + b.intervalOccurred, 0);
    const intervalPercent = totalIntervals > 0 ? Math.round((occurredIntervals / totalIntervals) * 100) : 0;

    return {
      totalFrequency,
      totalDuration,
      totalABC,
      intervalPercent,
      totalIntervals,
      behaviorCount: filteredBehaviors.length,
    };
  }, [filteredBehaviors]);

  // Chart data: frequency over time
  const frequencyChartData = useMemo(() => {
    if (!dateRange) return [];
    
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dataPoint: any = { date: format(day, 'MMM d') };

      filteredBehaviors.forEach((behavior, idx) => {
        const dayFrequency = frequencyEntries.filter(e => 
          e.studentId === studentId &&
          e.behaviorId === behavior.id &&
          isWithinInterval(new Date(e.timestamp), { start: dayStart, end: dayEnd })
        );
        dataPoint[behavior.name] = dayFrequency.reduce((s, e) => s + e.count, 0);
      });

      return dataPoint;
    });
  }, [dateRange, filteredBehaviors, frequencyEntries, studentId]);

  // Chart data: duration over time
  const durationChartData = useMemo(() => {
    if (!dateRange) return [];
    
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dataPoint: any = { date: format(day, 'MMM d') };

      filteredBehaviors.forEach((behavior, idx) => {
        const dayDuration = durationEntries.filter(e => 
          e.studentId === studentId &&
          e.behaviorId === behavior.id &&
          isWithinInterval(new Date(e.startTime), { start: dayStart, end: dayEnd })
        );
        dataPoint[`${behavior.name} (sec)`] = dayDuration.reduce((s, e) => s + e.duration, 0);
      });

      return dataPoint;
    });
  }, [dateRange, filteredBehaviors, durationEntries, studentId]);

  // ABC distribution data
  const abcDistributionData = useMemo(() => {
    const antecedentCounts: Record<string, number> = {};
    const consequenceCounts: Record<string, number> = {};

    const filteredABC = filterByDateRange(abcEntries.filter(e => 
      selectedBehavior === 'all' || e.behaviorId === selectedBehavior
    ));

    filteredABC.forEach(entry => {
      antecedentCounts[entry.antecedent] = (antecedentCounts[entry.antecedent] || 0) + 1;
      consequenceCounts[entry.consequence] = (consequenceCounts[entry.consequence] || 0) + 1;
    });

    return {
      antecedents: Object.entries(antecedentCounts)
        .map(([name, value], idx) => ({ name, value, color: CHART_COLORS[idx % CHART_COLORS.length] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      consequences: Object.entries(consequenceCounts)
        .map(([name, value], idx) => ({ name, value, color: CHART_COLORS[idx % CHART_COLORS.length] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    };
  }, [abcEntries, selectedBehavior, filterByDateRange]);

  // Interval chart data
  const intervalChartData = useMemo(() => {
    if (!dateRange) return [];
    
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dayIntervals = intervalEntries.filter(e => 
        e.studentId === studentId &&
        (selectedBehavior === 'all' || e.behaviorId === selectedBehavior) &&
        isWithinInterval(new Date(e.timestamp), { start: dayStart, end: dayEnd })
      );

      const occurred = dayIntervals.filter(e => e.occurred).length;
      const total = dayIntervals.length;
      const percent = total > 0 ? Math.round((occurred / total) * 100) : null;

      return {
        date: format(day, 'MMM d'),
        'Interval %': percent,
        intervals: total,
      };
    }).filter(d => d.intervals > 0);
  }, [dateRange, intervalEntries, studentId, selectedBehavior]);

  const toggleBehaviorExpanded = (behaviorId: string) => {
    setExpandedBehaviors(prev => {
      const next = new Set(prev);
      if (next.has(behaviorId)) {
        next.delete(behaviorId);
      } else {
        next.add(behaviorId);
      }
      return next;
    });
  };

  // Export functions
  const handleExportCSV = useCallback(() => {
    const headers = ['Behavior', 'Frequency (Range)', 'Duration (sec)', 'ABC Count', 'Interval %', 'Trend'];
    const rows = filteredBehaviors.map(b => [
      b.name,
      b.filteredFrequencyCount.toString(),
      b.filteredDuration.toString(),
      b.filteredAbcCount.toString(),
      b.intervalTotal > 0 ? `${Math.round((b.intervalOccurred / b.intervalTotal) * 100)}%` : 'N/A',
      b.recentTrend || 'N/A',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${studentName.replace(/\s+/g, '_')}_behaviors_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  }, [filteredBehaviors, studentName]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  if (behaviors.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground font-medium">No Behaviors Configured</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add behaviors to start tracking and see analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
        </div>
        
        <Select value={selectedBehavior} onValueChange={setSelectedBehavior}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue placeholder="All Behaviors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Behaviors</SelectItem>
            {behaviors.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_PRESETS.map(preset => (
              <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {dateRangePreset === 'custom' && (
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  {customStartDate ? format(customStartDate, 'MMM d') : 'Start'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  {customEndDate ? format(customEndDate, 'MMM d') : 'End'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 ml-auto">
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{summaryStats.behaviorCount}</div>
            <div className="text-xs text-muted-foreground">Behaviors</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-info/10 to-info/5">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-info">{summaryStats.totalFrequency}</div>
            <div className="text-xs text-muted-foreground">Total Frequency</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-warning">{formatDuration(summaryStats.totalDuration)}</div>
            <div className="text-xs text-muted-foreground">Total Duration</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-antecedent/10 to-antecedent/5">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-antecedent">{summaryStats.totalABC}</div>
            <div className="text-xs text-muted-foreground">ABC Entries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{summaryStats.intervalPercent}%</div>
            <div className="text-xs text-muted-foreground">Interval Occurrence</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="frequency" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="frequency" className="text-xs">
            <BarChart3 className="w-3 h-3 mr-1" />
            Frequency
          </TabsTrigger>
          <TabsTrigger value="duration" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Duration
          </TabsTrigger>
          <TabsTrigger value="interval" className="text-xs">
            <LineChartIcon className="w-3 h-3 mr-1" />
            Interval
          </TabsTrigger>
          <TabsTrigger value="abc" className="text-xs">
            <PieChartIcon className="w-3 h-3 mr-1" />
            ABC Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="frequency" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Frequency Over Time</CardTitle>
              <CardDescription className="text-xs">Daily behavior counts</CardDescription>
            </CardHeader>
            <CardContent>
              {frequencyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={frequencyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    {filteredBehaviors.map((behavior, idx) => (
                      <Bar
                        key={behavior.id}
                        dataKey={behavior.name}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        radius={[2, 2, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No frequency data in selected date range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duration" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Duration Over Time</CardTitle>
              <CardDescription className="text-xs">Daily duration totals (seconds)</CardDescription>
            </CardHeader>
            <CardContent>
              {durationChartData.some(d => Object.keys(d).length > 1) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={durationChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    {filteredBehaviors.map((behavior, idx) => (
                      <Line
                        key={behavior.id}
                        type="monotone"
                        dataKey={`${behavior.name} (sec)`}
                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No duration data in selected date range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interval" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Interval Occurrence %</CardTitle>
              <CardDescription className="text-xs">Daily percentage of intervals with behavior occurrence</CardDescription>
            </CardHeader>
            <CardContent>
              {intervalChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={intervalChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Interval %"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No interval data in selected date range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abc" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Antecedents</CardTitle>
              </CardHeader>
              <CardContent>
                {abcDistributionData.antecedents.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={abcDistributionData.antecedents}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, value }) => `${name.slice(0, 12)}${name.length > 12 ? '...' : ''}: ${value}`}
                        labelLine={false}
                      >
                        {abcDistributionData.antecedents.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No ABC data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Consequences</CardTitle>
              </CardHeader>
              <CardContent>
                {abcDistributionData.consequences.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={abcDistributionData.consequences}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, value }) => `${name.slice(0, 12)}${name.length > 12 ? '...' : ''}: ${value}`}
                        labelLine={false}
                      >
                        {abcDistributionData.consequences.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No ABC data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Behavior List with Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Behavior Details</CardTitle>
          <CardDescription className="text-xs">Click to expand and see recent data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredBehaviors.map((behavior, idx) => {
            const isExpanded = expandedBehaviors.has(behavior.id);
            const intervalPercent = behavior.intervalTotal > 0 
              ? Math.round((behavior.intervalOccurred / behavior.intervalTotal) * 100) 
              : null;

            return (
              <Collapsible
                key={behavior.id}
                open={isExpanded}
                onOpenChange={() => toggleBehaviorExpanded(behavior.id)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{behavior.name}</span>
                            {behavior.recentTrend && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  behavior.recentTrend === 'up' && "text-destructive border-destructive",
                                  behavior.recentTrend === 'down' && "text-primary border-primary",
                                  behavior.recentTrend === 'flat' && "text-muted-foreground"
                                )}
                              >
                                {behavior.recentTrend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                                {behavior.recentTrend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                                {behavior.recentTrend === 'flat' && <Minus className="w-3 h-3 mr-1" />}
                                {behavior.recentTrend === 'up' ? '+' : ''}{Math.round(behavior.trendPercentage)}%
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1 mt-0.5">
                            {(behavior.methods || [behavior.type]).map(method => (
                              <Badge key={method} variant="secondary" className="text-xs py-0">
                                {METHOD_LABELS[method]}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="font-medium">{behavior.filteredFrequencyCount}</div>
                          <div className="text-xs text-muted-foreground">frequency</div>
                        </div>
                        {behavior.filteredDuration > 0 && (
                          <div className="text-right text-sm">
                            <div className="font-medium">{formatDuration(behavior.filteredDuration)}</div>
                            <div className="text-xs text-muted-foreground">duration</div>
                          </div>
                        )}
                        {intervalPercent !== null && (
                          <div className="text-right text-sm">
                            <div className="font-medium">{intervalPercent}%</div>
                            <div className="text-xs text-muted-foreground">interval</div>
                          </div>
                        )}
                        <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="p-3 bg-muted/30 border-t space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <div className="text-muted-foreground">Total (all time)</div>
                          <div className="font-medium">{behavior.frequencyCount} occurrences</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Duration (all time)</div>
                          <div className="font-medium">{formatDuration(behavior.totalDuration)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">ABC Entries</div>
                          <div className="font-medium">{behavior.abcCount} total</div>
                        </div>
                        {behavior.ratePerHour !== null && (
                          <div>
                            <div className="text-muted-foreground">Avg Rate</div>
                            <div className="font-medium">{behavior.ratePerHour.toFixed(2)}/hr</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
