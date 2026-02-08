import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isValid, parseISO } from 'date-fns';
import { 
  Users, Calendar, Save, X, Check, Minus, 
  ChevronDown, ChevronUp, AlertCircle, Timer, Grid3X3, TrendingUp,
  Edit2, Clock, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HistoricalSyncStatusBadge } from '@/components/HistoricalSyncStatusBadge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useDataStore } from '@/store/dataStore';
import { Behavior, BehaviorDefinition, DataCollectionMethod } from '@/types/behavior';

// Default behavior bank (same as in BehaviorLibrary and HistoricalDataEntry)
const DEFAULT_BEHAVIORS: BehaviorDefinition[] = [
  {
    id: 'aggression-physical',
    name: 'Physical Aggression',
    operationalDefinition: 'Any instance of forceful physical contact towards another person including hitting, kicking, biting, scratching, pushing, or throwing objects at others with apparent intent to harm or intimidate.',
    category: 'Aggression',
    isGlobal: true,
  },
  {
    id: 'aggression-verbal',
    name: 'Verbal Aggression',
    operationalDefinition: 'Vocalized threats, name-calling, or hostile statements directed at others, including yelling obscenities, making threats of harm, or using derogatory language.',
    category: 'Aggression',
    isGlobal: true,
  },
  {
    id: 'sib',
    name: 'Self-Injurious Behavior',
    operationalDefinition: 'Any behavior that results in or has the potential to result in physical injury to oneself, including head-banging, biting self, hitting self, scratching self, or hair pulling.',
    category: 'Self-Injury',
    isGlobal: true,
  },
  {
    id: 'property-destruction',
    name: 'Property Destruction',
    operationalDefinition: 'Any instance of damaging, breaking, or attempting to destroy property, including throwing objects, tearing materials, breaking items, or defacing property.',
    category: 'Property Destruction',
    isGlobal: true,
  },
  {
    id: 'elopement',
    name: 'Elopement',
    operationalDefinition: 'Leaving or attempting to leave a designated area without permission, including running away, walking out of the classroom, or leaving the school grounds without authorization.',
    category: 'Elopement',
    isGlobal: true,
  },
  {
    id: 'non-compliance',
    name: 'Non-Compliance',
    operationalDefinition: 'Failure to initiate a response to an instruction within 10 seconds of the instruction being given, or failure to complete the instructed task.',
    category: 'Non-Compliance',
    isGlobal: true,
  },
  {
    id: 'task-refusal',
    name: 'Task Refusal',
    operationalDefinition: 'Verbal or non-verbal indication that the individual will not complete a requested task, including saying "no", shaking head, pushing materials away, or stating refusal.',
    category: 'Non-Compliance',
    isGlobal: true,
  },
  {
    id: 'verbal-disruption',
    name: 'Verbal Disruption',
    operationalDefinition: 'Vocalizations that interrupt ongoing instruction or activities, including talking out of turn, making loud noises, singing, humming loudly, or calling out during lessons.',
    category: 'Verbal Disruption',
    isGlobal: true,
  },
  {
    id: 'out-of-seat',
    name: 'Out of Seat',
    operationalDefinition: 'Leaving assigned seat without permission, including standing up, walking around the classroom, or moving to a different location during instruction.',
    category: 'Verbal Disruption',
    isGlobal: true,
  },
  {
    id: 'stereotypy-motor',
    name: 'Motor Stereotypy',
    operationalDefinition: 'Repetitive motor movements that appear to have no adaptive function, including hand flapping, body rocking, finger flicking, spinning, or repetitive object manipulation.',
    category: 'Stereotypy',
    isGlobal: true,
  },
  {
    id: 'stereotypy-vocal',
    name: 'Vocal Stereotypy',
    operationalDefinition: 'Repetitive vocalizations that do not serve a communicative function, including scripting, echolalia, repetitive sounds, or humming.',
    category: 'Stereotypy',
    isGlobal: true,
  },
  {
    id: 'on-task',
    name: 'On-Task Behavior',
    operationalDefinition: 'Engagement in assigned task activities including looking at materials, writing, participating in discussions, following along during instruction, or completing work independently.',
    category: 'Academic',
    isGlobal: true,
  },
  {
    id: 'hand-raising',
    name: 'Appropriate Hand Raising',
    operationalDefinition: 'Raising hand quietly and waiting to be called on before speaking during classroom instruction or group activities.',
    category: 'Social Skills',
    isGlobal: true,
  },
  {
    id: 'appropriate-request',
    name: 'Appropriate Requesting',
    operationalDefinition: 'Using words, signs, or AAC device to request wants or needs in a calm voice without engaging in problem behavior.',
    category: 'Communication',
    isGlobal: true,
  },
];

