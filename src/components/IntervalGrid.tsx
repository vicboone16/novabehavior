import { useState } from 'react';
import { Check, X, Minus, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDataStore } from '@/store/dataStore';
import { IntervalEntry } from '@/types/behavior';
import { BulkVoidDialog } from './BulkVoidDialog';

interface IntervalGridProps {
  studentId: string;
  behaviorId: string;
  studentColor: string;
  totalIntervals: number;
  currentInterval: number;
  isRunning: boolean;
  showBulkVoidButton?: boolean;
}

export function IntervalGrid({ 
  studentId, 
  behaviorId, 
  studentColor, 
  totalIntervals, 
  currentInterval,
  isRunning,
  showBulkVoidButton = false
}: IntervalGridProps) {
  const { getIntervalData, recordInterval, voidInterval, unvoidInterval, isIntervalVoided } = useDataStore();
  const [editingInterval, setEditingInterval] = useState<number | null>(null);
  const [showBulkVoid, setShowBulkVoid] = useState(false);
  
  const intervalData = getIntervalData(studentId, behaviorId);

  const handleCorrection = (intervalNumber: number, occurred: boolean) => {
    recordInterval(studentId, behaviorId, intervalNumber, occurred);
    setEditingInterval(null);
  };

  const handleVoid = (intervalNumber: number) => {
    voidInterval(studentId, behaviorId, intervalNumber, 'not_present');
    setEditingInterval(null);
  };

  const handleUnvoid = (intervalNumber: number) => {
    unvoidInterval(studentId, behaviorId, intervalNumber);
    setEditingInterval(null);
  };

  const handleBulkVoid = (startInterval: number, endInterval: number, reason: IntervalEntry['voidReason'], customReason?: string) => {
    for (let i = startInterval; i <= endInterval; i++) {
      voidInterval(studentId, behaviorId, i, reason, customReason);
    }
  };

  const handleBulkClear = (startInterval: number, endInterval: number) => {
    for (let i = startInterval; i <= endInterval; i++) {
      unvoidInterval(studentId, behaviorId, i);
    }
  };
  return (
    <>
      <div className="space-y-2">
        {showBulkVoidButton && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setShowBulkVoid(true)}
          >
            <Ban className="w-3 h-3 mr-1" />
            Bulk Void
          </Button>
        )}
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: totalIntervals }).map((_, i) => {
            const entry = intervalData.find(e => e.intervalNumber === i);
            const isCurrent = i === currentInterval && isRunning;
            const isPast = i < currentInterval || entry !== undefined;
            const isVoided = entry?.voided || false;
            
            return (
              <Popover 
                key={i} 
                open={editingInterval === i} 
                onOpenChange={(open) => setEditingInterval(open ? i : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    className={`
                      w-6 h-6 rounded text-xs flex items-center justify-center font-medium
                      transition-all cursor-pointer hover:ring-2 hover:ring-primary/50
                      ${isCurrent ? 'ring-2 ring-primary ring-offset-1 animate-pulse' : ''}
                      ${isVoided ? 'bg-muted/50 text-muted-foreground line-through opacity-50' : ''}
                      ${!isVoided && entry?.occurred === true ? 'bg-success text-success-foreground' : ''}
                      ${!isVoided && entry?.occurred === false ? 'bg-destructive/30 text-destructive' : ''}
                      ${!isVoided && entry === undefined && !isCurrent ? 'bg-muted text-muted-foreground' : ''}
                      ${!isVoided && isCurrent && !entry ? 'bg-primary/20 text-primary' : ''}
                    `}
                    title={isVoided ? `N/A: ${entry?.voidReason?.replace('_', ' ')}` : isPast ? "Click to correct" : ""}
                  >
                    {isVoided ? <Minus className="w-3 h-3" /> : i + 1}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="center">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground text-center mb-1">
                      {isVoided ? `Interval ${i + 1} (Voided)` : `Correct Interval ${i + 1}`}
                    </p>
                    {isVoided ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnvoid(i)}
                      >
                        Restore Interval
                      </Button>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            style={{ backgroundColor: studentColor }}
                            onClick={() => handleCorrection(i, true)}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Yes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleCorrection(i, false)}
                          >
                            <X className="w-3 h-3 mr-1" />
                            No
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => handleVoid(i)}
                        >
                          <Minus className="w-3 h-3 mr-1" />
                          Mark N/A
                        </Button>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </div>

      <BulkVoidDialog
        open={showBulkVoid}
        onOpenChange={setShowBulkVoid}
        totalIntervals={totalIntervals}
        onApply={handleBulkVoid}
        onClear={handleBulkClear}
      />
    </>
  );
}
