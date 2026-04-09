import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { format, subMonths, subDays, isAfter, parseISO, isValid, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Filter, Plus, Clock, LineChart as LineChartIcon, Calendar } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';
import { getStudentBehaviorNameMap } from '@/lib/behaviorNameResolver';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CHART_COLORS = [
  'hsl(199, 89%, 48%)',
  'hsl(173, 58%, 49%)',
  'hsl(262, 83%, 68%)',
  'hsl(38, 92%, 60%)',
  'hsl(0, 72%, 61%)',
  'hsl(280, 65%, 70%)',
];

type DateRangePreset = '1month' | '3months' | '6months' | 'all' | 'custom';

export function BehaviorTrendCharts() {
  const { sessions, students, frequencyEntries, durationEntries, addHistoricalFrequency } = useDataStore();
  const syncedIdsRef = useRef<Set<string>>(new Set());

  // Async-resolved behavior name map: behaviorId → display name
  const [resolvedNames, setResolvedNames] = useState<Map<string, string>>(new Map());

  // Fetch name maps for all active students
  useEffect(() => {
    const studentIds = students.filter(s => !s.isArchived).map(s => s.id);
    if (studentIds.length === 0) return;
    let cancelled = false;

    Promise.all(studentIds.map(sid => getStudentBehaviorNameMap(sid)))
      .then(maps => {
        if (cancelled) return;
        const merged = new Map<string, string>();
        maps.forEach(m => m.forEach((name, id) => merged.set(id, name)));
        // Also add names from Zustand store behaviors
        students.forEach(s => s.behaviors.forEach(b => {
          if (b.id && b.name && !UUID_RE.test(b.name)) {
            merged.set(b.id, b.name);
          }
        }));
        setResolvedNames(merged);
      });

    return () => { cancelled = true; };
  }, [students]);

  // Robust behavior name resolver — never returns a UUID
  const resolveName = useCallback((behaviorId: string, fallbackName?: string): string => {
    // 1. Check async-resolved map
    const resolved = resolvedNames.get(behaviorId);
    if (resolved && !UUID_RE.test(resolved)) return resolved;

    // 2. Check Zustand store
    for (const s of students) {
      const b = s.behaviors.find(b => b.id === behaviorId);
      if (b?.name && !UUID_RE.test(b.name)) return b.name;
    }

    // 3. Fallback name if not a UUID
    if (fallbackName && !UUID_RE.test(fallbackName)) return fallbackName;

    // 4. Never show raw UUID
    return `Behavior #${behaviorId.slice(0, 4)}`;
  }, [resolvedNames, students]);

  // Bulk-sync behavior_session_data for ALL students so the global chart shows all historical data
  useEffect(() => {
    const unsyncedIds = students
      .filter(s => !s.isArchived && !syncedIdsRef.current.has(s.id))
      .map(s => s.id);
    if (unsyncedIds.length === 0) return;

    unsyncedIds.forEach(id => syncedIdsRef.current.add(id));

    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from('behavior_session_data')
          .select('id, session_id, behavior_id, frequency, duration_seconds, data_state, created_at, student_id, sessions(start_time, started_at)')
          .in('student_id', unsyncedIds)
          .eq('data_state', 'measured')
          .order('created_at', { ascending: true })
          .limit(2000);

        if (error || !rows || rows.length === 0) return;

        const store = useDataStore.getState();
        const studentMap = new Map(store.students.map(student => [student.id, student]));
        const unresolvedBehaviorIds = Array.from(new Set(
          rows
            .filter(row => !studentMap.get(row.student_id)?.behaviors.some(behavior => behavior.id === row.behavior_id))
            .map(row => row.behavior_id)
        ));
        const behaviorNames = new Map<string, string>();

        if (unresolvedBehaviorIds.length > 0) {
          const { data: behaviorRows } = await supabase
            .from('behaviors')
            .select('id, name')
            .in('id', unresolvedBehaviorIds);

          (behaviorRows || []).forEach((behavior: any) => {
            if (behavior?.id && behavior?.name) {
              behaviorNames.set(behavior.id, behavior.name);
            }
          });
        }

        const missingBehaviorsByStudent = new Map<string, Array<{ id: string; name: string }>>();
        const newFreq: any[] = [];
        const newDur: any[] = [];
        const existingFreqIds = new Set(store.frequencyEntries.map(e => e.id));
        const existingDurIds = new Set(store.durationEntries.map(e => e.id));

        for (const r of rows) {
          const session = (r as any).sessions;
          const obsDate = session?.started_at || session?.start_time || r.created_at;
          const student = studentMap.get(r.student_id);

          if (student && !student.behaviors.some(behavior => behavior.id === r.behavior_id)) {
            const name = behaviorNames.get(r.behavior_id);
            if (name) {
              const existing = missingBehaviorsByStudent.get(r.student_id) || [];
              if (!existing.some(behavior => behavior.id === r.behavior_id)) {
                existing.push({ id: r.behavior_id, name });
                missingBehaviorsByStudent.set(r.student_id, existing);
              }
            }
          }

          if (r.frequency != null) {
            const fId = `bsd-${r.id}`;
            if (!existingFreqIds.has(fId)) {
              newFreq.push({
                id: fId,
                studentId: r.student_id,
                behaviorId: r.behavior_id,
                count: r.frequency,
                timestamp: obsDate,
                notes: r.frequency === 0 ? 'observed_zero' : '',
              });
            }
          }
          if (r.duration_seconds != null && r.duration_seconds > 0) {
            const dId = `bsd-dur-${r.id}`;
            if (!existingDurIds.has(dId)) {
              newDur.push({
                id: dId,
                studentId: r.student_id,
                behaviorId: r.behavior_id,
                duration: r.duration_seconds,
                startTime: new Date(obsDate),
              });
            }
          }
        }

        if (newFreq.length > 0 || newDur.length > 0 || missingBehaviorsByStudent.size > 0) {
          useDataStore.setState(state => ({
            frequencyEntries: [...state.frequencyEntries, ...newFreq],
            durationEntries: [...state.durationEntries, ...newDur],
            students: state.students.map(student => {
              const missingBehaviors = missingBehaviorsByStudent.get(student.id) || [];
              if (missingBehaviors.length === 0) return student;

              const existingIds = new Set(student.behaviors.map(behavior => behavior.id));
              const behaviorsToAdd = missingBehaviors
                .filter(behavior => !existingIds.has(behavior.id))
                .map(behavior => ({
                  id: behavior.id,
                  name: behavior.name,
                  type: 'frequency',
                  methods: ['frequency'],
                }));

              return behaviorsToAdd.length > 0
                ? { ...student, behaviors: [...student.behaviors, ...behaviorsToAdd as any] }
                : student;
            }),
          } as any));
          console.log(`[BehaviorTrendCharts] Bulk-synced ${newFreq.length} freq + ${newDur.length} dur entries`);
        }
      } catch (err) {
        console.warn('[BehaviorTrendCharts] Bulk sync failed:', err);
      }
    })();
  }, [students]);
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterBehavior, setFilterBehavior] = useState<string>('all');
  const [showRatePerHour, setShowRatePerHour] = useState(false);
  const [showAddHistorical, setShowAddHistorical] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Historical entry form state
  const [histDate, setHistDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [histStudentId, setHistStudentId] = useState('');
  const [histBehaviorId, setHistBehaviorId] = useState('');
  const [histCount, setHistCount] = useState('1');
  const [histDuration, setHistDuration] = useState('30');

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    const endDate = startOfDay(now);
    
    switch (dateRangePreset) {
      case '1month':
        return { start: subMonths(endDate, 1), end: endDate };
      case '3months':
        return { start: subMonths(endDate, 3), end: endDate };
      case '6months':
        return { start: subMonths(endDate, 6), end: endDate };
      case 'custom':
        const customStart = customStartDate ? parseISO(customStartDate) : null;
        const customEnd = customEndDate ? parseISO(customEndDate) : null;
        if (customStart && isValid(customStart) && customEnd && isValid(customEnd)) {
          return { start: customStart, end: customEnd };
        }
        return null; // Show all if custom dates invalid
      case 'all':
      default:
        return null; // No filter - show all
    }
  }, [dateRangePreset, customStartDate, customEndDate]);

  const allBehaviors = useMemo(() => {
    const behaviors: { id: string; name: string }[] = [];
    students.forEach(student => {
      student.behaviors.forEach(b => {
        if (!behaviors.find(x => x.id === b.id)) {
          behaviors.push({ id: b.id, name: resolveName(b.id, b.name) });
        }
      });
    });
    return behaviors;
  }, [students, resolveName]);

  // Process data for charts - combine session data AND historical data
  const chartData = useMemo(() => {
    // Collect all data points by date
    const dataByDate = new Map<string, {
      frequencyByBehavior: Record<string, number>;
      rateByBehavior: Record<string, number>;
      intervalByBehavior: Record<string, { occurred: number; total: number }>;
      durationByBehavior: Record<string, number>;
    }>();

    const getOrCreateDateEntry = (dateKey: string) => {
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, {
          frequencyByBehavior: {},
          rateByBehavior: {},
          intervalByBehavior: {},
          durationByBehavior: {},
        });
      }
      return dataByDate.get(dateKey)!;
    };

    // Helper to check if date is in range
    const isInDateRange = (date: Date) => {
      if (!dateRange) return true; // No filter
      const dateOnly = startOfDay(new Date(date));
      return dateOnly >= dateRange.start && dateOnly <= dateRange.end;
    };

    // Process session data
    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      if (!isInDateRange(sessionDate)) return;
      
      const dateKey = format(sessionDate, 'yyyy-MM-dd');
      const entry = getOrCreateDateEntry(dateKey);
      const sessionLengthMinutes = session.sessionLengthMinutes || 30;
      
      // Process frequency entries from sessions
      session.frequencyEntries.forEach(freqEntry => {
        if (filterStudent !== 'all' && freqEntry.studentId !== filterStudent) return;
        if (filterBehavior !== 'all' && freqEntry.behaviorId !== filterBehavior) return;
        
        // behavior name resolved via resolveName
        const key = resolveName(freqEntry.behaviorId);
        
        const wasDataCollected = freqEntry.count > 0 || (freqEntry as any).dataCollected === true;
        if (wasDataCollected) {
          entry.frequencyByBehavior[key] = (entry.frequencyByBehavior[key] || 0) + freqEntry.count;
          
          const durationMinutes = (freqEntry as any).observationDurationMinutes || sessionLengthMinutes;
          const ratePerHour = freqEntry.count / (durationMinutes / 60);
          entry.rateByBehavior[key] = (entry.rateByBehavior[key] || 0) + ratePerHour;
        }
      });

      // Process interval data
      session.intervalEntries.forEach(intEntry => {
        if (filterStudent !== 'all' && intEntry.studentId !== filterStudent) return;
        if (filterBehavior !== 'all' && intEntry.behaviorId !== filterBehavior) return;
        
        // behavior name resolved via resolveName
        const key = resolveName(intEntry.behaviorId);
        
        if (!entry.intervalByBehavior[key]) entry.intervalByBehavior[key] = { occurred: 0, total: 0 };
        entry.intervalByBehavior[key].total++;
        if (intEntry.occurred) entry.intervalByBehavior[key].occurred++;
      });

      // Process duration data
      session.durationEntries.forEach(durEntry => {
        if (filterStudent !== 'all' && durEntry.studentId !== filterStudent) return;
        if (filterBehavior !== 'all' && durEntry.behaviorId !== filterBehavior) return;
        
        // behavior name resolved via resolveName
        const key = resolveName(durEntry.behaviorId);
        
        entry.durationByBehavior[key] = (entry.durationByBehavior[key] || 0) + durEntry.duration;
      });
    });

    // Process synced Supabase data (bsd-* entries from useBehaviorSessionSync)
    // These are in store.frequencyEntries/durationEntries but NOT in session objects
    const sessionFreqIds = new Set<string>();
    sessions.forEach(s => s.frequencyEntries.forEach(e => sessionFreqIds.add(e.id)));

    frequencyEntries
      .filter(e => e.id.startsWith('bsd-') && !sessionFreqIds.has(e.id))
      .forEach(freqEntry => {
        if (filterStudent !== 'all' && freqEntry.studentId !== filterStudent) return;
        if (filterBehavior !== 'all' && freqEntry.behaviorId !== filterBehavior) return;

        const entryDate = new Date(freqEntry.timestamp);
        if (!isInDateRange(entryDate)) return;

        const dateKey = format(entryDate, 'yyyy-MM-dd');
        const entry = getOrCreateDateEntry(dateKey);
        // behavior name resolved via resolveName
        const key = resolveName(freqEntry.behaviorId);

        if (freqEntry.count > 0 || (freqEntry as any).notes === 'observed_zero') {
          entry.frequencyByBehavior[key] = (entry.frequencyByBehavior[key] || 0) + freqEntry.count;
          const ratePerHour = freqEntry.count / 0.5; // default 30min session
          entry.rateByBehavior[key] = (entry.rateByBehavior[key] || 0) + ratePerHour;
        }
      });

    durationEntries
      .filter(e => e.id.startsWith('bsd-dur-'))
      .forEach(durEntry => {
        if (filterStudent !== 'all' && durEntry.studentId !== filterStudent) return;
        if (filterBehavior !== 'all' && durEntry.behaviorId !== filterBehavior) return;

        const entryDate = new Date(durEntry.startTime);
        if (!isInDateRange(entryDate)) return;

        const dateKey = format(entryDate, 'yyyy-MM-dd');
        const entry = getOrCreateDateEntry(dateKey);
        // behavior name resolved via resolveName
        const key = resolveName(durEntry.behaviorId);
        entry.durationByBehavior[key] = (entry.durationByBehavior[key] || 0) + durEntry.duration;
      });


    students.forEach(student => {
      if (filterStudent !== 'all' && student.id !== filterStudent) return;
      if (!student.historicalData) return;

      // Historical frequency entries
      student.historicalData.frequencyEntries?.forEach(histEntry => {
        if (filterBehavior !== 'all' && histEntry.behaviorId !== filterBehavior) return;
        
        const entryDate = new Date(histEntry.timestamp);
        if (!isInDateRange(entryDate)) return;
        
        const dateKey = format(entryDate, 'yyyy-MM-dd');
        const entry = getOrCreateDateEntry(dateKey);
        
        // behavior name resolved via resolveName
        const key = resolveName(histEntry.behaviorId);
        
        entry.frequencyByBehavior[key] = (entry.frequencyByBehavior[key] || 0) + histEntry.count;
        
        // Calculate rate if observation duration provided
        const durationMinutes = histEntry.observationDurationMinutes || 30;
        const ratePerHour = histEntry.count / (durationMinutes / 60);
        entry.rateByBehavior[key] = (entry.rateByBehavior[key] || 0) + ratePerHour;
      });

      // Historical duration entries
      student.historicalData.durationEntries?.forEach(histEntry => {
        if (filterBehavior !== 'all' && histEntry.behaviorId !== filterBehavior) return;
        
        const entryDate = new Date(histEntry.timestamp);
        if (!isInDateRange(entryDate)) return;
        
        const dateKey = format(entryDate, 'yyyy-MM-dd');
        const entry = getOrCreateDateEntry(dateKey);
        
        // behavior name resolved via resolveName
        const key = resolveName(histEntry.behaviorId);
        
        entry.durationByBehavior[key] = (entry.durationByBehavior[key] || 0) + histEntry.durationSeconds;
      });
    });

    // Convert to chart data format
    const chartDataArray = Array.from(dataByDate.entries()).map(([dateKey, data]) => {
      const dataPoint: Record<string, any> = {
        date: format(new Date(dateKey), 'MM/dd'),
        dateKey,
      };
      
      // Add frequency data
      Object.entries(data.frequencyByBehavior).forEach(([key, value]) => {
        dataPoint[key] = value;
      });
      
      // Add rate data
      Object.entries(data.rateByBehavior).forEach(([key, value]) => {
        dataPoint[`${key} (/hr)`] = parseFloat(value.toFixed(2));
      });
      
      // Calculate and add interval percentages
      Object.entries(data.intervalByBehavior).forEach(([key, value]) => {
        dataPoint[`${key} (%)`] = value.total > 0 ? Math.round((value.occurred / value.total) * 100) : 0;
      });
      
      // Add duration data
      Object.entries(data.durationByBehavior).forEach(([key, value]) => {
        dataPoint[`${key} (sec)`] = value;
      });

      return dataPoint;
    });

    // Sort by date
    return chartDataArray.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [sessions, students, frequencyEntries, durationEntries, filterStudent, filterBehavior, dateRange]);

  // Aggregate data for pie chart - includes historical data
  const aggregateData = useMemo(() => {
    const totals: Record<string, number> = {};
    
    // Helper to check if date is in range
    const isInDateRange = (date: Date) => {
      if (!dateRange) return true;
      const dateOnly = startOfDay(new Date(date));
      return dateOnly >= dateRange.start && dateOnly <= dateRange.end;
    };
    
    // Session data
    sessions.forEach(session => {
      if (!isInDateRange(new Date(session.date))) return;
      
      session.frequencyEntries.forEach(entry => {
        if (filterStudent !== 'all' && entry.studentId !== filterStudent) return;
        if (filterBehavior !== 'all' && entry.behaviorId !== filterBehavior) return;
        
        // behavior name resolved via resolveName
        const key = resolveName(entry.behaviorId);
        totals[key] = (totals[key] || 0) + entry.count;
      });
    });
    
    // Historical data from students
    students.forEach(student => {
      if (filterStudent !== 'all' && student.id !== filterStudent) return;
      if (!student.historicalData) return;
      
      student.historicalData.frequencyEntries?.forEach(histEntry => {
        if (filterBehavior !== 'all' && histEntry.behaviorId !== filterBehavior) return;
        if (!isInDateRange(new Date(histEntry.timestamp))) return;
        
        // behavior name resolved via resolveName
        const key = resolveName(histEntry.behaviorId);
        totals[key] = (totals[key] || 0) + histEntry.count;
      });
    });

    return Object.entries(totals).map(([name, value], idx) => ({
      name,
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [sessions, students, filterStudent, filterBehavior, dateRange]);

  // Get unique behavior names for chart keys
  const behaviorNames = useMemo(() => {
    const names = new Set<string>();
    chartData.forEach(d => {
      Object.keys(d).forEach(key => {
        if (!['date', 'dateKey', 'dateTime', 'sessionId', 'sessionLengthMinutes'].includes(key)) {
          names.add(key);
        }
      });
    });
    return Array.from(names);
  }, [chartData]);

  // Handle adding historical frequency entry
  const handleAddHistoricalEntry = () => {
    if (!histStudentId || !histBehaviorId) {
      toast.error('Please select a student and behavior');
      return;
    }
    
    const count = parseInt(histCount) || 1;
    const durationMinutes = parseFloat(histDuration) || 30;
    const timestamp = new Date(`${histDate}T12:00:00`);
    
    addHistoricalFrequency({
      studentId: histStudentId,
      behaviorId: histBehaviorId,
      count,
      timestamp,
      observationDurationMinutes: durationMinutes,
    });
    
    toast.success(`Added ${count} occurrences (${(count / (durationMinutes / 60)).toFixed(2)}/hr)`);
    setShowAddHistorical(false);
    setHistCount('1');
    setHistDuration('30');
  };

  // Get behaviors for selected student
  const studentBehaviors = useMemo(() => {
    if (!histStudentId) return [];
    const student = students.find(s => s.id === histStudentId);
    return student?.behaviors || [];
  }, [histStudentId, students]);

  // Check if there's any data (sessions OR historical)
  const hasAnyData = useMemo(() => {
    if (sessions.length > 0) return true;
    return students.some(s => 
      (s.historicalData?.frequencyEntries?.length || 0) > 0 ||
      (s.historicalData?.durationEntries?.length || 0) > 0
    );
  }, [sessions, students]);

  if (!hasAnyData) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Trends
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Behavior Trends</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No data available</p>
            <p className="text-sm">Save sessions or add historical data to see trend charts</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <TrendingUp className="w-4 h-4" />
          Trends
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Behavior Trends & Analysis
          </DialogTitle>
        </DialogHeader>

        {/* Filters and Controls */}
        <div className="flex flex-wrap gap-2 py-2 border-b items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </div>
          
          {/* Date Range Filter */}
          <Select value={dateRangePreset} onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRangePreset === 'custom' && (
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 w-[110px] text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 w-[110px] text-xs"
              />
            </div>
          )}
          
          <Select value={filterStudent} onValueChange={setFilterStudent}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue placeholder="All Students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterBehavior} onValueChange={setFilterBehavior}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue placeholder="All Behaviors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Behaviors</SelectItem>
              {allBehaviors.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">{chartData.length} data points</Badge>
          
          {/* Chart Type Toggle */}
          <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v as 'line' | 'bar')} size="sm">
            <ToggleGroupItem value="line" aria-label="Line chart" className="gap-1 h-7 px-2">
              <LineChartIcon className="w-3 h-3" />
              <span className="text-xs hidden sm:inline">Line</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="bar" aria-label="Bar chart" className="gap-1 h-7 px-2">
              <BarChart3 className="w-3 h-3" />
              <span className="text-xs hidden sm:inline">Bar</span>
            </ToggleGroupItem>
          </ToggleGroup>
          
          <div className="flex items-center gap-2 ml-auto">
            <Switch
              id="show-rate"
              checked={showRatePerHour}
              onCheckedChange={setShowRatePerHour}
            />
            <Label htmlFor="show-rate" className="text-xs cursor-pointer">
              Rate/hr
            </Label>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddHistorical(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Historical
          </Button>
        </div>

        {/* Add Historical Entry Dialog */}
        {showAddHistorical && (
          <Card className="mx-2 my-2 border-primary/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Add Historical Frequency Entry
              </CardTitle>
              <CardDescription className="text-xs">
                Enter data collected outside of sessions with observation duration for rate calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={histDate}
                    onChange={(e) => setHistDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Student</Label>
                  <Select value={histStudentId} onValueChange={(v) => { setHistStudentId(v); setHistBehaviorId(''); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {students.filter(s => !s.isArchived).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Behavior</Label>
                  <Select value={histBehaviorId} onValueChange={setHistBehaviorId} disabled={!histStudentId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {studentBehaviors.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Count</Label>
                  <Input
                    type="number"
                    min="1"
                    value={histCount}
                    onChange={(e) => setHistCount(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Observation Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={histDuration}
                    onChange={(e) => setHistDuration(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Calculated Rate</Label>
                  <div className="h-8 px-3 flex items-center bg-muted rounded-md text-sm font-medium">
                    {((parseInt(histCount) || 0) / ((parseFloat(histDuration) || 30) / 60)).toFixed(2)} per hour
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddHistoricalEntry}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Entry
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddHistorical(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="flex-1 overflow-y-auto py-2">
          <Tabs defaultValue="frequency">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="frequency" className="gap-1">
                <BarChart3 className="w-3 h-3" />
                Frequency
              </TabsTrigger>
              <TabsTrigger value="rate" className="gap-1">
                <Clock className="w-3 h-3" />
                Rate/Hour
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="distribution" className="gap-1">
                <PieChartIcon className="w-3 h-3" />
                Distribution
              </TabsTrigger>
            </TabsList>

            <TabsContent value="frequency" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Frequency by Session (Raw Counts)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    {chartType === 'line' ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        {behaviorNames
                          .filter(n => !n.includes('(%)') && !n.includes('(sec)') && !n.includes('(/hr)'))
                          .map((name, idx) => (
                            <Line 
                              key={name} 
                              type="monotone"
                              dataKey={name} 
                              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                              connectNulls={false}
                            />
                          ))
                        }
                      </LineChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        {behaviorNames
                          .filter(n => !n.includes('(%)') && !n.includes('(sec)') && !n.includes('(/hr)'))
                          .map((name, idx) => (
                            <Bar 
                              key={name} 
                              dataKey={name} 
                              fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                            />
                          ))
                        }
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Interval Percentage by Session</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    {chartType === 'line' ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        {behaviorNames
                          .filter(n => n.includes('(%)'))
                          .map((name, idx) => (
                            <Line 
                              key={name} 
                              type="monotone"
                              dataKey={name} 
                              stroke={CHART_COLORS[(idx + 2) % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{ fill: CHART_COLORS[(idx + 2) % CHART_COLORS.length], r: 4 }}
                              connectNulls={false}
                            />
                          ))
                        }
                      </LineChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        {behaviorNames
                          .filter(n => n.includes('(%)'))
                          .map((name, idx) => (
                            <Bar 
                              key={name} 
                              dataKey={name} 
                              fill={CHART_COLORS[(idx + 2) % CHART_COLORS.length]} 
                            />
                          ))
                        }
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rate Per Hour Tab */}
            <TabsContent value="rate" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Behavior Rate Per Hour</CardTitle>
                  <CardDescription className="text-xs">
                    Frequency normalized by observation duration for accurate comparison
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    {chartType === 'line' ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)}/hr`} />
                        <Legend />
                        {behaviorNames
                          .filter(n => n.includes('(/hr)'))
                          .map((name, idx) => (
                            <Line 
                              key={name} 
                              type="monotone"
                              dataKey={name} 
                              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                              connectNulls={false}
                            />
                          ))
                        }
                      </LineChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)}/hr`} />
                        <Legend />
                        {behaviorNames
                          .filter(n => n.includes('(/hr)'))
                          .map((name, idx) => (
                            <Bar 
                              key={name} 
                              dataKey={name} 
                              fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                            />
                          ))
                        }
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Rate Trends Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)}/hr`} />
                      <Legend />
                      {behaviorNames
                        .filter(n => n.includes('(/hr)'))
                        .map((name, idx) => (
                          <Line 
                            key={name} 
                            type="monotone"
                            dataKey={name} 
                            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                            connectNulls={false}
                          />
                        ))
                      }
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Behavior Trends Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      {behaviorNames
                        .filter(n => !n.includes('(%)') && !n.includes('(sec)') && !n.includes('(/hr)'))
                        .map((name, idx) => (
                          <Line 
                            key={name} 
                            type="monotone"
                            dataKey={name} 
                            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                            connectNulls={false}
                          />
                        ))
                      }
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Duration Trends (seconds)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      {behaviorNames
                        .filter(n => n.includes('(sec)'))
                        .map((name, idx) => (
                          <Line 
                            key={name} 
                            type="monotone"
                            dataKey={name} 
                            stroke={CHART_COLORS[(idx + 3) % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS[(idx + 3) % CHART_COLORS.length], r: 4 }}
                            connectNulls={false}
                          />
                        ))
                      }
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribution">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Frequency Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={aggregateData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {aggregateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}