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
  FUNCTION_OPTIONS,
  BehaviorFunction,
  DataCollectionMethod 
} from '@/types/behavior';

interface HistoricalDataEntryProps {
  student: Student;
}

interface BehaviorSelection {
  behaviorId: string;
  count: number;
  durationSeconds?: number;
  linkDuration?: boolean; // Link frequency and duration together
  dataStatus?: 'collected' | 'zero' | 'no_data'; // Zero = behavior not observed, No Data = data not collected
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
  
  // ABC-specific fields - now multi-select
  const [selectedAntecedents, setSelectedAntecedents] = useState<string[]>([]);
  const [selectedConsequences, setSelectedConsequences] = useState<string[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<BehaviorFunction[]>([]);
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
        return [...prev, { behaviorId, count: 1, dataStatus: 'collected' }];
      }
    });
  };

  // Update behavior data status (collected, zero, no_data)
  const updateBehaviorDataStatus = (behaviorId: string, status: 'collected' | 'zero' | 'no_data') => {
    setSelectedBehaviors(prev => 
      prev.map(b => b.behaviorId === behaviorId ? { 
        ...b, 
        dataStatus: status,
        count: status === 'zero' ? 0 : (status === 'no_data' ? 0 : b.count),
      } : b)
    );
  };

  // Toggle duration linking
  const toggleDurationLink = (behaviorId: string) => {
    setSelectedBehaviors(prev => 
      prev.map(b => b.behaviorId === behaviorId ? { ...b, linkDuration: !b.linkDuration } : b)
    );
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
    setSelectedAntecedents(prev => [...prev, customAntecedent.trim()]);
    setCustomAntecedent('');
    toast.success('Custom antecedent added');
  };

  // Handle adding custom consequence
  const handleAddCustomConsequence = () => {
    if (!customConsequence.trim()) return;
    addCustomConsequence(student.id, customConsequence.trim());
    setSelectedConsequences(prev => [...prev, customConsequence.trim()]);
    setCustomConsequence('');
    toast.success('Custom consequence added');
  };

  // Toggle functions for multi-select
  const toggleAntecedent = (a: string) => {
    setSelectedAntecedents(prev => 
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  const toggleConsequence = (c: string) => {
    setSelectedConsequences(prev => 
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const toggleFunction = (f: BehaviorFunction) => {
    setSelectedFunctions(prev => 
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  // Submit frequency entries
  const handleSubmitFrequency = () => {
    if (selectedBehaviors.length === 0) {
      toast.error('Please select at least one behavior');
      return;
    }

    const timestamp = parseLocalDate(date, time);
    const durationMinutes = observationDuration ? parseFloat(observationDuration) : undefined;

    let addedCount = 0;
    let skippedNoData = 0;

    selectedBehaviors.forEach(selection => {
      // Skip "no data" entries - they don't get recorded
      if (selection.dataStatus === 'no_data') {
        skippedNoData++;
        return;
      }

      // Add frequency entry (including zero counts)
      addHistoricalFrequency({
        studentId: student.id,
        behaviorId: selection.behaviorId,
        count: selection.dataStatus === 'zero' ? 0 : selection.count,
        timestamp,
        observationDurationMinutes: durationMinutes,
      });

      // If duration is linked, also add duration entry
      if (selection.linkDuration && selection.durationSeconds && selection.durationSeconds > 0) {
        addHistoricalDuration({
          studentId: student.id,
          behaviorId: selection.behaviorId,
          durationSeconds: selection.durationSeconds,
          timestamp,
        });
      }

      addedCount++;
    });

    if (addedCount === 0 && skippedNoData > 0) {
      toast.info(`${skippedNoData} behavior(s) marked as "No Data" were not recorded`);
    } else {
      toast.success(`Added ${addedCount} frequency ${addedCount === 1 ? 'entry' : 'entries'}${skippedNoData > 0 ? ` (${skippedNoData} skipped - no data)` : ''}`);
    }
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

    if (selectedAntecedents.length === 0) {
      toast.error('Please select at least one antecedent');
      return;
    }

    if (selectedConsequences.length === 0) {
      toast.error('Please select at least one consequence');
      return;
    }

    const timestamp = parseLocalDate(date, time);
    
    // Generate a concurrent group ID if multiple behaviors are being recorded together
    const isConcurrent = selectedBehaviors.length > 1;
    const concurrentGroupId = isConcurrent ? `concurrent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : undefined;

    // Create ABC entry for each behavior
    selectedBehaviors.forEach(selection => {
      addABCEntry({
        studentId: student.id,
        behaviorId: selection.behaviorId,
        antecedent: selectedAntecedents[0], // Primary for legacy
        antecedents: selectedAntecedents,
        behavior: getBehaviorName(selection.behaviorId),
        consequence: selectedConsequences[0], // Primary for legacy
        consequences: selectedConsequences,
        functions: selectedFunctions.length > 0 ? selectedFunctions : undefined,
        frequencyCount: selection.count,
        hasDuration: selection.durationSeconds !== undefined && selection.durationSeconds > 0,
        durationMinutes: selection.durationSeconds ? selection.durationSeconds / 60 : undefined,
        isConcurrent,
        concurrentGroupId,
        timestamp, // Include historical timestamp
      } as any);
    });

    toast.success(`Added ABC ${selectedBehaviors.length === 1 ? 'entry' : 'entries'} for ${selectedBehaviors.length} behavior${selectedBehaviors.length === 1 ? '' : 's'}${isConcurrent ? ' (concurrent)' : ''}`);
    resetForm();
  };

  // Reset form after submission
  const resetForm = () => {
    setSelectedBehaviors([]);
    setObservationDuration('');
    setNotes('');
    setSelectedAntecedents([]);
    setSelectedConsequences([]);
    setSelectedFunctions([]);
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

  // Check if any data has been entered
  const hasEnteredData = selectedBehaviors.length > 0 || observationDuration || notes || selectedAntecedents.length > 0 || selectedConsequences.length > 0;

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
          {hasEnteredData && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              className="gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
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
                            <Badge 
                              variant={selection?.dataStatus === 'no_data' ? 'outline' : selection?.dataStatus === 'zero' ? 'secondary' : 'secondary'} 
                              className={`ml-auto ${selection?.dataStatus === 'no_data' ? 'text-muted-foreground' : ''}`}
                            >
                              {selection?.dataStatus === 'no_data' 
                                ? 'No Data'
                                : selection?.dataStatus === 'zero'
                                  ? 'Zero'
                                  : entryType === 'duration' 
                                    ? (selection?.durationSeconds ? formatDuration(selection.durationSeconds) : 'Set duration')
                                    : `×${selection?.count || 1}`
                              }
                            </Badge>
                          )}
                        </div>
                        
                        {/* Per-behavior options when selected */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t space-y-3">
                            {/* Data Status Row - for frequency tab */}
                            {entryType === 'frequency' && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Label className="text-xs text-muted-foreground">Status:</Label>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant={selection?.dataStatus !== 'zero' && selection?.dataStatus !== 'no_data' ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={() => updateBehaviorDataStatus(behavior.id, 'collected')}
                                  >
                                    Collected
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={selection?.dataStatus === 'zero' ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={() => updateBehaviorDataStatus(behavior.id, 'zero')}
                                  >
                                    Zero (Not Observed)
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={selection?.dataStatus === 'no_data' ? 'secondary' : 'outline'}
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={() => updateBehaviorDataStatus(behavior.id, 'no_data')}
                                  >
                                    No Data
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Count and Duration Row */}
                            <div className="flex flex-wrap gap-3">
                              {entryType !== 'duration' && selection?.dataStatus !== 'zero' && selection?.dataStatus !== 'no_data' && (
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
                              
                              {/* Duration linking for frequency mode */}
                              {entryType === 'frequency' && selection?.dataStatus !== 'zero' && selection?.dataStatus !== 'no_data' && (
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`link-duration-${behavior.id}`}
                                    checked={selection?.linkDuration || false}
                                    onCheckedChange={() => toggleDurationLink(behavior.id)}
                                  />
                                  <Label htmlFor={`link-duration-${behavior.id}`} className="text-xs cursor-pointer">
                                    Include Duration
                                  </Label>
                                </div>
                              )}
                              
                              {/* Duration input - show for duration tab, ABC tab, or when linked in frequency tab */}
                              {(entryType === 'duration' || entryType === 'abc' || (entryType === 'frequency' && selection?.linkDuration)) && (
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
            {/* Antecedents - Multi-select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-antecedent">Antecedent(s)</Label>
                {selectedAntecedents.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedAntecedents.length} selected
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allAntecedents.map((a) => {
                  const isCustom = !ANTECEDENT_OPTIONS.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() => toggleAntecedent(a)}
                      className={`
                        px-3 py-1.5 text-sm rounded-md transition-all border
                        ${selectedAntecedents.includes(a) 
                          ? 'bg-antecedent text-antecedent-foreground border-antecedent' 
                          : 'bg-secondary hover:bg-antecedent/20 border-border'}
                        ${isCustom ? 'ring-1 ring-primary/30' : ''}
                      `}
                    >
                      {a}
                      {isCustom && <span className="ml-1 text-xs opacity-70">★</span>}
                      {selectedAntecedents.includes(a) && <Check className="w-3 h-3 ml-1 inline" />}
                    </button>
                  );
                })}
              </div>
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

            {/* Consequences - Multi-select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-consequence">Consequence(s)</Label>
                {selectedConsequences.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedConsequences.length} selected
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allConsequences.map((c) => {
                  const isCustom = !CONSEQUENCE_OPTIONS.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleConsequence(c)}
                      className={`
                        px-3 py-1.5 text-sm rounded-md transition-all border
                        ${selectedConsequences.includes(c) 
                          ? 'bg-consequence text-consequence-foreground border-consequence' 
                          : 'bg-secondary hover:bg-consequence/20 border-border'}
                        ${isCustom ? 'ring-1 ring-primary/30' : ''}
                      `}
                    >
                      {c}
                      {isCustom && <span className="ml-1 text-xs opacity-70">★</span>}
                      {selectedConsequences.includes(c) && <Check className="w-3 h-3 ml-1 inline" />}
                    </button>
                  );
                })}
              </div>
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

            {/* Functions - Multi-select */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hypothesized Function(s) - Optional</Label>
                {selectedFunctions.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedFunctions.length} selected
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {FUNCTION_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleFunction(value)}
                    className={`
                      px-3 py-1.5 text-sm rounded-md transition-all border
                      ${selectedFunctions.includes(value) 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-secondary hover:bg-primary/20 border-border'}
                    `}
                  >
                    {label}
                    {selectedFunctions.includes(value) && <Check className="w-3 h-3 ml-1 inline" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 bg-secondary/50 p-2 rounded">
              <p><strong>Concurrent behaviors:</strong> When multiple behaviors happen at once, each gets its own entry marked as "concurrent" for accurate de-duplication in reports.</p>
              <p><strong>Frequency per behavior:</strong> Set the count for each behavior to reflect how many times it occurred (e.g., if one behavior happened 3× during an episode).</p>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmitABC}
              disabled={selectedBehaviors.length === 0 || selectedAntecedents.length === 0 || selectedConsequences.length === 0}
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
