import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ThumbsUp, ThumbsDown, Minus, MessageSquare, Plus,
  User, Clock, Check, X, Settings2, PlusCircle, Save, Timer,
  Play, Square, FileDown, BarChart3, Edit2, Link2, Library, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { useDataStore } from '@/store/dataStore';
import { Student, ANTECEDENT_OPTIONS, CONSEQUENCE_OPTIONS } from '@/types/behavior';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface TeacherFriendlyViewProps {
  student: Student;
}

type DayRating = 'good' | 'ok' | 'hard' | null;

interface RecordedEntry {
  id: string;
  behaviorId: string;
  behaviorName: string;
  count: number;
  durationSeconds?: number;
  timestamp: Date;
  type: 'frequency' | 'duration' | 'abc';
  recordedBy: string;
  recordedByName: string;
  linkedABCId?: string; // Link to ABC entry if applicable
  antecedent?: string;
  consequence?: string;
}

interface ActiveTimer {
  behaviorId: string;
  startTime: Date;
}

export function TeacherFriendlyView({ student }: TeacherFriendlyViewProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    incrementFrequency, 
    getFrequencyCount, 
    addABCEntry,
    addBehaviorWithMethods,
    addCustomAntecedent,
    addCustomConsequence,
    addHistoricalFrequency,
    addHistoricalDuration,
    resetFrequency,
    updateBehaviorMethods,
    globalBehaviorBank,
  } = useDataStore();

  const [dayRating, setDayRating] = useState<DayRating>(null);
  const [comments, setComments] = useState('');
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [selectedAntecedent, setSelectedAntecedent] = useState<string | null>(null);
  const [selectedConsequence, setSelectedConsequence] = useState<string | null>(null);
  const [showABCQuick, setShowABCQuick] = useState(false);
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [newBehaviorSupportsDuration, setNewBehaviorSupportsDuration] = useState(false);
  
  // Behavior configuration dialog
  const [showBehaviorConfig, setShowBehaviorConfig] = useState(false);
  const [showAddAntecedent, setShowAddAntecedent] = useState(false);
  const [showAddConsequence, setShowAddConsequence] = useState(false);
  const [newAntecedent, setNewAntecedent] = useState('');
  const [newConsequence, setNewConsequence] = useState('');
  
  // Pre-selected behaviors for Quick ABC (up to 3)
  const [preselectedBehaviorIds, setPreselectedBehaviorIds] = useState<string[]>([]);
  const [showBehaviorSettings, setShowBehaviorSettings] = useState(false);
  
  // Duration entry state
  const [showDurationEntry, setShowDurationEntry] = useState(false);
  const [selectedDurationBehavior, setSelectedDurationBehavior] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  
  // Record Now tracking
  const [recordedEntries, setRecordedEntries] = useState<RecordedEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  // Live duration timer state
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [timerDisplays, setTimerDisplays] = useState<Record<string, number>>({});
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Duration confirmation dialog
  const [showDurationConfirm, setShowDurationConfirm] = useState(false);
  const [pendingDuration, setPendingDuration] = useState<{ behaviorId: string; seconds: number } | null>(null);
  const [editedMinutes, setEditedMinutes] = useState('');
  const [editedSeconds, setEditedSeconds] = useState('');
  
  // Multi-behavior selection for frequency
  const [multiBehaviorMode, setMultiBehaviorMode] = useState(false);
  const [selectedMultiBehaviors, setSelectedMultiBehaviors] = useState<string[]>([]);
  
  // Daily summary view
  const [showDailySummary, setShowDailySummary] = useState(false);
  
  // ABC Duration toggle
  const [abcIncludeDuration, setAbcIncludeDuration] = useState(false);
  const [abcDurationMinutes, setAbcDurationMinutes] = useState('');
  const [abcDurationSeconds, setAbcDurationSeconds] = useState('');
  
  // Link ABC to frequency/duration
  const [linkABCToData, setLinkABCToData] = useState(false);
  
  // Behavior bank selection
  const [showBehaviorBankDialog, setShowBehaviorBankDialog] = useState(false);
  const [selectedBankBehavior, setSelectedBankBehavior] = useState<string>('');

  const allAntecedents = [...ANTECEDENT_OPTIONS, ...(student.customAntecedents || [])];
  const allConsequences = [...CONSEQUENCE_OPTIONS, ...(student.customConsequences || [])];
  
  // Get all behaviors including from bank that student doesn't have
  const studentBehaviorNames = new Set(student.behaviors.map(b => b.name.toLowerCase()));
  const availableBankBehaviors = globalBehaviorBank.filter(
    b => !studentBehaviorNames.has(b.name.toLowerCase())
  );
  
  // Get preselected behaviors or default to first 3
  const quickABCBehaviors = preselectedBehaviorIds.length > 0 
    ? student.behaviors.filter(b => preselectedBehaviorIds.includes(b.id))
    : student.behaviors.slice(0, 3);

  // Get display name for user
  const getUserDisplayName = useCallback(() => {
    if (!user) return 'Unknown';
    return user.email?.split('@')[0] || 'Unknown';
  }, [user]);

  // Update timer displays every second
  useEffect(() => {
    if (activeTimers.length > 0) {
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const displays: Record<string, number> = {};
        activeTimers.forEach(timer => {
          displays[timer.behaviorId] = Math.floor((now - timer.startTime.getTime()) / 1000);
        });
        setTimerDisplays(displays);
      }, 100);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimerDisplays({});
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeTimers]);

  const formatTimerDisplay = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleBehaviorTap = (behaviorId: string) => {
    incrementFrequency(student.id, behaviorId);
    toast({
      title: 'Recorded',
      description: 'Behavior count increased',
    });
  };

  const toggleBehaviorSelection = (behaviorId: string) => {
    setSelectedBehaviors(prev => {
      if (prev.includes(behaviorId)) {
        return prev.filter(id => id !== behaviorId);
      }
      if (prev.length >= 3) {
        toast({
          title: 'Maximum 3 behaviors',
          description: 'You can only select up to 3 behaviors at once',
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, behaviorId];
    });
  };

  const togglePreselectedBehavior = (behaviorId: string) => {
    setPreselectedBehaviorIds(prev => {
      if (prev.includes(behaviorId)) {
        return prev.filter(id => id !== behaviorId);
      }
      if (prev.length >= 3) {
        toast({
          title: 'Maximum 3 behaviors',
          description: 'You can only preselect up to 3 behaviors',
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, behaviorId];
    });
  };
  
  // Toggle multi-behavior selection
  const toggleMultiBehavior = (behaviorId: string) => {
    setSelectedMultiBehaviors(prev => {
      if (prev.includes(behaviorId)) {
        return prev.filter(id => id !== behaviorId);
      }
      return [...prev, behaviorId];
    });
  };
  
  // Record multiple behaviors at once with frequency 1
  const handleRecordMultipleBehaviors = () => {
    if (selectedMultiBehaviors.length === 0 || !user) return;
    
    const now = new Date();
    const entries: RecordedEntry[] = [];
    
    selectedMultiBehaviors.forEach(behaviorId => {
      const behavior = student.behaviors.find(b => b.id === behaviorId);
      if (!behavior) return;
      
      const entryId = crypto.randomUUID();
      
      // Add to historical with count of 1
      addHistoricalFrequency({
        studentId: student.id,
        behaviorId,
        count: 1,
        timestamp: now,
      });
      
      entries.push({
        id: entryId,
        behaviorId,
        behaviorName: behavior.name,
        count: 1,
        timestamp: now,
        type: 'frequency',
        recordedBy: user.id,
        recordedByName: getUserDisplayName(),
      });
    });
    
    setRecordedEntries(prev => [...entries, ...prev]);
    
    toast({
      title: 'Behaviors Recorded',
      description: `${selectedMultiBehaviors.length} behavior(s) recorded at ${format(now, 'h:mm a')}`,
    });
    
    setSelectedMultiBehaviors([]);
    setMultiBehaviorMode(false);
  };

  const handleQuickABC = () => {
    if (selectedBehaviors.length === 0 || !selectedAntecedent || !selectedConsequence || !user) {
      toast({
        title: 'Missing info',
        description: 'Please select at least one behavior, antecedent, and consequence',
        variant: 'destructive',
      });
      return;
    }

    const now = new Date();
    const abcEntryId = crypto.randomUUID();
    
    // Calculate duration if included
    const durationMins = abcIncludeDuration 
      ? (parseInt(abcDurationMinutes) || 0) + (parseInt(abcDurationSeconds) || 0) / 60
      : undefined;

    // Record ABC for each selected behavior with frequency 1
    selectedBehaviors.forEach(behaviorId => {
      const behavior = student.behaviors.find(b => b.id === behaviorId);
      if (!behavior) return;

      addABCEntry({
        studentId: student.id,
        behaviorId: behaviorId,
        antecedent: selectedAntecedent,
        behavior: behavior.name,
        consequence: selectedConsequence,
        frequencyCount: 1, // Default frequency 1 for multi-select
        hasDuration: abcIncludeDuration,
        durationMinutes: durationMins,
      });
      
      // If linking ABC to data, create corresponding frequency entry
      if (linkABCToData) {
        const entryId = crypto.randomUUID();
        
        setRecordedEntries(prev => [{
          id: entryId,
          behaviorId,
          behaviorName: behavior.name,
          count: 1,
          durationSeconds: durationMins ? durationMins * 60 : undefined,
          timestamp: now,
          type: 'abc',
          recordedBy: user.id,
          recordedByName: getUserDisplayName(),
          linkedABCId: abcEntryId,
          antecedent: selectedAntecedent,
          consequence: selectedConsequence,
        }, ...prev]);
      }
    });

    toast({ 
      title: 'ABC Recorded', 
      description: `${selectedBehaviors.length} behavior(s) saved with frequency 1${linkABCToData ? ' (linked)' : ''}` 
    });
    setSelectedBehaviors([]);
    setSelectedAntecedent(null);
    setSelectedConsequence(null);
    setShowABCQuick(false);
    setAbcIncludeDuration(false);
    setAbcDurationMinutes('');
    setAbcDurationSeconds('');
  };

  const handleAddBehavior = () => {
    if (!newBehaviorName.trim()) return;
    
    const methods: ('frequency' | 'abc' | 'duration')[] = ['frequency', 'abc'];
    if (newBehaviorSupportsDuration) {
      methods.push('duration');
    }
    
    addBehaviorWithMethods(student.id, newBehaviorName.trim(), methods);
    toast({
      title: 'Behavior Added',
      description: `"${newBehaviorName}" has been added${newBehaviorSupportsDuration ? ' with duration tracking' : ''}`,
    });
    setNewBehaviorName('');
    setNewBehaviorSupportsDuration(false);
    setShowAddBehavior(false);
  };
  
  // Add behavior from bank
  const handleAddFromBank = () => {
    if (!selectedBankBehavior) return;
    
    const bankBehavior = globalBehaviorBank.find(b => b.id === selectedBankBehavior);
    if (!bankBehavior) return;
    
    addBehaviorWithMethods(
      student.id, 
      bankBehavior.name, 
      ['frequency', 'abc'], 
      { 
        operationalDefinition: bankBehavior.operationalDefinition,
        category: bankBehavior.category,
        baseBehaviorId: bankBehavior.id,
      }
    );
    
    toast({
      title: 'Behavior Added',
      description: `"${bankBehavior.name}" added from library`,
    });
    
    setSelectedBankBehavior('');
    setShowBehaviorBankDialog(false);
  };
  
  // Toggle duration tracking for a behavior directly (without settings gear)
  const handleQuickToggleDuration = (behaviorId: string) => {
    const behavior = student.behaviors.find(b => b.id === behaviorId);
    if (!behavior) return;
    
    const currentMethods = behavior.methods || ['frequency'];
    const hasDuration = currentMethods.includes('duration');
    
    let newMethods: typeof currentMethods;
    if (hasDuration) {
      newMethods = currentMethods.filter(m => m !== 'duration');
    } else {
      newMethods = [...currentMethods, 'duration'];
    }
    
    updateBehaviorMethods(student.id, behaviorId, newMethods);
    toast({
      title: hasDuration ? 'Duration Disabled' : 'Duration Enabled',
      description: `${behavior.name} ${hasDuration ? 'no longer tracks' : 'now tracks'} duration`,
    });
  };
  
  // Toggle duration tracking for a behavior via settings
  const handleToggleBehaviorDuration = (behaviorId: string) => {
    handleQuickToggleDuration(behaviorId);
  };

  const handleAddNewAntecedent = () => {
    if (!newAntecedent.trim()) return;
    addCustomAntecedent(student.id, newAntecedent.trim());
    setSelectedAntecedent(newAntecedent.trim());
    setNewAntecedent('');
    setShowAddAntecedent(false);
    toast({ title: 'Antecedent Added' });
  };

  const handleAddNewConsequence = () => {
    if (!newConsequence.trim()) return;
    addCustomConsequence(student.id, newConsequence.trim());
    setSelectedConsequence(newConsequence.trim());
    setNewConsequence('');
    setShowAddConsequence(false);
    toast({ title: 'Consequence Added' });
  };

  const handleSaveDay = async () => {
    if (!user) return;
    
    try {
      // Upsert to daily_summaries
      const { error } = await supabase
        .from('daily_summaries')
        .upsert({
          student_id: student.id,
          user_id: user.id,
          summary_date: format(new Date(), 'yyyy-MM-dd'),
          day_rating: dayRating,
          comments: comments.trim() || null,
        }, {
          onConflict: 'student_id,user_id,summary_date'
        });
      
      if (error) throw error;
      
      toast({
        title: 'Day Summary Saved',
        description: `${format(new Date(), 'MMM d')}: ${dayRating || 'No rating'} day`,
      });
      setComments('');
      setDayRating(null);
    } catch (error) {
      console.error('Error saving day summary:', error);
      toast({
        title: 'Error saving summary',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  // Record Now - save current behavior data immediately with timestamp
  const handleRecordNow = async () => {
    if (!user) return;
    
    setIsRecording(true);
    const now = new Date();
    const entries: RecordedEntry[] = [];
    
    try {
      // Record frequency data for each behavior
      for (const behavior of student.behaviors) {
        const count = getFrequencyCount(student.id, behavior.id);
        if (count > 0) {
          const entryId = crypto.randomUUID();
          
          // Add to historical frequency with timestamp
          addHistoricalFrequency({
            studentId: student.id,
            behaviorId: behavior.id,
            count,
            timestamp: now,
          });
          
          entries.push({
            id: entryId,
            behaviorId: behavior.id,
            behaviorName: behavior.name,
            count,
            timestamp: now,
            type: 'frequency',
            recordedBy: user.id,
            recordedByName: getUserDisplayName(),
          });
          
          // Reset the count after recording
          resetFrequency(student.id, behavior.id);
        }
      }
      
      setRecordedEntries(prev => [...entries, ...prev]);
      
      toast({
        title: 'Data Recorded',
        description: `${entries.length} behavior(s) saved at ${format(now, 'h:mm a')}`,
      });
    } catch (error) {
      console.error('Error recording data:', error);
      toast({
        title: 'Error recording',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsRecording(false);
    }
  };

  // Start/Stop live duration timer
  const handleToggleTimer = (behaviorId: string) => {
    const existingTimer = activeTimers.find(t => t.behaviorId === behaviorId);
    
    if (existingTimer) {
      // Stop timer - show confirmation dialog
      const elapsed = Math.floor((Date.now() - existingTimer.startTime.getTime()) / 1000);
      setPendingDuration({ behaviorId, seconds: elapsed });
      setEditedMinutes(Math.floor(elapsed / 60).toString());
      setEditedSeconds((elapsed % 60).toString());
      setShowDurationConfirm(true);
      
      // Remove from active timers
      setActiveTimers(prev => prev.filter(t => t.behaviorId !== behaviorId));
    } else {
      // Start timer
      setActiveTimers(prev => [...prev, { behaviorId, startTime: new Date() }]);
      toast({
        title: 'Timer Started',
        description: `Recording duration for ${student.behaviors.find(b => b.id === behaviorId)?.name}`,
      });
    }
  };
  
  // Confirm and save duration
  const handleConfirmDuration = () => {
    if (!pendingDuration || !user) return;
    
    const mins = parseInt(editedMinutes) || 0;
    const secs = parseInt(editedSeconds) || 0;
    const totalSeconds = mins * 60 + secs;
    
    if (totalSeconds <= 0) {
      toast({
        title: 'Duration discarded',
        description: 'Duration was 0 seconds',
      });
      setShowDurationConfirm(false);
      setPendingDuration(null);
      return;
    }
    
    const behavior = student.behaviors.find(b => b.id === pendingDuration.behaviorId);
    const now = new Date();
    const entryId = crypto.randomUUID();
    
    addHistoricalDuration({
      studentId: student.id,
      behaviorId: pendingDuration.behaviorId,
      durationSeconds: totalSeconds,
      timestamp: now,
    });
    
    setRecordedEntries(prev => [{
      id: entryId,
      behaviorId: pendingDuration.behaviorId,
      behaviorName: behavior?.name || 'Unknown',
      count: 0,
      durationSeconds: totalSeconds,
      timestamp: now,
      type: 'duration',
      recordedBy: user.id,
      recordedByName: getUserDisplayName(),
    }, ...prev]);
    
    toast({
      title: 'Duration Recorded',
      description: `${behavior?.name}: ${formatTimerDisplay(totalSeconds)} at ${format(now, 'h:mm a')}`,
    });
    
    setShowDurationConfirm(false);
    setPendingDuration(null);
    setEditedMinutes('');
    setEditedSeconds('');
  };

  // Handle duration entry (manual)
  const handleOpenDurationEntry = (behaviorId: string) => {
    setSelectedDurationBehavior(behaviorId);
    setDurationMinutes('');
    setDurationSeconds('');
    setShowDurationEntry(true);
  };

  const handleSaveDuration = () => {
    if (!selectedDurationBehavior || !user) return;
    
    const mins = parseInt(durationMinutes) || 0;
    const secs = parseInt(durationSeconds) || 0;
    const totalSeconds = mins * 60 + secs;
    
    if (totalSeconds <= 0) {
      toast({
        title: 'Invalid duration',
        description: 'Please enter a duration greater than 0',
        variant: 'destructive',
      });
      return;
    }
    
    const behavior = student.behaviors.find(b => b.id === selectedDurationBehavior);
    const now = new Date();
    const entryId = crypto.randomUUID();
    
    // Add historical duration
    addHistoricalDuration({
      studentId: student.id,
      behaviorId: selectedDurationBehavior,
      durationSeconds: totalSeconds,
      timestamp: now,
    });
    
    setRecordedEntries(prev => [{
      id: entryId,
      behaviorId: selectedDurationBehavior,
      behaviorName: behavior?.name || 'Unknown',
      count: 0,
      durationSeconds: totalSeconds,
      timestamp: now,
      type: 'duration',
      recordedBy: user.id,
      recordedByName: getUserDisplayName(),
    }, ...prev]);
    
    toast({
      title: 'Duration Recorded',
      description: `${behavior?.name}: ${mins}m ${secs}s at ${format(now, 'h:mm a')}`,
    });
    
    setShowDurationEntry(false);
    setSelectedDurationBehavior(null);
    setDurationMinutes('');
    setDurationSeconds('');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getDayRatingColor = (rating: DayRating) => {
    switch (rating) {
      case 'good': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'ok': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'hard': return 'bg-red-500 hover:bg-red-600 text-white';
      default: return '';
    }
  };
  
  // Get today's recorded data summary with cumulative totals
  const getTodaySummary = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEntries = recordedEntries.filter(
      e => format(e.timestamp, 'yyyy-MM-dd') === today
    );
    
    // Group by behavior with cumulative totals
    const behaviorSummary: Record<string, { 
      frequency: number; 
      duration: number; 
      entries: RecordedEntry[];
      abcCount: number;
    }> = {};
    
    // Track linked ABC IDs to avoid double counting
    const linkedABCIds = new Set<string>();
    
    todayEntries.forEach(entry => {
      if (!behaviorSummary[entry.behaviorId]) {
        behaviorSummary[entry.behaviorId] = { frequency: 0, duration: 0, entries: [], abcCount: 0 };
      }
      
      // If this entry is linked to an ABC, track it
      if (entry.linkedABCId) {
        linkedABCIds.add(entry.linkedABCId);
      }
      
      if (entry.type === 'frequency') {
        behaviorSummary[entry.behaviorId].frequency += entry.count;
      } else if (entry.type === 'duration' && entry.durationSeconds) {
        behaviorSummary[entry.behaviorId].duration += entry.durationSeconds;
      } else if (entry.type === 'abc') {
        behaviorSummary[entry.behaviorId].abcCount += entry.count;
        if (entry.durationSeconds) {
          behaviorSummary[entry.behaviorId].duration += entry.durationSeconds;
        }
      }
      behaviorSummary[entry.behaviorId].entries.push(entry);
    });
    
    // Calculate grand totals
    const totals = {
      totalFrequency: Object.values(behaviorSummary).reduce((sum, d) => sum + d.frequency + d.abcCount, 0),
      totalDuration: Object.values(behaviorSummary).reduce((sum, d) => sum + d.duration, 0),
      totalEntries: todayEntries.length,
    };
    
    return { behaviorSummary, todayEntries, totals };
  };
  
  // Export daily summary as CSV
  const handleExportSummary = () => {
    const { todayEntries, behaviorSummary, totals } = getTodaySummary();
    
    if (todayEntries.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Record some data first',
        variant: 'destructive',
      });
      return;
    }
    
    // Summary section
    const summaryRows = [
      `Daily Summary for ${student.name} - ${format(new Date(), 'MMMM d, yyyy')}`,
      '',
      'BEHAVIOR TOTALS',
      'Behavior,Total Frequency,Total Duration,ABC Entries',
    ];
    
    Object.entries(behaviorSummary).forEach(([behaviorId, data]) => {
      const behavior = student.behaviors.find(b => b.id === behaviorId);
      summaryRows.push([
        behavior?.name || 'Unknown',
        (data.frequency + data.abcCount).toString(),
        data.duration > 0 ? formatDuration(data.duration) : '-',
        data.abcCount.toString(),
      ].join(','));
    });
    
    summaryRows.push('');
    summaryRows.push(`GRAND TOTALS: ${totals.totalFrequency} occurrences, ${formatDuration(totals.totalDuration)} total duration`);
    summaryRows.push('');
    
    // Detailed entries
    const headers = ['Time', 'Behavior', 'Type', 'Value', 'Recorded By', 'Linked ABC'];
    const rows = todayEntries.map(entry => [
      format(entry.timestamp, 'h:mm a'),
      entry.behaviorName,
      entry.type,
      entry.type === 'frequency' || entry.type === 'abc' ? entry.count.toString() : formatDuration(entry.durationSeconds || 0),
      entry.recordedByName,
      entry.linkedABCId ? 'Yes' : '',
    ]);
    
    const csvContent = [
      ...summaryRows,
      'DETAILED ENTRIES',
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.name}_${format(new Date(), 'yyyy-MM-dd')}_summary.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported',
      description: 'Daily summary downloaded',
    });
  };

  const { behaviorSummary, todayEntries, totals } = getTodaySummary();

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Student Header */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${student.color}20` }}
            >
              <User className="w-6 h-6" style={{ color: student.color }} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{student.name}</h2>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDailySummary(true)}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Day Rating - Large Touch Targets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">How was today?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={dayRating === 'good' ? 'default' : 'outline'}
              className={`h-20 flex-col gap-1 ${dayRating === 'good' ? getDayRatingColor('good') : ''}`}
              onClick={() => setDayRating('good')}
            >
              <ThumbsUp className="w-8 h-8" />
              <span className="text-xs">Good Day</span>
            </Button>
            <Button
              variant={dayRating === 'ok' ? 'default' : 'outline'}
              className={`h-20 flex-col gap-1 ${dayRating === 'ok' ? getDayRatingColor('ok') : ''}`}
              onClick={() => setDayRating('ok')}
            >
              <Minus className="w-8 h-8" />
              <span className="text-xs">OK Day</span>
            </Button>
            <Button
              variant={dayRating === 'hard' ? 'default' : 'outline'}
              className={`h-20 flex-col gap-1 ${dayRating === 'hard' ? getDayRatingColor('hard') : ''}`}
              onClick={() => setDayRating('hard')}
            >
              <ThumbsDown className="w-8 h-8" />
              <span className="text-xs">Hard Day</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Frequency Taps - Big Buttons */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Quick Behavior Counts</CardTitle>
            <div className="flex gap-1">
              <Button
                variant={multiBehaviorMode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setMultiBehaviorMode(!multiBehaviorMode);
                  setSelectedMultiBehaviors([]);
                }}
                title="Select multiple behaviors"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBehaviorConfig(true)}
                title="Configure duration tracking"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" title="Add behavior">
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowAddBehavior(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Behavior
                  </DropdownMenuItem>
                  {availableBankBehaviors.length > 0 && (
                    <DropdownMenuItem onClick={() => setShowBehaviorBankDialog(true)}>
                      <Library className="w-4 h-4 mr-2" />
                      From Library ({availableBankBehaviors.length})
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {multiBehaviorMode && (
            <p className="text-xs text-muted-foreground mt-1">
              Select multiple behaviors to record with frequency 1
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {student.behaviors.slice(0, 6).map((behavior) => {
              const count = getFrequencyCount(student.id, behavior.id);
              const supportsDuration = behavior.methods?.includes('duration');
              const isSelected = selectedMultiBehaviors.includes(behavior.id);
              const isTimerActive = activeTimers.some(t => t.behaviorId === behavior.id);
              const timerSeconds = timerDisplays[behavior.id] || 0;
              
              return (
                <div key={behavior.id} className="relative">
                  {multiBehaviorMode ? (
                    <Button
                      variant={isSelected ? 'default' : 'outline'}
                      className="w-full h-16 flex-col gap-1"
                      onClick={() => toggleMultiBehavior(behavior.id)}
                    >
                      <span className="text-sm font-medium truncate max-w-full">{behavior.name}</span>
                      {isSelected && <Check className="w-4 h-4" />}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-16 flex-col gap-1"
                      onClick={() => handleBehaviorTap(behavior.id)}
                    >
                      <span className="text-sm font-medium truncate max-w-full">{behavior.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    </Button>
                  )}
                  {!multiBehaviorMode && (
                    <div className="absolute -top-1 -right-1 flex gap-0.5">
                      {/* Quick duration toggle */}
                      <Button
                        variant={supportsDuration ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-5 w-5 p-0 rounded-full ${
                          supportsDuration 
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                        title={supportsDuration ? 'Disable duration' : 'Enable duration'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickToggleDuration(behavior.id);
                        }}
                      >
                        <Timer className="w-2.5 h-2.5" />
                      </Button>
                      {supportsDuration && (
                        <Button
                          variant={isTimerActive ? 'default' : 'ghost'}
                          size="sm"
                          className={`h-5 w-5 p-0 rounded-full ${
                            isTimerActive 
                              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTimer(behavior.id);
                          }}
                          title={isTimerActive ? `Stop timer (${formatTimerDisplay(timerSeconds)})` : 'Start timer'}
                        >
                          {isTimerActive ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {multiBehaviorMode && selectedMultiBehaviors.length > 0 && (
            <Button 
              className="w-full" 
              onClick={handleRecordMultipleBehaviors}
            >
              <Check className="w-4 h-4 mr-1" />
              Record {selectedMultiBehaviors.length} Behavior(s) with Frequency 1
            </Button>
          )}
          
          {/* Active Timers Display */}
          {activeTimers.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium mb-2 flex items-center gap-1">
                <Timer className="w-3 h-3 text-destructive" />
                Active Timers
              </p>
              <div className="space-y-1">
                {activeTimers.map(timer => {
                  const behavior = student.behaviors.find(b => b.id === timer.behaviorId);
                  const seconds = timerDisplays[timer.behaviorId] || 0;
                  return (
                    <div 
                      key={timer.behaviorId} 
                      className="flex items-center justify-between bg-destructive/10 rounded px-3 py-2"
                    >
                      <span className="text-sm font-medium">{behavior?.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold text-destructive">
                          {formatTimerDisplay(seconds)}</span>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2"
                          onClick={() => handleToggleTimer(timer.behaviorId)}
                        >
                          <Square className="w-3 h-3 mr-1" />
                          Stop
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Duration Entry Section */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              Manual Duration Entry
            </p>
            <div className="flex flex-wrap gap-1">
              {student.behaviors.slice(0, 6).map((behavior) => (
                <Badge
                  key={behavior.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleOpenDurationEntry(behavior.id)}
                >
                  {behavior.name}
                </Badge>
              ))}
            </div>
          </div>
          
          {student.behaviors.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                No behaviors configured
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddBehavior(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Behavior
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick ABC Entry */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Quick ABC</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBehaviorSettings(true)}
                title="Configure preselected behaviors"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowABCQuick(!showABCQuick)}
              >
                {showABCQuick ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        {showABCQuick && (
          <CardContent className="space-y-3">
            {/* Behavior Selection - Multi-select up to 3 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">
                  Behavior(s) <span className="text-muted-foreground">(select up to 3, frequency = 1)</span>
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowAddBehavior(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Behavior
                    </DropdownMenuItem>
                    {availableBankBehaviors.length > 0 && (
                      <DropdownMenuItem onClick={() => setShowBehaviorBankDialog(true)}>
                        <Library className="w-4 h-4 mr-2" />
                        From Library
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-1">
                {/* Show all student behaviors, not just quick ABC ones */}
                {student.behaviors.map((b) => (
                  <Badge
                    key={b.id}
                    variant={selectedBehaviors.includes(b.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleBehaviorSelection(b.id)}
                  >
                    {b.name}
                    {selectedBehaviors.includes(b.id) && <Check className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
              {selectedBehaviors.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedBehaviors.length} selected (each with frequency 1)
                </p>
              )}
            </div>

            {/* Antecedent Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">What happened before?</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAddAntecedent(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {allAntecedents.map((a, idx) => (
                  <Badge
                    key={`${a}-${idx}`}
                    variant={selectedAntecedent === a ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedAntecedent(a)}
                  >
                    {a}
                    {(student.customAntecedents || []).includes(a) && ' ★'}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Consequence Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">What happened after?</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAddConsequence(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {allConsequences.map((c, idx) => (
                  <Badge
                    key={`${c}-${idx}`}
                    variant={selectedConsequence === c ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedConsequence(c)}
                  >
                    {c}
                    {(student.customConsequences || []).includes(c) && ' ★'}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Duration toggle for ABC */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="abc-duration"
                    checked={abcIncludeDuration}
                    onCheckedChange={setAbcIncludeDuration}
                  />
                  <Label htmlFor="abc-duration" className="text-xs cursor-pointer flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    Include Duration
                  </Label>
                </div>
              </div>
              {abcIncludeDuration && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      value={abcDurationMinutes}
                      onChange={(e) => setAbcDurationMinutes(e.target.value)}
                      placeholder="0"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Seconds</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={abcDurationSeconds}
                      onChange={(e) => setAbcDurationSeconds(e.target.value)}
                      placeholder="0"
                      className="h-8"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Link ABC to frequency/duration data */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Switch
                id="link-abc"
                checked={linkABCToData}
                onCheckedChange={setLinkABCToData}
              />
              <Label htmlFor="link-abc" className="text-xs cursor-pointer flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                Link to frequency/duration data (prevents double counting)
              </Label>
            </div>

            <Button 
              onClick={handleQuickABC}
              disabled={selectedBehaviors.length === 0 || !selectedAntecedent || !selectedConsequence}
              className="w-full"
            >
              <Check className="w-4 h-4 mr-1" />
              Record ABC
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any notes about today..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="text-base"
          />
        </CardContent>
      </Card>

      {/* Recently Recorded Entries */}
      {recordedEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recently Recorded
              </div>
              <Button variant="ghost" size="sm" onClick={handleExportSummary}>
                <FileDown className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {recordedEntries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-medium truncate">{entry.behaviorName}</span>
                    {entry.linkedABCId && (
                      <span title="Linked to ABC">
                        <Link2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                    {entry.type === 'duration' ? (
                      <Badge variant="outline" className="text-xs">
                        <Timer className="w-3 h-3 mr-1" />
                        {formatDuration(entry.durationSeconds || 0)}
                      </Badge>
                    ) : entry.type === 'abc' ? (
                      <Badge variant="outline" className="text-xs">ABC ×{entry.count}</Badge>
                    ) : (
                      <span>×{entry.count}</span>
                    )}
                    <span className="text-xs">{format(entry.timestamp, 'h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
            {recordedEntries.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2 text-xs"
                onClick={() => setShowDailySummary(true)}
              >
                View all {recordedEntries.length} entries
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline"
          className="h-14 text-base" 
          onClick={handleRecordNow}
          disabled={isRecording || student.behaviors.every(b => getFrequencyCount(student.id, b.id) === 0)}
        >
          <Save className="w-5 h-5 mr-2" />
          Record Now
        </Button>
        <Button 
          className="h-14 text-base" 
          onClick={handleSaveDay}
          disabled={!dayRating && !comments.trim()}
        >
          <Check className="w-5 h-5 mr-2" />
          Save Day
        </Button>
      </div>

      {/* Daily Summary Dialog */}
      <Dialog open={showDailySummary} onOpenChange={setShowDailySummary}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Today's Summary
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </div>
            
            {/* Grand Totals */}
            {Object.keys(behaviorSummary).length > 0 && (
              <div className="bg-primary/10 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Day Totals</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{totals.totalFrequency}</div>
                    <div className="text-xs text-muted-foreground">Occurrences</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{formatDuration(totals.totalDuration)}</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{totals.totalEntries}</div>
                    <div className="text-xs text-muted-foreground">Entries</div>
                  </div>
                </div>
              </div>
            )}
            
            {Object.keys(behaviorSummary).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No data recorded today</p>
                <p className="text-xs mt-1">Start recording behaviors to see your summary</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Per Behavior</h4>
                {Object.entries(behaviorSummary).map(([behaviorId, data]) => {
                  const behavior = student.behaviors.find(b => b.id === behaviorId);
                  const totalCount = data.frequency + data.abcCount;
                  return (
                    <div key={behaviorId} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{behavior?.name || 'Unknown'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-muted rounded p-2 text-center">
                          <div className="text-xs text-muted-foreground">Frequency</div>
                          <div className="text-lg font-bold">{totalCount}</div>
                        </div>
                        <div className="bg-muted rounded p-2 text-center">
                          <div className="text-xs text-muted-foreground">Duration</div>
                          <div className="text-lg font-bold">{data.duration > 0 ? formatDuration(data.duration) : '-'}</div>
                        </div>
                        <div className="bg-muted rounded p-2 text-center">
                          <div className="text-xs text-muted-foreground">ABC</div>
                          <div className="text-lg font-bold">{data.abcCount}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {data.entries.length} recording{data.entries.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* All entries timeline */}
            {todayEntries.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Timeline</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {todayEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{entry.behaviorName}</span>
                          {entry.linkedABCId && (
                            <Link2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {entry.type === 'duration' ? (
                            <span>{formatDuration(entry.durationSeconds || 0)}</span>
                          ) : entry.type === 'abc' ? (
                            <span>ABC ×{entry.count}</span>
                          ) : (
                            <span>×{entry.count}</span>
                          )}
                          <span className="text-muted-foreground">{format(entry.timestamp, 'h:mm a')}</span>
                          <span className="text-muted-foreground text-[10px]">by {entry.recordedByName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleExportSummary} disabled={todayEntries.length === 0}>
              <FileDown className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
            <Button onClick={() => setShowDailySummary(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Behavior Dialog */}
      <Dialog open={showAddBehavior} onOpenChange={setShowAddBehavior}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add New Behavior</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Behavior Name</Label>
              <Input
                value={newBehaviorName}
                onChange={(e) => setNewBehaviorName(e.target.value)}
                placeholder="Enter behavior name..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddBehavior()}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="duration-tracking"
                checked={newBehaviorSupportsDuration}
                onCheckedChange={(checked) => setNewBehaviorSupportsDuration(checked === true)}
              />
              <Label 
                htmlFor="duration-tracking" 
                className="text-sm cursor-pointer flex items-center gap-1"
              >
                <Timer className="w-3 h-3" />
                Enable duration tracking
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddBehavior(false);
              setNewBehaviorSupportsDuration(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddBehavior} disabled={!newBehaviorName.trim()}>
              Add Behavior
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Behavior Bank Dialog */}
      <Dialog open={showBehaviorBankDialog} onOpenChange={setShowBehaviorBankDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="w-4 h-4" />
              Add from Behavior Library
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedBankBehavior} onValueChange={setSelectedBankBehavior}>
              <SelectTrigger>
                <SelectValue placeholder="Select a behavior..." />
              </SelectTrigger>
              <SelectContent>
                {availableBankBehaviors.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex flex-col">
                      <span>{b.name}</span>
                      {b.category && (
                        <span className="text-xs text-muted-foreground">{b.category}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBankBehavior && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                {globalBehaviorBank.find(b => b.id === selectedBankBehavior)?.operationalDefinition || 'No definition available'}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBehaviorBankDialog(false);
              setSelectedBankBehavior('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddFromBank} disabled={!selectedBankBehavior}>
              Add Behavior
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Behavior Configuration Dialog */}
      <Dialog open={showBehaviorConfig} onOpenChange={setShowBehaviorConfig}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Configure Behaviors
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enable or disable duration tracking for each behavior. Behaviors with duration enabled will show timer buttons.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {student.behaviors.map((b) => {
                const hasDuration = b.methods?.includes('duration');
                return (
                  <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium truncate flex-1">{b.name}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={hasDuration ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleToggleBehaviorDuration(b.id)}
                      >
                        <Timer className="w-3 h-3 mr-1" />
                        {hasDuration ? 'On' : 'Off'}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {student.behaviors.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No behaviors configured yet
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBehaviorConfig(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Antecedent Dialog */}
      <Dialog open={showAddAntecedent} onOpenChange={setShowAddAntecedent}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add Custom Antecedent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Antecedent</Label>
              <Input
                value={newAntecedent}
                onChange={(e) => setNewAntecedent(e.target.value)}
                placeholder="What happened before..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewAntecedent()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAntecedent(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewAntecedent} disabled={!newAntecedent.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Consequence Dialog */}
      <Dialog open={showAddConsequence} onOpenChange={setShowAddConsequence}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add Custom Consequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Consequence</Label>
              <Input
                value={newConsequence}
                onChange={(e) => setNewConsequence(e.target.value)}
                placeholder="What happened after..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewConsequence()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddConsequence(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewConsequence} disabled={!newConsequence.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Behavior Settings Dialog */}
      <Dialog open={showBehaviorSettings} onOpenChange={setShowBehaviorSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Quick ABC Behaviors</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select up to 3 behaviors to show in Quick ABC. If none selected, first 3 behaviors will be shown.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {student.behaviors.map((b) => (
                <div key={b.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`preset-${b.id}`}
                    checked={preselectedBehaviorIds.includes(b.id)}
                    onCheckedChange={() => togglePreselectedBehavior(b.id)}
                    disabled={!preselectedBehaviorIds.includes(b.id) && preselectedBehaviorIds.length >= 3}
                  />
                  <Label 
                    htmlFor={`preset-${b.id}`} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {b.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreselectedBehaviorIds([])}>
              Reset
            </Button>
            <Button onClick={() => setShowBehaviorSettings(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duration Entry Dialog (Manual) */}
      <Dialog open={showDurationEntry} onOpenChange={setShowDurationEntry}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Record Duration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedDurationBehavior && 
                student.behaviors.find(b => b.id === selectedDurationBehavior)?.name
              }
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  max="999"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="0"
                  className="text-center text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Seconds</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  placeholder="0"
                  className="text-center text-lg"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Recorded at {format(new Date(), 'h:mm a')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDurationEntry(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDuration}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duration Confirmation Dialog (After Timer Stop) */}
      <Dialog open={showDurationConfirm} onOpenChange={setShowDurationConfirm}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Confirm Duration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {pendingDuration && 
                student.behaviors.find(b => b.id === pendingDuration.behaviorId)?.name
              }
            </p>
            <div className="text-center text-2xl font-bold text-primary">
              {pendingDuration && formatTimerDisplay(pendingDuration.seconds)}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Edit the duration below if needed
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  max="999"
                  value={editedMinutes}
                  onChange={(e) => setEditedMinutes(e.target.value)}
                  placeholder="0"
                  className="text-center text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Seconds</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={editedSeconds}
                  onChange={(e) => setEditedSeconds(e.target.value)}
                  placeholder="0"
                  className="text-center text-lg"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDurationConfirm(false);
              setPendingDuration(null);
            }}>
              Discard
            </Button>
            <Button onClick={handleConfirmDuration}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
