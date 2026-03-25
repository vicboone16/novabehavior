import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  History, Trash2, Pencil, Clock, TrendingUp, Save, X,
  ChevronDown, ChevronUp, AlertCircle, Filter
} from 'lucide-react';
import { HistoricalSyncStatusBadge } from '@/components/HistoricalSyncStatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { toast } from 'sonner';
import { useDataStore } from '@/store/dataStore';
import { FrequencyEntry } from '@/types/behavior';

interface HistoricalDataManagerProps {
  studentId: string;
}

export function HistoricalDataManager({ studentId }: HistoricalDataManagerProps) {
  const { 
    students,
    frequencyEntries,
    deleteFrequencyEntry,
    updateFrequencyEntry,
    durationEntries,
    deleteDurationEntry,
    intervalEntries,
    latencyEntries,
  } = useDataStore();
  
  const student = students.find(s => s.id === studentId);
  const [showManager, setShowManager] = useState(false);
  const [filterBehavior, setFilterBehavior] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editingEntry, setEditingEntry] = useState<FrequencyEntry | null>(null);
  const [editCount, setEditCount] = useState<number>(0);
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; desc: string } | null>(null);

  // Get all frequency entries for this student
  const studentFrequencyEntries = useMemo(() => {
    return frequencyEntries
      .filter(e => e.studentId === studentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [frequencyEntries, studentId]);

  // Get duration entries
  const studentDurationEntries = useMemo(() => {
    return durationEntries
      .filter(e => e.studentId === studentId && e.endTime)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [durationEntries, studentId]);

  // Get interval entries grouped by session/date
  const studentIntervalEntries = useMemo(() => {
    return intervalEntries
      .filter(e => e.studentId === studentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [intervalEntries, studentId]);

  // Get latency entries
  const studentLatencyEntries = useMemo(() => {
    return latencyEntries
      .filter(e => e.studentId === studentId)
      .sort((a, b) => new Date(b.antecedentTime).getTime() - new Date(a.antecedentTime).getTime());
  }, [latencyEntries, studentId]);

  if (!student) return null;

  const getBehaviorName = (behaviorId: string) => {
    return student.behaviors.find(b => b.id === behaviorId)?.name || `Needs Mapping (${behaviorId.slice(0, 6)})`;
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleEditFrequency = (entry: FrequencyEntry) => {
    setEditingEntry(entry);
    setEditCount(entry.count);
    setEditDuration(entry.observationDurationMinutes || 0);
    setEditDate(format(new Date(entry.timestamp), 'yyyy-MM-dd'));
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    
    updateFrequencyEntry(editingEntry.id, {
      count: editCount,
      observationDurationMinutes: editDuration || undefined,
      timestamp: new Date(editDate),
      timestamps: Array(editCount).fill(new Date(editDate)),
    });
    
    toast.success('Entry updated successfully');
    setEditingEntry(null);
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    
    if (confirmDelete.type === 'frequency') {
      deleteFrequencyEntry(confirmDelete.id);
      toast.success('Frequency entry deleted');
    } else if (confirmDelete.type === 'duration') {
      deleteDurationEntry(confirmDelete.id);
      toast.success('Duration entry deleted');
    }
    
    setConfirmDelete(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const calculateRate = (count: number, durationMinutes?: number) => {
    if (!durationMinutes || durationMinutes <= 0) return null;
    return (count / (durationMinutes / 60)).toFixed(1);
  };

  // Filter entries based on selections
  const filteredFrequency = studentFrequencyEntries.filter(e => 
    (filterBehavior === 'all' || e.behaviorId === filterBehavior) &&
    (filterType === 'all' || filterType === 'frequency')
  );

  const filteredDuration = studentDurationEntries.filter(e =>
    (filterBehavior === 'all' || e.behaviorId === filterBehavior) &&
    (filterType === 'all' || filterType === 'duration')
  );

  const totalEntries = filteredFrequency.length + filteredDuration.length;

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowManager(true)}
        className="gap-2"
      >
        <History className="w-4 h-4" />
        Manage Data
      </Button>

      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Historical Data Manager - {student.name}
              <HistoricalSyncStatusBadge studentId={studentId} className="ml-auto" />
            </DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="flex gap-3 pb-3 border-b">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
            </div>
            <Select value={filterBehavior} onValueChange={setFilterBehavior}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="All Behaviors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Behaviors</SelectItem>
                {student.behaviors.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="frequency">Frequency</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="interval">Interval</SelectItem>
                <SelectItem value="latency">Latency</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="ml-auto">
              {totalEntries} entries
            </Badge>
          </div>

          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div className="space-y-4 py-2">
              {/* Frequency Data */}
              {(filterType === 'all' || filterType === 'frequency') && filteredFrequency.length > 0 && (
                <Collapsible
                  open={expandedSections['frequency'] !== false}
                  onOpenChange={() => toggleSection('frequency')}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-secondary/50 rounded">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="font-medium">Frequency Data</span>
                      <Badge variant="secondary">{filteredFrequency.length}</Badge>
                    </div>
                    {expandedSections['frequency'] !== false ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {filteredFrequency.map(entry => {
                      const rate = calculateRate(entry.count, entry.observationDurationMinutes);
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{getBehaviorName(entry.behaviorId)}</Badge>
                              <span className="font-medium">{entry.count} occurrences</span>
                              {entry.isHistorical && (
                                <Badge variant="secondary" className="text-xs">Historical</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{format(new Date(entry.timestamp), 'MMM d, yyyy')}</span>
                              {entry.observationDurationMinutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {entry.observationDurationMinutes} min
                                </span>
                              )}
                              {rate && (
                                <Badge variant="outline" className="text-xs">
                                  {rate}/hr
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditFrequency(entry)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete({
                                type: 'frequency',
                                id: entry.id,
                                desc: `${entry.count} occurrences of ${getBehaviorName(entry.behaviorId)} on ${format(new Date(entry.timestamp), 'MMM d, yyyy')}`
                              })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Duration Data */}
              {(filterType === 'all' || filterType === 'duration') && filteredDuration.length > 0 && (
                <Collapsible
                  open={expandedSections['duration'] !== false}
                  onOpenChange={() => toggleSection('duration')}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-secondary/50 rounded">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-medium">Duration Data</span>
                      <Badge variant="secondary">{filteredDuration.length}</Badge>
                    </div>
                    {expandedSections['duration'] !== false ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {filteredDuration.map(entry => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{getBehaviorName(entry.behaviorId)}</Badge>
                            <span className="font-medium">{formatDuration(entry.duration)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(entry.startTime), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setConfirmDelete({
                              type: 'duration',
                              id: entry.id,
                              desc: `${formatDuration(entry.duration)} of ${getBehaviorName(entry.behaviorId)}`
                            })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Empty state */}
              {totalEntries === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No data entries found</p>
                  <p className="text-sm">Add data through tracking or historical entry</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManager(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Frequency Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Frequency Entry</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Behavior</Label>
              <Input 
                value={editingEntry ? getBehaviorName(editingEntry.behaviorId) : ''} 
                disabled 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Count</Label>
              <Input
                type="number"
                min="1"
                value={editCount}
                onChange={(e) => setEditCount(parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Observation Duration (minutes)</Label>
              <Input
                type="number"
                min="0"
                value={editDuration}
                onChange={(e) => setEditDuration(parseInt(e.target.value) || 0)}
                placeholder="Optional - for rate calculation"
              />
              {editDuration > 0 && (
                <p className="text-xs text-muted-foreground">
                  Rate: {calculateRate(editCount, editDuration)}/hr
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete Entry"
        description={`Are you sure you want to delete this entry? ${confirmDelete?.desc}`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}
