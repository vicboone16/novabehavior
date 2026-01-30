import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  Plus, Save, Clock, AlertCircle, TrendingUp, 
  Timer, Grid3X3, FileText, X, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useDataStore } from '@/store/dataStore';
import { 
  Student, 
  ANTECEDENT_OPTIONS, 
  CONSEQUENCE_OPTIONS,
  DataCollectionMethod 
} from '@/types/behavior';

interface HistoricalDataEntryProps {
  student: Student;
}

interface BehaviorSelection {
  behaviorId: string;
  count: number;
  durationSeconds?: number;
}

type EntryType = 'frequency' | 'abc' | 'duration';

export function HistoricalDataEntry({ student }: HistoricalDataEntryProps) {
  // Data type selection
  const [entryType, setEntryType] = useState<EntryType>('frequency');
  
  // Common fields
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [observationDuration, setObservationDuration] = useState('');
  const [notes, setNotes] = useState('');
  
  // Multi-behavior selection
  const [selectedBehaviors, setSelectedBehaviors] = useState<BehaviorSelection[]>([]);
  
  // ABC-specific fields
  const [antecedent, setAntecedent] = useState('');
  const [consequence, setConsequence] = useState('');
  const [customAntecedent, setCustomAntecedent] = useState('');
  const [customConsequence, setCustomConsequence] = useState('');
  
  // Add new behavior dialog
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [newBehaviorMethods, setNewBehaviorMethods] = useState<DataCollectionMethod[]>(['frequency']);
  const [newBehaviorDefinition, setNewBehaviorDefinition] = useState('');

  const { 
    addHistoricalFrequency, 
    addHistoricalDuration,
    addABCEntry,
    addBehaviorWithMethods,
    addCustomAntecedent,
    addCustomConsequence,
  } = useDataStore();

  // Get all antecedent options including custom
  const allAntecedents = useMemo(() => {
    const custom = student.customAntecedents || [];
    return [...ANTECEDENT_OPTIONS, ...custom.filter(a => !ANTECEDENT_OPTIONS.includes(a))];
  }, [student.customAntecedents]);

  // Get all consequence options including custom
  const allConsequences = useMemo(() => {
    const custom = student.customConsequences || [];
    return [...CONSEQUENCE_OPTIONS, ...custom.filter(c => !CONSEQUENCE_OPTIONS.includes(c))];
  }, [student.customConsequences]);

  // Parse date without timezone shift
  const parseLocalDate = (dateStr: string, timeStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  // Toggle behavior selection
  const toggleBehavior = (behaviorId: string) => {
    setSelectedBehaviors(prev => {
      const existing = prev.find(b => b.behaviorId === behaviorId);
      if (existing) {
        return prev.filter(b => b.behaviorId !== behaviorId);
      } else {
        return [...prev, { behaviorId, count: 1 }];
      }
    });
  };

  // Update behavior count
  const updateBehaviorCount = (behaviorId: string, count: number) => {
    setSelectedBehaviors(prev => 
      prev.map(b => b.behaviorId === behaviorId ? { ...b, count } : b)
    );
  };

  // Update behavior duration
  const updateBehaviorDuration = (behaviorId: string, durationSeconds: number | undefined) => {
    setSelectedBehaviors(prev => 
      prev.map(b => b.behaviorId === behaviorId ? { ...b, durationSeconds } : b)
    );
  };

  // Get behavior name by ID
  const getBehaviorName = (behaviorId: string) => {
    return student.behaviors.find(b => b.id === behaviorId)?.name || 'Unknown';
  };

  // Handle adding a new behavior
  const handleAddNewBehavior = () => {
    if (!newBehaviorName.trim()) {
      toast.error('Please enter a behavior name');
      return;
    }

    addBehaviorWithMethods(student.id, newBehaviorName.trim(), newBehaviorMethods, {
      operationalDefinition: newBehaviorDefinition.trim() || undefined,
    });

    toast.success(`Behavior "${newBehaviorName}" added`);
    setNewBehaviorName('');
    setNewBehaviorMethods(['frequency']);
    setNewBehaviorDefinition('');
    setShowAddBehavior(false);
  };

  // Handle adding custom antecedent
  const handleAddCustomAntecedent = () => {
    if (!customAntecedent.trim()) return;
    addCustomAntecedent(student.id, customAntecedent.trim());
    setAntecedent(customAntecedent.trim());
    setCustomAntecedent('');
    toast.success('Custom antecedent added');
  };

  // Handle adding custom consequence
  const handleAddCustomConsequence = () => {
    if (!customConsequence.trim()) return;
    addCustomConsequence(student.id, customConsequence.trim());
    setConsequence(customConsequence.trim());
    setCustomConsequence('');
    toast.success('Custom consequence added');
  };

  // Submit frequency entries
  const handleSubmitFrequency = () => {
    if (selectedBehaviors.length === 0) {
      toast.error('Please select at least one behavior');
      return;
    }

    const timestamp = parseLocalDate(date, time);
    const durationMinutes = observationDuration ? parseFloat(observationDuration) : undefined;

    selectedBehaviors.forEach(selection => {
      addHistoricalFrequency({
        studentId: student.id,
        behaviorId: selection.behaviorId,
        count: selection.count,
        timestamp,
        observationDurationMinutes: durationMinutes,
      });
    });

    toast.success(`Added ${selectedBehaviors.length} frequency ${selectedBehaviors.length === 1 ? 'entry' : 'entries'}`);
    resetForm();
  };

  // Submit duration entries
  const handleSubmitDuration = () => {
    if (selectedBehaviors.length === 0) {
      toast.error('Please select at least one behavior');
      return;
    }

    const timestamp = parseLocalDate(date, time);

    selectedBehaviors.forEach(selection => {
      if (selection.durationSeconds && selection.durationSeconds > 0) {
        addHistoricalDuration({
          studentId: student.id,
          behaviorId: selection.behaviorId,
          durationSeconds: selection.durationSeconds,
          timestamp,
        });
      }
    });

    const validEntries = selectedBehaviors.filter(b => b.durationSeconds && b.durationSeconds > 0);
    if (validEntries.length === 0) {
      toast.error('Please enter duration for at least one behavior');
      return;
    }

    toast.success(`Added ${validEntries.length} duration ${validEntries.length === 1 ? 'entry' : 'entries'}`);
    resetForm();
  };

  // Submit ABC entries
  const handleSubmitABC = () => {
    if (selectedBehaviors.length === 0) {
      toast.error('Please select at least one behavior');
      return;
    }

    if (!antecedent) {
      toast.error('Please select an antecedent');
      return;
    }

    if (!consequence) {
      toast.error('Please select a consequence');
      return;
    }

    const timestamp = parseLocalDate(date, time);

    // Create ABC entry with multiple behaviors
    if (selectedBehaviors.length === 1) {
      const selection = selectedBehaviors[0];
      addABCEntry({
        studentId: student.id,
        behaviorId: selection.behaviorId,
        antecedent,
        behavior: getBehaviorName(selection.behaviorId),
        consequence,
        frequencyCount: selection.count,
        hasDuration: selection.durationSeconds !== undefined && selection.durationSeconds > 0,
        durationMinutes: selection.durationSeconds ? selection.durationSeconds / 60 : undefined,
        timestamp, // Include historical timestamp
      } as any);
    } else {
      // For multiple behaviors, create entries for each
      selectedBehaviors.forEach(selection => {
        addABCEntry({
          studentId: student.id,
          behaviorId: selection.behaviorId,
          antecedent,
          behavior: getBehaviorName(selection.behaviorId),
          consequence,
          frequencyCount: selection.count,
          hasDuration: selection.durationSeconds !== undefined && selection.durationSeconds > 0,
          durationMinutes: selection.durationSeconds ? selection.durationSeconds / 60 : undefined,
          timestamp, // Include historical timestamp
        } as any);
      });
    }

    toast.success(`Added ABC ${selectedBehaviors.length === 1 ? 'entry' : 'entries'} for ${selectedBehaviors.length} behavior${selectedBehaviors.length === 1 ? '' : 's'}`);
    resetForm();
  };

  // Reset form after submission
  const resetForm = () => {
    setSelectedBehaviors([]);
    setObservationDuration('');
    setNotes('');
    setAntecedent('');
    setConsequence('');
  };

  // Calculate rate for display
  const calculateRate = (count: number) => {
    if (!observationDuration || parseFloat(observationDuration) <= 0) return null;
    return (count / (parseFloat(observationDuration) / 60)).toFixed(1);
  };

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const activeBehaviors = student.behaviors.filter(b => !b.isArchived && !b.isMastered);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Add Historical / External Data</CardTitle>
            <CardDescription>
              Manually add data collected outside the system or from past sessions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Type Tabs */}
        <Tabs value={entryType} onValueChange={(v) => setEntryType(v as EntryType)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="frequency" className="gap-1">
              <TrendingUp className="w-3 h-3" />
              Frequency
            </TabsTrigger>
            <TabsTrigger value="duration" className="gap-1">
              <Timer className="w-3 h-3" />
              Duration
            </TabsTrigger>
            <TabsTrigger value="abc" className="gap-1">
              <FileText className="w-3 h-3" />
              ABC
            </TabsTrigger>
          </TabsList>

          {/* Common Fields */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Behavior Selection */}
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <Label>Behaviors (select one or more)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddBehavior(true)}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                New Behavior
              </Button>
            </div>
            
            {activeBehaviors.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No behaviors configured</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowAddBehavior(true)}
                >
                  Add a behavior
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-md p-3">
                <div className="space-y-2">
                  {activeBehaviors.map((behavior) => {
                    const isSelected = selectedBehaviors.some(b => b.behaviorId === behavior.id);
                    const selection = selectedBehaviors.find(b => b.behaviorId === behavior.id);
                    
                    return (
                      <div 
                        key={behavior.id} 
                        className={`p-3 rounded-lg border transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-secondary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleBehavior(behavior.id)}
                          />
                          <div className="flex-1">
                            <span className="font-medium">{behavior.name}</span>
                            {behavior.operationalDefinition && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {behavior.operationalDefinition}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="ml-auto">
                              {entryType === 'duration' 
                                ? (selection?.durationSeconds ? formatDuration(selection.durationSeconds) : 'Set duration')
                                : `×${selection?.count || 1}`
                              }
                            </Badge>
                          )}
                        </div>
                        
                        {/* Per-behavior options when selected */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t flex flex-wrap gap-3">
                            {entryType !== 'duration' && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Count:</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  className="w-20 h-8"
                                  value={selection?.count || 1}
                                  onChange={(e) => updateBehaviorCount(behavior.id, parseInt(e.target.value) || 1)}
                                />
                              </div>
                            )}
                            
                            {(entryType === 'duration' || entryType === 'abc') && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Duration:</Label>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-16 h-8"
                                    placeholder="min"
                                    value={selection?.durationSeconds ? Math.floor(selection.durationSeconds / 60) : ''}
                                    onChange={(e) => {
                                      const mins = parseInt(e.target.value) || 0;
                                      const currentSecs = (selection?.durationSeconds || 0) % 60;
                                      updateBehaviorDuration(behavior.id, mins * 60 + currentSecs);
                                    }}
                                  />
                                  <span className="text-xs text-muted-foreground">m</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="59"
                                    className="w-16 h-8"
                                    placeholder="sec"
                                    value={selection?.durationSeconds ? (selection.durationSeconds % 60) : ''}
                                    onChange={(e) => {
                                      const secs = parseInt(e.target.value) || 0;
                                      const currentMins = Math.floor((selection?.durationSeconds || 0) / 60);
                                      updateBehaviorDuration(behavior.id, currentMins * 60 + Math.min(secs, 59));
                                    }}
                                  />
                                  <span className="text-xs text-muted-foreground">s</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            
            {selectedBehaviors.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                {selectedBehaviors.length} behavior{selectedBehaviors.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {/* Frequency-specific fields */}
          <TabsContent value="frequency" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Observation Duration (optional)</span>
                <span className="text-xs text-muted-foreground font-normal">For rate calculation</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g., 30"
                  value={observationDuration}
                  onChange={(e) => setObservationDuration(e.target.value)}
                  className="flex-1"
                />
                <span className="flex items-center text-sm text-muted-foreground">minutes</span>
              </div>
              {observationDuration && selectedBehaviors.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {selectedBehaviors.map(sel => {
                    const rate = calculateRate(sel.count);
                    return rate ? (
                      <p key={sel.behaviorId}>
                        {getBehaviorName(sel.behaviorId)}: {rate}/hr
                      </p>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleSubmitFrequency}
              disabled={selectedBehaviors.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Add Frequency Data
            </Button>
          </TabsContent>

          {/* Duration-specific fields */}
          <TabsContent value="duration" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Enter the duration for each selected behavior above.
            </p>

            <Button
              className="w-full"
              onClick={handleSubmitDuration}
              disabled={selectedBehaviors.length === 0 || !selectedBehaviors.some(b => b.durationSeconds && b.durationSeconds > 0)}
            >
              <Save className="w-4 h-4 mr-2" />
              Add Duration Data
            </Button>
          </TabsContent>

          {/* ABC-specific fields */}
          <TabsContent value="abc" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Antecedent (A)</Label>
              </div>
              <Select value={antecedent} onValueChange={setAntecedent}>
                <SelectTrigger>
                  <SelectValue placeholder="What happened before?" />
                </SelectTrigger>
                <SelectContent>
                  {allAntecedents.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom antecedent..."
                  value={customAntecedent}
                  onChange={(e) => setCustomAntecedent(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomAntecedent}
                  disabled={!customAntecedent.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Consequence (C)</Label>
              <Select value={consequence} onValueChange={setConsequence}>
                <SelectTrigger>
                  <SelectValue placeholder="What happened after?" />
                </SelectTrigger>
                <SelectContent>
                  {allConsequences.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom consequence..."
                  value={customConsequence}
                  onChange={(e) => setCustomConsequence(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomConsequence}
                  disabled={!customConsequence.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: You can set count and duration per-behavior in the selection above.
            </p>

            <Button
              className="w-full"
              onClick={handleSubmitABC}
              disabled={selectedBehaviors.length === 0 || !antecedent || !consequence}
            >
              <Save className="w-4 h-4 mr-2" />
              Add ABC Entry
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Add New Behavior Dialog */}
      <Dialog open={showAddBehavior} onOpenChange={setShowAddBehavior}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Behavior</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Behavior Name *</Label>
              <Input
                placeholder="e.g., Hand flapping, Verbal protest"
                value={newBehaviorName}
                onChange={(e) => setNewBehaviorName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Collection Methods</Label>
              <div className="flex flex-wrap gap-2">
                {(['frequency', 'duration', 'interval', 'abc'] as DataCollectionMethod[]).map((method) => (
                  <label key={method} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={newBehaviorMethods.includes(method)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewBehaviorMethods(prev => [...prev, method]);
                        } else {
                          setNewBehaviorMethods(prev => prev.filter(m => m !== method));
                        }
                      }}
                    />
                    <span className="text-sm capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Operational Definition (optional)</Label>
              <Textarea
                placeholder="Define the behavior in observable, measurable terms..."
                value={newBehaviorDefinition}
                onChange={(e) => setNewBehaviorDefinition(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBehavior(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewBehavior} disabled={!newBehaviorName.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Add Behavior
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
