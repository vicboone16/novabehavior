import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Plus, Play, Pause, Square, Clock, Hash, Check, Timer, Zap,
  ChevronDown, ChevronUp, AlertTriangle, X, Trash2, Target, 
  FileText, MessageSquare, History, RefreshCw
} from 'lucide-react';
import { useStudentTargets } from '@/hooks/useCurriculum';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { useDataStore } from '@/store/dataStore';
import { ABCTracker } from '@/components/ABCTracker';
import { FrequencyTracker } from '@/components/FrequencyTracker';
import { DurationTracker } from '@/components/DurationTracker';
import { StudentSessionTimer } from '@/components/StudentSessionTimer';
import { ColdProbeTracker, ColdProbeSession } from '@/components/ColdProbeTracker';
import { StructuredObservationForm, StructuredObservationData } from '@/components/StructuredObservationForm';
import { ObservationNotesPanel, ObservationNotes } from '@/components/ObservationNotesPanel';
import { HistoricalObservationEntry } from '@/components/assessment/HistoricalObservationEntry';
import { AddTargetFromProbe } from '@/components/assessment/AddTargetFromProbe';
import { 
  Student, 
  Behavior, 
  DataCollectionMethod, 
  ANTECEDENT_OPTIONS, 
  CONSEQUENCE_OPTIONS 
} from '@/types/behavior';
import { toast } from 'sonner';

interface AssessmentDataCollectionProps {
  student: Student;
  onObservationChange?: (isActive: boolean, durationMinutes: number) => void;
}

type RecordingMode = 'abc' | 'interval' | 'frequency' | 'duration' | 'latency' | 'cold_probe' | 'structured' | 'notes';

interface IntervalConfig {
  intervalLength: number; // seconds
  totalIntervals: number;
}

