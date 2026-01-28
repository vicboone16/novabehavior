import { useMemo, useState, useCallback } from 'react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { 
  TrendingUp, TrendingDown, Minus, CheckCircle2, Target, Calendar, 
  BarChart3, Activity, AlertCircle, Clock, Filter, Download, FileSpreadsheet, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SkillTarget, DTTSession } from '@/types/behavior';

interface StudentSkillsOverviewProps {
  studentName: string;
  skillTargets: SkillTarget[];
  dttSessions: DTTSession[];
  studentColor: string;
}

interface TargetWithStats extends SkillTarget {
  sessions: DTTSession[];
  filteredSessions: DTTSession[];
  totalTrials: number;
  filteredTrials: number;
  recentTrend: 'up' | 'flat' | 'down' | null;
  trendPercentage: number;
  lastSessionDate: Date | null;
  lastPercentCorrect: number | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  baseline: { label: 'Baseline', color: 'bg-slate-500' },
  acquisition: { label: 'Acquisition', color: 'bg-blue-500' },
  maintenance: { label: 'Maintenance', color: 'bg-green-500' },
  generalization: { label: 'Generalization', color: 'bg-purple-500' },
  mastered: { label: 'Mastered', color: 'bg-emerald-600' },
};

const DATE_RANGE_PRESETS = [
  { label: 'Last 5 Days', value: 'last5', days: 5 },
  { label: 'Last 7 Days', value: 'last7', days: 7 },
  { label: 'Last 14 Days', value: 'last14', days: 14 },
  { label: 'Last 30 Days', value: 'last30', days: 30 },
  { label: 'Last 90 Days', value: 'last90', days: 90 },
  { label: 'All Time', value: 'all', days: null },
  { label: 'Custom Range', value: 'custom', days: null },
];

