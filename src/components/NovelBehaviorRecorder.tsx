import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Play, Pause, Square, Clock, Hash, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDataStore } from '@/store/dataStore';
import { DataCollectionMethod } from '@/types/behavior';

type RecordingMode = 'frequency' | 'duration';

export function NovelBehaviorRecorder() {
  const { 
    students, 
    addBehaviorWithMethods,
    incrementFrequency,
    startDuration,
    stopDuration,
    getActiveDuration,
    addFrequencyFromABC,
  } = useDataStore();

  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [behaviorName, setBehaviorName] = useState('');
  const [selectedExistingBehaviorId, setSelectedExistingBehaviorId] = useState('');
  const [mode, setMode] = useState<RecordingMode>('frequency');
  const [frequencyCount, setFrequencyCount] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [addToStudent, setAddToStudent] = useState(true);
  const [behaviorSource, setBehaviorSource] = useState<'new' | 'existing'>('new');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Get all unique behaviors across all students
  const allBehaviors = useMemo(() => {
    const behaviorMap = new Map<string, { name: string; studentNames: string[] }>();
    students.forEach(s => {
      s.behaviors.forEach(b => {
        const existing = behaviorMap.get(b.name.toLowerCase());
        if (existing) {
          if (!existing.studentNames.includes(s.name)) {
            existing.studentNames.push(s.name);
          }
        } else {
          behaviorMap.set(b.name.toLowerCase(), { name: b.name, studentNames: [s.name] });
        }
      });
    });
    return Array.from(behaviorMap.values());
  }, [students]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  
  // Check if behavior already exists for selected student
  const behaviorExistsForStudent = useMemo(() => {
    if (!selectedStudent) return false;
    const nameToCheck = behaviorSource === 'new' ? behaviorName : 
      allBehaviors.find(b => b.name.toLowerCase() === selectedExistingBehaviorId.toLowerCase())?.name || '';
    return selectedStudent.behaviors.some(b => b.name.toLowerCase() === nameToCheck.toLowerCase());
  }, [selectedStudent, behaviorName, selectedExistingBehaviorId, behaviorSource, allBehaviors]);

  const effectiveBehaviorName = behaviorSource === 'new' ? behaviorName : 
    allBehaviors.find(b => b.name.toLowerCase() === selectedExistingBehaviorId.toLowerCase())?.name || '';

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000));
        }
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    startTimeRef.current = new Date();
    setIsTimerRunning(true);
    setElapsedTime(0);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResumeTimer = () => {
    if (startTimeRef.current) {
      // Adjust start time to account for paused time
      const pausedDuration = elapsedTime * 1000;
      startTimeRef.current = new Date(Date.now() - pausedDuration);
    }
    setIsTimerRunning(true);
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleSaveAndClose = () => {
    if (!selectedStudentId || !effectiveBehaviorName.trim()) return;

    let behaviorId: string | null = null;

    // If adding to student, create the behavior if it doesn't exist
    if (addToStudent && !behaviorExistsForStudent) {
      const methods: DataCollectionMethod[] = mode === 'duration' 
        ? ['duration', 'frequency'] 
        : ['frequency'];
      addBehaviorWithMethods(selectedStudentId, effectiveBehaviorName.trim(), methods);
      
      // Get the newly created behavior ID
      const updatedStudent = students.find(s => s.id === selectedStudentId);
      const newBehavior = updatedStudent?.behaviors.find(b => b.name === effectiveBehaviorName.trim());
      behaviorId = newBehavior?.id || null;
    } else {
      // Find existing behavior
      const existingBehavior = selectedStudent?.behaviors.find(
        b => b.name.toLowerCase() === effectiveBehaviorName.toLowerCase()
      );
      behaviorId = existingBehavior?.id || null;
    }

    // Record the data
    if (behaviorId) {
      if (mode === 'frequency' && frequencyCount > 0) {
        addFrequencyFromABC(selectedStudentId, behaviorId, frequencyCount);
      }
      // Duration data is recorded through the timer system
    }

    // Reset and close
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setBehaviorName('');
    setSelectedExistingBehaviorId('');
    setFrequencyCount(0);
    setElapsedTime(0);
    setIsTimerRunning(false);
    startTimeRef.current = null;
    setBehaviorSource('new');
    setAddToStudent(true);
  };

  const isValid = selectedStudentId && effectiveBehaviorName.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        handleStopTimer();
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          Record Novel Behavior
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Record Novel Behavior
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label>Assign to Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Behavior Source */}
          <Tabs value={behaviorSource} onValueChange={(v) => setBehaviorSource(v as 'new' | 'existing')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="new">New Behavior</TabsTrigger>
              <TabsTrigger value="existing">From List</TabsTrigger>
            </TabsList>
            
            <TabsContent value="new" className="space-y-2">
              <Label>Behavior Name</Label>
              <Input
                placeholder="Enter behavior name..."
                value={behaviorName}
                onChange={(e) => setBehaviorName(e.target.value)}
              />
            </TabsContent>
            
            <TabsContent value="existing" className="space-y-2">
              <Label>Select Existing Behavior</Label>
              <Select value={selectedExistingBehaviorId} onValueChange={setSelectedExistingBehaviorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose behavior..." />
                </SelectTrigger>
                <SelectContent>
                  {allBehaviors.map(b => (
                    <SelectItem key={b.name.toLowerCase()} value={b.name.toLowerCase()}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{b.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({b.studentNames.join(', ')})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>
          </Tabs>

          {/* Recording Mode */}
          <div className="space-y-2">
            <Label>Recording Mode</Label>
            <div className="flex gap-2">
              <Button
                variant={mode === 'frequency' ? 'default' : 'outline'}
                onClick={() => setMode('frequency')}
                className="flex-1 gap-2"
              >
                <Hash className="w-4 h-4" />
                Frequency
              </Button>
              <Button
                variant={mode === 'duration' ? 'default' : 'outline'}
                onClick={() => setMode('duration')}
                className="flex-1 gap-2"
              >
                <Clock className="w-4 h-4" />
                Duration
              </Button>
            </div>
          </div>

          {/* Frequency Counter */}
          {mode === 'frequency' && (
            <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
              <Label className="text-sm">Frequency Count</Label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 w-12 text-xl"
                  onClick={() => setFrequencyCount(Math.max(0, frequencyCount - 1))}
                >
                  -
                </Button>
                <div className="text-4xl font-bold min-w-[60px] text-center">
                  {frequencyCount}
                </div>
                <Button
                  variant="default"
                  size="lg"
                  className="h-12 w-12 text-xl"
                  onClick={() => setFrequencyCount(frequencyCount + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          )}

          {/* Duration Timer */}
          {mode === 'duration' && (
            <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
              <Label className="text-sm">Duration Timer</Label>
              <div className="text-4xl font-mono font-bold text-center py-2">
                {formatTime(elapsedTime)}
              </div>
              <div className="flex justify-center gap-2">
                {!isTimerRunning && elapsedTime === 0 && (
                  <Button onClick={handleStartTimer} className="gap-2">
                    <Play className="w-4 h-4" />
                    Start
                  </Button>
                )}
                {isTimerRunning && (
                  <Button onClick={handlePauseTimer} variant="outline" className="gap-2">
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                )}
                {!isTimerRunning && elapsedTime > 0 && (
                  <>
                    <Button onClick={handleResumeTimer} className="gap-2">
                      <Play className="w-4 h-4" />
                      Resume
                    </Button>
                    <Button onClick={handleStopTimer} variant="outline" className="gap-2">
                      <Square className="w-4 h-4" />
                      Stop
                    </Button>
                  </>
                )}
                {isTimerRunning && (
                  <Button onClick={handleStopTimer} variant="destructive" className="gap-2">
                    <Square className="w-4 h-4" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {effectiveBehaviorName && (
              <Badge variant="outline">
                Behavior: {effectiveBehaviorName}
              </Badge>
            )}
            {behaviorExistsForStudent && (
              <Badge variant="secondary" className="bg-success/20 text-success">
                Already assigned to {selectedStudent?.name}
              </Badge>
            )}
            {!behaviorExistsForStudent && addToStudent && effectiveBehaviorName && (
              <Badge variant="secondary" className="bg-info/20 text-info">
                Will be added to {selectedStudent?.name || 'student'}
              </Badge>
            )}
          </div>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                handleStopTimer();
                resetForm();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSaveAndClose}
              disabled={!isValid || (mode === 'frequency' && frequencyCount === 0) || (mode === 'duration' && elapsedTime === 0)}
            >
              <Check className="w-4 h-4" />
              Save & Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
