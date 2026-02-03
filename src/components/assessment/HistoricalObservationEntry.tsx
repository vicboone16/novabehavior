import { useState } from 'react';
import { format } from 'date-fns';
import { 
  History, Calendar, Clock, Save, Plus, Trash2, 
  Hash, Timer as TimerIcon, BarChart3, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataStore } from '@/store/dataStore';
import { 
  Student, 
  ANTECEDENT_OPTIONS, 
  CONSEQUENCE_OPTIONS, 
  FUNCTION_OPTIONS,
  BehaviorFunction 
} from '@/types/behavior';
import { toast } from 'sonner';

interface HistoricalObservationEntryProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EntryMode = 'frequency' | 'duration' | 'abc' | 'interval' | 'latency';

interface FrequencyEntry {
  behaviorId: string;
  count: number;
}

interface DurationEntry {
  behaviorId: string;
  durationSeconds: number;
}

interface ABCEntryForm {
  behaviorId: string;
  antecedent: string;
  consequence: string;
  functions: BehaviorFunction[];
  notes?: string;
}

interface IntervalEntry {
  behaviorId: string;
  intervals: boolean[];
  intervalLengthSeconds: number;
}

interface LatencyEntryForm {
  behaviorId: string;
  latencySeconds: number;
  instruction?: string;
}

