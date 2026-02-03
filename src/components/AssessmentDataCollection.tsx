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
  const [novelRecordingMode, setNovelRecordingMode] = useState<'frequency' | 'duration' | 'latency'>('frequency');
  const [novelCount, setNovelCount] = useState(0);
  const [novelObservationMinutes, setNovelObservationMinutes] = useState<number>(0);
  const [novelTimerRunning, setNovelTimerRunning] = useState(false);
  const [novelElapsed, setNovelElapsed] = useState(0);
  const novelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const novelStartRef = useRef<Date | null>(null);

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
    const durationMinutes = sessionStartTime
      ? (Date.now() - new Date(sessionStartTime).getTime()) / 60000
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

    // Add behavior to student
    const methods: DataCollectionMethod[] = [novelRecordingMode];
    if (novelRecordingMode === 'frequency') methods.push('abc');
    addBehaviorWithMethods(student.id, novelBehaviorName.trim(), methods);

    // Get the newly created behavior ID
    setTimeout(() => {
      const updatedStudent = useDataStore.getState().students.find(s => s.id === student.id);
      const newBehavior = updatedStudent?.behaviors.find(b => b.name === novelBehaviorName.trim());
      
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
      
      toast.success(`Behavior "${novelBehaviorName}" added and data saved`);
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
            <ScrollArea className="max-h-[400px]">
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
            </ScrollArea>
          )}

          {/* Novel Behavior Button */}
          <Dialog open={showNovelDialog} onOpenChange={setShowNovelDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Zap className="w-4 h-4" />
                Record Novel Behavior
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Novel Behavior</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                  <div className="flex gap-2">
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
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Use the ABC tab for quick frequency recording, or add a Novel Behavior with frequency count.
              </p>
              <Dialog open={showNovelDialog} onOpenChange={setShowNovelDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <Zap className="w-4 h-4" />
                    Record Novel Behavior with Frequency
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duration Tab */}
        <TabsContent value="duration" className="space-y-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Use the Novel Behavior recorder to capture duration for new behaviors.
              </p>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => {
                  setNovelRecordingMode('duration');
                  setShowNovelDialog(true);
                }}
              >
                <Clock className="w-4 h-4" />
                Record Duration for Novel Behavior
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Latency Tab */}
        <TabsContent value="latency" className="space-y-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Measure time between instruction and behavior onset.
              </p>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => {
                  setNovelRecordingMode('latency');
                  setShowNovelDialog(true);
                }}
              >
                <Timer className="w-4 h-4" />
                Record Latency for Novel Behavior
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cold Probe Tab */}
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
            <ColdProbeTracker
              studentId={student.id}
              skillTargets={supabaseSkillTargets.map(t => ({
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
                // Save cold probe session - could store in student.dttSessions or separate storage
                toast.success(`Cold probe session saved with ${session.trials.length} trials`);
                // Update student profile with cold probe data
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
