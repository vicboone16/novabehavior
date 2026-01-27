import { useState } from 'react';
import { Student, DataCollectionMethod, METHOD_LABELS } from '@/types/behavior';
import { FrequencyTracker } from './FrequencyTracker';
import { DurationTracker } from './DurationTracker';
import { ABCTracker } from './ABCTracker';
import { CompactIntervalTracker } from './CompactIntervalTracker';
import { 
  User, 
  ChevronUp, 
  ChevronDown, 
  ChevronRight,
  GripVertical, 
  Minimize2, 
  Maximize2,
  Eye,
  EyeOff 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDataStore } from '@/store/dataStore';
import { useSyncedIntervalState } from './SyncedIntervalController';

interface CompactStudentCardProps {
  student: Student;
}

const DEFAULT_ORDER: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];

export function CompactStudentCard({ student }: CompactStudentCardProps) {
  const { 
    getTrackerOrder, 
    setTrackerOrder, 
    syncedIntervalsRunning,
    isMethodCollapsed,
    toggleMethodCollapsed,
    isBehaviorCollapsed,
    toggleBehaviorCollapsed,
    collapseAllForStudent,
    expandAllForStudent,
  } = useDataStore();
  const { syncedInterval, syncedTime } = useSyncedIntervalState();
  
  const [order, setOrder] = useState<DataCollectionMethod[]>(() => 
    getTrackerOrder(student.id) || DEFAULT_ORDER
  );

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

  // Count collapsed items for summary
  const collapsedMethodsCount = DEFAULT_ORDER.filter(m => isMethodCollapsed(student.id, m)).length;
  const collapsedBehaviorsCount = student.behaviors.filter(b => isBehaviorCollapsed(student.id, b.id)).length;

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

  const renderBehaviorItem = (
    behavior: typeof student.behaviors[0], 
    TrackerComponent: React.ComponentType<any> | null,
    method: DataCollectionMethod
  ) => {
    const isCollapsed = isBehaviorCollapsed(student.id, behavior.id);
    
    if (method === 'interval') {
      return (
        <Collapsible key={behavior.id} open={!isCollapsed}>
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => toggleBehaviorCollapsed(student.id, behavior.id)}
              >
                <ChevronRight className={`w-3 h-3 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <span className="text-xs font-medium truncate flex-1">{behavior.name}</span>
            {isCollapsed && (
              <Badge variant="outline" className="text-[9px] h-4 px-1">hidden</Badge>
            )}
          </div>
          <CollapsibleContent>
            <CompactIntervalTracker 
              studentId={student.id}
              behavior={behavior}
              studentColor={student.color}
              syncedMode={syncedIntervalsRunning}
              syncedRunning={syncedIntervalsRunning}
              syncedInterval={syncedInterval}
              syncedTime={syncedTime}
            />
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Collapsible key={behavior.id} open={!isCollapsed}>
        <div className="flex items-center gap-1">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => toggleBehaviorCollapsed(student.id, behavior.id)}
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <span className="text-xs font-medium truncate flex-1">{behavior.name}</span>
          {isCollapsed && (
            <Badge variant="outline" className="text-[9px] h-4 px-1">hidden</Badge>
          )}
        </div>
        <CollapsibleContent>
          {TrackerComponent && (
            <TrackerComponent 
              studentId={student.id}
              behavior={behavior}
              studentColor={student.color}
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    );
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

    const isCollapsed = isMethodCollapsed(student.id, method);
    const visibleBehaviors = behaviors.filter(b => !isBehaviorCollapsed(student.id, b.id));

    return (
      <Collapsible key={method} open={!isCollapsed}>
        <div className="flex items-center justify-between bg-secondary/30 rounded-md px-2 py-1">
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => toggleMethodCollapsed(student.id, method)}
              >
                <ChevronRight className={`w-3 h-3 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <GripVertical className="w-3 h-3 text-muted-foreground" />
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {METHOD_LABELS[method]}
            </h4>
            <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1">
              {visibleBehaviors.length}/{behaviors.length}
            </Badge>
          </div>
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={() => moveUp(method)}
              disabled={index === 0}
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={() => moveDown(method)}
              disabled={index === order.length - 1}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <CollapsibleContent className="space-y-1 mt-1 pl-2">
          {behaviors.map(behavior => renderBehaviorItem(behavior, TrackerComponent, method))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

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
    <div className="bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col">
      {/* Sticky Header */}
      <div 
        className="sticky top-0 z-10 flex items-center gap-2 p-3 border-b bg-card"
        style={{ borderBottomColor: `${student.color}40` }}
      >
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${student.color}20` }}
        >
          <User className="w-4 h-4" style={{ color: student.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground text-sm truncate">{student.name}</h3>
          <p className="text-[10px] text-muted-foreground">
            {student.behaviors.length} behaviors
            {(collapsedMethodsCount > 0 || collapsedBehaviorsCount > 0) && (
              <span className="ml-1 text-warning">
                ({collapsedBehaviorsCount} hidden)
              </span>
            )}
          </p>
        </div>
        
        {/* Collapse/Expand All buttons */}
        <TooltipProvider>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => collapseAllForStudent(student.id)}
                >
                  <Minimize2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Minimize all
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => expandAllForStudent(student.id)}
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Expand all
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!hasBehaviors && (
          <p className="text-center text-muted-foreground py-4 text-xs">
            No behaviors configured.
            <br />
            Use "Manage Behaviors" to add.
          </p>
        )}

        {activeOrder.map((method, index) => renderTrackerSection(method, index))}
      </div>
    </div>
  );
}