// Simple inline component for creating a new behavior by name only
function NewBehaviorDialog({ studentId, onSuccess }: { studentId: string; onSuccess: (behaviorId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const { addBehaviorWithMethods } = useDataStore();

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Please enter a behavior name');
      return;
    }
    addBehaviorWithMethods(studentId, name.trim(), ['abc']);
    // Get the newly created behavior ID
    setTimeout(() => {
      const state = useDataStore.getState();
      const student = state.students.find(s => s.id === studentId);
      const newBehavior = student?.behaviors.find(b => b.name === name.trim());
      if (newBehavior) {
        onSuccess(newBehavior.id);
      }
      setName('');
      setOpen(false);
    }, 100);
    toast.success(`Behavior "${name}" created`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="w-3 h-3" />
          New Behavior
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create New Behavior</DialogTitle>
          <DialogDescription>
            Add a behavior by name. Data collection type can be assigned later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Behavior Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter behavior name..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HistoricalObservationEntry({
  student, 
  open, 
  onOpenChange 
}: HistoricalObservationEntryProps) {
  const { 
    addHistoricalFrequency, 
    addHistoricalDuration,
    addABCEntry, 
    addLatencyEntry, 
    recordInterval,
  } = useDataStore();

  const [entryMode, setEntryMode] = useState<EntryMode>('frequency');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [observationDuration, setObservationDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Frequency entries
  const [frequencyEntries, setFrequencyEntries] = useState<FrequencyEntry[]>([]);
  
  // Duration entries
  const [durationEntries, setDurationEntries] = useState<DurationEntry[]>([]);
  
  // ABC entries
  const [abcEntries, setABCEntries] = useState<ABCEntryForm[]>([]);
  
  // Interval entries
  const [intervalEntries, setIntervalEntries] = useState<IntervalEntry[]>([]);
  
  // Latency entries
  const [latencyEntries, setLatencyEntries] = useState<LatencyEntryForm[]>([]);

  const activeBehaviors = student.behaviors.filter(b => !b.isArchived);

  const resetForm = () => {
    setFrequencyEntries([]);
    setDurationEntries([]);
    setABCEntries([]);
    setIntervalEntries([]);
    setLatencyEntries([]);
    setNotes('');
    setObservationDuration(30);
  };

  const addFrequencyEntry = (behaviorId: string) => {
    if (frequencyEntries.some(e => e.behaviorId === behaviorId)) {
      toast.error('Behavior already added');
      return;
    }
    setFrequencyEntries(prev => [...prev, { behaviorId, count: 0 }]);
  };

  const addDurationEntryForm = (behaviorId: string) => {
    if (durationEntries.some(e => e.behaviorId === behaviorId)) {
      toast.error('Behavior already added');
      return;
    }
    setDurationEntries(prev => [...prev, { behaviorId, durationSeconds: 0 }]);
  };

  const addABCEntryForm = (behaviorId: string) => {
    setABCEntries(prev => [...prev, {
      behaviorId,
      antecedent: '',
      consequence: '',
      functions: [],
      notes: '',
    }]);
  };

  const addIntervalEntry = (behaviorId: string) => {
    if (intervalEntries.some(e => e.behaviorId === behaviorId)) {
      toast.error('Behavior already added');
      return;
    }
    const numIntervals = Math.floor((observationDuration * 60) / 10);
    setIntervalEntries(prev => [...prev, {
      behaviorId,
      intervals: Array(numIntervals).fill(false),
      intervalLengthSeconds: 10,
    }]);
  };

  const addLatencyEntryFormEntry = (behaviorId: string) => {
    setLatencyEntries(prev => [...prev, {
      behaviorId,
      latencySeconds: 0,
      instruction: '',
    }]);
  };

  const handleSave = async () => {
    const timestamp = new Date(`${date}T${time}`);
    setIsSaving(true);

    try {
      // Save frequency entries
      for (const entry of frequencyEntries) {
        if (entry.count > 0) {
          addHistoricalFrequency({
            studentId: student.id,
            behaviorId: entry.behaviorId,
            count: entry.count,
            timestamp,
            observationDurationMinutes: observationDuration,
          });
        }
      }

      // Save duration entries
      for (const entry of durationEntries) {
        if (entry.durationSeconds > 0) {
          addHistoricalDuration({
            studentId: student.id,
            behaviorId: entry.behaviorId,
            durationSeconds: entry.durationSeconds,
            timestamp,
          });
        }
      }

      // Save ABC entries
      for (const entry of abcEntries) {
        if (entry.antecedent || entry.consequence) {
          const behavior = student.behaviors.find(b => b.id === entry.behaviorId);
          addABCEntry({
            studentId: student.id,
            behaviorId: entry.behaviorId,
            antecedent: entry.antecedent,
            consequence: entry.consequence,
            behavior: behavior?.name || 'Unknown',
            functions: entry.functions,
            frequencyCount: 1,
          });
        }
      }

      // Save interval entries
      for (const entry of intervalEntries) {
        const occurredCount = entry.intervals.filter(Boolean).length;
        if (occurredCount > 0) {
          entry.intervals.forEach((occurred, index) => {
            if (occurred) {
              recordInterval(student.id, entry.behaviorId, index, true);
            }
          });
        }
      }

      // Save latency entries
      for (const entry of latencyEntries) {
        if (entry.latencySeconds > 0) {
          addLatencyEntry({
            studentId: student.id,
            behaviorId: entry.behaviorId,
            latencySeconds: entry.latencySeconds,
            antecedentTime: new Date(timestamp.getTime() - entry.latencySeconds * 1000),
            behaviorOnsetTime: timestamp,
          });
        }
      }

      toast.success('Historical observation saved successfully');
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving historical observation:', error);
      toast.error('Failed to save observation');
    } finally {
      setIsSaving(false);
    }
  };

  const getBehaviorName = (behaviorId: string) => {
    return student.behaviors.find(b => b.id === behaviorId)?.name || 'Unknown';
  };

  const hasAnyEntries = 
    frequencyEntries.length > 0 ||
    durationEntries.length > 0 ||
    abcEntries.length > 0 ||
    intervalEntries.length > 0 ||
    latencyEntries.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <DialogTitle>Historical Observation Entry</DialogTitle>
          </div>
          <DialogDescription>
            Enter observation data from a previous session for {student.displayName || student.name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Date/Time/Duration Header */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Date
                    </Label>
                    <Input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Time
                    </Label>
                    <Input 
                      type="time" 
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <TimerIcon className="w-3 h-3" />
                      Duration (min)
                    </Label>
                    <Input 
                      type="number" 
                      value={observationDuration}
                      onChange={(e) => setObservationDuration(Number(e.target.value))}
                      min={1}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Entry Tabs */}
            <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as EntryMode)}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="frequency" className="text-xs gap-1">
                  <Hash className="w-3 h-3" />
                  Frequency
                </TabsTrigger>
                <TabsTrigger value="duration" className="text-xs gap-1">
                  <TimerIcon className="w-3 h-3" />
                  Duration
                </TabsTrigger>
                <TabsTrigger value="abc" className="text-xs gap-1">
                  <FileText className="w-3 h-3" />
                  ABC
                </TabsTrigger>
                <TabsTrigger value="interval" className="text-xs gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Interval
                </TabsTrigger>
                <TabsTrigger value="latency" className="text-xs gap-1">
                  <Clock className="w-3 h-3" />
                  Latency
                </TabsTrigger>
              </TabsList>

              {/* Frequency Tab */}
              <TabsContent value="frequency" className="space-y-3">
                <div className="flex gap-2">
                  <Select onValueChange={addFrequencyEntry}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Add behavior..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBehaviors.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {frequencyEntries.map((entry, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getBehaviorName(entry.behaviorId)}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFrequencyEntries(prev => 
                              prev.map((e, i) => i === idx ? { ...e, count: Math.max(0, e.count - 1) } : e)
                            )}
                          >
                            −
                          </Button>
                          <Input
                            type="number"
                            value={entry.count}
                            onChange={(e) => setFrequencyEntries(prev =>
                              prev.map((item, i) => i === idx ? { ...item, count: Number(e.target.value) } : item)
                            )}
                            className="w-20 text-center"
                            min={0}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFrequencyEntries(prev => 
                              prev.map((e, i) => i === idx ? { ...e, count: e.count + 1 } : e)
                            )}
                          >
                            +
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFrequencyEntries(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {frequencyEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select a behavior above to add frequency count
                  </p>
                )}
              </TabsContent>

              {/* Duration Tab */}
              <TabsContent value="duration" className="space-y-3">
                <div className="flex gap-2">
                  <Select onValueChange={addDurationEntryForm}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Add behavior..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBehaviors.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {durationEntries.map((entry, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getBehaviorName(entry.behaviorId)}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={Math.floor(entry.durationSeconds / 60)}
                            onChange={(e) => {
                              const mins = Number(e.target.value);
                              const secs = entry.durationSeconds % 60;
                              setDurationEntries(prev =>
                                prev.map((item, i) => i === idx ? { ...item, durationSeconds: mins * 60 + secs } : item)
                              );
                            }}
                            className="w-16 text-center"
                            min={0}
                          />
                          <span className="text-muted-foreground">min</span>
                          <Input
                            type="number"
                            value={entry.durationSeconds % 60}
                            onChange={(e) => {
                              const secs = Math.min(59, Math.max(0, Number(e.target.value)));
                              const mins = Math.floor(entry.durationSeconds / 60);
                              setDurationEntries(prev =>
                                prev.map((item, i) => i === idx ? { ...item, durationSeconds: mins * 60 + secs } : item)
                              );
                            }}
                            className="w-16 text-center"
                            min={0}
                            max={59}
                          />
                          <span className="text-muted-foreground">sec</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDurationEntries(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* ABC Tab */}
              <TabsContent value="abc" className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Select onValueChange={addABCEntryForm}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Add ABC entry..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBehaviors.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <NewBehaviorDialog 
                    studentId={student.id}
                    onSuccess={(behaviorId) => {
                      addABCEntryForm(behaviorId);
                    }}
                  />
                </div>

                {abcEntries.map((entry, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <Badge variant="outline">{getBehaviorName(entry.behaviorId)}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setABCEntries(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Antecedent</Label>
                        <Select 
                          value={entry.antecedent}
                          onValueChange={(v) => setABCEntries(prev =>
                            prev.map((e, i) => i === idx ? { ...e, antecedent: v } : e)
                          )}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select antecedent..." />
                          </SelectTrigger>
                          <SelectContent>
                            {[...ANTECEDENT_OPTIONS, ...(student.customAntecedents || [])].map(a => (
                              <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Consequence</Label>
                        <Select
                          value={entry.consequence}
                          onValueChange={(v) => setABCEntries(prev =>
                            prev.map((e, i) => i === idx ? { ...e, consequence: v } : e)
                          )}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select consequence..." />
                          </SelectTrigger>
                          <SelectContent>
                            {[...CONSEQUENCE_OPTIONS, ...(student.customConsequences || [])].map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Function(s)</Label>
                        <div className="flex flex-wrap gap-1">
                          {FUNCTION_OPTIONS.map(f => (
                            <Badge
                              key={f.value}
                              variant={entry.functions.includes(f.value) ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => setABCEntries(prev =>
                                prev.map((e, i) => {
                                  if (i !== idx) return e;
                                  const newFns = e.functions.includes(f.value)
                                    ? e.functions.filter(fn => fn !== f.value)
                                    : [...e.functions, f.value];
                                  return { ...e, functions: newFns };
                                })
                              )}
                            >
                              {f.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          value={entry.notes || ''}
                          onChange={(e) => setABCEntries(prev =>
                            prev.map((etr, i) => i === idx ? { ...etr, notes: e.target.value } : etr)
                          )}
                          placeholder="Optional notes..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Interval Tab */}
              <TabsContent value="interval" className="space-y-3">
                <div className="flex gap-2">
                  <Select onValueChange={addIntervalEntry}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Add behavior..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBehaviors.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {intervalEntries.map((entry, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <Badge variant="outline">{getBehaviorName(entry.behaviorId)}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setIntervalEntries(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-2">
                        Click to toggle interval occurrence ({entry.intervals.filter(Boolean).length}/{entry.intervals.length} marked)
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {entry.intervals.map((occurred, intIdx) => (
                          <Button
                            key={intIdx}
                            variant={occurred ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0 text-xs"
                            onClick={() => setIntervalEntries(prev =>
                              prev.map((e, i) => {
                                if (i !== idx) return e;
                                const newInts = [...e.intervals];
                                newInts[intIdx] = !newInts[intIdx];
                                return { ...e, intervals: newInts };
                              })
                            )}
                          >
                            {intIdx + 1}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Latency Tab */}
              <TabsContent value="latency" className="space-y-3">
                <div className="flex gap-2">
                  <Select onValueChange={addLatencyEntryFormEntry}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Add latency entry..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBehaviors.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {latencyEntries.map((entry, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{getBehaviorName(entry.behaviorId)}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setLatencyEntries(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Instruction/Antecedent</Label>
                        <Input
                          value={entry.instruction || ''}
                          onChange={(e) => setLatencyEntries(prev =>
                            prev.map((etr, i) => i === idx ? { ...etr, instruction: e.target.value } : etr)
                          )}
                          placeholder="e.g., 'Sit down'"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="space-y-1 flex-1">
                          <Label className="text-xs">Latency (seconds)</Label>
                          <Input
                            type="number"
                            value={entry.latencySeconds}
                            onChange={(e) => setLatencyEntries(prev =>
                              prev.map((etr, i) => i === idx ? { ...etr, latencySeconds: Number(e.target.value) } : etr)
                            )}
                            min={0}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>

            {/* Session Notes */}
            <div className="space-y-2">
              <Label>Session Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this observation session..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasAnyEntries || isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Historical Observation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