// Custom hook for debounced date inputs
function useDebouncedDateRange(initialStart: string, initialEnd: string, delay: number = 500) {
  const [inputStart, setInputStart] = useState(initialStart);
  const [inputEnd, setInputEnd] = useState(initialEnd);
  const [debouncedRange, setDebouncedRange] = useState({ start: initialStart, end: initialEnd });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateDebouncedRange = useCallback((start: string, end: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      // Only update if both dates are valid complete dates (yyyy-MM-dd format)
      const startValid = start.length === 10 && isValid(parseISO(start));
      const endValid = end.length === 10 && isValid(parseISO(end));
      
      if (startValid && endValid) {
        setDebouncedRange({ start, end });
      }
    }, delay);
  }, [delay]);
  
  const setStart = useCallback((value: string) => {
    setInputStart(value);
    updateDebouncedRange(value, inputEnd);
  }, [inputEnd, updateDebouncedRange]);
  
  const setEnd = useCallback((value: string) => {
    setInputEnd(value);
    updateDebouncedRange(inputStart, value);
  }, [inputStart, updateDebouncedRange]);
  
  const setImmediate = useCallback((start: string, end: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setInputStart(start);
    setInputEnd(end);
    setDebouncedRange({ start, end });
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    inputStart,
    inputEnd,
    debouncedRange,
    setStart,
    setEnd,
    setImmediate,
  };
}

type DataStatus = 'collected' | 'zero' | 'no_data';
type DataType = 'frequency' | 'interval';

interface CellData {
  status: DataStatus;
  count: number;
  durationSeconds?: number;
  observationMinutes?: number; // For rate calculation
  // Interval-specific fields
  totalIntervals?: number;
  occurredIntervals?: number[];
}

// Key format: studentId-behaviorId-date
type BulkDataMap = Record<string, CellData>;

interface BulkHistoricalDataEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkHistoricalDataEntry({ open, onOpenChange }: BulkHistoricalDataEntryProps) {
  const { 
    students, 
    addHistoricalFrequencyBatch, 
    addHistoricalDurationBatch, 
    addBehaviorWithMethods,
    globalBehaviorBank,
    behaviorDefinitionOverrides,
  } = useDataStore();
  
  // Selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedBehaviorIds, setSelectedBehaviorIds] = useState<string[]>([]); // Now stores behavior names (normalized)
  
  // Use debounced date range to prevent freezing when typing
  const initialStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const initialEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const {
    inputStart,
    inputEnd,
    debouncedRange: dateRange,
    setStart: setDateStart,
    setEnd: setDateEnd,
    setImmediate: setDateRangeImmediate,
  } = useDebouncedDateRange(initialStart, initialEnd, 400);
  
  // Data type selection
  const [dataType, setDataType] = useState<DataType>('frequency');
  
  // Bulk data map
  const [bulkData, setBulkData] = useState<BulkDataMap>({});
  
