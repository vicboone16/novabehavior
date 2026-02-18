import { useState, useMemo, useRef } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, isWithinInterval, getHours, getDay } from 'date-fns';
import { 
  Download, FileSpreadsheet, FileText, Calendar, User, Activity, 
  Filter, Printer, CalendarDays, CalendarRange, TrendingUp, ExternalLink, BarChart3, Clock
} from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useDataStore } from '@/store/dataStore';
import { Session, DataCollectionMethod, METHOD_LABELS, IntervalEntry } from '@/types/behavior';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(173, 58%, 49%)',
  'hsl(262, 83%, 68%)',
  'hsl(38, 92%, 60%)',
  'hsl(0, 72%, 61%)',
  'hsl(280, 65%, 70%)',
];

type DateFrame = 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

const SAMPLING_TYPE_LABELS: Record<string, string> = {
  partial: 'Partial Interval Recording',
  whole: 'Whole Interval Recording',
  momentary: 'Momentary Time Sampling',
};

export function DataExportManager() {
  const { sessions, students, sessionConfig } = useDataStore();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Date frame selection — default to "All Time" so historical data is always visible
  const [dateFrame, setDateFrame] = useState<DateFrame>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  // Specific session selection (empty = all sessions in date range)
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  
  // Filters
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedBehaviorIds, setSelectedBehaviorIds] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<DataCollectionMethod[]>([]);
  
  // Export options
  const [includeTrendCharts, setIncludeTrendCharts] = useState<boolean>(true);
  const [includeHeatmap, setIncludeHeatmap] = useState<boolean>(true);

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // Get date range based on frame
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateFrame) {
      case 'all':
        return { from: new Date('2000-01-01'), to: new Date('2100-01-01') };
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      case 'thisWeek':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        return { from: lastWeekStart, to: endOfWeek(lastWeekStart, { weekStartsOn: 1 }) };
      case 'thisMonth':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'lastMonth':
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        return { from: lastMonthStart, to: endOfMonth(lastMonthStart) };
      case 'custom':
        return { 
          from: customDateRange.from || startOfDay(now), 
          to: customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(now) 
        };
      default:
        return { from: new Date('2000-01-01'), to: new Date('2100-01-01') };
    }
  }, [dateFrame, customDateRange]);

  // Filter sessions by date range
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return isWithinInterval(sessionDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [sessions, dateRange]);

  // Aggregate all entries from filtered sessions
  const aggregatedData = useMemo(() => {
    const freq: typeof filteredSessions[0]['frequencyEntries'] = [];
    const dur: typeof filteredSessions[0]['durationEntries'] = [];
    const interval: typeof filteredSessions[0]['intervalEntries'] = [];
    const abc: typeof filteredSessions[0]['abcEntries'] = [];

    filteredSessions.forEach(session => {
      freq.push(...session.frequencyEntries);
      dur.push(...session.durationEntries);
      interval.push(...session.intervalEntries);
      abc.push(...session.abcEntries);
    });

    // Apply student filter
    const filterByStudent = (e: { studentId: string }) => 
      selectedStudentIds.length === 0 || selectedStudentIds.includes(e.studentId);
    
    // Apply behavior filter
    const filterByBehavior = (e: { behaviorId: string }) => 
      selectedBehaviorIds.length === 0 || selectedBehaviorIds.includes(e.behaviorId);

    const includeMethod = (method: DataCollectionMethod) =>
      selectedMethods.length === 0 || selectedMethods.includes(method);

    return {
      frequencyEntries: includeMethod('frequency') ? freq.filter(e => filterByStudent(e) && filterByBehavior(e)) : [],
      durationEntries: includeMethod('duration') ? dur.filter(e => filterByStudent(e) && filterByBehavior(e)) : [],
      intervalEntries: includeMethod('interval') ? interval.filter(e => filterByStudent(e) && filterByBehavior(e)) : [],
      abcEntries: includeMethod('abc') ? abc.filter(e => filterByStudent(e) && filterByBehavior(e)) : [],
    };
  }, [filteredSessions, selectedStudentIds, selectedBehaviorIds, selectedMethods]);

  // Get unique students from ALL sessions (not just filtered) so dropdowns are always populated
  // regardless of the current date range selection. This prevents "catch-22" where empty
  // date range → empty dropdowns → can't select students to look at their data.
  const sessionStudentIds = useMemo(() => {
    const ids = new Set<string>();
    sessions.forEach(s => {
      s.frequencyEntries.forEach(e => ids.add(e.studentId));
      s.durationEntries.forEach(e => ids.add(e.studentId));
      s.intervalEntries.forEach(e => ids.add(e.studentId));
      s.abcEntries.forEach(e => ids.add(e.studentId));
    });
    return Array.from(ids);
  }, [sessions]);

  // Get unique behaviors from ALL sessions (decoupled from date filter)
  const sessionBehaviors = useMemo(() => {
    const behaviors = new Map<string, string>();
    sessions.forEach(session => {
      session.frequencyEntries.forEach(e => {
        const student = students.find(s => s.id === e.studentId);
        const behavior = student?.behaviors.find(b => b.id === e.behaviorId);
        if (behavior) behaviors.set(e.behaviorId, behavior.name);
      });
      session.durationEntries.forEach(e => {
        const student = students.find(s => s.id === e.studentId);
        const behavior = student?.behaviors.find(b => b.id === e.behaviorId);
        if (behavior) behaviors.set(e.behaviorId, behavior.name);
      });
      session.intervalEntries.forEach(e => {
        const student = students.find(s => s.id === e.studentId);
        const behavior = student?.behaviors.find(b => b.id === e.behaviorId);
        if (behavior) behaviors.set(e.behaviorId, behavior.name);
      });
    });
    return Array.from(behaviors.entries());
  }, [sessions, students]);

  // Available methods from ALL sessions (decoupled from date filter)
  const availableMethods = useMemo(() => {
    const methods: DataCollectionMethod[] = [];
    if (sessions.some(s => s.frequencyEntries.length > 0)) methods.push('frequency');
    if (sessions.some(s => s.durationEntries.length > 0)) methods.push('duration');
    if (sessions.some(s => s.intervalEntries.length > 0)) methods.push('interval');
    if (sessions.some(s => s.abcEntries.length > 0)) methods.push('abc');
    return methods;
  }, [sessions]);

  // Chart data for trend visualization
  const trendChartData = useMemo(() => {
    return filteredSessions.map(session => {
      const date = format(new Date(session.date), 'MM/dd');
      
      // Calculate totals per session
      const freqTotal = session.frequencyEntries
        .filter(e => (selectedStudentIds.length === 0 || selectedStudentIds.includes(e.studentId)) &&
                     (selectedBehaviorIds.length === 0 || selectedBehaviorIds.includes(e.behaviorId)))
        .reduce((sum, e) => sum + e.count, 0);
      
      const durTotal = session.durationEntries
        .filter(e => (selectedStudentIds.length === 0 || selectedStudentIds.includes(e.studentId)) &&
                     (selectedBehaviorIds.length === 0 || selectedBehaviorIds.includes(e.behaviorId)))
        .reduce((sum, e) => sum + Math.round(e.duration / 60), 0);
      
      const intervals = session.intervalEntries
        .filter(e => (selectedStudentIds.length === 0 || selectedStudentIds.includes(e.studentId)) &&
                     (selectedBehaviorIds.length === 0 || selectedBehaviorIds.includes(e.behaviorId)) &&
                     !e.voided);
      const intPct = intervals.length > 0 
        ? Math.round((intervals.filter(e => e.occurred).length / intervals.length) * 100)
        : 0;
      
      return {
        date,
        Frequency: freqTotal,
        'Duration (min)': durTotal,
        'Interval %': intPct,
      };
    });
  }, [filteredSessions, selectedStudentIds, selectedBehaviorIds]);

  // Heatmap data for time-based analysis
  const heatmapData = useMemo(() => {
    const slots: Map<string, { day: number; hour: number; count: number; behaviors: string[] }> = new Map();
    
    // Process all frequency entries from filtered sessions
    aggregatedData.frequencyEntries.forEach(entry => {
      const student = students.find(s => s.id === entry.studentId);
      const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
      if (!behavior) return;

      (entry.timestamps || [new Date(entry.timestamp)]).forEach(ts => {
        const date = new Date(ts);
        const day = getDay(date);
        const hour = getHours(date);
        const key = `${day}-${hour}`;
        
        const existing = slots.get(key) || { day, hour, count: 0, behaviors: [] };
        existing.count += 1;
        if (!existing.behaviors.includes(behavior.name)) {
          existing.behaviors.push(behavior.name);
        }
        slots.set(key, existing);
      });
    });

    // Process ABC entries
    aggregatedData.abcEntries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const day = getDay(date);
      const hour = getHours(date);
      const key = `${day}-${hour}`;
      
      const existing = slots.get(key) || { day, hour, count: 0, behaviors: [] };
      existing.count += entry.frequencyCount || 1;
      const behaviorNames = entry.behaviors?.map(b => b.behaviorName) || [entry.behavior];
      behaviorNames.forEach(name => {
        if (!existing.behaviors.includes(name)) {
          existing.behaviors.push(name);
        }
      });
      slots.set(key, existing);
    });

    return Array.from(slots.values());
  }, [aggregatedData, students]);

  const heatmapMatrix = useMemo(() => {
    const matrix: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    heatmapData.forEach(slot => {
      matrix[slot.day][slot.hour] = slot.count;
    });
    return matrix;
  }, [heatmapData]);

  const maxHeatmapCount = useMemo(() => Math.max(...heatmapData.map(t => t.count), 1), [heatmapData]);

  const getHeatColor = (count: number) => {
    if (count === 0) return 'hsl(var(--muted))';
    const intensity = count / maxHeatmapCount;
    if (intensity < 0.25) return 'hsl(199, 89%, 80%)';
    if (intensity < 0.5) return 'hsl(199, 89%, 60%)';
    if (intensity < 0.75) return 'hsl(38, 92%, 50%)';
    return 'hsl(0, 72%, 51%)';
  };

  const getStudentName = (studentId: string) => 
    students.find(s => s.id === studentId)?.name || 'Unknown';

  const getStudentColor = (studentId: string) => 
    students.find(s => s.id === studentId)?.color || '#888';

  const getBehaviorName = (studentId: string, behaviorId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.behaviors.find(b => b.id === behaviorId)?.name || 'Unknown';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getVoidReasonLabel = (reason?: string) => {
    const labels: Record<string, string> = {
      'late_arrival': 'Late Arrival',
      'early_departure': 'Early Departure',
      'not_present': 'Not Present',
      'fire_drill': 'Fire Drill',
      'break': 'Break',
      'transition': 'Transition',
      'other': 'Other'
    };
    return labels[reason || ''] || reason || 'N/A';
  };

  // Toggle functions
  const toggleStudent = (id: string) => setSelectedStudentIds(prev => 
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const toggleBehavior = (id: string) => setSelectedBehaviorIds(prev => 
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const toggleMethod = (m: DataCollectionMethod) => setSelectedMethods(prev => 
    prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
  );

  const hasFilters = selectedStudentIds.length > 0 || selectedBehaviorIds.length > 0 || selectedMethods.length > 0;

  // Google Sheets Export (via TSV copy to clipboard)
  const exportToGoogleSheets = async () => {
    const rows: string[] = [];
    
    // Header
    rows.push(['Date', 'Time', 'Type', 'Student', 'Behavior', 'Value', 'Interval #', 'Status', 'Voided', 'Void Reason', 'Notes'].join('\t'));
    
    // Data rows
    aggregatedData.frequencyEntries.forEach(e => {
      const session = filteredSessions.find(s => s.frequencyEntries.some(fe => fe.id === e.id));
      rows.push([
        format(new Date(e.timestamp), 'yyyy-MM-dd'),
        format(new Date(e.timestamp), 'HH:mm:ss'),
        'Frequency',
        getStudentName(e.studentId),
        getBehaviorName(e.studentId, e.behaviorId),
        e.count.toString(),
        '', '', '', '',
        session?.notes || ''
      ].join('\t'));
    });

    aggregatedData.durationEntries.forEach(e => {
      const session = filteredSessions.find(s => s.durationEntries.some(de => de.id === e.id));
      rows.push([
        format(new Date(e.startTime), 'yyyy-MM-dd'),
        format(new Date(e.startTime), 'HH:mm:ss'),
        'Duration',
        getStudentName(e.studentId),
        getBehaviorName(e.studentId, e.behaviorId),
        formatDuration(e.duration),
        '', '', '', '',
        session?.notes || ''
      ].join('\t'));
    });

    aggregatedData.intervalEntries.forEach(e => {
      const session = filteredSessions.find(s => s.intervalEntries.some(ie => ie.id === e.id));
      rows.push([
        format(new Date(e.timestamp), 'yyyy-MM-dd'),
        format(new Date(e.timestamp), 'HH:mm:ss'),
        'Interval',
        getStudentName(e.studentId),
        getBehaviorName(e.studentId, e.behaviorId),
        e.voided ? 'N/A' : (e.occurred ? 'Yes' : 'No'),
        (e.intervalNumber + 1).toString(),
        e.occurred ? 'Y' : 'N',
        e.voided ? 'Y' : 'N',
        e.voided ? getVoidReasonLabel(e.voidReason) : '',
        session?.notes || ''
      ].join('\t'));
    });

    aggregatedData.abcEntries.forEach(e => {
      const session = filteredSessions.find(s => s.abcEntries.some(ae => ae.id === e.id));
      rows.push([
        format(new Date(e.timestamp), 'yyyy-MM-dd'),
        format(new Date(e.timestamp), 'HH:mm:ss'),
        'ABC',
        getStudentName(e.studentId),
        e.behavior,
        `A: ${e.antecedent} | B: ${e.behavior} | C: ${e.consequence}`,
        '', '', '', '',
        session?.notes || ''
      ].join('\t'));
    });

    const tsvContent = rows.join('\n');
    
    try {
      await navigator.clipboard.writeText(tsvContent);
      toast({
        title: 'Copied to clipboard!',
        description: 'Open Google Sheets and paste (Ctrl/Cmd+V) to import your data.',
      });
      // Open Google Sheets in new tab
      window.open('https://sheets.google.com/create', '_blank');
    } catch (err) {
      // Fallback: download as TSV file
      const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
      saveAs(blob, `behavior-data-${format(new Date(), 'yyyy-MM-dd')}.tsv`);
      toast({
        title: 'Downloaded TSV file',
        description: 'Open Google Sheets → File → Import → Upload the TSV file.',
      });
    }
  };

  // Enhanced CSV Export
  const exportEnhancedCSV = () => {
    const rows: string[] = [];
    
    // Header with more detail
    rows.push('Date,Time,Session ID,Type,Student,Behavior,Value,Interval #,Endorsed,Voided,Void Reason,Sampling Type,Duration (sec),Count,Antecedent,Consequence,Functions,Notes');
    
    // Frequency entries
    aggregatedData.frequencyEntries.forEach(e => {
      const session = filteredSessions.find(s => s.frequencyEntries.some(fe => fe.id === e.id));
      rows.push([
        format(new Date(e.timestamp), 'yyyy-MM-dd'),
        format(new Date(e.timestamp), 'HH:mm:ss'),
        session?.id || '',
        'Frequency',
        getStudentName(e.studentId),
        getBehaviorName(e.studentId, e.behaviorId),
        e.count.toString(),
        '', '', '', '', '', '',
        e.count.toString(),
        '', '', '', session?.notes || ''
      ].map(v => `"${v}"`).join(','));
    });

    // Duration entries
    aggregatedData.durationEntries.forEach(e => {
      const session = filteredSessions.find(s => s.durationEntries.some(de => de.id === e.id));
      rows.push([
        format(new Date(e.startTime), 'yyyy-MM-dd'),
        format(new Date(e.startTime), 'HH:mm:ss'),
        session?.id || '',
        'Duration',
        getStudentName(e.studentId),
        getBehaviorName(e.studentId, e.behaviorId),
        formatDuration(e.duration),
        '', '', '', '', '',
        e.duration.toString(),
        '', '', '', '', session?.notes || ''
      ].map(v => `"${v}"`).join(','));
    });

    // Interval entries with full detail
    aggregatedData.intervalEntries.forEach(e => {
      const session = filteredSessions.find(s => s.intervalEntries.some(ie => ie.id === e.id));
      rows.push([
        format(new Date(e.timestamp), 'yyyy-MM-dd'),
        format(new Date(e.timestamp), 'HH:mm:ss'),
        session?.id || '',
        'Interval',
        getStudentName(e.studentId),
        getBehaviorName(e.studentId, e.behaviorId),
        e.voided ? 'N/A' : (e.occurred ? 'Yes' : 'No'),
        (e.intervalNumber + 1).toString(),
        e.occurred ? 'Y' : 'N',
        e.voided ? 'Y' : 'N',
        e.voided ? getVoidReasonLabel(e.voidReason) : '',
        SAMPLING_TYPE_LABELS[sessionConfig.samplingType] || 'Partial',
        '', '', '', '', '', session?.notes || ''
      ].map(v => `"${v}"`).join(','));
    });

    // ABC entries
    aggregatedData.abcEntries.forEach(e => {
      const session = filteredSessions.find(s => s.abcEntries.some(ae => ae.id === e.id));
      rows.push([
        format(new Date(e.timestamp), 'yyyy-MM-dd'),
        format(new Date(e.timestamp), 'HH:mm:ss'),
        session?.id || '',
        'ABC',
        getStudentName(e.studentId),
        e.behavior,
        `Count: ${e.frequencyCount || 1}`,
        '', '', '', '', '', '',
        (e.frequencyCount || 1).toString(),
        e.antecedents?.join('; ') || e.antecedent,
        e.consequences?.join('; ') || e.consequence,
        e.functions?.join('; ') || '',
        session?.notes || ''
      ].map(v => `"${v}"`).join(','));
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `behavior-data-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.csv`);
  };

  // Word Document Export
  const exportWordDocument = async () => {
    const children: (Paragraph | Table)[] = [];

    // Title
    children.push(
      new Paragraph({
        text: 'Behavior Data Collection Report',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Date Range: ${format(dateRange.from, 'MMMM d, yyyy')} - ${format(dateRange.to, 'MMMM d, yyyy')}`,
            size: 24,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`,
            size: 20,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Filters applied
    if (hasFilters) {
      children.push(
        new Paragraph({
          text: 'Filters Applied:',
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            ...(selectedStudentIds.length > 0 ? [new TextRun({ text: `Students: ${selectedStudentIds.map(id => getStudentName(id)).join(', ')}. ` })] : []),
            ...(selectedBehaviorIds.length > 0 ? [new TextRun({ text: `Behaviors: ${sessionBehaviors.filter(([id]) => selectedBehaviorIds.includes(id)).map(([, name]) => name).join(', ')}. ` })] : []),
            ...(selectedMethods.length > 0 ? [new TextRun({ text: `Methods: ${selectedMethods.map(m => METHOD_LABELS[m]).join(', ')}.` })] : []),
          ],
          spacing: { after: 400 },
        })
      );
    }

    // Summary Statistics
    const totalFreq = aggregatedData.frequencyEntries.reduce((sum, e) => sum + e.count, 0);
    const totalDur = aggregatedData.durationEntries.reduce((sum, e) => sum + e.duration, 0);
    const validIntervals = aggregatedData.intervalEntries.filter(e => !e.voided);
    const occurredIntervals = validIntervals.filter(e => e.occurred).length;
    const intervalPct = validIntervals.length > 0 ? Math.round((occurredIntervals / validIntervals.length) * 100) : 0;

    children.push(
      new Paragraph({
        text: 'Summary Statistics',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Total Frequency Count: ${totalFreq}`, break: 1 }),
          new TextRun({ text: `Total Duration: ${formatDuration(totalDur)}`, break: 1 }),
          new TextRun({ text: `Interval Data: ${occurredIntervals}/${validIntervals.length} endorsed (${intervalPct}%)`, break: 1 }),
          new TextRun({ text: `ABC Entries: ${aggregatedData.abcEntries.length}`, break: 1 }),
          new TextRun({ text: `Sessions Included: ${filteredSessions.length}`, break: 1 }),
        ],
        spacing: { after: 400 },
      })
    );

    // Interval Recording Details
    if (aggregatedData.intervalEntries.length > 0) {
      children.push(
        new Paragraph({
          text: 'Interval Recording Details',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Recording Type: ${SAMPLING_TYPE_LABELS[sessionConfig.samplingType] || 'Partial Interval Recording'}`, break: 1 }),
            new TextRun({ text: `Interval Length: ${sessionConfig.intervalLength} seconds`, break: 1 }),
          ],
          spacing: { after: 200 },
        })
      );

      // Group by student and behavior
      const intervalsByStudent = aggregatedData.intervalEntries.reduce((acc, e) => {
        const key = `${e.studentId}-${e.behaviorId}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(e);
        return acc;
      }, {} as Record<string, IntervalEntry[]>);

      Object.entries(intervalsByStudent).forEach(([key, entries]) => {
        const [studentId, behaviorId] = key.split('-');
        const valid = entries.filter(e => !e.voided);
        const occurred = valid.filter(e => e.occurred).length;
        const pct = valid.length > 0 ? Math.round((occurred / valid.length) * 100) : 0;

        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${getStudentName(studentId)} - ${getBehaviorName(studentId, behaviorId)}: `, bold: true }),
              new TextRun({ text: `${occurred}/${valid.length} intervals endorsed (${pct}%)` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: `Intervals: ${entries.map(e => e.voided ? '—' : (e.occurred ? '✓' : '✗')).join(' ')}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      });
    }

    // ABC Data Table
    if (aggregatedData.abcEntries.length > 0) {
      children.push(
        new Paragraph({
          text: 'ABC Data',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400 },
        })
      );

      const tableRows = [
        new TableRow({
          children: ['Date/Time', 'Student', 'Antecedent', 'Behavior', 'Consequence', 'Function(s)'].map(text =>
            new TableCell({
              children: [new Paragraph({ text, alignment: AlignmentType.CENTER })],
              shading: { fill: 'E0E0E0' },
            })
          ),
        }),
        ...aggregatedData.abcEntries.slice(0, 50).map(e =>
          new TableRow({
            children: [
              format(new Date(e.timestamp), 'MM/dd HH:mm'),
              getStudentName(e.studentId),
              e.antecedents?.join(', ') || e.antecedent,
              e.behavior,
              e.consequences?.join(', ') || e.consequence,
              e.functions?.join(', ') || '-',
            ].map(text =>
              new TableCell({
                children: [new Paragraph({ text: text.substring(0, 50) })],
              })
            ),
          })
        ),
      ];

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );

      if (aggregatedData.abcEntries.length > 50) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `... and ${aggregatedData.abcEntries.length - 50} more entries`, italics: true }),
            ],
            spacing: { before: 200 },
          })
        );
      }
    }

    // Footer
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Report generated by Behavior Data Collector on ${format(new Date(), 'MMMM d, yyyy h:mm a')}`,
            size: 18,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800 },
      })
    );

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { orientation: 'landscape' as any },
          },
        },
        children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `behavior-report-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.docx`);
  };

  // Print/PDF Export
  const handlePrintPDF = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Behavior Data Report - ${format(dateRange.from, 'yyyy-MM-dd')} to ${format(dateRange.to, 'yyyy-MM-dd')}</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; font-size: 11px; }
          .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .filter-summary { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 11px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-box { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .summary-value { font-size: 20px; font-weight: bold; }
          .summary-label { font-size: 10px; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
          .interval-grid { display: flex; flex-wrap: wrap; gap: 3px; margin: 8px 0; }
          .interval-box { width: 20px; height: 20px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 9px; border-radius: 2px; }
          .interval-yes { background: #22c55e; color: white; }
          .interval-no { background: #ef4444; color: white; }
          .interval-na { background: #e5e7eb; color: #666; border-style: dashed; }
          .student-section { margin-bottom: 15px; page-break-inside: avoid; }
          .student-header { background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px; font-weight: bold; }
          .color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const totalEntries = aggregatedData.frequencyEntries.length + aggregatedData.durationEntries.length + 
    aggregatedData.intervalEntries.length + aggregatedData.abcEntries.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Data Export Manager
          </DialogTitle>
        </DialogHeader>

        {/* Date Frame Selection */}
        <div className="flex flex-wrap items-center gap-2 py-2 border-b">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <Select value={dateFrame} onValueChange={(v) => setDateFrame(v as DateFrame)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="lastWeek">Last Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateFrame === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <CalendarRange className="w-3 h-3" />
                  {customDateRange.from ? format(customDateRange.from, 'MMM d') : 'Start'} - {customDateRange.to ? format(customDateRange.to, 'MMM d') : 'End'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{ from: customDateRange.from, to: customDateRange.to }}
                  onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          <Badge variant="outline" className="ml-2">
            {dateFrame === 'all' ? 'All Time' : `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`}
          </Badge>

          <Badge variant="secondary">
            {filteredSessions.length} sessions
          </Badge>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 py-2 border-b">
          <Filter className="w-4 h-4 text-muted-foreground" />

          {/* Student Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <User className="w-3 h-3" />
                Students
                {selectedStudentIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">{selectedStudentIds.length}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Filter by Student</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedStudentIds([])}>Clear</Button>
                </div>
                <ScrollArea className="max-h-[200px]">
                  {sessionStudentIds.map(studentId => (
                    <div key={studentId} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`export-student-${studentId}`}
                        checked={selectedStudentIds.includes(studentId)}
                        onCheckedChange={() => toggleStudent(studentId)}
                      />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStudentColor(studentId) }} />
                      <Label htmlFor={`export-student-${studentId}`} className="text-sm cursor-pointer">
                        {getStudentName(studentId)}
                      </Label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {/* Behavior Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Activity className="w-3 h-3" />
                Behaviors
                {selectedBehaviorIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">{selectedBehaviorIds.length}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Filter by Behavior</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedBehaviorIds([])}>Clear</Button>
                </div>
                <ScrollArea className="max-h-[200px]">
                  {sessionBehaviors.map(([id, name]) => (
                    <div key={id} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`export-behavior-${id}`}
                        checked={selectedBehaviorIds.includes(id)}
                        onCheckedChange={() => toggleBehavior(id)}
                      />
                      <Label htmlFor={`export-behavior-${id}`} className="text-sm cursor-pointer">{name}</Label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {/* Method Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                Methods
                {selectedMethods.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">{selectedMethods.length}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Filter by Method</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedMethods([])}>Clear</Button>
                </div>
                {availableMethods.map(method => (
                  <div key={method} className="flex items-center gap-2 py-1">
                    <Checkbox
                      id={`export-method-${method}`}
                      checked={selectedMethods.includes(method)}
                      onCheckedChange={() => toggleMethod(method)}
                    />
                    <Label htmlFor={`export-method-${method}`} className="text-sm cursor-pointer">
                      {METHOD_LABELS[method]}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
              setSelectedStudentIds([]);
              setSelectedBehaviorIds([]);
              setSelectedMethods([]);
            }}>
              Clear All
            </Button>
          )}

          <Badge variant="outline" className="ml-auto">
            {totalEntries} entries
          </Badge>
        </div>

        {/* Export Options */}
        <div className="flex flex-wrap items-center gap-2 py-3 border-b">
          <Button onClick={exportEnhancedCSV} variant="outline" size="sm" className="gap-2" disabled={totalEntries === 0}>
            <FileSpreadsheet className="w-4 h-4" />
            CSV
          </Button>
          <Button onClick={exportToGoogleSheets} variant="outline" size="sm" className="gap-2" disabled={totalEntries === 0}>
            <ExternalLink className="w-4 h-4" />
            Google Sheets
          </Button>
          <Button onClick={exportWordDocument} variant="outline" size="sm" className="gap-2" disabled={totalEntries === 0}>
            <FileText className="w-4 h-4" />
            Word (.docx)
          </Button>
          <Button onClick={handlePrintPDF} size="sm" className="gap-2" disabled={totalEntries === 0}>
            <Printer className="w-4 h-4" />
            PDF
          </Button>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Include Charts Toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-charts"
              checked={includeTrendCharts}
              onCheckedChange={(checked) => setIncludeTrendCharts(checked === true)}
            />
            <Label htmlFor="include-charts" className="text-xs cursor-pointer flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Include Trend Charts
            </Label>
          </div>

          {/* Include Heatmap Toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-heatmap"
              checked={includeHeatmap}
              onCheckedChange={(checked) => setIncludeHeatmap(checked === true)}
            />
            <Label htmlFor="include-heatmap" className="text-xs cursor-pointer flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Include Heatmap
            </Label>
          </div>
        </div>

        {/* Report Preview */}
        <ScrollArea className="flex-1">
          <div ref={reportRef} className="p-4 space-y-4">
            {/* Report Header */}
            <div className="report-header text-center border-b-2 border-foreground pb-4">
              <h1 className="text-xl font-bold">Behavior Data Collection Report</h1>
              <p className="text-muted-foreground">
                {format(dateRange.from, 'MMMM d, yyyy')} - {format(dateRange.to, 'MMMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredSessions.length} sessions • {SAMPLING_TYPE_LABELS[sessionConfig.samplingType] || 'Partial Interval Recording'}
              </p>
            </div>

            {/* Filter Summary */}
            {hasFilters && (
              <div className="filter-summary bg-muted/50 p-3 rounded-lg text-sm">
                <span className="font-medium">Filters: </span>
                {selectedStudentIds.length > 0 && <span>Students: {selectedStudentIds.map(id => getStudentName(id)).join(', ')}; </span>}
                {selectedBehaviorIds.length > 0 && <span>Behaviors: {sessionBehaviors.filter(([id]) => selectedBehaviorIds.includes(id)).map(([, name]) => name).join(', ')}; </span>}
                {selectedMethods.length > 0 && <span>Methods: {selectedMethods.map(m => METHOD_LABELS[m]).join(', ')}; </span>}
              </div>
            )}

            {/* Summary Stats */}
            {totalEntries > 0 ? (
              <>
                <div className="summary-grid grid grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {aggregatedData.frequencyEntries.reduce((sum, e) => sum + e.count, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Frequency</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {formatDuration(aggregatedData.durationEntries.reduce((sum, e) => sum + e.duration, 0))}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Duration</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      {(() => {
                        const valid = aggregatedData.intervalEntries.filter(e => !e.voided);
                        const occurred = valid.filter(e => e.occurred).length;
                        const pct = valid.length > 0 ? Math.round((occurred / valid.length) * 100) : 0;
                        return (
                          <>
                            <p className="text-2xl font-bold text-primary">{occurred}/{valid.length}</p>
                            <p className="text-xs text-muted-foreground">Intervals ({pct}%)</p>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold text-primary">{aggregatedData.abcEntries.length}</p>
                      <p className="text-xs text-muted-foreground">ABC Entries</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Trend Charts */}
                {includeTrendCharts && trendChartData.length > 1 && (
                  <Card ref={chartRef}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Behavior Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Frequency Trend */}
                        {aggregatedData.frequencyEntries.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-2">Frequency Over Time</h4>
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={trendChartData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="Frequency" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Interval Percentage Trend */}
                        {aggregatedData.intervalEntries.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-2">Interval % Over Time</h4>
                            <ResponsiveContainer width="100%" height={180}>
                              <LineChart data={trendChartData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Line 
                                  type="monotone" 
                                  dataKey="Interval %" 
                                  stroke={CHART_COLORS[1]} 
                                  strokeWidth={2}
                                  dot={{ fill: CHART_COLORS[1], r: 4 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Duration Trend */}
                        {aggregatedData.durationEntries.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-2">Duration (min) Over Time</h4>
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={trendChartData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="Duration (min)" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Time-Based Heatmap */}
                {includeHeatmap && heatmapData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Time-Based Behavior Heatmap
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">
                        Shows when behaviors occur most frequently by day and hour
                      </p>
                      
                      {/* Legend */}
                      <div className="flex items-center gap-4 text-xs mb-3">
                        <span className="text-muted-foreground">Frequency:</span>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--muted))' }} />
                          <span>None</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(199, 89%, 80%)' }} />
                          <span>Low</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(199, 89%, 60%)' }} />
                          <span>Medium</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(38, 92%, 50%)' }} />
                          <span>High</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(0, 72%, 51%)' }} />
                          <span>Very High</span>
                        </div>
                      </div>

                      {/* Heatmap Grid */}
                      <div className="overflow-x-auto">
                        <div className="min-w-[600px]">
                          {/* Hour labels */}
                          <div className="flex mb-1">
                            <div className="w-12" />
                            {HOURS.filter(h => h % 2 === 0).map(hour => (
                              <div key={hour} className="flex-1 text-center text-[10px] text-muted-foreground">
                                {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                              </div>
                            ))}
                          </div>
                          
                          {/* Grid rows */}
                          {DAYS.map((day, dayIdx) => (
                            <div key={day} className="flex items-center gap-0.5 mb-0.5">
                              <div className="w-12 text-xs text-muted-foreground font-medium">{day}</div>
                              <div className="flex-1 flex gap-0.5">
                                {HOURS.map(hour => {
                                  const count = heatmapMatrix[dayIdx][hour];
                                  return (
                                    <div
                                      key={hour}
                                      className="flex-1 h-6 rounded-sm transition-colors"
                                      style={{ backgroundColor: getHeatColor(count) }}
                                      title={`${day} ${hour}:00 - ${count} occurrence${count !== 1 ? 's' : ''}`}
                                    >
                                      {count > 0 && (
                                        <span className="flex items-center justify-center h-full text-[9px] font-medium text-white">
                                          {count}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Peak Times Summary */}
                      <div className="mt-3 text-xs">
                        <span className="font-medium">Peak Times: </span>
                        {(() => {
                          const sorted = [...heatmapData].sort((a, b) => b.count - a.count).slice(0, 3);
                          if (sorted.length === 0) return <span className="text-muted-foreground">No data</span>;
                          return sorted.map((slot, i) => (
                            <span key={i}>
                              {DAYS[slot.day]} {slot.hour}:00 ({slot.count})
                              {i < sorted.length - 1 ? ', ' : ''}
                            </span>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Student Breakdown */}
                {[...new Set([
                  ...aggregatedData.frequencyEntries.map(e => e.studentId),
                  ...aggregatedData.durationEntries.map(e => e.studentId),
                  ...aggregatedData.intervalEntries.map(e => e.studentId),
                  ...aggregatedData.abcEntries.map(e => e.studentId),
                ])].map(studentId => {
                  const studentFreq = aggregatedData.frequencyEntries.filter(e => e.studentId === studentId);
                  const studentDur = aggregatedData.durationEntries.filter(e => e.studentId === studentId);
                  const studentInt = aggregatedData.intervalEntries.filter(e => e.studentId === studentId);

                  return (
                    <div key={studentId} className="student-section border rounded-lg p-3">
                      <div className="student-header flex items-center gap-2 mb-3">
                        <div className="color-dot w-3 h-3 rounded-full" style={{ backgroundColor: getStudentColor(studentId) }} />
                        <span className="font-semibold">{getStudentName(studentId)}</span>
                      </div>

                      {/* Frequency Data */}
                      {studentFreq.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Frequency</h4>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(studentFreq.reduce((acc, e) => {
                              acc[e.behaviorId] = (acc[e.behaviorId] || 0) + e.count;
                              return acc;
                            }, {} as Record<string, number>)).map(([behaviorId, count]) => (
                              <Badge key={behaviorId} variant="secondary">
                                {getBehaviorName(studentId, behaviorId)}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Duration Data */}
                      {studentDur.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Duration</h4>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(studentDur.reduce((acc, e) => {
                              acc[e.behaviorId] = (acc[e.behaviorId] || 0) + e.duration;
                              return acc;
                            }, {} as Record<string, number>)).map(([behaviorId, duration]) => (
                              <Badge key={behaviorId} variant="secondary">
                                {getBehaviorName(studentId, behaviorId)}: {formatDuration(duration)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interval Data with endorsement detail */}
                      {studentInt.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">
                            Interval Recording ({SAMPLING_TYPE_LABELS[sessionConfig.samplingType] || 'Partial'})
                          </h4>
                          {Object.entries(studentInt.reduce((acc, e) => {
                            if (!acc[e.behaviorId]) acc[e.behaviorId] = [];
                            acc[e.behaviorId].push(e);
                            return acc;
                          }, {} as Record<string, IntervalEntry[]>)).map(([behaviorId, intervals]) => {
                            const valid = intervals.filter(e => !e.voided);
                            const occurred = valid.filter(e => e.occurred).length;
                            const pct = valid.length > 0 ? Math.round((occurred / valid.length) * 100) : 0;
                            return (
                              <div key={behaviorId} className="mb-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{getBehaviorName(studentId, behaviorId)}</span>
                                  <Badge variant="outline">{occurred}/{valid.length} ({pct}%)</Badge>
                                </div>
                                <div className="interval-grid flex flex-wrap gap-1">
                                  {intervals.sort((a, b) => a.intervalNumber - b.intervalNumber).map((int, idx) => (
                                    <div
                                      key={int.id}
                                      className={`interval-box w-6 h-6 flex items-center justify-center text-[10px] rounded border ${
                                        int.voided 
                                          ? 'bg-muted text-muted-foreground border-dashed' 
                                          : int.occurred 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-red-500 text-white'
                                      }`}
                                      title={int.voided ? getVoidReasonLabel(int.voidReason) : (int.occurred ? 'Endorsed' : 'Not Endorsed')}
                                    >
                                      {int.voided ? '—' : (int.occurred ? '✓' : '✗')}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ABC Data Table */}
                {aggregatedData.abcEntries.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">ABC Data</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="p-2 text-left font-medium">Date/Time</th>
                              <th className="p-2 text-left font-medium">Student</th>
                              <th className="p-2 text-left font-medium">Antecedent</th>
                              <th className="p-2 text-left font-medium">Behavior</th>
                              <th className="p-2 text-left font-medium">Consequence</th>
                              <th className="p-2 text-center font-medium">Count</th>
                              <th className="p-2 text-left font-medium">Function(s)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aggregatedData.abcEntries.slice(0, 25).map((entry, idx) => (
                              <tr key={entry.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                <td className="p-2 text-xs whitespace-nowrap">
                                  {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStudentColor(entry.studentId) }} />
                                    <span className="text-xs">{getStudentName(entry.studentId)}</span>
                                  </div>
                                </td>
                                <td className="p-2 text-xs max-w-[120px] truncate">
                                  {entry.antecedents?.join(', ') || entry.antecedent}
                                </td>
                                <td className="p-2 text-xs font-medium max-w-[120px] truncate">
                                  {entry.behavior}
                                </td>
                                <td className="p-2 text-xs max-w-[120px] truncate">
                                  {entry.consequences?.join(', ') || entry.consequence}
                                </td>
                                <td className="p-2 text-center">
                                  <Badge variant="secondary">{entry.frequencyCount || 1}</Badge>
                                </td>
                                <td className="p-2 text-xs">
                                  {entry.functions?.map(f => (
                                    <Badge key={f} variant="outline" className="mr-1 text-[10px]">{f}</Badge>
                                  )) || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {aggregatedData.abcEntries.length > 25 && (
                          <p className="p-2 text-xs text-center text-muted-foreground">
                            Showing 25 of {aggregatedData.abcEntries.length} entries
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No data found</p>
                <p className="text-sm">Try adjusting your date range or filters</p>
              </div>
            )}

            {/* Footer */}
            <Separator />
            <p className="footer text-xs text-center text-muted-foreground">
              Generated by Behavior Data Collector • {format(new Date(), 'MMMM d, yyyy h:mm a')}
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
