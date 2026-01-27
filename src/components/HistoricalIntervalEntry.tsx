import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Grid3X3, CheckCircle, XCircle, MinusCircle, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { Student, Behavior, IntervalEntry } from '@/types/behavior';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HistoricalIntervalEntryProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type IntervalStatus = 'occurred' | 'not_occurred' | 'voided';

interface IntervalData {
  intervalNumber: number;
  status: IntervalStatus;
  voidReason?: IntervalEntry['voidReason'];
}

const VOID_REASONS: { value: IntervalEntry['voidReason']; label: string }[] = [
  { value: 'late_arrival', label: 'Late Arrival' },
  { value: 'early_departure', label: 'Early Departure' },
  { value: 'not_present', label: 'Not Present' },
  { value: 'fire_drill', label: 'Fire Drill' },
  { value: 'break', label: 'Break' },
  { value: 'transition', label: 'Transition' },
  { value: 'other', label: 'Other' },
];

export function HistoricalIntervalEntry({ student, open, onOpenChange }: HistoricalIntervalEntryProps) {
  const { sessions } = useDataStore();
  
  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('09:00');
  const [intervalDuration, setIntervalDuration] = useState('15'); // seconds
  const [numberOfIntervals, setNumberOfIntervals] = useState('20');
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [intervalData, setIntervalData] = useState<Record<string, IntervalData[]>>({});
  const [step, setStep] = useState<'config' | 'mark'>('config');

  // Get behaviors with interval method
  const intervalBehaviors = useMemo(() => {
    return student.behaviors.filter(b => b.methods.includes('interval'));
  }, [student.behaviors]);

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTime('09:00');
    setIntervalDuration('15');
    setNumberOfIntervals('20');
    setSelectedBehaviors([]);
    setIntervalData({});
    setStep('config');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleProceedToMark = () => {
    if (selectedBehaviors.length === 0) {
      toast.error('Please select at least one behavior');
      return;
    }
    
    const numIntervals = parseInt(numberOfIntervals) || 20;
    
    // Initialize interval data for each behavior
    const initialData: Record<string, IntervalData[]> = {};
    selectedBehaviors.forEach(behaviorId => {
      initialData[behaviorId] = Array.from({ length: numIntervals }, (_, i) => ({
        intervalNumber: i,
        status: 'not_occurred' as IntervalStatus,
      }));
    });
    
    setIntervalData(initialData);
    setStep('mark');
  };

  const toggleBehavior = (behaviorId: string) => {
    setSelectedBehaviors(prev => 
      prev.includes(behaviorId)
        ? prev.filter(id => id !== behaviorId)
        : [...prev, behaviorId]
    );
  };

  const cycleIntervalStatus = (behaviorId: string, intervalIndex: number) => {
    setIntervalData(prev => {
      const behaviorIntervals = [...(prev[behaviorId] || [])];
      const currentStatus = behaviorIntervals[intervalIndex]?.status || 'not_occurred';
      
      let newStatus: IntervalStatus;
      if (currentStatus === 'not_occurred') {
        newStatus = 'occurred';
      } else if (currentStatus === 'occurred') {
        newStatus = 'voided';
      } else {
        newStatus = 'not_occurred';
      }
      
      behaviorIntervals[intervalIndex] = {
        ...behaviorIntervals[intervalIndex],
        status: newStatus,
        voidReason: newStatus === 'voided' ? 'other' : undefined,
      };
      
      return { ...prev, [behaviorId]: behaviorIntervals };
    });
  };

  const setIntervalVoidReason = (behaviorId: string, intervalIndex: number, reason: IntervalEntry['voidReason']) => {
    setIntervalData(prev => {
      const behaviorIntervals = [...(prev[behaviorId] || [])];
      behaviorIntervals[intervalIndex] = {
        ...behaviorIntervals[intervalIndex],
        voidReason: reason,
      };
      return { ...prev, [behaviorId]: behaviorIntervals };
    });
  };

  const markAllAs = (behaviorId: string, status: IntervalStatus) => {
    setIntervalData(prev => {
      const numIntervals = parseInt(numberOfIntervals) || 20;
      return {
        ...prev,
        [behaviorId]: Array.from({ length: numIntervals }, (_, i) => ({
          intervalNumber: i,
          status,
          voidReason: status === 'voided' ? 'other' : undefined,
        })),
      };
    });
  };

  const handleSave = () => {
    const sessionDate = new Date(`${date}T${time}`);
    const numIntervals = parseInt(numberOfIntervals) || 20;
    const intervalSecs = parseInt(intervalDuration) || 15;
    
    // Create a new session with the historical data
    const sessionId = crypto.randomUUID();
    const sessionLengthMinutes = Math.ceil((numIntervals * intervalSecs) / 60);
    
    // Build interval entries
    const intervalEntries: IntervalEntry[] = [];
    
    Object.entries(intervalData).forEach(([behaviorId, intervals]) => {
      intervals.forEach((interval) => {
        const entryTimestamp = new Date(sessionDate.getTime() + (interval.intervalNumber * intervalSecs * 1000));
        
        intervalEntries.push({
          id: crypto.randomUUID(),
          studentId: student.id,
          behaviorId,
          intervalNumber: interval.intervalNumber,
          occurred: interval.status === 'occurred',
          timestamp: entryTimestamp,
          markedAt: entryTimestamp,
          voided: interval.status === 'voided',
          voidReason: interval.status === 'voided' ? interval.voidReason : undefined,
          sessionId,
        });
      });
    });

    // Create the session object
    const newSession = {
      id: sessionId,
      date: sessionDate,
      notes: `Historical interval data entry`,
      studentIds: [student.id],
      sessionLengthMinutes,
      abcEntries: [],
      frequencyEntries: [],
      durationEntries: [],
      intervalEntries,
    };

    // Add to store
    useDataStore.setState((state) => ({
      sessions: [newSession, ...state.sessions],
    }));

    toast.success('Historical interval data saved');
    handleClose();
  };

  const getStatusIcon = (status: IntervalStatus) => {
    switch (status) {
      case 'occurred':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'voided':
        return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <XCircle className="w-4 h-4 text-destructive/50" />;
    }
  };

  const getStatusColor = (status: IntervalStatus) => {
    switch (status) {
      case 'occurred':
        return 'bg-primary/20 border-primary hover:bg-primary/30';
      case 'voided':
        return 'bg-muted border-muted-foreground/30 hover:bg-muted/80';
      default:
        return 'bg-background border-border hover:bg-muted/50';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Add Historical Interval Data for {student.name}
          </DialogTitle>
          <DialogDescription>
            {step === 'config' 
              ? 'Configure the session parameters and select behaviors to track'
              : 'Mark each interval as occurred, not occurred, or voided'}
          </DialogDescription>
        </DialogHeader>

        {step === 'config' ? (
          <div className="space-y-6 py-4">
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Start Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            {/* Interval Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interval-duration">Interval Duration (seconds)</Label>
                <Input
                  id="interval-duration"
                  type="number"
                  min="5"
                  max="300"
                  value={intervalDuration}
                  onChange={(e) => setIntervalDuration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="num-intervals">Number of Intervals</Label>
                <Input
                  id="num-intervals"
                  type="number"
                  min="1"
                  max="100"
                  value={numberOfIntervals}
                  onChange={(e) => setNumberOfIntervals(e.target.value)}
                />
              </div>
            </div>

            {/* Session Summary */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-muted-foreground">
                Session Duration: {Math.ceil((parseInt(numberOfIntervals) || 20) * (parseInt(intervalDuration) || 15) / 60)} minutes
                ({numberOfIntervals} intervals × {intervalDuration} seconds)
              </p>
            </div>

            {/* Behavior Selection */}
            <div className="space-y-3">
              <Label>Select Behaviors to Track</Label>
              {intervalBehaviors.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-muted-foreground">
                    No behaviors with interval tracking configured.
                    Add interval tracking to behaviors first.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-2">
                  {intervalBehaviors.map((behavior) => (
                    <Card 
                      key={behavior.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedBehaviors.includes(behavior.id) 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleBehavior(behavior.id)}
                    >
                      <CardContent className="py-3 flex items-center gap-3">
                        <Checkbox 
                          checked={selectedBehaviors.includes(behavior.id)}
                          onCheckedChange={() => toggleBehavior(behavior.id)}
                        />
                        <span className="font-medium">{behavior.name}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {selectedBehaviors.map((behaviorId) => {
                const behavior = student.behaviors.find(b => b.id === behaviorId);
                if (!behavior) return null;
                
                const intervals = intervalData[behaviorId] || [];
                const occurredCount = intervals.filter(i => i.status === 'occurred').length;
                const voidedCount = intervals.filter(i => i.status === 'voided').length;
                const validIntervals = intervals.length - voidedCount;
                const percentage = validIntervals > 0 
                  ? Math.round((occurredCount / validIntervals) * 100) 
                  : 0;
                
                return (
                  <Card key={behaviorId}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{behavior.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {occurredCount}/{validIntervals} ({percentage}%)
                          </Badge>
                          {voidedCount > 0 && (
                            <Badge variant="secondary">
                              {voidedCount} voided
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => markAllAs(behaviorId, 'occurred')}
                        >
                          Mark All Occurred
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => markAllAs(behaviorId, 'not_occurred')}
                        >
                          Mark All Not Occurred
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-10 gap-1.5">
                        {intervals.map((interval, idx) => (
                          <div key={idx} className="relative group">
                            <button
                              className={cn(
                                "w-full aspect-square rounded border-2 flex items-center justify-center transition-all text-xs font-medium",
                                getStatusColor(interval.status)
                              )}
                              onClick={() => cycleIntervalStatus(behaviorId, idx)}
                              title={`Interval ${idx + 1}: ${interval.status}${interval.status === 'voided' ? ` (${interval.voidReason})` : ''}`}
                            >
                              {idx + 1}
                            </button>
                            {interval.status === 'voided' && (
                              <div className="absolute -top-1 -right-1">
                                <MinusCircle className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Legend */}
                      <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded border-2 bg-primary/20 border-primary" />
                          <span>Occurred</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded border-2 bg-background border-border" />
                          <span>Not Occurred</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded border-2 bg-muted border-muted-foreground/30" />
                          <span>Voided/N/A</span>
                        </div>
                        <span className="ml-auto">Click to cycle through states</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          {step === 'config' ? (
            <Button 
              onClick={handleProceedToMark}
              disabled={selectedBehaviors.length === 0}
            >
              Continue to Mark Intervals
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('config')}>
                Back
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Historical Data
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}