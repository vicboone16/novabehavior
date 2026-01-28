import { useState, useMemo } from 'react';
import { 
  Target, Link, Unlink, Calendar, CheckCircle2, TrendingUp, 
  Activity, FileText, ChevronDown, ChevronUp, Plus, Trash2, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useDataStore } from '@/store/dataStore';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { 
  BehaviorGoal, 
  GoalDirection, 
  GoalMetric, 
  Student, 
  FrequencyEntry,
  ABCEntry,
  IntervalEntry,
  DurationEntry,
  LatencyEntry
} from '@/types/behavior';

interface EnhancedGoalBuilderProps {
  student: Student;
  goal?: BehaviorGoal;
  onSave: (goal: Partial<BehaviorGoal>) => void;
  onClose: () => void;
}

export function EnhancedGoalBuilder({ student, goal, onSave, onClose }: EnhancedGoalBuilderProps) {
  const { toast } = useToast();
  const { 
    frequencyEntries, 
    abcEntries, 
    intervalEntries, 
    durationEntries,
    latencyEntries,
    behaviorGoals,
  } = useDataStore();

  // Form state
  const [behaviorId, setBehaviorId] = useState(goal?.behaviorId || '');
  const [goalStatement, setGoalStatement] = useState(goal?.notes || '');
  const [direction, setDirection] = useState<GoalDirection>(goal?.direction || 'decrease');
  const [metric, setMetric] = useState<GoalMetric>(goal?.metric || 'frequency');
  const [targetValue, setTargetValue] = useState(goal?.targetValue?.toString() || '');
  const [baseline, setBaseline] = useState(goal?.baseline?.toString() || '');
  const [masteryCriteria, setMasteryCriteria] = useState(goal?.masteryCriteria || '');
  const [measurementType, setMeasurementType] = useState(goal?.measurementType || '');
  const [reviewDate, setReviewDate] = useState(goal?.reviewDate ? format(new Date(goal.reviewDate), 'yyyy-MM-dd') : '');
  const [introducedDate, setIntroducedDate] = useState(goal?.introducedDate ? format(new Date(goal.introducedDate), 'yyyy-MM-dd') : '');
  const [dataStartDate, setDataStartDate] = useState(goal?.dataCollectionStartDate ? format(new Date(goal.dataCollectionStartDate), 'yyyy-MM-dd') : '');
  
  // Smart linking state
  const [linkedBehaviorData, setLinkedBehaviorData] = useState<string[]>(goal?.linkedBehaviorData || []);
  const [linkedABCData, setLinkedABCData] = useState<string[]>(goal?.linkedABCData || []);
  const [linkedReplacementSkill, setLinkedReplacementSkill] = useState(goal?.linkedReplacementSkill || '');
  const [linkedInterventionFidelity, setLinkedInterventionFidelity] = useState<string[]>(goal?.linkedInterventionFidelity || []);
  
  // Linking mode state
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [linkDateFrom, setLinkDateFrom] = useState('');
  const [linkDateTo, setLinkDateTo] = useState('');
  const [selectedDataType, setSelectedDataType] = useState<'frequency' | 'abc' | 'interval' | 'duration' | 'latency'>('frequency');

  // Get available data for linking
  const availableFrequencyData = useMemo(() => {
    return frequencyEntries.filter(e => 
      e.studentId === student.id && 
      (!behaviorId || e.behaviorId === behaviorId)
    );
  }, [frequencyEntries, student.id, behaviorId]);

  const availableABCData = useMemo(() => {
    return abcEntries.filter(e => 
      e.studentId === student.id && 
      (!behaviorId || e.behaviorId === behaviorId)
    );
  }, [abcEntries, student.id, behaviorId]);

  const availableIntervalData = useMemo(() => {
    return intervalEntries.filter(e => 
      e.studentId === student.id && 
      (!behaviorId || e.behaviorId === behaviorId)
    );
  }, [intervalEntries, student.id, behaviorId]);

  const availableDurationData = useMemo(() => {
    return durationEntries.filter(e => 
      e.studentId === student.id && 
      (!behaviorId || e.behaviorId === behaviorId)
    );
  }, [durationEntries, student.id, behaviorId]);

  const availableLatencyData = useMemo(() => {
    return latencyEntries.filter(e => 
      e.studentId === student.id && 
      (!behaviorId || e.behaviorId === behaviorId)
    );
  }, [latencyEntries, student.id, behaviorId]);

  // Filter data by date range
  const filteredDataByDate = useMemo(() => {
    if (!linkDateFrom && !linkDateTo) {
      return {
        frequency: availableFrequencyData,
        abc: availableABCData,
        interval: availableIntervalData,
        duration: availableDurationData,
        latency: availableLatencyData,
      };
    }

    const fromDate = linkDateFrom ? startOfDay(parseISO(linkDateFrom)) : new Date(0);
    const toDate = linkDateTo ? endOfDay(parseISO(linkDateTo)) : new Date();

    const filterByDateRange = <T extends { timestamp: Date } | { startTime: Date } | { antecedentTime: Date }>(
      entries: T[],
      getDate: (e: T) => Date
    ) => entries.filter(e => {
      const date = getDate(e);
      return isWithinInterval(new Date(date), { start: fromDate, end: toDate });
    });

    return {
      frequency: filterByDateRange(availableFrequencyData, e => new Date(e.timestamp)),
      abc: filterByDateRange(availableABCData, e => new Date(e.timestamp)),
      interval: filterByDateRange(availableIntervalData, e => new Date(e.timestamp)),
      duration: filterByDateRange(availableDurationData, e => new Date(e.startTime)),
      latency: filterByDateRange(availableLatencyData, e => new Date(e.antecedentTime)),
    };
  }, [linkDateFrom, linkDateTo, availableFrequencyData, availableABCData, availableIntervalData, availableDurationData, availableLatencyData]);

  // Get replacement skill candidates (other behaviors of the student)
  const replacementSkillCandidates = useMemo(() => {
    return student.behaviors.filter(b => b.id !== behaviorId);
  }, [student.behaviors, behaviorId]);

  const handleLinkAllInRange = () => {
    switch (selectedDataType) {
      case 'frequency':
        setLinkedBehaviorData(prev => [
          ...new Set([...prev, ...filteredDataByDate.frequency.map(e => e.id)])
        ]);
        break;
      case 'abc':
        setLinkedABCData(prev => [
          ...new Set([...prev, ...filteredDataByDate.abc.map(e => e.id)])
        ]);
        break;
    }
    toast({ title: 'Data linked', description: 'All data in range has been linked to this goal.' });
  };

  const handleUnlinkAllInRange = () => {
    const idsToRemove = new Set(
      selectedDataType === 'frequency' 
        ? filteredDataByDate.frequency.map(e => e.id)
        : filteredDataByDate.abc.map(e => e.id)
    );
    
    if (selectedDataType === 'frequency') {
      setLinkedBehaviorData(prev => prev.filter(id => !idsToRemove.has(id)));
    } else {
      setLinkedABCData(prev => prev.filter(id => !idsToRemove.has(id)));
    }
    toast({ title: 'Data unlinked', description: 'All data in range has been unlinked from this goal.' });
  };

  const handleSave = () => {
    if (!behaviorId) {
      toast({ title: 'Error', description: 'Please select a behavior', variant: 'destructive' });
      return;
    }

    const goalData: Partial<BehaviorGoal> = {
      behaviorId,
      direction,
      metric,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      baseline: baseline ? parseFloat(baseline) : undefined,
      notes: goalStatement,
      masteryCriteria,
      measurementType,
      reviewDate: reviewDate ? new Date(reviewDate) : undefined,
      introducedDate: introducedDate ? new Date(introducedDate) : undefined,
      dataCollectionStartDate: dataStartDate ? new Date(dataStartDate) : undefined,
      linkedBehaviorData,
      linkedABCData,
      linkedReplacementSkill: linkedReplacementSkill && linkedReplacementSkill !== 'none' ? linkedReplacementSkill : undefined,
      linkedInterventionFidelity,
    };

    onSave(goalData);
    toast({ title: 'Goal saved', description: 'The goal has been saved successfully.' });
    onClose();
  };

  const getBehaviorName = (id: string) => student.behaviors.find(b => b.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="basic">Goal Details</TabsTrigger>
          <TabsTrigger value="criteria">Criteria & Dates</TabsTrigger>
          <TabsTrigger value="linking">Smart Linking</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          {/* Behavior Selection */}
          <div className="space-y-2">
            <Label>Target Behavior *</Label>
            <Select value={behaviorId} onValueChange={setBehaviorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select behavior" />
              </SelectTrigger>
              <SelectContent>
                {student.behaviors.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Goal Statement */}
          <div className="space-y-2">
            <Label>Goal Statement</Label>
            <Textarea
              placeholder="e.g., Student will reduce hitting behavior to 0 occurrences per day across 5 consecutive school days."
              value={goalStatement}
              onChange={(e) => setGoalStatement(e.target.value)}
              rows={3}
            />
          </div>

          {/* Direction and Metric */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v: GoalDirection) => setDirection(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">↑ Increase</SelectItem>
                  <SelectItem value="decrease">↓ Decrease</SelectItem>
                  <SelectItem value="maintain">→ Maintain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metric</Label>
              <Select value={metric} onValueChange={(v: GoalMetric) => setMetric(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frequency">Frequency (count)</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="rate">Rate (per minute)</SelectItem>
                  <SelectItem value="latency">Latency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target and Baseline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Value</Label>
              <Input
                type="number"
                placeholder="e.g., 0"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Baseline</Label>
              <Input
                type="number"
                placeholder="e.g., 15"
                value={baseline}
                onChange={(e) => setBaseline(e.target.value)}
              />
            </div>
          </div>

          {/* Replacement Skill */}
          <div className="space-y-2">
            <Label>Linked Replacement Skill</Label>
            <Select value={linkedReplacementSkill} onValueChange={setLinkedReplacementSkill}>
              <SelectTrigger>
                <SelectValue placeholder="Select replacement skill (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {replacementSkillCandidates.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Link a positive behavior to track as a replacement</p>
          </div>
        </TabsContent>

        <TabsContent value="criteria" className="space-y-4 mt-4">
          {/* Mastery Criteria */}
          <div className="space-y-2">
            <Label>Mastery Criteria</Label>
            <Textarea
              placeholder="e.g., 3 consecutive sessions at or below target, across 2 different settings"
              value={masteryCriteria}
              onChange={(e) => setMasteryCriteria(e.target.value)}
              rows={2}
            />
          </div>

          {/* Measurement Type */}
          <div className="space-y-2">
            <Label>Measurement Type</Label>
            <Select value={measurementType} onValueChange={setMeasurementType}>
              <SelectTrigger>
                <SelectValue placeholder="Select measurement type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frequency">Frequency Count</SelectItem>
                <SelectItem value="partial-interval">Partial Interval Recording</SelectItem>
                <SelectItem value="whole-interval">Whole Interval Recording</SelectItem>
                <SelectItem value="momentary">Momentary Time Sampling</SelectItem>
                <SelectItem value="duration">Duration Recording</SelectItem>
                <SelectItem value="latency">Latency Recording</SelectItem>
                <SelectItem value="abc">ABC Recording</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Introduced Date</Label>
              <Input
                type="date"
                value={introducedDate}
                onChange={(e) => setIntroducedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Collection Start</Label>
              <Input
                type="date"
                value={dataStartDate}
                onChange={(e) => setDataStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Review Date</Label>
              <Input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="linking" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link className="w-4 h-4" />
                Smart Data Linking
              </CardTitle>
              <CardDescription>
                Link historical or upcoming session data to this goal for tracking and reporting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range Filter */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">From Date</Label>
                  <Input
                    type="date"
                    value={linkDateFrom}
                    onChange={(e) => setLinkDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">To Date</Label>
                  <Input
                    type="date"
                    value={linkDateTo}
                    onChange={(e) => setLinkDateTo(e.target.value)}
                  />
                </div>
              </div>

              {/* Data Type Selector */}
              <div className="flex flex-wrap gap-2">
                {(['frequency', 'abc', 'interval', 'duration', 'latency'] as const).map(type => (
                  <Badge
                    key={type}
                    variant={selectedDataType === type ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedDataType(type)}
                  >
                    {type === 'abc' ? 'ABC' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Badge>
                ))}
              </div>

              {/* Link/Unlink Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleLinkAllInRange}>
                  <Link className="w-3 h-3 mr-1" />
                  Link All in Range
                </Button>
                <Button variant="outline" size="sm" onClick={handleUnlinkAllInRange}>
                  <Unlink className="w-3 h-3 mr-1" />
                  Unlink All in Range
                </Button>
              </div>

              {/* Currently Linked Summary */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm font-medium">Currently Linked</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">
                    <Activity className="w-3 h-3 mr-1" />
                    {linkedBehaviorData.length} frequency entries
                  </Badge>
                  <Badge variant="secondary">
                    <FileText className="w-3 h-3 mr-1" />
                    {linkedABCData.length} ABC entries
                  </Badge>
                  {linkedReplacementSkill && (
                    <Badge variant="secondary">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Replacement: {getBehaviorName(linkedReplacementSkill)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Data Preview */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>Preview Data ({
                      selectedDataType === 'frequency' ? filteredDataByDate.frequency.length :
                      selectedDataType === 'abc' ? filteredDataByDate.abc.length :
                      selectedDataType === 'interval' ? filteredDataByDate.interval.length :
                      selectedDataType === 'duration' ? filteredDataByDate.duration.length :
                      filteredDataByDate.latency.length
                    } entries)</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="h-48 mt-2">
                    <div className="space-y-1">
                      {selectedDataType === 'frequency' && filteredDataByDate.frequency.map(entry => (
                        <div 
                          key={entry.id} 
                          className={`flex items-center justify-between p-2 rounded text-xs ${
                            linkedBehaviorData.includes(entry.id) ? 'bg-primary/10' : 'bg-muted/30'
                          }`}
                        >
                          <span>{format(new Date(entry.timestamp), 'MMM d, yyyy')} - Count: {entry.count}</span>
                          <Checkbox
                            checked={linkedBehaviorData.includes(entry.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setLinkedBehaviorData(prev => [...prev, entry.id]);
                              } else {
                                setLinkedBehaviorData(prev => prev.filter(id => id !== entry.id));
                              }
                            }}
                          />
                        </div>
                      ))}
                      {selectedDataType === 'abc' && filteredDataByDate.abc.map(entry => (
                        <div 
                          key={entry.id} 
                          className={`flex items-center justify-between p-2 rounded text-xs ${
                            linkedABCData.includes(entry.id) ? 'bg-primary/10' : 'bg-muted/30'
                          }`}
                        >
                          <span className="truncate max-w-[200px]">
                            {format(new Date(entry.timestamp), 'MMM d')} - {entry.antecedent} → {entry.consequence}
                          </span>
                          <Checkbox
                            checked={linkedABCData.includes(entry.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setLinkedABCData(prev => [...prev, entry.id]);
                              } else {
                                setLinkedABCData(prev => prev.filter(id => id !== entry.id));
                              }
                            }}
                          />
                        </div>
                      ))}
                      {selectedDataType === 'interval' && filteredDataByDate.interval.slice(0, 50).map(entry => (
                        <div key={entry.id} className="p-2 rounded text-xs bg-muted/30">
                          {format(new Date(entry.timestamp), 'MMM d')} - Interval #{entry.intervalNumber + 1}: {entry.occurred ? 'Yes' : 'No'}
                        </div>
                      ))}
                      {selectedDataType === 'duration' && filteredDataByDate.duration.map(entry => (
                        <div key={entry.id} className="p-2 rounded text-xs bg-muted/30">
                          {format(new Date(entry.startTime), 'MMM d')} - {Math.round(entry.duration / 60)}min
                        </div>
                      ))}
                      {selectedDataType === 'latency' && filteredDataByDate.latency.map(entry => (
                        <div key={entry.id} className="p-2 rounded text-xs bg-muted/30">
                          {format(new Date(entry.antecedentTime), 'MMM d')} - {entry.latencySeconds}s
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Save Goal
        </Button>
      </div>
    </div>
  );
}
