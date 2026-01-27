import { useState } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDataStore } from '@/store/dataStore';
import { IntervalEntry } from '@/types/behavior';

interface IntervalGridProps {
  studentId: string;
  behaviorId: string;
  studentColor: string;
  totalIntervals: number;
  currentInterval: number;
  isRunning: boolean;
}

export function IntervalGrid({ 
  studentId, 
  behaviorId, 
  studentColor, 
  totalIntervals, 
  currentInterval,
  isRunning
}: IntervalGridProps) {
  const { getIntervalData, recordInterval } = useDataStore();
  const [editingInterval, setEditingInterval] = useState<number | null>(null);
  
  const intervalData = getIntervalData(studentId, behaviorId);

  const handleCorrection = (intervalNumber: number, occurred: boolean) => {
    recordInterval(studentId, behaviorId, intervalNumber, occurred);
    setEditingInterval(null);
  };

  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: totalIntervals }).map((_, i) => {
        const entry = intervalData.find(e => e.intervalNumber === i);
        const isCurrent = i === currentInterval && isRunning;
        const isPast = i < currentInterval || entry !== undefined;
        
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
                  ${entry?.occurred === true ? 'bg-success text-success-foreground' : ''}
                  ${entry?.occurred === false ? 'bg-destructive/30 text-destructive' : ''}
                  ${entry === undefined && !isCurrent ? 'bg-muted text-muted-foreground' : ''}
                  ${isCurrent && !entry ? 'bg-primary/20 text-primary' : ''}
                `}
                title={isPast ? "Click to correct" : ""}
              >
                {i + 1}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="center">
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground text-center mb-1">
                  Correct Interval {i + 1}
                </p>
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
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
