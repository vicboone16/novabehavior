import { useState } from 'react';
import { Student, DataCollectionMethod, METHOD_LABELS } from '@/types/behavior';
import { FrequencyTracker } from './FrequencyTracker';
import { DurationTracker } from './DurationTracker';
import { ABCTracker } from './ABCTracker';
import { IntervalTracker } from './IntervalTracker';
import { User, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { useSyncedIntervalState } from './SyncedIntervalController';

interface StudentDataCardProps {
  student: Student;
}

const DEFAULT_ORDER: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];

export function StudentDataCard({ student }: StudentDataCardProps) {
  const { getTrackerOrder, setTrackerOrder, syncedIntervalsRunning } = useDataStore();
  const { syncedInterval, syncedTime } = useSyncedIntervalState();
  
  const [order, setOrder] = useState<DataCollectionMethod[]>(() => 
    getTrackerOrder(student.id) || DEFAULT_ORDER
  );

  // Get behaviors by method type (accounting for multi-method behaviors)
  const getBehaviorsForMethod = (method: DataCollectionMethod) => {
    return student.behaviors.filter(b => 
      (b.methods || [b.type]).includes(method)
    );
  };

  const frequencyBehaviors = getBehaviorsForMethod('frequency');
  const durationBehaviors = getBehaviorsForMethod('duration');
  const abcBehaviors = getBehaviorsForMethod('abc');
  const intervalBehaviors = getBehaviorsForMethod('interval');

  const hasBehaviors = student.behaviors.length > 0;

  const moveUp = (method: DataCollectionMethod) => {
    const idx = order.indexOf(method);
    if (idx > 0) {
      const newOrder = [...order];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      setOrder(newOrder);
      setTrackerOrder(student.id, newOrder);
    }
  };

  const moveDown = (method: DataCollectionMethod) => {
    const idx = order.indexOf(method);
    if (idx < order.length - 1) {
      const newOrder = [...order];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      setOrder(newOrder);
      setTrackerOrder(student.id, newOrder);
    }
  };

  const renderTrackerSection = (method: DataCollectionMethod, index: number) => {
    let behaviors: typeof student.behaviors = [];
    let TrackerComponent: React.ComponentType<any> | null = null;
    
    switch (method) {
      case 'frequency':
        behaviors = frequencyBehaviors;
        TrackerComponent = FrequencyTracker;
        break;
      case 'duration':
        behaviors = durationBehaviors;
        TrackerComponent = DurationTracker;
        break;
      case 'interval':
        behaviors = intervalBehaviors;
        break;
      case 'abc':
        behaviors = abcBehaviors;
        TrackerComponent = ABCTracker;
        break;
    }

    if (behaviors.length === 0) return null;

    return (
      <div key={method} className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {METHOD_LABELS[method]}
            </h4>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => moveUp(method)}
              disabled={index === 0}
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => moveDown(method)}
              disabled={index === order.length - 1}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {method === 'interval' ? (
          behaviors.map(behavior => (
            <IntervalTracker 
              key={behavior.id}
              studentId={student.id}
              behavior={behavior}
              studentColor={student.color}
              syncedMode={syncedIntervalsRunning}
              syncedRunning={syncedIntervalsRunning}
              syncedInterval={syncedInterval}
              syncedTime={syncedTime}
            />
          ))
        ) : (
          behaviors.map(behavior => (
            TrackerComponent && (
              <TrackerComponent 
                key={behavior.id}
                studentId={student.id}
                behavior={behavior}
                studentColor={student.color}
              />
            )
          ))
        )}
      </div>
    );
  };

  // Filter order to only show methods that have behaviors
  const activeOrder = order.filter(method => {
    switch (method) {
      case 'frequency': return frequencyBehaviors.length > 0;
      case 'duration': return durationBehaviors.length > 0;
      case 'interval': return intervalBehaviors.length > 0;
      case 'abc': return abcBehaviors.length > 0;
      default: return false;
    }
  });

  return (
    <div className="student-card">
      {/* Header */}
      <div 
        className="flex items-center gap-3 pb-3 mb-3 border-b border-border"
        style={{ borderBottomColor: `${student.color}30` }}
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${student.color}20` }}
        >
          <User className="w-5 h-5" style={{ color: student.color }} />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{student.name}</h3>
          <p className="text-xs text-muted-foreground">
            {student.behaviors.length} behaviors configured
          </p>
        </div>
      </div>

      {!hasBehaviors && (
        <p className="text-center text-muted-foreground py-6 text-sm">
          No behaviors configured for this student.
          <br />
          Use "Manage Behaviors" to add some.
        </p>
      )}

      {/* Render trackers in order */}
      {activeOrder.map((method, index) => renderTrackerSection(method, index))}
    </div>
  );
}
