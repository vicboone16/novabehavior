import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Grid3X3, CheckCircle, XCircle, MinusCircle, Save, X, Ban, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Student, Behavior, IntervalEntry, Session } from '@/types/behavior';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BulkVoidDialog } from './BulkVoidDialog';

interface HistoricalSessionEditorProps {
  student: Student;
  session: Session;
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

export function HistoricalSessionEditor({ student, session, open, onOpenChange }: HistoricalSessionEditorProps) {
  const [intervalData, setIntervalData] = useState<Record<string, IntervalData[]>>({});
  const [showBulkVoid, setShowBulkVoid] = useState(false);
  const [bulkVoidBehaviorId, setBulkVoidBehaviorId] = useState<string | null>(null);

  // Get interval entries for this student from the session
  const studentIntervalEntries = useMemo(() => {
    return session.intervalEntries.filter(e => e.studentId === student.id);
  }, [session, student.id]);

  // Get unique behavior IDs from the session's interval entries
  const behaviorIds = useMemo(() => {
    return [...new Set(studentIntervalEntries.map(e => e.behaviorId))];
  }, [studentIntervalEntries]);

  // Calculate number of intervals per behavior
  const intervalsPerBehavior = useMemo(() => {
    const counts: Record<string, number> = {};
    behaviorIds.forEach(behaviorId => {
      const entries = studentIntervalEntries.filter(e => e.behaviorId === behaviorId);
      counts[behaviorId] = entries.length;
    });
    return counts;
  }, [behaviorIds, studentIntervalEntries]);

  // Initialize interval data from session
  useEffect(() => {
    if (open && studentIntervalEntries.length > 0) {
      const data: Record<string, IntervalData[]> = {};
      
      behaviorIds.forEach(behaviorId => {
        const entries = studentIntervalEntries
          .filter(e => e.behaviorId === behaviorId)
          .sort((a, b) => a.intervalNumber - b.intervalNumber);
        
        data[behaviorId] = entries.map(entry => ({
          intervalNumber: entry.intervalNumber,
          status: entry.voided ? 'voided' : (entry.occurred ? 'occurred' : 'not_occurred'),
          voidReason: entry.voidReason,
        }));
      });
      
      setIntervalData(data);
    }
  }, [open, studentIntervalEntries, behaviorIds]);

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

  const markAllAs = (behaviorId: string, status: IntervalStatus) => {
    setIntervalData(prev => {
      const numIntervals = intervalsPerBehavior[behaviorId] || 0;
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

  const handleBulkVoid = (startInterval: number, endInterval: number, reason: IntervalEntry['voidReason'], customReason?: string) => {
    if (!bulkVoidBehaviorId) return;
    
    setIntervalData(prev => {
      const behaviorIntervals = [...(prev[bulkVoidBehaviorId] || [])];
      for (let i = startInterval; i <= endInterval; i++) {
        if (behaviorIntervals[i]) {
          behaviorIntervals[i] = {
            ...behaviorIntervals[i],
            status: 'voided',
            voidReason: reason,
          };
        }
      }
      return { ...prev, [bulkVoidBehaviorId]: behaviorIntervals };
    });
  };

  const handleBulkClear = (startInterval: number, endInterval: number) => {
    if (!bulkVoidBehaviorId) return;
    
    setIntervalData(prev => {
      const behaviorIntervals = [...(prev[bulkVoidBehaviorId] || [])];
      for (let i = startInterval; i <= endInterval; i++) {
        if (behaviorIntervals[i]) {
          behaviorIntervals[i] = {
            ...behaviorIntervals[i],
            status: 'not_occurred',
            voidReason: undefined,
          };
        }
      }
      return { ...prev, [bulkVoidBehaviorId]: behaviorIntervals };
    });
  };

  const handleSave = () => {
    // Update the session's interval entries
    useDataStore.setState((state) => {
      const updatedSessions = state.sessions.map(s => {
        if (s.id !== session.id) return s;
        
        const updatedIntervalEntries = s.intervalEntries.map(entry => {
          if (entry.studentId !== student.id) return entry;
          
          const behaviorData = intervalData[entry.behaviorId];
          if (!behaviorData) return entry;
          
          const intervalDataEntry = behaviorData.find(d => d.intervalNumber === entry.intervalNumber);
          if (!intervalDataEntry) return entry;
          
          return {
            ...entry,
            occurred: intervalDataEntry.status === 'occurred',
            voided: intervalDataEntry.status === 'voided',
            voidReason: intervalDataEntry.status === 'voided' ? intervalDataEntry.voidReason : undefined,
          };
        });
        
        return { ...s, intervalEntries: updatedIntervalEntries };
      });
      
      return { sessions: updatedSessions };
    });

    toast.success('Session updated successfully');
    onOpenChange(false);
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

  if (behaviorIds.length === 0) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Historical Session - {student.displayName || student.name}
            </DialogTitle>
            <DialogDescription>
              Session from {format(new Date(session.date), 'PPP p')}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {behaviorIds.map((behaviorId) => {
                const behavior = student.behaviors.find(b => b.id === behaviorId);
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
                        <CardTitle className="text-base">{behavior?.name || 'Unknown Behavior'}</CardTitle>
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
                      <div className="flex gap-2 mt-2 flex-wrap">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBulkVoidBehaviorId(behaviorId);
                            setShowBulkVoid(true);
                          }}
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          Bulk Void Range
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
                      <div className="flex gap-4 mt-4 text-xs text-muted-foreground flex-wrap">
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

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {bulkVoidBehaviorId && (
        <BulkVoidDialog
          open={showBulkVoid}
          onOpenChange={setShowBulkVoid}
          totalIntervals={intervalsPerBehavior[bulkVoidBehaviorId] || 0}
          onApply={handleBulkVoid}
          onClear={handleBulkClear}
        />
      )}
    </>
  );
}
