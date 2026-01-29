import { useState } from 'react';
import { Plus, Minus, RotateCcw, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FrequencyTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function FrequencyTracker({ studentId, behavior, studentColor }: FrequencyTrackerProps) {
  const { 
    incrementFrequency, 
    decrementFrequency, 
    resetFrequency, 
    getFrequencyCount,
    frequencyEntries,
    markDataCollected,
    isDataCollected,
  } = useDataStore();
  
  const count = getFrequencyCount(studentId, behavior.id);
  const dataCollected = isDataCollected(studentId, behavior.id);
  const [showEntries, setShowEntries] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Get entry for this student/behavior
  const entry = frequencyEntries.find(
    e => e.studentId === studentId && e.behaviorId === behavior.id
  );
  const timestamps = entry?.timestamps || [];

  const handleReset = () => {
    resetFrequency(studentId, behavior.id);
    setConfirmReset(false);
  };

  const handleRemoveTimestamp = (index: number) => {
    // Remove one occurrence by decrementing
    decrementFrequency(studentId, behavior.id);
  };

  const handleDataCollectedToggle = (checked: boolean) => {
    markDataCollected(studentId, behavior.id, checked);
  };

  return (
    <div className="bg-secondary/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{behavior.name}</span>
        <div className="flex gap-1">
          {timestamps.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={() => setShowEntries(true)}
            >
              <Clock className="w-3 h-3" />
              View
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={() => count > 0 ? setConfirmReset(true) : null}
            disabled={count === 0}
          >
            <RotateCcw className="w-3 h-3 text-muted-foreground" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0"
          onClick={() => decrementFrequency(studentId, behavior.id)}
          disabled={count === 0}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <div 
          className="flex-1 h-12 rounded-lg flex items-center justify-center counter-display text-foreground font-bold"
          style={{ 
            backgroundColor: `${studentColor}20`,
            border: `2px solid ${studentColor}40`
          }}
        >
          {count}
        </div>
        <Button
          size="sm"
          className="h-10 w-10 p-0"
          style={{ 
            backgroundColor: studentColor,
            color: 'white'
          }}
          onClick={() => incrementFrequency(studentId, behavior.id)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Data Collected Toggle - only show when count is 0 */}
      {count === 0 && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`data-collected-${behavior.id}`}
                    checked={dataCollected}
                    onCheckedChange={handleDataCollectedToggle}
                  />
                  <label 
                    htmlFor={`data-collected-${behavior.id}`}
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Zero recorded (data collected)
                  </label>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs">
                  Check this if you collected data and zero instances occurred. 
                  Leave unchecked if no data was collected for this behavior.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Entries Dialog */}
      <Dialog open={showEntries} onOpenChange={setShowEntries}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Frequency Log - {behavior.name}</span>
              <Badge variant="secondary">{count}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-1 py-2">
            {timestamps.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No occurrences recorded
              </p>
            ) : (
              timestamps
                .map((ts, idx) => ({ ts, idx }))
                .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
                .map(({ ts, idx }, displayIdx) => (
                  <div
                    key={`${idx}-${displayIdx}`}
                    className="flex items-center justify-between py-2 px-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6">
                        #{count - displayIdx}
                      </span>
                      <span className="text-sm">
                        {format(new Date(ts), 'h:mm:ss a')}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveTimestamp(idx)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEntries(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation */}
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset Frequency Count"
        description={`Are you sure you want to reset the count for "${behavior.name}"? This will remove all ${count} recorded occurrences.`}
        confirmLabel="Reset"
        onConfirm={handleReset}
        variant="destructive"
      />
    </div>
  );
}
