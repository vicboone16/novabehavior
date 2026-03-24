import { useMemo, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { useDataStore } from '@/store/dataStore';
import { 
  TrendingUp, TrendingDown, Minus, Activity, Calendar, 
  BarChart3, Clock, Filter, Download, FileSpreadsheet, FileText, LineChart as LineChartIcon,
  Layers, AlertTriangle, UserPlus, Edit2, Check, X
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ReferenceLine 
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Behavior, FrequencyEntry, DurationEntry, ABCEntry, IntervalEntry, Session, METHOD_LABELS, BehaviorGoal, PhaseChange, DataCollectionMethod } from '@/types/behavior';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  dataCollectionStartDate?: Date;
  behaviorGoals?: BehaviorGoal[];
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
  dataCollectionStartDate,
  behaviorGoals = [],
}: StudentBehaviorsOverviewProps) {
  const [dateRangePreset, setDateRangePreset] = useState<string>('last30');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());
  const [selectedBehavior, setSelectedBehavior] = useState<string>('all');
  const [expandedBehaviors, setExpandedBehaviors] = useState<Set<string>>(new Set());
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [showPhaseLines, setShowPhaseLines] = useState(true);
  const [editingMethodsBehaviorId, setEditingMethodsBehaviorId] = useState<string | null>(null);
  const [editingMethods, setEditingMethods] = useState<DataCollectionMethod[]>([]);
  const { updateBehaviorMethods } = useDataStore();

  const ALL_METHODS: { value: DataCollectionMethod; label: string }[] = [
    { value: 'frequency', label: 'Frequency' },
    { value: 'duration', label: 'Duration' },
    { value: 'latency', label: 'Latency' },
    { value: 'abc', label: 'ABC' },
    { value: 'interval', label: 'Interval' },
  ];

  const startEditMethods = (behaviorId: string, currentMethods: DataCollectionMethod[]) => {
    setEditingMethodsBehaviorId(behaviorId);
    setEditingMethods(currentMethods.length > 0 ? [...currentMethods] : ['frequency']);
  };

  const saveEditMethods = () => {
    if (editingMethodsBehaviorId && editingMethods.length > 0) {
      updateBehaviorMethods(studentId, editingMethodsBehaviorId, editingMethods);
      setEditingMethodsBehaviorId(null);
      toast.success('Data collection methods updated');
    }
  };

  const toggleEditingMethod = (method: DataCollectionMethod) => {
    setEditingMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  // For the "All Time" preset we still need a concrete range so charts can render.
  // We compute the earliest available timestamp for this student and use "today" as the end.
  // IMPORTANT: Include historicalData timestamps and dataCollectionStartDate to ensure all data appears.
  const allTimeRange = useMemo(() => {
    const times: number[] = [];

    // If dataCollectionStartDate is set, use it as the earliest possible date
    if (dataCollectionStartDate) {
      const t = new Date(dataCollectionStartDate).getTime();
      if (Number.isFinite(t)) times.push(t);
    }

    frequencyEntries.forEach((e) => {
      if (e.studentId !== studentId) return;
      const t = new Date(e.timestamp as any).getTime();
      if (Number.isFinite(t)) times.push(t);
    });

    durationEntries.forEach((e) => {
      if (e.studentId !== studentId) return;
      const t = new Date((e as any).startTime).getTime();
      if (Number.isFinite(t)) times.push(t);
    });

    intervalEntries.forEach((e) => {
      if (e.studentId !== studentId) return;
      const t = new Date(e.timestamp as any).getTime();
      if (Number.isFinite(t)) times.push(t);
    });

    abcEntries.forEach((e) => {
      if (e.studentId !== studentId) return;
      const t = new Date((e as any).timestamp).getTime();
      if (Number.isFinite(t)) times.push(t);
    });

    // Also include historicalData timestamps
    historicalData.forEach((e: any) => {
      const t = new Date(e.timestamp).getTime();
      if (Number.isFinite(t)) times.push(t);
    });

    // Fallback keeps charts usable even if there's no data.
    if (times.length === 0) {
      return {
        start: startOfDay(subDays(new Date(), 30)),
        end: endOfDay(new Date()),
      };
    }

    const min = new Date(Math.min(...times));
    return {
      start: startOfDay(min),
      end: endOfDay(new Date()),
    };
  }, [abcEntries, durationEntries, frequencyEntries, intervalEntries, historicalData, studentId, dataCollectionStartDate]);

  // Collect all phase changes from behavior goals for this student
  const phaseChangesForChart = useMemo(() => {
    const phases: Array<PhaseChange & { behaviorId: string; behaviorName: string }> = [];
    
    behaviorGoals.forEach(goal => {
      if (goal.studentId !== studentId) return;
      const behavior = behaviors.find(b => b.id === goal.behaviorId);
      if (!behavior) return;
      
      goal.phaseChanges?.forEach(pc => {
        phases.push({
          ...pc,
          behaviorId: goal.behaviorId,
          behaviorName: behavior.name,
        });
      });
    });
    
    return phases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [behaviorGoals, studentId, behaviors]);

  // Calculate date range
  const dateRange = useMemo(() => {
    if (dateRangePreset === 'custom') {
      return {
        start: customStartDate ? startOfDay(customStartDate) : subDays(new Date(), 30),
        end: customEndDate ? endOfDay(customEndDate) : endOfDay(new Date()),
      };
    }
    
    const preset = DATE_RANGE_PRESETS.find(p => p.value === dateRangePreset);
    if (!preset) return null;

    // "All Time" should still chart; use computed earliest->today range.
    if (preset.value === 'all') return allTimeRange;

    // Other presets with null days shouldn't happen here (custom is handled above).
    if (preset.days === null) return null;
    
    return {
      start: startOfDay(subDays(new Date(), preset.days)),
      end: endOfDay(new Date()),
    };
  }, [dateRangePreset, customStartDate, customEndDate, allTimeRange]);

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
      // Frequency stats - include ABC entry frequencyCount
      const behaviorFrequency = frequencyEntries.filter(e => e.studentId === studentId && e.behaviorId === behavior.id);
      const filteredFrequency = filterByDateRange(behaviorFrequency);
      let frequencyCount = behaviorFrequency.reduce((sum, e) => sum + e.count, 0);
      let filteredFrequencyCount = filteredFrequency.reduce((sum, e) => sum + e.count, 0);
      
      // Also count frequency from ABC entries (they contain frequencyCount)
      const behaviorABC = abcEntries.filter(e => e.studentId === studentId && e.behaviorId === behavior.id);
      const filteredABC = filterByDateRange(behaviorABC);
      frequencyCount += behaviorABC.reduce((sum, e) => sum + ((e as any).frequencyCount || 1), 0);
      filteredFrequencyCount += filteredABC.reduce((sum, e) => sum + ((e as any).frequencyCount || 1), 0);

      // Duration stats - include ABC entry durationMinutes
      const behaviorDuration = durationEntries.filter(e => e.studentId === studentId && e.behaviorId === behavior.id);
      const filteredDurationEntries = filterByDateRange(behaviorDuration, 'startTime');
      let totalDuration = behaviorDuration.reduce((sum, e) => sum + e.duration, 0);
      let filteredDuration = filteredDurationEntries.reduce((sum, e) => sum + e.duration, 0);
      
      // Also add duration from ABC entries (stored as durationMinutes, convert to seconds)
      behaviorABC.forEach(e => {
        if ((e as any).hasDuration && (e as any).durationMinutes) {
          totalDuration += ((e as any).durationMinutes * 60);
        }
      });
      filteredABC.forEach(e => {
        if ((e as any).hasDuration && (e as any).durationMinutes) {
          filteredDuration += ((e as any).durationMinutes * 60);
        }
      });

      // ABC stats (already computed above)
      const abcCount = behaviorABC.length;
      const filteredAbcCount = filteredABC.length;

      // Interval stats — exclude voided intervals from both numerator and denominator
      const behaviorIntervals = intervalEntries.filter(e => e.studentId === studentId && e.behaviorId === behavior.id);
      const filteredIntervals = filterByDateRange(behaviorIntervals);
      const validIntervals = filteredIntervals.filter(e => !e.voided);
      const intervalOccurred = validIntervals.filter(e => e.occurred).length;
      const intervalTotal = validIntervals.length;

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

  // Detect orphaned behavior IDs — data entries referencing behaviors not in student.behaviors
  const orphanedBehaviors = useMemo(() => {
    const knownIds = new Set(behaviors.map(b => b.id));
    const orphanMap = new Map<string, { id: string; inferredName: string; freqCount: number; durationSec: number; abcCount: number }>();

    const processEntry = (behaviorId: string, entryBehaviorName?: string) => {
      if (!behaviorId || knownIds.has(behaviorId)) return;
      if (!orphanMap.has(behaviorId)) {
        orphanMap.set(behaviorId, {
          id: behaviorId,
          inferredName: entryBehaviorName || `Unlinked (${behaviorId.slice(0, 6)})`,
          freqCount: 0, durationSec: 0, abcCount: 0,
        });
      }
      return orphanMap.get(behaviorId)!;
    };

    frequencyEntries.filter(e => e.studentId === studentId).forEach(e => {
      const o = processEntry(e.behaviorId, (e as any).behaviorName);
      if (o) o.freqCount += e.count;
    });
    durationEntries.filter(e => e.studentId === studentId).forEach(e => {
      const o = processEntry(e.behaviorId, (e as any).behaviorName);
      if (o) o.durationSec += e.duration;
    });
    abcEntries.filter(e => e.studentId === studentId).forEach(e => {
      const o = processEntry(e.behaviorId, (e as any).behaviorName || (e as any).behavior);
      if (o) { o.abcCount += 1; o.freqCount += ((e as any).frequencyCount || 1); }
      if (o && ((e as any).behaviorName || (e as any).behavior) && o.inferredName.startsWith('Unlinked')) {
        o.inferredName = (e as any).behaviorName || (e as any).behavior;
      }
    });
    intervalEntries.filter(e => e.studentId === studentId).forEach(e => {
      processEntry(e.behaviorId, (e as any).behaviorName);
    });
    historicalData.forEach((e: any) => {
      const o = processEntry(e.behaviorId, e.behaviorName);
      if (o) o.freqCount += (e.count || 0);
    });

    return Array.from(orphanMap.values());
  }, [behaviors, frequencyEntries, durationEntries, abcEntries, intervalEntries, historicalData, studentId]);

  // Auto-reconcile orphans whose inferredName matches an existing behavior by name
  // Also fetches student_behavior_map from DB to resolve IDs by subtype name
  useEffect(() => {
    if (orphanedBehaviors.length === 0 || behaviors.length === 0) return;

    const normalize = (value?: string) => (value || '').toLowerCase().replace(/[_\-]/g, ' ').trim();
    const behaviorsByName = new Map<string, string>();
    behaviors.forEach(b => behaviorsByName.set(normalize(b.name), b.id));

    const doReconcile = async () => {
      // Fetch student_behavior_map entries to resolve orphan IDs by subtype
      let dbSubtypeMap = new Map<string, string>(); // behavior_entry_id -> subtype name
      try {
        const { data: mapRows } = await supabase
          .from('student_behavior_map')
          .select('behavior_entry_id, behavior_subtype')
          .eq('student_id', studentId)
          .eq('active', true);
        if (mapRows) {
          mapRows.forEach((r: any) => {
            dbSubtypeMap.set(r.behavior_entry_id, r.behavior_subtype);
          });
        }
      } catch { /* ignore */ }

      const toRekey: { oldId: string; newId: string; name: string }[] = [];
      orphanedBehaviors.forEach(orphan => {
        // Try matching by inferred name first
        const normalized = normalize(orphan.inferredName.replace(/^Unlinked\s*\(|\)$/g, ''));
        if (normalized && !normalized.startsWith('unlinked')) {
          const matchId = behaviorsByName.get(normalized);
          if (matchId && matchId !== orphan.id) {
            toRekey.push({ oldId: orphan.id, newId: matchId, name: orphan.inferredName });
            return;
          }
        }

        // Try matching orphan.id against student_behavior_map behavior_entry_id -> subtype -> local behavior name
        const subtypeName = dbSubtypeMap.get(orphan.id);
        if (subtypeName) {
          const normalizedSubtype = normalize(subtypeName);
          const matchId = behaviorsByName.get(normalizedSubtype);
          if (matchId && matchId !== orphan.id) {
            toRekey.push({ oldId: orphan.id, newId: matchId, name: subtypeName });
            return;
          }
          // Also try partial matching
          for (const [bName, bId] of behaviorsByName) {
            if (bId !== orphan.id && (bName.includes(normalizedSubtype) || normalizedSubtype.includes(bName))) {
              toRekey.push({ oldId: orphan.id, newId: bId, name: subtypeName });
              return;
            }
          }
        }
      });

      if (toRekey.length === 0) return;

      const rekey = (entries: any[]) => entries.map(e => {
        if (e.studentId !== studentId) return e;
        const match = toRekey.find(r => r.oldId === e.behaviorId);
        return match ? { ...e, behaviorId: match.newId } : e;
      });

      useDataStore.setState(state => ({
        frequencyEntries: rekey(state.frequencyEntries),
        durationEntries: rekey(state.durationEntries),
        abcEntries: rekey(state.abcEntries),
        intervalEntries: rekey(state.intervalEntries),
      } as any));
    };

    doReconcile();
  }, [orphanedBehaviors, behaviors, studentId]);

  const [adoptDialogOpen, setAdoptDialogOpen] = useState(false);
  const [adoptTarget, setAdoptTarget] = useState<{ id: string; inferredName: string } | null>(null);
  const [adoptName, setAdoptName] = useState('');
  const [adoptDefinition, setAdoptDefinition] = useState('');
  const [adoptMode, setAdoptMode] = useState<'existing' | 'bank' | 'custom'>('existing');
  const [adoptExistingId, setAdoptExistingId] = useState('');
  const { addBehavior, globalBehaviorBank, behaviorDefinitionOverrides } = useDataStore();

  // Get effective behavior bank with overrides
  const effectiveBankForAdopt = useMemo(() => {
    const BEHAVIOR_BANK = [
      { id: 'aggression-physical', name: 'Physical Aggression', operationalDefinition: 'Forceful physical contact towards others', category: 'Aggression' },
      { id: 'aggression-verbal', name: 'Verbal Aggression', operationalDefinition: 'Vocalized threats or hostile statements', category: 'Aggression' },
      { id: 'sib', name: 'Self-Injurious Behavior', operationalDefinition: 'Actions causing injury to self', category: 'Self-Injury' },
      { id: 'elopement', name: 'Elopement', operationalDefinition: 'Leaving designated area without permission', category: 'Safety' },
      { id: 'property-destruction', name: 'Property Destruction', operationalDefinition: 'Intentional damage to objects or property', category: 'Disruption' },
      { id: 'non-compliance', name: 'Non-Compliance', operationalDefinition: 'Failure to follow instructions within specified time', category: 'Non-Compliance' },
      { id: 'tantrum', name: 'Tantrum', operationalDefinition: 'Crying, screaming, or falling to the floor', category: 'Disruption' },
      { id: 'stereotypy', name: 'Stereotypy', operationalDefinition: 'Repetitive motor movements or vocalizations', category: 'Repetitive' },
      { id: 'mouthing', name: 'Mouthing/Pica', operationalDefinition: 'Placing inedible objects in the mouth', category: 'Safety' },
      { id: 'social-withdrawal', name: 'Social Withdrawal', operationalDefinition: 'Avoiding social interaction or isolating from peers', category: 'Social' },
    ];
    const all = [...BEHAVIOR_BANK.map(b => {
      const override = behaviorDefinitionOverrides[b.id];
      return override ? { ...b, operationalDefinition: override.operationalDefinition || b.operationalDefinition } : b;
    }), ...globalBehaviorBank.map(b => ({ id: b.id, name: b.name, operationalDefinition: b.operationalDefinition, category: b.category || 'Custom' }))];
    return all;
  }, [globalBehaviorBank, behaviorDefinitionOverrides]);

  const handleAdoptBehavior = async () => {
    if (!adoptTarget) return;

    const oldBehaviorId = adoptTarget.id;
    let newBehaviorId: string | null = null;

    if (adoptMode === 'existing' && adoptExistingId) {
      newBehaviorId = adoptExistingId;
      const store = useDataStore.getState();
      const student = store.students.find(s => s.id === studentId);
      if (student) {
        const existingBehavior = student.behaviors.find(b => b.id === adoptExistingId);
        if (existingBehavior) {
          const rekey = (entries: any[]) => entries.map(e => 
            e.studentId === studentId && e.behaviorId === oldBehaviorId 
              ? { ...e, behaviorId: adoptExistingId } 
              : e
          );
          useDataStore.setState(state => ({
            frequencyEntries: rekey(state.frequencyEntries),
            durationEntries: rekey(state.durationEntries),
            abcEntries: rekey(state.abcEntries),
            intervalEntries: rekey(state.intervalEntries),
          }));
          toast.success(`Linked data to "${existingBehavior.name}"`);
        }
      }
    } else {
      const name = adoptName.trim();
      if (!name) return;
      
      addBehavior(studentId, {
        name,
        type: 'frequency' as DataCollectionMethod,
        methods: ['frequency'] as DataCollectionMethod[],
        operationalDefinition: adoptDefinition || undefined,
      });
      // Replace generated ID with orphan ID so data lines up
      const store = useDataStore.getState();
      const student = store.students.find(s => s.id === studentId);
      if (student) {
        const newestBehavior = student.behaviors[student.behaviors.length - 1];
        if (newestBehavior && newestBehavior.name === name) {
          useDataStore.setState({
            students: store.students.map(s => s.id === studentId ? {
              ...s,
              behaviors: s.behaviors.map(b => b.id === newestBehavior.id 
                ? { ...b, id: oldBehaviorId, operationalDefinition: adoptDefinition || b.operationalDefinition } 
                : b),
            } : s),
          });
        }
      }
      // For new/bank behaviors, the behavior ID stays as the orphan ID — no DB rekey needed
      newBehaviorId = null;
      toast.success(`Linked "${name}" to existing data`);
    }

    // Persist the behavior_id change to the database so it survives refresh
    if (newBehaviorId && oldBehaviorId !== newBehaviorId) {
      try {
        const { error } = await supabase
          .from('session_data')
          .update({ behavior_id: newBehaviorId } as any)
          .eq('student_id', studentId)
          .eq('behavior_id', oldBehaviorId);
        
        if (error) {
          console.error('[Adopt] Failed to persist behavior_id rekey to DB:', error);
          toast.error('Link saved locally but failed to sync to cloud. Try saving your session.');
        } else {
          console.log(`[Adopt] Rekeyed session_data behavior_id from ${oldBehaviorId} to ${newBehaviorId}`);
        }

        // Also update any session entries that store the old behavior_id inline
        // Update sessions that contain this data in their stored entries
        const { data: affectedSessions } = await supabase
          .from('sessions')
          .select('id')
          .contains('student_ids', [studentId]);
        
        if (affectedSessions && affectedSessions.length > 0) {
          console.log(`[Adopt] ${affectedSessions.length} sessions may reference old behavior_id`);
        }
      } catch (err) {
        console.error('[Adopt] Error persisting behavior link:', err);
      }
    }
    
    setAdoptDialogOpen(false);
    setAdoptTarget(null);
    setAdoptName('');
    setAdoptDefinition('');
    setAdoptMode('existing');
    setAdoptExistingId('');
  };

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

  // Chart data: frequency over time (combines frequencyEntries + historicalData + ABC frequencyCount)
  // Only includes days where actual data was recorded — no placeholder zeros for missing dates
  const frequencyChartData = useMemo(() => {
    if (!dateRange) return [];
    
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dataPoint: any = { date: format(day, 'MMM d') };
      let hasData = false;

      filteredBehaviors.forEach((behavior) => {
        // Count from frequencyEntries
        const dayFrequency = frequencyEntries.filter(e => 
          e.studentId === studentId &&
          e.behaviorId === behavior.id &&
          isWithinInterval(new Date(e.timestamp), { start: dayStart, end: dayEnd })
        );
        let count = dayFrequency.reduce((s, e) => s + e.count, 0);
        
        // Also add from historicalData (for entries that might only exist there after cloud load)
        const histFrequency = historicalData.filter((e: any) =>
          e.behaviorId === behavior.id &&
          isWithinInterval(new Date(e.timestamp), { start: dayStart, end: dayEnd })
        );
        // Avoid double counting - check if entry IDs overlap
        const freqIds = new Set(dayFrequency.map(e => e.id));
        histFrequency.forEach((h: any) => {
          if (!freqIds.has(h.id)) {
            count += h.count || 0;
          }
        });
        
        // Also add frequencyCount from ABC entries for this behavior
        const dayABC = abcEntries.filter(e => 
          e.studentId === studentId &&
          e.behaviorId === behavior.id &&
          isWithinInterval(new Date((e as any).timestamp), { start: dayStart, end: dayEnd })
        );
        count += dayABC.reduce((s, e) => s + ((e as any).frequencyCount || 1), 0);
        
        // Only include if there was actual data recorded (frequency entries, historical, or ABC)
        const hadEntries = dayFrequency.length > 0 || histFrequency.length > 0 || dayABC.length > 0;
        if (hadEntries) {
          dataPoint[behavior.name] = count; // 0 is valid if observed but not occurred
          hasData = true;
        }
        // If no entries exist for this day, leave the key absent (renders as gap)
      });

      return hasData ? dataPoint : null;
    }).filter(Boolean);
  }, [dateRange, filteredBehaviors, frequencyEntries, historicalData, abcEntries, studentId]);

  // Chart data: duration over time (includes ABC durationMinutes)
  // Only includes days where actual duration data was recorded
  const durationChartData = useMemo(() => {
    if (!dateRange) return [];
    
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const dataPoint: any = { date: format(day, 'MMM d') };
      let hasData = false;

      filteredBehaviors.forEach((behavior, idx) => {
        // Duration from durationEntries
        const dayDuration = durationEntries.filter(e => 
          e.studentId === studentId &&
          e.behaviorId === behavior.id &&
          isWithinInterval(new Date(e.startTime), { start: dayStart, end: dayEnd })
        );
        let duration = dayDuration.reduce((s, e) => s + e.duration, 0);
        
        // Also add duration from ABC entries (stored as durationMinutes, convert to seconds)
        const dayABC = abcEntries.filter(e => 
          e.studentId === studentId &&
          e.behaviorId === behavior.id &&
          (e as any).hasDuration &&
          (e as any).durationMinutes &&
          isWithinInterval(new Date((e as any).timestamp), { start: dayStart, end: dayEnd })
        );
        duration += dayABC.reduce((s, e) => s + (((e as any).durationMinutes || 0) * 60), 0);
        
        // Only include if actual data exists for this day
        const hadEntries = dayDuration.length > 0 || dayABC.length > 0;
        if (hadEntries) {
          dataPoint[`${behavior.name} (sec)`] = duration; // 0 is valid if timed but no duration
          hasData = true;
        }
      });

      return hasData ? dataPoint : null;
    }).filter(Boolean);
  }, [dateRange, filteredBehaviors, durationEntries, abcEntries, studentId]);

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

        {/* Phase Lines Toggle */}
        {phaseChangesForChart.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 bg-secondary/50 rounded-md">
            <Layers className="w-3 h-3 text-muted-foreground" />
            <Label htmlFor="phase-lines" className="text-xs cursor-pointer">Phase Lines</Label>
            <Switch 
              id="phase-lines" 
              checked={showPhaseLines} 
              onCheckedChange={setShowPhaseLines}
              className="scale-75"
            />
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
                  {chartType === 'line' ? (
                    <LineChart data={frequencyChartData}>
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
                          dataKey={behavior.name}
                          stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                          connectNulls={false}
                        />
                      ))}
                      {/* Phase Change Lines */}
                      {showPhaseLines && phaseChangesForChart.map((pc, idx) => {
                        const dateLabel = format(new Date(pc.date), 'MMM d');
                        // Find matching date in chart data
                        const matchIndex = frequencyChartData.findIndex(d => d.date === dateLabel);
                        if (matchIndex === -1) return null;
                        return (
                          <ReferenceLine
                            key={pc.id}
                            x={dateLabel}
                            stroke="hsl(var(--warning))"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            label={{
                              value: pc.label,
                              position: 'top',
                              fill: 'hsl(var(--warning))',
                              fontSize: 10,
                            }}
                          />
                        );
                      })}
                    </LineChart>
                  ) : (
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
                      {/* Phase Change Lines */}
                      {showPhaseLines && phaseChangesForChart.map((pc) => {
                        const dateLabel = format(new Date(pc.date), 'MMM d');
                        const matchIndex = frequencyChartData.findIndex(d => d.date === dateLabel);
                        if (matchIndex === -1) return null;
                        return (
                          <ReferenceLine
                            key={pc.id}
                            x={dateLabel}
                            stroke="hsl(var(--warning))"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            label={{
                              value: pc.label,
                              position: 'top',
                              fill: 'hsl(var(--warning))',
                              fontSize: 10,
                            }}
                          />
                        );
                      })}
                    </BarChart>
                  )}
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
                  {chartType === 'line' ? (
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
                          dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                          connectNulls={false}
                        />
                      ))}
                      {/* Phase Change Lines */}
                      {showPhaseLines && phaseChangesForChart.map((pc) => {
                        const dateLabel = format(new Date(pc.date), 'MMM d');
                        const matchIndex = durationChartData.findIndex(d => d.date === dateLabel);
                        if (matchIndex === -1) return null;
                        return (
                          <ReferenceLine
                            key={pc.id}
                            x={dateLabel}
                            stroke="hsl(var(--warning))"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            label={{
                              value: pc.label,
                              position: 'top',
                              fill: 'hsl(var(--warning))',
                              fontSize: 10,
                            }}
                          />
                        );
                      })}
                    </LineChart>
                  ) : (
                    <BarChart data={durationChartData}>
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
                          dataKey={`${behavior.name} (sec)`}
                          fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          radius={[2, 2, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  )}
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
                  {chartType === 'line' ? (
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
                  ) : (
                    <BarChart data={intervalChartData}>
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
                      <Bar
                        dataKey="Interval %"
                        fill="hsl(var(--primary))"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  )}
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
                          <div className="flex items-center gap-1 mt-0.5">
                            {editingMethodsBehaviorId === behavior.id ? (
                              <>
                                {ALL_METHODS.map(m => (
                                  <Badge
                                    key={m.value}
                                    variant={editingMethods.includes(m.value) ? 'default' : 'outline'}
                                    className="text-xs py-0 cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); toggleEditingMethod(m.value); }}
                                  >
                                    {m.label}
                                  </Badge>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 p-0 ml-1"
                                  onClick={(e) => { e.stopPropagation(); saveEditMethods(); }}
                                  disabled={editingMethods.length === 0}
                                >
                                  <Check className="w-3 h-3 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => { e.stopPropagation(); setEditingMethodsBehaviorId(null); }}
                                >
                                  <X className="w-3 h-3 text-muted-foreground" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {(behavior.methods || [behavior.type]).map(method => (
                                  <Badge key={method} variant="secondary" className="text-xs py-0">
                                    {METHOD_LABELS[method]}
                                  </Badge>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 p-0 ml-1 opacity-40 hover:opacity-100"
                                  onClick={(e) => { e.stopPropagation(); startEditMethods(behavior.id, behavior.methods || [behavior.type]); }}
                                  title="Edit data collection methods"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
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

      {/* Orphaned / Unlinked Behavior Data */}
      {orphanedBehaviors.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Unlinked Behavior Data ({orphanedBehaviors.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Data collected during assessments or observations that isn't linked to a defined behavior. Click "Link" to name and adopt it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {orphanedBehaviors.map(orphan => (
              <div key={orphan.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                <div>
                  <div className="font-medium text-sm">{orphan.inferredName}</div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    {orphan.freqCount > 0 && <span>{orphan.freqCount} frequency</span>}
                    {orphan.durationSec > 0 && <span>{formatDuration(orphan.durationSec)} duration</span>}
                    {orphan.abcCount > 0 && <span>{orphan.abcCount} ABC entries</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    setAdoptTarget({ id: orphan.id, inferredName: orphan.inferredName });
                    setAdoptName(orphan.inferredName.startsWith('Unlinked') ? '' : orphan.inferredName);
                    setAdoptDefinition('');
                    setAdoptMode(behaviors.length > 0 ? 'existing' : 'bank');
                    setAdoptExistingId('');
                    setAdoptDialogOpen(true);
                  }}
                >
                  <UserPlus className="w-3 h-3" />
                  Link
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Adopt Behavior Dialog */}
      <Dialog open={adoptDialogOpen} onOpenChange={setAdoptDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Behavior to Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Data ID: {adoptTarget?.inferredName} — Choose how to link this data.
            </p>

            {/* Mode selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Link Method</Label>
              <Select value={adoptMode} onValueChange={(v: any) => { setAdoptMode(v); setAdoptExistingId(''); setAdoptName(''); setAdoptDefinition(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Link to existing student behavior</SelectItem>
                  <SelectItem value="bank">Pull from behavior bank</SelectItem>
                  <SelectItem value="custom">Create custom behavior</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Existing behavior picker */}
            {adoptMode === 'existing' && (
              <div className="space-y-2">
                <Label className="text-sm">Select Behavior</Label>
                {behaviors.length > 0 ? (
                  <Select value={adoptExistingId} onValueChange={setAdoptExistingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a behavior..." />
                    </SelectTrigger>
                    <SelectContent>
                      {behaviors.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          <div className="flex flex-col">
                            <span>{b.name}</span>
                            {b.operationalDefinition && (
                              <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                                {b.operationalDefinition}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground border rounded p-3 bg-muted/30">
                    No behaviors on this student yet. Use "Pull from behavior bank" or "Create custom behavior" instead.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  All orphaned data will be reassigned to this behavior.
                </p>
              </div>
            )}

            {/* Behavior bank picker */}
            {adoptMode === 'bank' && (
              <div className="space-y-2">
                <Label className="text-sm">Select from Bank</Label>
                <Select value={adoptName} onValueChange={(v) => {
                  const found = effectiveBankForAdopt.find(b => b.name === v);
                  setAdoptName(v);
                  setAdoptDefinition(found?.operationalDefinition || '');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from bank..." />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveBankForAdopt.map(b => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {adoptDefinition && (
                  <p className="text-xs text-muted-foreground border rounded p-2 bg-muted/30">
                    {adoptDefinition}
                  </p>
                )}
              </div>
            )}

            {/* Custom */}
            {adoptMode === 'custom' && (
              <div className="space-y-2">
                <Label className="text-sm">Behavior Name</Label>
                <Input
                  value={adoptName}
                  onChange={(e) => setAdoptName(e.target.value)}
                  placeholder="Enter behavior name..."
                />
                <Label className="text-sm">Definition (optional)</Label>
                <Input
                  value={adoptDefinition}
                  onChange={(e) => setAdoptDefinition(e.target.value)}
                  placeholder="Operational definition..."
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAdoptDialogOpen(false)}>Cancel</Button>
              <Button 
                className="flex-1" 
                onClick={handleAdoptBehavior} 
                disabled={
                  (adoptMode === 'existing' && !adoptExistingId) ||
                  (adoptMode !== 'existing' && !adoptName.trim())
                }
              >
                Link Behavior
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
