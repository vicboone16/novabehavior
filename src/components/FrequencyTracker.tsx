import { Plus, Minus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface FrequencyTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function FrequencyTracker({ studentId, behavior, studentColor }: FrequencyTrackerProps) {
  const { incrementFrequency, decrementFrequency, resetFrequency, getFrequencyCount } = useDataStore();
  const count = getFrequencyCount(studentId, behavior.id);

  return (
    <div className="bg-secondary/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{behavior.name}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0"
          onClick={() => resetFrequency(studentId, behavior.id)}
        >
          <RotateCcw className="w-3 h-3 text-muted-foreground" />
        </Button>
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
          className="flex-1 h-12 rounded-lg flex items-center justify-center counter-display"
          style={{ 
            backgroundColor: `${studentColor}20`,
            color: studentColor,
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
    </div>
  );
}