  // UI state
  const [expandedStudents, setExpandedStudents] = useState<string[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<DataStatus>('collected');
  const [defaultCount, setDefaultCount] = useState(1);
  const [defaultDuration, setDefaultDuration] = useState(0);
  const [defaultObservationMinutes, setDefaultObservationMinutes] = useState(0);
  const [defaultTotalIntervals, setDefaultTotalIntervals] = useState(6);
  const [showApplyDefaults, setShowApplyDefaults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Cell editor state
  const [editingCell, setEditingCell] = useState<{
    studentId: string;
    behaviorId: string;
    date: Date;
  } | null>(null);

  // Get active (non-archived) students
  const activeStudents = useMemo(() => 
    students.filter(s => !s.isArchived),
    [students]
  );

  // Get effective default behaviors with overrides applied
  const effectiveDefaultBehaviors = useMemo(() => {
    return DEFAULT_BEHAVIORS.map(behavior => {
      const override = behaviorDefinitionOverrides[behavior.id];
      if (override) {
        return {
          ...behavior,
          operationalDefinition: override.operationalDefinition || behavior.operationalDefinition,
          category: override.category || behavior.category,
        };
      }
      return behavior;
    });
  }, [behaviorDefinitionOverrides]);

  // Get ALL behaviors: student behaviors + bank behaviors (deduplicated by name)
  // This allows selecting any behavior from the bank even if no student has it yet
  const availableBehaviors = useMemo(() => {
    const behaviorMap = new Map<string, { 
      id: string;
      name: string;
      operationalDefinition?: string;
      category?: string;
      studentIds: string[]; // Which students already have this behavior
      source: 'student' | 'built-in' | 'organization';
      baseBehaviorId?: string; // For bank behaviors, the original ID
    }>();
    
    // First, add all behaviors from selected students
    selectedStudentIds.forEach(studentId => {
      const student = activeStudents.find(s => s.id === studentId);
      if (!student) return;
      
      student.behaviors
        .filter(b => !b.isArchived && !b.isMastered)
        .forEach(behavior => {
          const key = behavior.name.toLowerCase().trim();
          const existing = behaviorMap.get(key);
          if (existing) {
            if (!existing.studentIds.includes(studentId)) {
              existing.studentIds.push(studentId);
            }
          } else {
            behaviorMap.set(key, { 
              id: behavior.id,
              name: behavior.name,
              operationalDefinition: behavior.operationalDefinition,
              category: behavior.category,
              studentIds: [studentId],
              source: 'student',
            });
          }
        });
    });
    
    // Then, add built-in behaviors that aren't already in the map
    effectiveDefaultBehaviors.forEach(behavior => {
      const key = behavior.name.toLowerCase().trim();
      if (!behaviorMap.has(key)) {
        behaviorMap.set(key, {
          id: `bank-${behavior.id}`,
          name: behavior.name,
          operationalDefinition: behavior.operationalDefinition,
          category: behavior.category,
          studentIds: [], // No students have this yet
          source: 'built-in',
          baseBehaviorId: behavior.id,
        });
      }
    });
    
    // Finally, add organization behaviors that aren't already in the map
    globalBehaviorBank.forEach(behavior => {
      const key = behavior.name.toLowerCase().trim();
      if (!behaviorMap.has(key)) {
        behaviorMap.set(key, {
          id: `bank-${behavior.id}`,
          name: behavior.name,
          operationalDefinition: behavior.operationalDefinition,
          category: behavior.category,
          studentIds: [], // No students have this yet
          source: 'organization',
          baseBehaviorId: behavior.id,
        });
      }
    });
    
    return Array.from(behaviorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedStudentIds, activeStudents, effectiveDefaultBehaviors, globalBehaviorBank]);

  // Generate dates from range
  const dates = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const start = new Date(dateRange.start + 'T00:00:00');
    const end = new Date(dateRange.end + 'T00:00:00');
    if (start > end) return [];
    return eachDayOfInterval({ start, end });
  }, [dateRange]);

  // Get cell key
  const getCellKey = (studentId: string, behaviorId: string, date: Date) => 
    `${studentId}-${behaviorId}-${format(date, 'yyyy-MM-dd')}`;

  // Get cell data
  const getCellData = (studentId: string, behaviorId: string, date: Date): CellData => {
    const key = getCellKey(studentId, behaviorId, date);
    return bulkData[key] || { 
      status: 'no_data', 
      count: 0,
      totalIntervals: defaultTotalIntervals,
      occurredIntervals: [],
    };
  };

  // Set cell data
  const setCellData = (studentId: string, behaviorId: string, date: Date, data: Partial<CellData>) => {
    const key = getCellKey(studentId, behaviorId, date);
    setBulkData(prev => ({
      ...prev,
      [key]: { ...getCellData(studentId, behaviorId, date), ...data },
    }));
  };

  // Cycle through status: no_data -> zero -> collected -> no_data
  const cycleStatus = (studentId: string, behaviorId: string, date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = getCellData(studentId, behaviorId, date);
    const statusOrder: DataStatus[] = ['no_data', 'zero', 'collected'];
    const currentIndex = statusOrder.indexOf(current.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    setCellData(studentId, behaviorId, date, { 
      status: nextStatus, 
      count: nextStatus === 'zero' ? 0 : (nextStatus === 'collected' ? 1 : 0),
      occurredIntervals: nextStatus === 'zero' ? [] : current.occurredIntervals,
    });
  };

  // Apply defaults to all cells (using behavior name as key for bank behaviors)
  const applyDefaultsToAll = () => {
    const newData: BulkDataMap = {};
    
    selectedStudentIds.forEach(studentId => {
      const student = activeStudents.find(s => s.id === studentId);
      if (!student) return;

      selectedBehaviorIds.forEach(behaviorName => {
        // First check if student has the behavior
        const existingBehavior = student.behaviors.find(b => 
          b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim() && !b.isArchived && !b.isMastered
        );
        
        // Get the behavior info from available behaviors (for bank behaviors)
        const bankBehaviorInfo = availableBehaviors.find(
          b => b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim()
        );
        
        // Use existing behavior ID if available, otherwise use the bank behavior ID
        const behaviorId = existingBehavior?.id || bankBehaviorInfo?.id;
        if (!behaviorId) return;

        dates.forEach(date => {
          const key = getCellKey(studentId, behaviorId, date);
          newData[key] = {
            status: defaultStatus,
            count: defaultStatus === 'zero' ? 0 : defaultCount,
            durationSeconds: defaultDuration > 0 ? defaultDuration : undefined,
            observationMinutes: defaultObservationMinutes > 0 ? defaultObservationMinutes : undefined,
            totalIntervals: defaultTotalIntervals,
            occurredIntervals: [],
          };
        });
      });
    });

    setBulkData(newData);
    setShowApplyDefaults(false);
    toast.success('Defaults applied to all cells');
  };

  // Set all cells for a specific student
  const setAllForStudent = (studentId: string, status: DataStatus) => {
    const student = activeStudents.find(s => s.id === studentId);
    if (!student) return;

    selectedBehaviorIds.forEach(behaviorName => {
      // First check if student has the behavior
      const existingBehavior = student.behaviors.find(b => 
        b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim() && !b.isArchived && !b.isMastered
      );
      
      // Get the behavior info from available behaviors (for bank behaviors)
      const bankBehaviorInfo = availableBehaviors.find(
        b => b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim()
      );
      
      // Use existing behavior ID if available, otherwise use the bank behavior ID
      const behaviorId = existingBehavior?.id || bankBehaviorInfo?.id;
      if (!behaviorId) return;

      dates.forEach(date => {
        setCellData(studentId, behaviorId, date, { 
          status, 
          count: status === 'zero' ? 0 : (status === 'collected' ? 1 : 0),
          occurredIntervals: status === 'zero' ? [] : undefined,
        });
      });
    });
  };

  // Toggle student expansion
  const toggleStudentExpanded = (studentId: string) => {
    setExpandedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Helper to get or create behavior ID for a student
  const getOrCreateBehaviorId = (studentId: string, behaviorName: string): string | null => {
    const student = activeStudents.find(s => s.id === studentId);
    if (!student) return null;

    // Check if student already has this behavior
    const existingBehavior = student.behaviors.find(
      b => b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim() && !b.isArchived
    );
    
    if (existingBehavior) {
      return existingBehavior.id;
    }

    // Student doesn't have this behavior - add it from the bank
    const bankBehavior = availableBehaviors.find(
      b => b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim()
    );

    if (!bankBehavior) return null;

    // Determine methods based on data type
    const methods: DataCollectionMethod[] = dataType === 'interval' 
      ? ['interval', 'frequency'] 
      : ['frequency'];

    // Add the behavior to the student
    addBehaviorWithMethods(studentId, bankBehavior.name, methods, {
      operationalDefinition: bankBehavior.operationalDefinition,
      category: bankBehavior.category,
      baseBehaviorId: bankBehavior.baseBehaviorId,
    });

    // Get the newly created behavior ID from the updated store
    const updatedStudents = useDataStore.getState().students;
    const updatedStudent = updatedStudents.find(s => s.id === studentId);
    const newBehavior = updatedStudent?.behaviors.find(
      b => b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim()
    );

    return newBehavior?.id || null;
  };

  // Handle save with batching to prevent freeze
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    // Track which behaviors were added to which students
    const behaviorsAdded: { studentName: string; behaviorName: string }[] = [];

    const frequencyEntries: Array<{
      studentId: string;
      behaviorId: string;
      count: number;
      timestamp: Date;
      observationDurationMinutes?: number;
    }> = [];
    
    const durationEntries: Array<{
      studentId: string;
      behaviorId: string;
      durationSeconds: number;
      timestamp: Date;
    }> = [];
    
    let skippedCount = 0;

    // Process each selected behavior for each selected student
    selectedBehaviorIds.forEach(behaviorName => {
      selectedStudentIds.forEach(studentId => {
        const student = activeStudents.find(s => s.id === studentId);
        if (!student) return;

        // Check if student already has this behavior
        const existingBehavior = student.behaviors.find(
          b => b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim() && !b.isArchived
        );

        let behaviorId: string;
        
        if (existingBehavior) {
          behaviorId = existingBehavior.id;
        } else {
          // Need to add behavior to student
          const bankBehavior = availableBehaviors.find(
            b => b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim()
          );

          if (!bankBehavior) return;

          // Determine methods based on data type
          const methods: DataCollectionMethod[] = dataType === 'interval' 
            ? ['interval', 'frequency'] 
            : ['frequency'];

          // Add the behavior to the student
          addBehaviorWithMethods(studentId, bankBehavior.name, methods, {
            operationalDefinition: bankBehavior.operationalDefinition,
            category: bankBehavior.category,
            baseBehaviorId: bankBehavior.baseBehaviorId,
          });

          // Get the newly created behavior ID
          const updatedStudents = useDataStore.getState().students;
          const updatedStudent = updatedStudents.find(s => s.id === studentId);
          const newBehavior = updatedStudent?.behaviors.find(
            b => b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim()
          );

          if (!newBehavior) return;
          
          behaviorId = newBehavior.id;
          behaviorsAdded.push({ studentName: student.name, behaviorName: bankBehavior.name });
        }

        // Now process all dates for this student-behavior combination
        dates.forEach(date => {
          const key = getCellKey(studentId, behaviorId, date);
          // Also check for keys using the bank behavior ID format
          const bankBehaviorInfo = availableBehaviors.find(
            b => b.name.toLowerCase().trim() === behaviorName.toLowerCase().trim()
          );
          const altKey = bankBehaviorInfo ? getCellKey(studentId, bankBehaviorInfo.id, date) : null;
          
          const data = bulkData[key] || (altKey ? bulkData[altKey] : null);
          
          if (!data || data.status === 'no_data') {
            if (data) skippedCount++;
            return;
          }

          const timestamp = new Date(format(date, 'yyyy-MM-dd') + 'T12:00:00');

          if (dataType === 'frequency') {
            frequencyEntries.push({
              studentId,
              behaviorId,
              count: data.status === 'zero' ? 0 : data.count,
              timestamp,
              observationDurationMinutes: data.observationMinutes,
            });

            if (data.durationSeconds && data.durationSeconds > 0) {
              durationEntries.push({
                studentId,
                behaviorId,
                durationSeconds: data.durationSeconds,
                timestamp,
              });
            }
          } else if (dataType === 'interval') {
            const total = data.totalIntervals || defaultTotalIntervals;
            const occurred = data.occurredIntervals || [];
            const intervalSecs = 30; // Default 30-second intervals for historical data
            const sessionId = crypto.randomUUID();
            const sessionDate = new Date(format(date, 'yyyy-MM-dd') + 'T12:00:00');
            
            const intervalEntries: import('@/types/behavior').IntervalEntry[] = [];
            for (let i = 0; i < total; i++) {
              const entryTimestamp = new Date(sessionDate.getTime() + (i * intervalSecs * 1000));
              intervalEntries.push({
                id: crypto.randomUUID(),
                studentId,
                behaviorId,
                intervalNumber: i,
                occurred: occurred.includes(i),
                timestamp: entryTimestamp,
                markedAt: entryTimestamp,
                sessionId,
                isHistorical: true,
              });
            }

            // Create a dedicated historical session for this interval data
            const newSession = {
              id: sessionId,
              date: sessionDate,
              notes: 'Historical interval data entry',
              studentIds: [studentId],
              sessionLengthMinutes: Math.ceil((total * intervalSecs) / 60),
              abcEntries: [] as any[],
              frequencyEntries: [] as any[],
              durationEntries: [] as any[],
              intervalEntries,
            };

            useDataStore.setState((state) => ({
              sessions: [newSession, ...state.sessions],
              intervalEntries: [...state.intervalEntries, ...intervalEntries],
            }));
          }
        });
      });
    });

    try {
      await new Promise((r) => setTimeout(r, 0));

      if (frequencyEntries.length > 0) {
        addHistoricalFrequencyBatch(frequencyEntries);
      }

      if (durationEntries.length > 0) {
        addHistoricalDurationBatch(durationEntries);
      }

      const savedCount = dataType === 'frequency'
        ? frequencyEntries.length
        : Object.keys(bulkData).filter((k) => bulkData[k].status !== 'no_data').length;

      if (savedCount > 0) {
        let message = `Saved ${savedCount} ${dataType} entries`;
        if (skippedCount > 0) {
          message += ` (${skippedCount} skipped - no data)`;
        }
        if (behaviorsAdded.length > 0) {
          message += `. Added ${behaviorsAdded.length} new behavior(s) to students.`;
        }
        toast.success(message);
        resetAndClose();
      } else if (skippedCount > 0) {
        toast.info('All entries marked as "No Data" - nothing saved');
      } else {
        toast.error('No data to save. Please enter data for at least one cell.');
      }
    } catch (err) {
      console.error('Bulk save failed', err);
      toast.error('Save failed. Please try again with a smaller date range.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset and close
  const resetAndClose = () => {
    setSelectedStudentIds([]);
    setSelectedBehaviorIds([]);
    setBulkData({});
    setExpandedStudents([]);
    setEditingCell(null);
    onOpenChange(false);
  };

  // Format duration for display
  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m${secs > 0 ? ` ${secs}s` : ''}`;
    return `${secs}s`;
  };

  // Get status badge
  const getStatusBadge = (cellData: CellData) => {
    const { status, count, durationSeconds, totalIntervals, occurredIntervals } = cellData;
    
    if (status === 'no_data') {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
    
    if (status === 'zero') {
      return <Badge variant="secondary" className="text-xs px-1.5">0</Badge>;
    }
    
    if (dataType === 'interval') {
      const total = totalIntervals || defaultTotalIntervals;
      const occurred = occurredIntervals?.length || 0;
      const percentage = total > 0 ? Math.round((occurred / total) * 100) : 0;
      return (
        <Badge variant="default" className="text-xs px-1.5">
          {percentage}%
        </Badge>
      );
    }
    
    // Frequency with optional duration and rate
    const { observationMinutes } = cellData;
    const rate = observationMinutes && observationMinutes > 0 
      ? (count / (observationMinutes / 60)).toFixed(1) 
      : null;
    
    return (
      <div className="flex flex-col items-center gap-0.5">
        <Badge variant="default" className="text-xs px-1.5">{count}</Badge>
        {rate && (
          <span className="text-[10px] text-primary font-medium">
            {rate}/hr
          </span>
        )}
        {durationSeconds && durationSeconds > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {formatDuration(durationSeconds)}
          </span>
        )}
      </div>
    );
  };

  // Check if we're ready to show the grid
  const canShowGrid = selectedStudentIds.length > 0 && selectedBehaviorIds.length > 0 && dates.length > 0;

  // Cell Editor Component
  const CellEditor = () => {
    if (!editingCell) return null;
    
    const { studentId, behaviorId, date } = editingCell;
    const cellData = getCellData(studentId, behaviorId, date);
    const student = activeStudents.find(s => s.id === studentId);
    const behavior = student?.behaviors.find(b => b.id === behaviorId);
    
    const [localCount, setLocalCount] = useState(cellData.count || 1);
    const [localDuration, setLocalDuration] = useState(cellData.durationSeconds || 0);
    const [localObservationMinutes, setLocalObservationMinutes] = useState(cellData.observationMinutes || 0);
    const [localStatus, setLocalStatus] = useState(cellData.status);
    const [localTotalIntervals, setLocalTotalIntervals] = useState(cellData.totalIntervals || defaultTotalIntervals);
    const [localOccurred, setLocalOccurred] = useState<number[]>(cellData.occurredIntervals || []);
    
    // Calculate rate for display
    const calculatedRate = localObservationMinutes > 0 
      ? (localCount / (localObservationMinutes / 60)).toFixed(2)
      : null;
    
    const handleSaveCell = () => {
      setCellData(studentId, behaviorId, date, {
        status: localStatus,
        count: localStatus === 'zero' ? 0 : localCount,
        durationSeconds: localDuration > 0 ? localDuration : undefined,
        observationMinutes: localObservationMinutes > 0 ? localObservationMinutes : undefined,
        totalIntervals: localTotalIntervals,
        occurredIntervals: localOccurred,
      });
      setEditingCell(null);
    };
    
    const toggleInterval = (index: number) => {
      setLocalOccurred(prev => 
        prev.includes(index) 
          ? prev.filter(i => i !== index)
          : [...prev, index].sort((a, b) => a - b)
      );
    };
    
    const setAllIntervalsOccurred = () => {
      setLocalOccurred(Array.from({ length: localTotalIntervals }, (_, i) => i));
    };
    
    const setNoIntervalsOccurred = () => {
      setLocalOccurred([]);
    };
    
    return (
      <Dialog open={!!editingCell} onOpenChange={() => setEditingCell(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Edit Cell Data
            </DialogTitle>
            <DialogDescription>
              {behavior?.name} - {student?.displayName || student?.name} - {format(date, 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Status Selection */}
            <div className="space-y-2">
              <Label>Data Status</Label>
              <Select value={localStatus} onValueChange={(v) => setLocalStatus(v as DataStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_data">No Data Collected</SelectItem>
                  <SelectItem value="zero">Zero (Behavior Not Observed)</SelectItem>
                  <SelectItem value="collected">Data Collected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {localStatus === 'collected' && dataType === 'frequency' && (
              <>
                {/* Count Input */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Frequency Count
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={localCount}
                    onChange={(e) => setLocalCount(parseInt(e.target.value) || 0)}
                  />
                </div>
                
                {/* Observation Duration for Rate Calculation */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Observation Duration (minutes)
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={localObservationMinutes}
                      onChange={(e) => setLocalObservationMinutes(parseFloat(e.target.value) || 0)}
                      placeholder="Optional"
                    />
                    {calculatedRate && (
                      <Badge variant="default" className="whitespace-nowrap">
                        Rate: {calculatedRate}/hr
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter observation time to calculate rate per hour
                  </p>
                </div>
                
                {/* Duration Input */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    Behavior Duration (seconds)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={localDuration}
                      onChange={(e) => setLocalDuration(parseInt(e.target.value) || 0)}
                      placeholder="Optional"
                    />
                    {localDuration > 0 && (
                      <Badge variant="outline" className="whitespace-nowrap">
                        {formatDuration(localDuration)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave at 0 if not tracking behavior duration
                  </p>
                </div>
              </>
            )}
            
            {localStatus === 'collected' && dataType === 'interval' && (
              <>
                {/* Total Intervals */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    Total Intervals
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={localTotalIntervals}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 6;
                      setLocalTotalIntervals(Math.min(30, Math.max(1, val)));
                      // Remove any occurred intervals that exceed the new total
                      setLocalOccurred(prev => prev.filter(i => i < val));
                    }}
                  />
                </div>
                
                {/* Interval Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Intervals Occurred ({localOccurred.length}/{localTotalIntervals})</Label>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={setAllIntervalsOccurred}>
                        All
                      </Button>
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={setNoIntervalsOccurred}>
                        None
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {Array.from({ length: localTotalIntervals }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => toggleInterval(i)}
                        className={`h-8 rounded text-xs font-medium border transition-colors ${
                          localOccurred.includes(i)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-secondary/50 border-border hover:bg-secondary'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {localTotalIntervals > 0 
                      ? `${Math.round((localOccurred.length / localTotalIntervals) * 100)}% occurrence`
                      : '0% occurrence'
                    }
                  </p>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCell(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCell}>
              <Check className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Historical Data Entry
          </DialogTitle>
          <DialogDescription>
            Enter zero, collected, or no data status for multiple students, behaviors, and dates at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Data Type Selection */}
          <Tabs value={dataType} onValueChange={(v) => setDataType(v as DataType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-xs">
              <TabsTrigger value="frequency" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                Frequency/Duration
              </TabsTrigger>
              <TabsTrigger value="interval" className="gap-1">
                <Grid3X3 className="w-3 h-3" />
                Interval
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Selection Controls */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Student Selection */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Students ({selectedStudentIds.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {activeStudents.map(student => (
                      <div key={student.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`student-${student.id}`}
                          checked={selectedStudentIds.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudentIds(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                            }
                          }}
                        />
                        <label 
                          htmlFor={`student-${student.id}`}
                          className="text-sm cursor-pointer flex items-center gap-2"
                        >
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: student.color }}
                          />
                          {student.displayName || student.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Behavior Selection */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  Behaviors ({selectedBehaviorIds.length})
                  {availableBehaviors.some(b => b.studentIds.length === 0) && (
                    <Badge variant="outline" className="text-xs font-normal">
                      <BookOpen className="w-3 h-3 mr-1" />
                      Bank behaviors included
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <ScrollArea className="h-40">
                  {availableBehaviors.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Select students first to see behaviors
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {availableBehaviors.map(behavior => {
                        const isFromBank = behavior.studentIds.length === 0;
                        return (
                          <div key={behavior.name} className="flex items-center gap-2">
                            <Checkbox
                              id={`behavior-${behavior.name}`}
                              checked={selectedBehaviorIds.includes(behavior.name.toLowerCase())}
                              onCheckedChange={(checked) => {
                                const key = behavior.name.toLowerCase();
                                if (checked) {
                                  setSelectedBehaviorIds(prev => [...prev, key]);
                                } else {
                                  setSelectedBehaviorIds(prev => prev.filter(id => id !== key));
                                }
                              }}
                            />
                            <label 
                              htmlFor={`behavior-${behavior.name}`}
                              className="text-sm cursor-pointer flex items-center gap-1 flex-wrap"
                            >
                              <span>{behavior.name}</span>
                              {isFromBank ? (
                                <Badge variant="secondary" className="text-xs h-5">
                                  <BookOpen className="w-3 h-3 mr-1" />
                                  {behavior.source === 'built-in' ? 'Built-in' : 'Org'}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  ({behavior.studentIds.length} student{behavior.studentIds.length !== 1 ? 's' : ''})
                                </span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
                {selectedBehaviorIds.some(name => 
                  availableBehaviors.find(b => b.name.toLowerCase() === name)?.studentIds.length === 0
                ) && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Bank behaviors will be auto-added to students when data is saved
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Date Range */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date Range ({dates.length} days)
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="date"
                      value={inputStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End</Label>
                    <Input
                      type="date"
                      value={inputEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const today = new Date();
                      setDateRangeImmediate(
                        format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                        format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
                      );
                    }}
                  >
                    This Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const lastWeek = addDays(new Date(), -7);
                      setDateRangeImmediate(
                        format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                        format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')
                      );
                    }}
                  >
                    Last Week
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Apply Defaults */}
          {canShowGrid && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApplyDefaults(!showApplyDefaults)}
              >
                Apply Defaults to All
              </Button>
              {showApplyDefaults && (
                <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-md flex-wrap">
                  <Select value={defaultStatus} onValueChange={(v) => setDefaultStatus(v as DataStatus)}>
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_data">No Data</SelectItem>
                      <SelectItem value="zero">Zero</SelectItem>
                      <SelectItem value="collected">Collected</SelectItem>
                    </SelectContent>
                  </Select>
                  {defaultStatus === 'collected' && dataType === 'frequency' && (
                    <>
                      <Input
                        type="number"
                        min={0}
                        value={defaultCount}
                        onChange={(e) => setDefaultCount(parseInt(e.target.value) || 0)}
                        className="w-16 h-8"
                        placeholder="Count"
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={defaultObservationMinutes}
                        onChange={(e) => setDefaultObservationMinutes(parseFloat(e.target.value) || 0)}
                        className="w-20 h-8"
                        placeholder="Obs (min)"
                        title="Observation duration in minutes for rate calculation"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={defaultDuration}
                        onChange={(e) => setDefaultDuration(parseInt(e.target.value) || 0)}
                        className="w-20 h-8"
                        placeholder="Dur (s)"
                        title="Behavior duration in seconds"
                      />
                    </>
                  )}
                  {defaultStatus === 'collected' && dataType === 'interval' && (
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={defaultTotalIntervals}
                      onChange={(e) => setDefaultTotalIntervals(parseInt(e.target.value) || 6)}
                      className="w-20 h-8"
                      placeholder="Intervals"
                    />
                  )}
                  <Button size="sm" onClick={applyDefaultsToAll}>
                    <Check className="w-4 h-4 mr-1" />
                    Apply
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Data Grid */}
          {canShowGrid ? (
            <ScrollArea className="flex-1 min-h-0 border rounded-md">
              <div className="min-w-max">
                {selectedStudentIds.map(studentId => {
                  const student = activeStudents.find(s => s.id === studentId);
                  if (!student) return null;

                  const studentBehaviors = student.behaviors.filter(b => 
                    !b.isArchived && 
                    !b.isMastered && 
                    selectedBehaviorIds.includes(b.name.toLowerCase())
                  );

                  if (studentBehaviors.length === 0) return null;

                  const isExpanded = expandedStudents.includes(studentId);

                  return (
                    <Collapsible 
                      key={studentId} 
                      open={isExpanded}
                      onOpenChange={() => toggleStudentExpanded(studentId)}
                    >
                      <div className="border-b">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-2 p-2 bg-secondary/30 cursor-pointer hover:bg-secondary/50">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: student.color }}
                            />
                            <span className="font-medium">
                              {student.displayName || student.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({studentBehaviors.length} behavior{studentBehaviors.length !== 1 ? 's' : ''})
                            </span>
                            <div className="ml-auto flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAllForStudent(studentId, 'zero');
                                }}
                              >
                                All Zero
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAllForStudent(studentId, 'no_data');
                                }}
                              >
                                All No Data
                              </Button>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-40 sticky left-0 bg-background">Behavior</TableHead>
                                {dates.map(date => (
                                  <TableHead 
                                    key={date.toISOString()} 
                                    className="text-center px-1 min-w-20"
                                  >
                                    <div className="text-xs">
                                      <div>{format(date, 'EEE')}</div>
                                      <div>{format(date, 'M/d')}</div>
                                    </div>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {studentBehaviors.map(behavior => (
                                <TableRow key={behavior.id}>
                                  <TableCell className="font-medium sticky left-0 bg-background">
                                    {behavior.name}
                                  </TableCell>
                                  {dates.map(date => {
                                    const cellData = getCellData(studentId, behavior.id, date);
                                    return (
                                      <TableCell 
                                        key={date.toISOString()}
                                        className="text-center p-1"
                                      >
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button
                                              className={`w-full min-h-10 rounded border flex items-center justify-center transition-colors p-1 ${
                                                cellData.status === 'no_data'
                                                  ? 'bg-secondary/30 border-transparent hover:bg-secondary/50'
                                                  : cellData.status === 'zero'
                                                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50'
                                                    : 'bg-primary/10 border-primary/30 hover:bg-primary/20'
                                              }`}
                                              title="Click to edit, right-click to cycle status"
                                            >
                                              {getStatusBadge(cellData)}
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-2" align="center">
                                            <div className="flex flex-col gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="justify-start h-7"
                                                onClick={() => {
                                                  setCellData(studentId, behavior.id, date, { status: 'no_data', count: 0 });
                                                }}
                                              >
                                                <Minus className="w-3 h-3 mr-2" />
                                                No Data
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="justify-start h-7"
                                                onClick={() => {
                                                  setCellData(studentId, behavior.id, date, { status: 'zero', count: 0 });
                                                }}
                                              >
                                                <Badge variant="secondary" className="mr-2 text-xs px-1">0</Badge>
                                                Zero
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="justify-start h-7"
                                                onClick={() => {
                                                  setEditingCell({ studentId, behaviorId: behavior.id, date });
                                                }}
                                              >
                                                <Edit2 className="w-3 h-3 mr-2" />
                                                Edit Details...
                                              </Button>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center border rounded-md bg-secondary/10">
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Select students, behaviors, and date range to start entering data
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-2 flex-wrap">
            <span className="font-medium">Legend:</span>
            <div className="flex items-center gap-1">
              <Minus className="w-4 h-4" />
              <span>No Data</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-1.5">0</Badge>
              <span>Zero</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="default" className="text-xs px-1.5">N</Badge>
              <span>{dataType === 'interval' ? 'Occurrence %' : 'Count'}</span>
            </div>
            <span className="ml-auto">Click cells to edit</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <div className="flex items-center gap-2 mr-auto">
            {selectedStudentIds.map(id => (
              <HistoricalSyncStatusBadge key={id} studentId={id} />
            ))}
          </div>
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || Object.keys(bulkData).length === 0}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving…' : 'Save All Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Cell Editor Dialog */}
      <CellEditor />
    </Dialog>
  );
}