export function AssessmentDataCollection({ student, onObservationChange }: AssessmentDataCollectionProps) {
  const {
    addBehaviorWithMethods,
    removeBehavior,
    incrementFrequency,
    addHistoricalFrequency,
    addCustomAntecedent,
    addCustomConsequence,
    recordInterval,
    getIntervalData,
    addLatencyEntry,
    updateStudentProfile,
    // Live session engine
    sessionStartTime,
    startSession,
    selectedStudentIds,
    toggleStudentSelection,
    resetStudentSessionStatus,
    isStudentSessionEnded,
    resetSessionData,
    resetSession,
  } = useDataStore();

  // Fetch skill targets from Supabase instead of local student.skillTargets
  const { targets: supabaseSkillTargets, loading: targetsLoading, refetch: refetchTargets } = useStudentTargets(student.id);
  const [activeMode, setActiveMode] = useState<RecordingMode>('abc');
  const [expandedBehaviors, setExpandedBehaviors] = useState<Set<string>>(new Set());
  
  // Novel behavior state
  const [showNovelDialog, setShowNovelDialog] = useState(false);
  const [novelBehaviorName, setNovelBehaviorName] = useState('');
  const [novelRecordingMode, setNovelRecordingMode] = useState<'abc' | 'frequency' | 'duration' | 'latency'>('abc');
  const [novelCount, setNovelCount] = useState(0);
  const [novelObservationMinutes, setNovelObservationMinutes] = useState<number>(0);
  const [novelTimerRunning, setNovelTimerRunning] = useState(false);
  const [novelElapsed, setNovelElapsed] = useState(0);
  const novelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const novelStartRef = useRef<Date | null>(null);

  // Manual duration/latency entry state
  const [manualDurationMinutes, setManualDurationMinutes] = useState<number>(0);
  const [manualDurationSeconds, setManualDurationSeconds] = useState<number>(0);
  const [manualDurationBehaviorId, setManualDurationBehaviorId] = useState('');
  const [manualLatencySeconds, setManualLatencySeconds] = useState<number>(0);
  const [manualLatencyBehaviorId, setManualLatencyBehaviorId] = useState('');
  const [showManualDuration, setShowManualDuration] = useState(false);
  const [showManualLatency, setShowManualLatency] = useState(false);

  // Interval recording state
  const [intervalConfig, setIntervalConfig] = useState<IntervalConfig>({
    intervalLength: 10,
    totalIntervals: 6,
  });
  const [selectedIntervalBehavior, setSelectedIntervalBehavior] = useState<string>('');
  const [currentInterval, setCurrentInterval] = useState(0);
  const [intervalTimerRunning, setIntervalTimerRunning] = useState(false);
  const [intervalTimeRemaining, setIntervalTimeRemaining] = useState(0);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Observation session state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showHistoricalEntry, setShowHistoricalEntry] = useState(false);
  const [showAddTarget, setShowAddTarget] = useState(false);

  // Custom A/C input state
  const [newAntecedent, setNewAntecedent] = useState('');
  const [newConsequence, setNewConsequence] = useState('');
  const [showAddAntecedent, setShowAddAntecedent] = useState(false);
  const [showAddConsequence, setShowAddConsequence] = useState(false);

  // Calculate rate for novel behaviors
  const calculatedRate = useMemo(() => {
    if (novelObservationMinutes > 0 && novelCount > 0) {
      const hours = novelObservationMinutes / 60;
      return (novelCount / hours).toFixed(2);
    }
    return null;
  }, [novelCount, novelObservationMinutes]);

  // Novel behavior timer effect
  useEffect(() => {
    if (novelTimerRunning) {
      novelTimerRef.current = setInterval(() => {
        if (novelStartRef.current) {
          setNovelElapsed(Math.floor((Date.now() - novelStartRef.current.getTime()) / 1000));
        }
      }, 100);
    }
    return () => {
      if (novelTimerRef.current) clearInterval(novelTimerRef.current);
    };
  }, [novelTimerRunning]);

  // Interval timer effect
  useEffect(() => {
    if (intervalTimerRunning && intervalTimeRemaining > 0) {
      intervalTimerRef.current = setInterval(() => {
        setIntervalTimeRemaining(prev => {
          if (prev <= 1) {
            // Interval complete - play sound
            playIntervalAlert();
            return intervalConfig.intervalLength;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    };
  }, [intervalTimerRunning, intervalTimeRemaining, intervalConfig.intervalLength]);

  const isStudentSelected = selectedStudentIds.includes(student.id);
  const studentEnded = isStudentSessionEnded(student.id);
  const isLiveObservationActive = !!sessionStartTime && isStudentSelected && !studentEnded;
  const canDeleteThisObservation = !!sessionStartTime && isStudentSelected && selectedStudentIds.length === 1;

  // Notify parent of observation state changes (kept for backwards compatibility)
  useEffect(() => {
    if (!onObservationChange) return;
    const startDate = sessionStartTime instanceof Date ? sessionStartTime : new Date(sessionStartTime);
    const startMs = startDate.getTime();
    const durationMinutes = !isNaN(startMs)
      ? (Date.now() - startMs) / 60000
      : 0;
    onObservationChange(isLiveObservationActive, durationMinutes);
  }, [isLiveObservationActive, onObservationChange, sessionStartTime]);

  const playIntervalAlert = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartNovelTimer = () => {
    novelStartRef.current = new Date();
    setNovelTimerRunning(true);
    setNovelElapsed(0);
  };

  const handleStopNovelTimer = () => {
    setNovelTimerRunning(false);
    if (novelTimerRef.current) clearInterval(novelTimerRef.current);
  };

  const handleSaveNovelBehavior = () => {
    if (!novelBehaviorName.trim()) return;

    // Add behavior to student with appropriate methods
    const methods: DataCollectionMethod[] = [];
    if (novelRecordingMode === 'abc') {
      methods.push('abc', 'frequency');
    } else {
      methods.push(novelRecordingMode);
      if (novelRecordingMode === 'frequency') methods.push('abc');
    }
    addBehaviorWithMethods(student.id, novelBehaviorName.trim(), methods);

    // Get the newly created behavior ID
    const savedName = novelBehaviorName.trim();
    setTimeout(() => {
      const updatedStudent = useDataStore.getState().students.find(s => s.id === student.id);
      const newBehavior = updatedStudent?.behaviors.find(b => b.name === savedName);
      
      if (newBehavior && novelRecordingMode === 'frequency' && novelCount > 0) {
        // Add historical frequency with rate
        addHistoricalFrequency({
          studentId: student.id,
          behaviorId: newBehavior.id,
          count: novelCount,
          timestamp: new Date(),
          observationDurationMinutes: novelObservationMinutes || undefined,
        });
      }
      
      toast.success(`Behavior "${savedName}" added`, {
        action: newBehavior ? {
          label: 'Undo',
          onClick: () => {
            removeBehavior(student.id, newBehavior.id);
            toast.info(`"${savedName}" removed from ${student.name}`);
          },
        } : undefined,
      });
    }, 100);

    // Reset
    setNovelBehaviorName('');
    setNovelCount(0);
    setNovelObservationMinutes(0);
    setNovelElapsed(0);
    setShowNovelDialog(false);
  };

  const handleAddCustomAntecedent = () => {
    if (newAntecedent.trim()) {
      addCustomAntecedent(student.id, newAntecedent.trim());
      setNewAntecedent('');
      setShowAddAntecedent(false);
      toast.success('Custom antecedent added');
    }
  };

  const handleAddCustomConsequence = () => {
    if (newConsequence.trim()) {
      addCustomConsequence(student.id, newConsequence.trim());
      setNewConsequence('');
      setShowAddConsequence(false);
      toast.success('Custom consequence added');
    }
  };

  const handleStartIntervalRecording = () => {
    if (!selectedIntervalBehavior) {
      toast.error('Please select a behavior first');
      return;
    }
    setCurrentInterval(1);
    setIntervalTimeRemaining(intervalConfig.intervalLength);
    setIntervalTimerRunning(true);
    toast.success('Interval recording started');
  };

  const handleRecordIntervalOccurrence = (occurred: boolean) => {
    if (selectedIntervalBehavior && currentInterval > 0) {
      recordInterval(student.id, selectedIntervalBehavior, currentInterval, occurred);
      
      if (currentInterval >= intervalConfig.totalIntervals) {
        // Recording complete
        setIntervalTimerRunning(false);
        toast.success('Interval recording complete!');
        setCurrentInterval(0);
      } else {
        setCurrentInterval(prev => prev + 1);
      }
    }
  };

  const handleStartObservation = () => {
    // Start global session clock if needed
    if (!sessionStartTime) {
      startSession();
    }
    // Ensure this student is part of the active session
    if (!isStudentSelected) {
      toggleStudentSelection(student.id);
    }
    // If this student had previously ended, re-open them
    resetStudentSessionStatus(student.id);
    toast.success('Observation started');
  };

  const handleDeleteObservation = () => {
    // Safety: only allow single-student delete here (multi-student sessions should be managed via End/Reset flows)
    if (!canDeleteThisObservation) {
      toast.error('To delete, end or reset the session from the main session controls.');
      return;
    }

    // Remove unsaved/live entries from the current session (moved to trash when applicable)
    resetSessionData();
    // Clear the session clock
    resetSession();
    // Clear per-student status and selection
    resetStudentSessionStatus(student.id);
    if (selectedStudentIds.includes(student.id)) {
      toggleStudentSelection(student.id);
    }
    toast.success('Observation deleted');
  };

  const toggleBehaviorExpand = (behaviorId: string) => {
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

  return (
    <div className="space-y-4">
      {/* Observation Session Header */}
      {isLiveObservationActive ? (
        <div className="space-y-2">
          <StudentSessionTimer
            studentId={student.id}
            studentName={student.displayName || student.name}
            studentColor={student.color}
          />

          {canDeleteThisObservation && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteConfirmation(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete Observation
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Timer className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {sessionStartTime ? 'Join Active Observation' : 'Start Observation'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {sessionStartTime
                      ? 'Add this student to the current live session'
                      : 'Start a live observation session or enter historical data'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowHistoricalEntry(true)}>
                  <History className="w-4 h-4 mr-2" />
                  Historical
                </Button>
                <Button onClick={handleStartObservation}>
                  <Play className="w-4 h-4 mr-2" />
                  {sessionStartTime ? 'Join' : 'Start Live'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode Tabs */}
      <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as RecordingMode)}>
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="abc" className="text-xs">ABC</TabsTrigger>
          <TabsTrigger value="interval" className="text-xs">Interval</TabsTrigger>
          <TabsTrigger value="frequency" className="text-xs">Freq</TabsTrigger>
          <TabsTrigger value="duration" className="text-xs">Dur</TabsTrigger>
          <TabsTrigger value="latency" className="text-xs">Lat</TabsTrigger>
          <TabsTrigger value="cold_probe" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            Probe
          </TabsTrigger>
          <TabsTrigger value="structured" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Form
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">
            <MessageSquare className="w-3 h-3 mr-1" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* ABC Tab - Shows ALL behaviors */}
        <TabsContent value="abc" className="space-y-4">
          {/* Add Custom Antecedent/Consequence */}
          <div className="flex gap-2">
            {showAddAntecedent ? (
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="New antecedent..."
                  value={newAntecedent}
                  onChange={(e) => setNewAntecedent(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddCustomAntecedent}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddAntecedent(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddAntecedent(true)}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Antecedent
              </Button>
            )}
            
            {showAddConsequence ? (
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="New consequence..."
                  value={newConsequence}
                  onChange={(e) => setNewConsequence(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddCustomConsequence}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddConsequence(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddConsequence(true)}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Consequence
              </Button>
            )}
          </div>

          {/* All Behaviors ABC Trackers */}
          {student.behaviors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No behaviors defined</p>
                <p className="text-xs text-muted-foreground">Add behaviors to the student profile or use Novel Behavior below</p>
              </CardContent>
            </Card>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <div className="space-y-3">
                {student.behaviors.map((behavior) => (
                  <Collapsible
                    key={behavior.id}
                    open={expandedBehaviors.has(behavior.id)}
                    onOpenChange={() => toggleBehaviorExpand(behavior.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/80">
                        <span className="font-medium text-sm">{behavior.name}</span>
                        {expandedBehaviors.has(behavior.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <ABCTracker
                        studentId={student.id}
                        behavior={behavior}
                        studentColor={student.color}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          )}

          {/* Novel Behavior Button */}
          <Dialog open={showNovelDialog} onOpenChange={setShowNovelDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Zap className="w-4 h-4" />
                Record Novel Behavior
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Record Novel Behavior</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 overflow-y-auto flex-1">
                <div className="space-y-2">
                  <Label>Behavior Name</Label>
                  <Input
                    placeholder="Enter behavior name..."
                    value={novelBehaviorName}
                    onChange={(e) => setNovelBehaviorName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recording Type</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={novelRecordingMode === 'abc' ? 'default' : 'outline'}
                      onClick={() => setNovelRecordingMode('abc')}
                      className="flex-1 gap-1"
                      size="sm"
                    >
                      <FileText className="w-3 h-3" />
                      ABC
                    </Button>
                    <Button
                      variant={novelRecordingMode === 'frequency' ? 'default' : 'outline'}
                      onClick={() => setNovelRecordingMode('frequency')}
                      className="flex-1 gap-1"
                      size="sm"
                    >
                      <Hash className="w-3 h-3" />
                      Frequency
                    </Button>
                    <Button
                      variant={novelRecordingMode === 'duration' ? 'default' : 'outline'}
                      onClick={() => setNovelRecordingMode('duration')}
                      className="flex-1 gap-1"
                      size="sm"
                    >
                      <Clock className="w-3 h-3" />
                      Duration
                    </Button>
                    <Button
                      variant={novelRecordingMode === 'latency' ? 'default' : 'outline'}
                      onClick={() => setNovelRecordingMode('latency')}
                      className="flex-1 gap-1"
                      size="sm"
                    >
                      <Timer className="w-3 h-3" />
                      Latency
                    </Button>
                  </div>
                </div>

                {novelRecordingMode === 'abc' && (
                  <div className="bg-secondary/30 rounded-lg p-4 text-center space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      This behavior will be added to the student's ABC tracking list. You can record ABC data for it after saving.
                    </p>
                  </div>
                )}

                {novelRecordingMode === 'frequency' && (
                  <div className="space-y-4">
                    <div className="bg-secondary/30 rounded-lg p-4">
                      <Label className="text-xs mb-2 block">Frequency Count</Label>
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-12 w-12 text-xl"
                          onClick={() => setNovelCount(Math.max(0, novelCount - 1))}
                        >
                          -
                        </Button>
                        <div className="text-4xl font-bold min-w-[60px] text-center">
                          {novelCount}
                        </div>
                        <Button
                          variant="default"
                          size="lg"
                          className="h-12 w-12 text-xl"
                          onClick={() => setNovelCount(novelCount + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Observation Duration (minutes)</Label>
                      <Input
                        type="number"
                        placeholder="Enter observation length..."
                        value={novelObservationMinutes || ''}
                        onChange={(e) => setNovelObservationMinutes(Number(e.target.value))}
                      />
                      {calculatedRate && (
                        <Badge variant="secondary" className="mt-2">
                          Rate: {calculatedRate} per hour
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {(novelRecordingMode === 'duration' || novelRecordingMode === 'latency') && (
                  <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                    <Label className="text-xs">
                      {novelRecordingMode === 'duration' ? 'Duration Timer' : 'Latency Timer'}
                    </Label>
                    <div className="text-4xl font-mono font-bold text-center py-2">
                      {formatTime(novelElapsed)}
                    </div>
                    <div className="flex justify-center gap-2">
                      {!novelTimerRunning && novelElapsed === 0 && (
                        <Button onClick={handleStartNovelTimer} className="gap-2">
                          <Play className="w-4 h-4" />
                          Start
                        </Button>
                      )}
                      {novelTimerRunning && (
                        <Button onClick={handleStopNovelTimer} variant="destructive" className="gap-2">
                          <Square className="w-4 h-4" />
                          Stop
                        </Button>
                      )}
                      {!novelTimerRunning && novelElapsed > 0 && (
                        <Button onClick={handleStopNovelTimer} variant="outline" className="gap-2">
                          <Check className="w-4 h-4" />
                          {formatTime(novelElapsed)} recorded
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNovelDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveNovelBehavior}
                  disabled={!novelBehaviorName.trim() || (novelRecordingMode === 'frequency' && novelCount === 0)}
                >
                  Save & Add to Student
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Interval Tab */}
        <TabsContent value="interval" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Interval Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interval Length (seconds)</Label>
                  <Input
                    type="number"
                    value={intervalConfig.intervalLength}
                    onChange={(e) => setIntervalConfig(prev => ({
                      ...prev,
                      intervalLength: Number(e.target.value)
                    }))}
                    disabled={intervalTimerRunning}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Intervals</Label>
                  <Input
                    type="number"
                    value={intervalConfig.totalIntervals}
                    onChange={(e) => setIntervalConfig(prev => ({
                      ...prev,
                      totalIntervals: Number(e.target.value)
                    }))}
                    disabled={intervalTimerRunning}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Behavior</Label>
                <Select 
                  value={selectedIntervalBehavior} 
                  onValueChange={setSelectedIntervalBehavior}
                  disabled={intervalTimerRunning}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose behavior to track..." />
                  </SelectTrigger>
                  <SelectContent>
                    {student.behaviors.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!intervalTimerRunning ? (
                <Button 
                  className="w-full gap-2"
                  onClick={handleStartIntervalRecording}
                  disabled={!selectedIntervalBehavior}
                >
                  <Play className="w-4 h-4" />
                  Start Interval Recording
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Interval {currentInterval} of {intervalConfig.totalIntervals}
                    </p>
                    <p className="text-4xl font-mono font-bold py-2">
                      {intervalTimeRemaining}s
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-16"
                      onClick={() => handleRecordIntervalOccurrence(false)}
                    >
                      <X className="w-6 h-6 mr-2" />
                      Did NOT Occur
                    </Button>
                    <Button
                      size="lg"
                      className="h-16"
                      onClick={() => handleRecordIntervalOccurrence(true)}
                    >
                      <Check className="w-6 h-6 mr-2" />
                      Occurred
                    </Button>
                  </div>

                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => {
                      setIntervalTimerRunning(false);
                      setCurrentInterval(0);
                    }}
                  >
                    Stop Recording
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interval Data Summary */}
          {selectedIntervalBehavior && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Interval Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: intervalConfig.totalIntervals }, (_, i) => {
                    const intervalData = getIntervalData(student.id, selectedIntervalBehavior);
                    const entry = intervalData.find(e => e.intervalNumber === i + 1);
                    return (
                      <div
                        key={i}
                        className={`
                          aspect-square rounded flex items-center justify-center text-xs font-medium
                          ${entry?.occurred ? 'bg-primary text-primary-foreground' : 
                            entry?.occurred === false ? 'bg-muted text-muted-foreground' : 
                            'bg-secondary text-secondary-foreground'}
                          ${entry?.voided ? 'opacity-50 line-through' : ''}
                        `}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Frequency Tab */}
        <TabsContent value="frequency" className="space-y-4">
          {student.behaviors.filter(b => b.methods?.includes('frequency')).length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {student.behaviors
                  .filter(b => b.methods?.includes('frequency'))
                  .map((behavior) => (
                    <FrequencyTracker
                      key={behavior.id}
                      studentId={student.id}
                      behavior={behavior}
                      studentColor={student.color}
                    />
                  ))}
              </div>
            </ScrollArea>
          ) : (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  No behaviors configured for frequency tracking. Add a novel behavior or configure existing behaviors.
                </p>
              </CardContent>
            </Card>
          )}
          <Dialog open={showNovelDialog} onOpenChange={setShowNovelDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2" onClick={() => setNovelRecordingMode('frequency')}>
                <Zap className="w-4 h-4" />
                Record Novel Behavior (Frequency)
              </Button>
            </DialogTrigger>
          </Dialog>
        </TabsContent>

        {/* Duration Tab */}
        <TabsContent value="duration" className="space-y-4">
          {student.behaviors.filter(b => b.methods?.includes('duration')).length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {student.behaviors
                  .filter(b => b.methods?.includes('duration'))
                  .map((behavior) => (
                    <DurationTracker
                      key={behavior.id}
                      studentId={student.id}
                      behavior={behavior}
                      studentColor={student.color}
                    />
                  ))}
              </div>
            </ScrollArea>
          ) : (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  No behaviors configured for duration tracking. Add a novel behavior or configure existing behaviors.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Manual Duration Entry */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Manual Duration Entry
              </CardTitle>
              <CardDescription className="text-xs">
                Enter duration data collected without the timer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Behavior</Label>
                <Select value={manualDurationBehaviorId} onValueChange={setManualDurationBehaviorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select behavior..." />
                  </SelectTrigger>
                  <SelectContent>
                    {student.behaviors.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Minutes</Label>
                  <Input
                    type="number"
                    min={0}
                    value={manualDurationMinutes || ''}
                    onChange={(e) => setManualDurationMinutes(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Seconds</Label>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={manualDurationSeconds || ''}
                    onChange={(e) => setManualDurationSeconds(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              <Button
                className="w-full"
                size="sm"
                disabled={!manualDurationBehaviorId || (manualDurationMinutes === 0 && manualDurationSeconds === 0)}
                onClick={() => {
                  const totalSeconds = manualDurationMinutes * 60 + manualDurationSeconds;
                  // Use startDuration + stopDuration to record a manual entry
                  const now = new Date();
                  const fakeStart = new Date(now.getTime() - totalSeconds * 1000);
                  // Add a duration entry directly
                  const { durationEntries } = useDataStore.getState();
                  useDataStore.setState({
                    durationEntries: [...durationEntries, {
                      id: crypto.randomUUID(),
                      studentId: student.id,
                      behaviorId: manualDurationBehaviorId,
                      startTime: fakeStart,
                      endTime: now,
                      duration: totalSeconds,
                    }],
                  });
                  toast.success(`Duration of ${manualDurationMinutes}m ${manualDurationSeconds}s recorded`);
                  setManualDurationMinutes(0);
                  setManualDurationSeconds(0);
                  setManualDurationBehaviorId('');
                }}
              >
                <Check className="w-4 h-4 mr-1" />
                Record Duration
              </Button>
            </CardContent>
          </Card>

          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => {
              setNovelRecordingMode('duration');
              setShowNovelDialog(true);
            }}
          >
            <Clock className="w-4 h-4" />
            Record Novel Behavior (Duration)
          </Button>
        </TabsContent>

        {/* Latency Tab */}
        <TabsContent value="latency" className="space-y-4">
          {student.behaviors.filter(b => b.methods?.includes('latency')).length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {student.behaviors
                  .filter(b => b.methods?.includes('latency'))
                  .map((behavior) => (
                    <Card key={behavior.id}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{behavior.name}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNovelBehaviorName(behavior.name);
                              setNovelRecordingMode('latency');
                              setShowNovelDialog(true);
                            }}
                          >
                            <Timer className="w-4 h-4 mr-1" />
                            Start Timer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          ) : (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  No behaviors configured for latency tracking. Add a novel behavior or configure existing behaviors.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Manual Latency Entry */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Manual Latency Entry
              </CardTitle>
              <CardDescription className="text-xs">
                Enter latency data collected without the timer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Behavior</Label>
                <Select value={manualLatencyBehaviorId} onValueChange={setManualLatencyBehaviorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select behavior..." />
                  </SelectTrigger>
                  <SelectContent>
                    {student.behaviors.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Latency (seconds)</Label>
                <Input
                  type="number"
                  min={0}
                  value={manualLatencySeconds || ''}
                  onChange={(e) => setManualLatencySeconds(Number(e.target.value))}
                  placeholder="Enter seconds..."
                />
              </div>
              <Button
                className="w-full"
                size="sm"
                disabled={!manualLatencyBehaviorId || manualLatencySeconds <= 0}
                onClick={() => {
                  const now = new Date();
                  addLatencyEntry({
                    studentId: student.id,
                    behaviorId: manualLatencyBehaviorId,
                    antecedentTime: new Date(now.getTime() - manualLatencySeconds * 1000),
                    behaviorOnsetTime: now,
                    latencySeconds: manualLatencySeconds,
                    notes: 'Manual entry',
                  });
                  toast.success(`Latency of ${manualLatencySeconds}s recorded`);
                  setManualLatencySeconds(0);
                  setManualLatencyBehaviorId('');
                }}
              >
                <Check className="w-4 h-4 mr-1" />
                Record Latency
              </Button>
            </CardContent>
          </Card>

          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => {
              setNovelRecordingMode('latency');
              setShowNovelDialog(true);
            }}
          >
            <Timer className="w-4 h-4" />
            Record Novel Behavior (Latency)
          </Button>
        </TabsContent>

        {/* Cold Probe / Skill Targets Tab */}
        <TabsContent value="cold_probe" className="space-y-4">
          {/* Add Target Button */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => refetchTargets()}
              disabled={targetsLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${targetsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAddTarget(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Skill Target
            </Button>
          </div>

          {targetsLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">Loading skill targets...</div>
          ) : (
            <>
              {/* Probe/DTT Targets */}
              {(() => {
                const probeTargets = supabaseSkillTargets.filter(t => 
                  !t.data_collection_type || t.data_collection_type === 'probe' || t.data_collection_type === 'discrete_trial' || t.data_collection_type === 'task_analysis'
                );
                return probeTargets.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Probe / DTT Targets</Label>
                    <ColdProbeTracker
                      studentId={student.id}
                      skillTargets={probeTargets.map(t => ({
                        id: t.id,
                        studentId: student.id,
                        name: t.title || '',
                        operationalDefinition: t.description || undefined,
                        domain: (t.domain as any)?.name || undefined,
                        method: (t.data_collection_type === 'probe' ? 'probe' : 'dtt') as any,
                        status: (t.status || 'active') as any,
                        masteryCriteria: t.mastery_criteria ? { 
                          type: 'percent_correct' as const, 
                          percentCorrect: 80 
                        } : undefined,
                        createdAt: new Date(t.created_at || Date.now()),
                        updatedAt: new Date(t.updated_at || Date.now()),
                      }))}
                      studentColor={student.color}
                      onSaveSession={(session: ColdProbeSession) => {
                        toast.success(`Cold probe session saved with ${session.trials.length} trials`);
                        const existingData = student.dttSessions || [];
                        updateStudentProfile(student.id, {
                          dttSessions: [...existingData, {
                            id: session.id,
                            skillTargetId: session.trials[0]?.skillTargetId || '',
                            studentId: student.id,
                            date: session.date,
                            trials: session.trials.map(t => ({
                              id: t.id,
                              timestamp: t.timestamp,
                              isCorrect: t.isCorrect,
                              promptLevel: t.promptLevel || 'independent',
                              notes: t.note,
                            })),
                            percentCorrect: Math.round(
                              (session.trials.filter(t => t.isCorrect).length / session.trials.length) * 100
                            ),
                            percentIndependent: Math.round(
                              (session.trials.filter(t => !t.promptNeeded).length / session.trials.length) * 100
                            ),
                            notes: session.notes,
                          }],
                        });
                      }}
                    />
                  </div>
                ) : null;
              })()}

              {/* Frequency Skill Targets */}
              {(() => {
                const freqTargets = supabaseSkillTargets.filter(t => t.data_collection_type === 'frequency');
                return freqTargets.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Frequency Targets</Label>
                    {freqTargets.map(t => {
                      const existingBehavior = student.behaviors.find(b => b.name === t.title);
                      return (
                        <Card key={t.id}>
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium">{t.title}</span>
                                <Badge variant="outline" className="ml-2 text-xs">Frequency</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {existingBehavior ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      incrementFrequency(student.id, existingBehavior.id);
                                      toast.success(`${t.title} count incremented`);
                                    }}
                                  >
                                    <Hash className="w-4 h-4 mr-1" />
                                    Count
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Add as behavior to count</span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : null;
              })()}

              {/* Duration Skill Targets */}
              {(() => {
                const durTargets = supabaseSkillTargets.filter(t => t.data_collection_type === 'duration');
                return durTargets.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Duration Targets</Label>
                    {durTargets.map(t => {
                      const existingBehavior = student.behaviors.find(b => b.name === t.title);
                      return (
                        <Card key={t.id}>
                          <CardContent className="py-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium">{t.title}</span>
                                <Badge variant="outline" className="ml-2 text-xs">Duration</Badge>
                              </div>
                              {existingBehavior ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const { getActiveDuration, startDuration, stopDuration } = useDataStore.getState();
                                    const active = getActiveDuration(student.id, existingBehavior.id);
                                    if (active) {
                                      stopDuration(student.id, existingBehavior.id);
                                      toast.success('Duration stopped');
                                    } else {
                                      startDuration(student.id, existingBehavior.id);
                                      toast.success('Duration timer started');
                                    }
                                  }}
                                >
                                  <Clock className="w-4 h-4 mr-1" />
                                  Timer
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">Add as behavior for timer</span>
                              )}
                            </div>
                            {/* Manual entry inline */}
                            <div className="flex gap-2 items-end">
                              <div className="flex-1 grid grid-cols-2 gap-1">
                                <Input type="number" min={0} placeholder="Min" className="h-8 text-xs" id={`dur-min-${t.id}`} />
                                <Input type="number" min={0} max={59} placeholder="Sec" className="h-8 text-xs" id={`dur-sec-${t.id}`} />
                              </div>
                              <Button size="sm" variant="secondary" className="h-8 text-xs"
                                onClick={() => {
                                  const minEl = document.getElementById(`dur-min-${t.id}`) as HTMLInputElement;
                                  const secEl = document.getElementById(`dur-sec-${t.id}`) as HTMLInputElement;
                                  const mins = Number(minEl?.value || 0);
                                  const secs = Number(secEl?.value || 0);
                                  const total = mins * 60 + secs;
                                  if (total <= 0) { toast.error('Enter a duration'); return; }
                                  const now = new Date();
                                  const { durationEntries } = useDataStore.getState();
                                  useDataStore.setState({
                                    durationEntries: [...durationEntries, {
                                      id: crypto.randomUUID(),
                                      studentId: student.id,
                                      behaviorId: existingBehavior?.id || t.id,
                                      startTime: new Date(now.getTime() - total * 1000),
                                      endTime: now,
                                      duration: total,
                                    }],
                                  });
                                  toast.success(`${mins}m ${secs}s recorded for ${t.title}`);
                                  if (minEl) minEl.value = '';
                                  if (secEl) secEl.value = '';
                                }}
                              >
                                Manual Save
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : null;
              })()}

              {/* Latency Skill Targets */}
              {(() => {
                const latTargets = supabaseSkillTargets.filter(t => t.data_collection_type === 'latency');
                return latTargets.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Latency Targets</Label>
                    {latTargets.map(t => (
                      <Card key={t.id}>
                        <CardContent className="py-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium">{t.title}</span>
                              <Badge variant="outline" className="ml-2 text-xs">Latency</Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNovelBehaviorName(t.title || '');
                                setNovelRecordingMode('latency');
                                setShowNovelDialog(true);
                              }}
                            >
                              <Timer className="w-4 h-4 mr-1" />
                              Timer
                            </Button>
                          </div>
                          {/* Manual entry inline */}
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Input type="number" min={0} placeholder="Seconds" className="h-8 text-xs" id={`lat-sec-${t.id}`} />
                            </div>
                            <Button size="sm" variant="secondary" className="h-8 text-xs"
                              onClick={() => {
                                const secEl = document.getElementById(`lat-sec-${t.id}`) as HTMLInputElement;
                                const secs = Number(secEl?.value || 0);
                                if (secs <= 0) { toast.error('Enter latency seconds'); return; }
                                const now = new Date();
                                const existingBehavior = student.behaviors.find(b => b.name === t.title);
                                addLatencyEntry({
                                  studentId: student.id,
                                  behaviorId: existingBehavior?.id || t.id,
                                  antecedentTime: new Date(now.getTime() - secs * 1000),
                                  behaviorOnsetTime: now,
                                  latencySeconds: secs,
                                  notes: 'Manual entry - skill target',
                                });
                                toast.success(`${secs}s latency recorded for ${t.title}`);
                                if (secEl) secEl.value = '';
                              }}
                            >
                              Manual Save
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* Interval Skill Targets */}
              {(() => {
                const intTargets = supabaseSkillTargets.filter(t => t.data_collection_type === 'interval');
                return intTargets.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Interval Targets</Label>
                    {intTargets.map(t => (
                      <Card key={t.id}>
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium">{t.title}</span>
                              <Badge variant="outline" className="ml-2 text-xs">Interval</Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveMode('interval');
                                const existingBehavior = student.behaviors.find(b => b.name === t.title);
                                if (existingBehavior) {
                                  setSelectedIntervalBehavior(existingBehavior.id);
                                }
                              }}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Go to Interval Tab
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : null;
              })()}

              {supabaseSkillTargets.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">No skill targets found</p>
                    <p className="text-xs text-muted-foreground">Add targets from Skills & Curriculum or use the button above</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Structured Observation Form Tab */}
        <TabsContent value="structured" className="space-y-4">
          <StructuredObservationForm
            studentId={student.id}
            studentName={student.displayName || student.name}
            onSave={(data: StructuredObservationData) => {
              // Save structured observation to student's narrative notes or a dedicated field
              const observationNote = {
                id: crypto.randomUUID(),
                studentId: student.id,
                content: JSON.stringify(data),
                timestamp: new Date(),
                tags: ['structured-observation', 'fba'],
              };
              const existingNotes = student.narrativeNotes || [];
              updateStudentProfile(student.id, {
                narrativeNotes: [...existingNotes, observationNote],
              });
              toast.success('Structured observation saved to student profile');
            }}
          />
        </TabsContent>

        {/* Observation Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <ObservationNotesPanel
            studentId={student.id}
            behaviors={student.behaviors}
            skillTargets={student.skillTargets || []}
            onSave={(notes: ObservationNotes) => {
              // Save observation notes to student profile
              const noteContent = {
                type: 'observation-notes',
                behaviorNotes: notes.behaviorNotes,
                skillNotes: notes.skillNotes,
                narrativeNotes: notes.narrativeNotes,
                observationDate: notes.observationDate,
              };
              const observationNote = {
                id: notes.id,
                studentId: student.id,
                content: JSON.stringify(noteContent),
                timestamp: new Date(),
                tags: ['observation-notes'],
              };
              const existingNotes = student.narrativeNotes || [];
              updateStudentProfile(student.id, {
                narrativeNotes: [...existingNotes, observationNote],
              });
            }}
          />
        </TabsContent>
      </Tabs>
      
      <ConfirmDialog
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
        title="Delete this observation?"
        description="This removes the currently active observation for this student (and any unsaved data recorded during it)."
        confirmLabel="Delete Observation"
        cancelLabel="Cancel"
        onConfirm={handleDeleteObservation}
        variant="destructive"
      />

      {/* Historical Observation Entry Dialog */}
      <HistoricalObservationEntry
        student={student}
        open={showHistoricalEntry}
        onOpenChange={setShowHistoricalEntry}
      />

      {/* Add Target Dialog */}
      <AddTargetFromProbe
        studentId={student.id}
        studentName={student.displayName || student.name}
        open={showAddTarget}
        onOpenChange={setShowAddTarget}
        onSuccess={() => {
          // Refresh targets from Supabase after adding
          refetchTargets();
        }}
      />
    </div>
  );
}