export function StudentSkillsOverview({ 
  studentName, 
  skillTargets, 
  dttSessions, 
  studentColor 
}: StudentSkillsOverviewProps) {
  // Filter state
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<string>('last5');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());

  // Get unique domains for filter dropdown
  const uniqueDomains = useMemo(() => {
    const domains = new Set(skillTargets.map(t => t.domain || 'General'));
    return Array.from(domains).sort();
  }, [skillTargets]);

  // Calculate date range based on preset or custom
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

  // Calculate stats for each target
  const targetsWithStats: TargetWithStats[] = useMemo(() => {
    return skillTargets.map(target => {
      const sessions = dttSessions.filter(s => s.skillTargetId === target.id);
      const totalTrials = sessions.reduce((sum, s) => sum + s.trials.length, 0);
      
      // Filter sessions by date range
      const filteredSessions = dateRange
        ? sessions.filter(s => {
            const sessionDate = new Date(s.date);
            return isWithinInterval(sessionDate, { start: dateRange.start, end: dateRange.end });
          })
        : sessions;
      
      const filteredTrials = filteredSessions.reduce((sum, s) => sum + s.trials.length, 0);
      
      // Calculate trend based on filtered sessions (date range)
      const sortedFilteredSessions = [...filteredSessions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      let recentTrend: 'up' | 'flat' | 'down' | null = null;
      let trendPercentage = 0;
      
      if (sortedFilteredSessions.length >= 2) {
        const halfIndex = Math.floor(sortedFilteredSessions.length / 2);
        const firstHalf = sortedFilteredSessions.slice(0, halfIndex);
        const secondHalf = sortedFilteredSessions.slice(halfIndex);
        
        const avgFirst = firstHalf.reduce((s, sess) => s + sess.percentCorrect, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s, sess) => s + sess.percentCorrect, 0) / secondHalf.length;
        
        trendPercentage = avgSecond - avgFirst;
        
        if (trendPercentage >= 5) {
          recentTrend = 'up';
        } else if (trendPercentage <= -5) {
          recentTrend = 'down';
        } else {
          recentTrend = 'flat';
        }
      }
      
      const sortedSessions = [...sessions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const lastSession = sortedSessions[0];
      
      return {
        ...target,
        sessions,
        filteredSessions,
        totalTrials,
        filteredTrials,
        recentTrend,
        trendPercentage,
        lastSessionDate: lastSession ? new Date(lastSession.date) : null,
        lastPercentCorrect: lastSession?.percentCorrect ?? null,
      };
    });
  }, [skillTargets, dttSessions, dateRange]);

  // Apply filters
  const filteredTargets = useMemo(() => {
    return targetsWithStats.filter(target => {
      // Domain filter
      if (domainFilter !== 'all') {
        const targetDomain = target.domain || 'General';
        if (targetDomain !== domainFilter) return false;
      }
      // Status filter
      if (statusFilter !== 'all' && target.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [targetsWithStats, domainFilter, statusFilter]);

  // Group targets by trend (using filtered targets)
  const trendingUp = filteredTargets.filter(t => t.recentTrend === 'up' && t.status !== 'mastered');
  const trendingFlat = filteredTargets.filter(t => t.recentTrend === 'flat' && t.status !== 'mastered');
  const trendingDown = filteredTargets.filter(t => t.recentTrend === 'down' && t.status !== 'mastered');
  const recentlyMastered = filteredTargets.filter(t => t.status === 'mastered');
  const inBaseline = filteredTargets.filter(t => t.status === 'baseline');
  const noData = filteredTargets.filter(t => t.filteredSessions.length === 0 && t.status !== 'mastered');
  
  const isFiltered = domainFilter !== 'all' || statusFilter !== 'all' || dateRangePreset !== 'last5';

  // Summary statistics (moved before export functions that depend on it)
  const summaryStats = useMemo(() => {
    const mastered = filteredTargets.filter(t => t.status === 'mastered').length;
    const openTargets = filteredTargets.filter(t => t.status !== 'mastered').length;
    const filteredSessionsAll = filteredTargets.flatMap(t => t.filteredSessions);
    const totalSessions = filteredSessionsAll.length;
    const totalTrials = filteredSessionsAll.reduce((sum, s) => sum + s.trials.length, 0);
    
    // Calculate avg trials to mastery (for mastered targets only)
    const masteredTargets = filteredTargets.filter(t => t.status === 'mastered');
    const avgTrialsToMastery = masteredTargets.length > 0
      ? Math.round(masteredTargets.reduce((sum, t) => sum + t.totalTrials, 0) / masteredTargets.length)
      : 0;
    
    const percentMastered = filteredTargets.length > 0
      ? Math.round((mastered / filteredTargets.length) * 100)
      : 0;

    return {
      openTargets,
      mastered,
      totalSessions,
      totalTrials,
      avgTrialsToMastery,
      percentMastered,
    };
  }, [filteredTargets]);

  // Export functions
  const generateCSV = useCallback(() => {
    const headers = ['Target Name', 'Domain', 'Status', 'Date Opened', 'Total Trials', 'Trials in Range', 'Trend', 'Last Session', 'Last % Correct'];
    const rows = filteredTargets.map(t => [
      t.name,
      t.domain || 'General',
      STATUS_LABELS[t.status]?.label || t.status,
      format(new Date(t.createdAt), 'yyyy-MM-dd'),
      t.totalTrials.toString(),
      t.filteredTrials.toString(),
      t.recentTrend || 'N/A',
      t.lastSessionDate ? format(t.lastSessionDate, 'yyyy-MM-dd') : 'N/A',
      t.lastPercentCorrect !== null ? `${t.lastPercentCorrect}%` : 'N/A',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    return csvContent;
  }, [filteredTargets]);

  const handleExportCSV = useCallback(() => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${studentName.replace(/\s+/g, '_')}_skills_overview_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  }, [generateCSV, studentName]);

  const handleExportGoogleSheets = useCallback(() => {
    // Generate CSV and copy to clipboard for easy paste into Google Sheets
    const csv = generateCSV();
    navigator.clipboard.writeText(csv).then(() => {
      toast.success('Data copied to clipboard! Open Google Sheets and paste (Ctrl+V)');
    }).catch(() => {
      // Fallback: download as CSV
      handleExportCSV();
      toast.info('Could not copy to clipboard. Downloaded as CSV instead.');
    });
  }, [generateCSV, handleExportCSV]);

  const handleExportPDF = useCallback(() => {
    // Generate a printable HTML and open print dialog
    const dateRangeLabel = dateRangePreset === 'custom' 
      ? `${customStartDate ? format(customStartDate, 'MMM d, yyyy') : ''} - ${customEndDate ? format(customEndDate, 'MMM d, yyyy') : ''}`
      : DATE_RANGE_PRESETS.find(p => p.value === dateRangePreset)?.label || 'All Time';
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Skills Overview - ${studentName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #3B82F6; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f4f4f4; font-weight: 600; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
          .summary-item { background: #f4f4f4; padding: 12px; border-radius: 6px; }
          .summary-label { font-size: 11px; color: #666; }
          .summary-value { font-size: 18px; font-weight: bold; color: #333; }
          .trend-up { color: #22c55e; }
          .trend-down { color: #ef4444; }
          .trend-flat { color: #6b7280; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Skills Overview: ${studentName}</h1>
        <p class="meta">Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')} | Date Range: ${dateRangeLabel}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Open Targets</div>
            <div class="summary-value">${summaryStats.openTargets}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Mastered Targets</div>
            <div class="summary-value">${summaryStats.mastered}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">% Mastered</div>
            <div class="summary-value">${summaryStats.percentMastered}%</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Avg Trials to Mastery</div>
            <div class="summary-value">${summaryStats.avgTrialsToMastery}</div>
          </div>
        </div>

        ${trendingUp.length > 0 ? `
          <h2 class="trend-up">↑ Trending Up (${trendingUp.length})</h2>
          <table>
            <tr><th>Target</th><th>Domain</th><th>Status</th><th>Trials</th><th>Trend</th></tr>
            ${trendingUp.map(t => `<tr><td>${t.name}</td><td>${t.domain || 'General'}</td><td>${STATUS_LABELS[t.status]?.label}</td><td>${t.filteredTrials}</td><td class="trend-up">+${t.trendPercentage.toFixed(1)}%</td></tr>`).join('')}
          </table>
        ` : ''}

        ${trendingFlat.length > 0 ? `
          <h2 class="trend-flat">→ Trending Flat (${trendingFlat.length})</h2>
          <table>
            <tr><th>Target</th><th>Domain</th><th>Status</th><th>Trials</th><th>Trend</th></tr>
            ${trendingFlat.map(t => `<tr><td>${t.name}</td><td>${t.domain || 'General'}</td><td>${STATUS_LABELS[t.status]?.label}</td><td>${t.filteredTrials}</td><td class="trend-flat">${t.trendPercentage.toFixed(1)}%</td></tr>`).join('')}
          </table>
        ` : ''}

        ${trendingDown.length > 0 ? `
          <h2 class="trend-down">↓ Trending Down (${trendingDown.length})</h2>
          <table>
            <tr><th>Target</th><th>Domain</th><th>Status</th><th>Trials</th><th>Trend</th></tr>
            ${trendingDown.map(t => `<tr><td>${t.name}</td><td>${t.domain || 'General'}</td><td>${STATUS_LABELS[t.status]?.label}</td><td>${t.filteredTrials}</td><td class="trend-down">${t.trendPercentage.toFixed(1)}%</td></tr>`).join('')}
          </table>
        ` : ''}

        ${recentlyMastered.length > 0 ? `
          <h2>✓ Mastered Targets (${recentlyMastered.length})</h2>
          <table>
            <tr><th>Target</th><th>Domain</th><th>Total Trials</th><th>Date Opened</th></tr>
            ${recentlyMastered.map(t => `<tr><td>${t.name}</td><td>${t.domain || 'General'}</td><td>${t.totalTrials}</td><td>${format(new Date(t.createdAt), 'M/d/yyyy')}</td></tr>`).join('')}
          </table>
        ` : ''}

        ${noData.length > 0 ? `
          <h2>⚠ Targets Without Data (${noData.length})</h2>
          <table>
            <tr><th>Target</th><th>Domain</th><th>Status</th><th>Date Opened</th></tr>
            ${noData.map(t => `<tr><td>${t.name}</td><td>${t.domain || 'General'}</td><td>${STATUS_LABELS[t.status]?.label}</td><td>${format(new Date(t.createdAt), 'M/d/yyyy')}</td></tr>`).join('')}
          </table>
        ` : ''}
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
      toast.success('Print dialog opened - save as PDF');
    } else {
      toast.error('Could not open print window. Please allow popups.');
    }
  }, [studentName, dateRangePreset, customStartDate, customEndDate, summaryStats, trendingUp, trendingFlat, trendingDown, recentlyMastered, noData]);


  // Today's data
  const trialsToday = useMemo(() => {
    const today = startOfDay(new Date());
    return dttSessions
      .filter(s => isWithinInterval(new Date(s.date), { start: today, end: endOfDay(new Date()) }))
      .reduce((sum, s) => sum + s.trials.length, 0);
  }, [dttSessions]);

  if (skillTargets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground font-medium">No Skill Targets</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add skill targets to start tracking progress
          </p>
        </CardContent>
      </Card>
    );
  }

  const TargetTable = ({ 
    targets, 
    showTrialsToday = false 
  }: { 
    targets: TargetWithStats[]; 
    showTrialsToday?: boolean;
  }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Target</TableHead>
          <TableHead className="text-xs">Date Opened</TableHead>
          <TableHead className="text-xs text-right">Trial Count</TableHead>
          {showTrialsToday && <TableHead className="text-xs text-right">Trials Today</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {targets.map(target => {
          const targetSessionsToday = target.sessions.filter(s => 
            isWithinInterval(new Date(s.date), { start: startOfDay(new Date()), end: endOfDay(new Date()) })
          );
          const trialsToday = targetSessionsToday.reduce((sum, s) => sum + s.trials.length, 0);
          
          return (
            <TableRow key={target.id} className="text-xs">
              <TableCell className="font-medium py-2">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">{target.domain || 'General'}:</span>
                  <span>{target.name}</span>
                </div>
              </TableCell>
              <TableCell className="py-2">
                {format(new Date(target.createdAt), 'M-d-yyyy')}
              </TableCell>
              <TableCell className="text-right py-2">{target.totalTrials}</TableCell>
              {showTrialsToday && (
                <TableCell className="text-right py-2">{trialsToday}</TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Filters and Export */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Skills Overview
              </CardTitle>
              
              {/* Export Buttons */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportGoogleSheets}>
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-primary" />
                    Copy for Google Sheets
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="w-4 h-4 mr-2 text-destructive" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGE_PRESETS.map(preset => (
                      <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range Pickers */}
              {dateRangePreset === 'custom' && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-8 justify-start text-left font-normal", !customStartDate && "text-muted-foreground")}>
                        {customStartDate ? format(customStartDate, "MMM d, yyyy") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-8 justify-start text-left font-normal", !customEndDate && "text-muted-foreground")}>
                        {customEndDate ? format(customEndDate, "MMM d, yyyy") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </>
              )}

              <div className="h-4 w-px bg-border mx-1" />

              {/* Domain Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Domain:</span>
                <Select value={domainFilter} onValueChange={setDomainFilter}>
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    {uniqueDomains.map(domain => (
                      <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isFiltered && (
              <p className="text-sm text-muted-foreground">
                Showing {filteredTargets.length} of {targetsWithStats.length} targets
                {dateRange && ` • ${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
              </p>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Daily Snapshot Header */}
      <Card style={{ borderColor: `${studentColor}40` }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Daily Snapshot of {studentName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Average Trial Count per Day</p>
              <p className="text-xl font-bold">
                {summaryStats.totalSessions > 0 
                  ? Math.round(summaryStats.totalTrials / Math.max(1, summaryStats.totalSessions))
                  : 'No data available'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Targets that Need Reopening</p>
              <p className="text-xl font-bold">
                {trendingDown.length > 0 ? trendingDown.length : 'No data available'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Highest Performing Targets</p>
              <p className="text-xl font-bold">
                {trendingUp.length > 0 ? trendingUp.length : 'No data available'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Current Targets in Baseline</p>
              <p className="text-xl font-bold">
                {inBaseline.length > 0 ? inBaseline.length : 'No data available'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets Trending Up */}
      {trendingUp.length > 0 && (
        <Card>
          <CardHeader className="py-3 flex flex-row items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Targets Trending Up: Last 5 days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TargetTable targets={trendingUp} showTrialsToday />
          </CardContent>
        </Card>
      )}

      {/* Targets Trending Flat */}
      {trendingFlat.length > 0 && (
        <Card>
          <CardHeader className="py-3 flex flex-row items-center gap-2">
            <Minus className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              Targets Trending Flat: Last 5 days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TargetTable targets={trendingFlat} />
          </CardContent>
        </Card>
      )}

      {/* Targets Trending Down */}
      {trendingDown.length > 0 && (
        <Card>
          <CardHeader className="py-3 flex flex-row items-center gap-2">
            <TrendingDown className="w-5 h-5 text-destructive" />
            <CardTitle className="text-base font-semibold">
              Targets Trending Down: Last 5 days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TargetTable targets={trendingDown} />
          </CardContent>
        </Card>
      )}

      {/* Recently Mastered */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-semibold">
            Recently Mastered Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentlyMastered.length > 0 ? (
            <TargetTable targets={recentlyMastered} />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Lowest Performing / No Data */}
      {noData.length > 0 && (
        <Card>
          <CardHeader className="py-3 flex flex-row items-center gap-2">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              Targets Without Data
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TargetTable targets={noData} />
          </CardContent>
        </Card>
      )}

      {/* Student Statistics Summary */}
      <Card className="bg-muted/30">
        <CardHeader className="py-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Student Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Trials to Mastery</p>
              <p className="text-lg font-bold">{summaryStats.avgTrialsToMastery}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Teaching Days to Mastery</p>
              <p className="text-lg font-bold">
                {summaryStats.mastered > 0 
                  ? Math.round(summaryStats.totalSessions / Math.max(1, summaryStats.mastered))
                  : 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Open Targets</p>
              <p className="text-lg font-bold">{summaryStats.openTargets}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">% of Targets Mastered</p>
              <p className="text-lg font-bold">{summaryStats.percentMastered}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">% of Targets Failed in Maintenance</p>
              <p className="text-lg font-bold">0%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failed in Maintenance */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center gap-2">
          <Activity className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">
            Failed In Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground py-4 text-center">No data available.</p>
        </CardContent>
      </Card>
    </div>
  );
}
