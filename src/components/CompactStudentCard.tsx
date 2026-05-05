import { useState, useMemo } from 'react';
import { Student, DataCollectionMethod, METHOD_LABELS, calculateAge, getZodiacSign, ZODIAC_SYMBOLS, ZODIAC_LABELS } from '@/types/behavior';
import { FrequencyTracker } from './FrequencyTracker';
import { DurationTracker } from './DurationTracker';
import { ABCTracker } from './ABCTracker';
import { CompactIntervalTracker } from './CompactIntervalTracker';
import { CompactSkillTracker } from './CompactSkillTracker';
import { SkillTargetSessionSelector } from './SkillTargetSessionSelector';
import { SessionEndFlow } from './SessionEndFlow';
import { 
  User, 
  ChevronUp, 
  ChevronDown, 
  ChevronRight,
  GripVertical, 
  Minimize2, 
  Maximize2,
  Filter,
  RotateCcw,
  Pause,
  Play,
  Square,
  Clock,
  Target,
  Expand
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDataStore } from '@/store/dataStore';
import { useSyncedIntervalState } from './SyncedIntervalController';
import { toast } from '@/hooks/use-toast';

interface CompactStudentCardProps {
  student: Student;
  onExpand?: () => void;
}

const DEFAULT_ORDER: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];
const ALL_METHODS: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];

export function CompactStudentCard({ student, onExpand }: CompactStudentCardProps) {
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
    sessionFocus,
    isSessionBehaviorActive,
    getSessionBehaviorMethods,
    isStudentMethodActive,
    toggleStudentMethod,
    getActiveStudentMethods,
    resetStudentMethods,
    pauseStudentSession,
    resumeStudentSession,
    endStudentSession,
    isStudentSessionPaused,
    isStudentSessionEnded,
    getStudentSessionStatus,
    resetStudentSessionStatus,
    addDTTSession,
    getStudentTargetSelection,
  } = useDataStore();
  const { syncedInterval, syncedTime } = useSyncedIntervalState();
  
  const [order, setOrder] = useState<DataCollectionMethod[]>(() => 
    getTrackerOrder(student.id) || DEFAULT_ORDER
  );
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // Only show targets in active phases during sessions — hides baseline, generalization, mastered
  const skillTargets = (student.skillTargets || []).filter(
    t => t.status === 'acquisition' || t.status === 'maintenance'
  );
  const [activeSkillTargetIds, setActiveSkillTargetIds] = useState<string[]>(
    () => {
      const stored = getStudentTargetSelection(student.id);
      if (stored !== undefined) return stored;
      return skillTargets.map(t => t.id);
    }
  );
  const dttSessions = student.dttSessions || [];

  const isPaused = isStudentSessionPaused(student.id);
  const hasEnded = isStudentSessionEnded(student.id);
  const sessionStatus = getStudentSessionStatus(student.id);

  // Filter behaviors based on session focus mode and student method toggles
  const getActiveBehaviorsForMethod = (method: DataCollectionMethod) => {
    // First check if this method is enabled for this student
    if (!isStudentMethodActive(student.id, method)) return [];
    
    return student.behaviors.filter(b => {
      const behaviorMethods = b.methods || [b.type];
      if (!behaviorMethods.includes(method)) return false;
      
      // Check session focus mode
      if (sessionFocus.enabled) {
        if (!isSessionBehaviorActive(student.id, b.id)) return false;
        const activeMethods = getSessionBehaviorMethods(student.id, b.id);
        if (!activeMethods.includes(method)) return false;
      }
      
      return true;
    });
  };

  const activeStudentMethods = getActiveStudentMethods(student.id);
  const hasMethodFilter = activeStudentMethods.length < ALL_METHODS.length;

  const frequencyBehaviors = getActiveBehaviorsForMethod('frequency');
  const durationBehaviors = getActiveBehaviorsForMethod('duration');
  const abcBehaviors = getActiveBehaviorsForMethod('abc');
  const intervalBehaviors = getActiveBehaviorsForMethod('interval');

  const hasBehaviors = student.behaviors.length > 0;
  const hasVisibleBehaviors = frequencyBehaviors.length + durationBehaviors.length + abcBehaviors.length + intervalBehaviors.length > 0;

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

  const formatPauseDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const totalPauseTime = sessionStatus?.pauseDurations.reduce((sum, d) => sum + d, 0) || 0;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden h-full flex flex-col ${
      hasEnded ? 'border-muted opacity-60' : isPaused ? 'border-warning' : 'border-border'
    }`}>
      {/* Session Status Banner */}
      {(isPaused || hasEnded) && (
        <div className={`px-3 py-1.5 text-xs font-medium flex items-center justify-between ${
          hasEnded ? 'bg-muted text-muted-foreground' : 'bg-warning/20 text-warning-foreground'
        }`}>
          <div className="flex items-center gap-1.5">
            {hasEnded ? (
              <>
                <Square className="w-3 h-3" />
                <span>Session Ended</span>
                {sessionStatus?.effectiveSessionMinutes !== undefined && (
                  <span className="text-[10px] opacity-70">
                    ({sessionStatus.effectiveSessionMinutes.toFixed(1)} min effective)
                  </span>
                )}
              </>
            ) : (
              <>
                <Pause className="w-3 h-3" />
                <span>Paused</span>
                {totalPauseTime > 0 && (
                  <span className="text-[10px] opacity-70">
                    (total: {formatPauseDuration(totalPauseTime)})
                  </span>
                )}
              </>
            )}
          </div>
          {hasEnded ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px]"
              onClick={() => resetStudentSessionStatus(student.id)}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px]"
              onClick={() => resumeStudentSession(student.id)}
            >
              <Play className="w-3 h-3 mr-1" />
              Resume
            </Button>
          )}
        </div>
      )}

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
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-foreground text-sm truncate">
              {student.displayName || student.name}
            </h3>
            {student.dateOfBirth && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm cursor-help" title={ZODIAC_LABELS[getZodiacSign(new Date(student.dateOfBirth))]}>
                      {ZODIAC_SYMBOLS[getZodiacSign(new Date(student.dateOfBirth))]}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {ZODIAC_LABELS[getZodiacSign(new Date(student.dateOfBirth))]}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {student.dateOfBirth && (() => {
              const age = calculateAge(new Date(student.dateOfBirth));
              return `${age.years}y ${age.months}m • `;
            })()}
            {student.behaviors.length} behaviors
            {skillTargets.length > 0 && ` • ${skillTargets.length} skills`}
            {(collapsedMethodsCount > 0 || collapsedBehaviorsCount > 0) && (
              <span className="ml-1 text-warning">
                ({collapsedBehaviorsCount} hidden)
              </span>
            )}
          </p>
        </div>
        
        {/* Method Filter & Collapse/Expand buttons */}
        <TooltipProvider>
          <div className="flex gap-1">
            {/* Method Filter Popover */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant={hasMethodFilter ? "default" : "ghost"}
                      size="sm"
                      className={`h-6 w-6 p-0 ${hasMethodFilter ? 'bg-primary/80' : ''}`}
                    >
                      <Filter className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Filter methods
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Methods</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-xs"
                      onClick={() => resetStudentMethods(student.id)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                  {ALL_METHODS.map(method => {
                    const isActive = isStudentMethodActive(student.id, method);
                    const hasBehaviorsForMethod = student.behaviors.some(b => 
                      (b.methods || [b.type]).includes(method)
                    );
                    
                    if (!hasBehaviorsForMethod) return null;
                    
                    return (
                      <div key={method} className="flex items-center justify-between">
                        <Label className="text-xs cursor-pointer" htmlFor={`method-${student.id}-${method}`}>
                          {METHOD_LABELS[method]}
                        </Label>
                        <Switch
                          id={`method-${student.id}-${method}`}
                          checked={isActive}
                          onCheckedChange={() => toggleStudentMethod(student.id, method)}
                          className="scale-75"
                        />
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            
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

            {/* Expand to Full View */}
            {onExpand && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={onExpand}
                  >
                    <Expand className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Expand to full view
                </TooltipContent>
              </Tooltip>
            )}

            {/* Session Controls - Pause/End */}
            {!hasEnded && (
              <>
                <div className="w-px h-4 bg-border mx-1" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isPaused ? "default" : "ghost"}
                      size="sm"
                      className={`h-6 w-6 p-0 ${isPaused ? 'bg-warning text-warning-foreground' : ''}`}
                      onClick={() => isPaused ? resumeStudentSession(student.id) : pauseStudentSession(student.id)}
                    >
                      {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {isPaused ? 'Resume session' : 'Pause session'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => setShowEndConfirm(true)}
                    >
                      <Square className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    End session for this student
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Skill Acquisition Section */}
        {!hasEnded && skillTargets.length > 0 && (
          <Collapsible defaultOpen={activeSkillTargetIds.length > 0}>
            <div className="flex items-center justify-between bg-primary/10 rounded-md px-2 py-1">
              <div className="flex items-center gap-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                    <ChevronRight className="w-3 h-3 transition-transform data-[state=open]:rotate-90" />
                  </Button>
                </CollapsibleTrigger>
                <Target className="w-3 h-3 text-primary" />
                <h4 className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                  Skills
                </h4>
                <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1">
                  {activeSkillTargetIds.length}/{skillTargets.length}
                </Badge>
              </div>
              <SkillTargetSessionSelector
                skillTargets={skillTargets}
                activeTargetIds={activeSkillTargetIds}
                onToggleTarget={(id) => setActiveSkillTargetIds(prev => 
                  prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                )}
                onSelectAll={() => setActiveSkillTargetIds(skillTargets.map(t => t.id))}
                onDeselectAll={() => setActiveSkillTargetIds([])}
              />
            </div>
            <CollapsibleContent className="space-y-1 mt-1">
              {skillTargets.map(target => (
                <CompactSkillTracker
                  key={target.id}
                  studentId={student.id}
                  skillTarget={target}
                  studentColor={student.color}
                  sessions={dttSessions.filter(s => s.skillTargetId === target.id)}
                  activeTargetIds={activeSkillTargetIds}
                  onToggleActive={(id) => setActiveSkillTargetIds(prev => 
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                  )}
                  onAddTrial={() => {}}
                  onSaveSession={(session) => addDTTSession(student.id, session)}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {!hasBehaviors && skillTargets.length === 0 && (
          <p className="text-center text-muted-foreground py-4 text-xs">
            No behaviors or skills configured.
            <br />
            Use "Manage Behaviors" to add.
          </p>
        )}

        {hasBehaviors && !hasVisibleBehaviors && sessionFocus.enabled && (
          <p className="text-center text-muted-foreground py-4 text-xs">
            All behaviors hidden by Focus Mode.
            <br />
            Adjust settings to show behaviors.
          </p>
        )}

        {!hasEnded && activeOrder.map((method, index) => renderTrackerSection(method, index))}
        
        {hasEnded && (
          <div className="text-center py-8 text-muted-foreground">
            <Square className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Session Ended</p>
            <p className="text-xs mt-1">
              Data collection stopped for this student.
              <br />
              Click "Reset" above to resume.
            </p>
          </div>
        )}
      </div>

      {/* End Session Flow */}
      <SessionEndFlow
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        mode="single"
        singleStudentId={student.id}
        onComplete={() => {
          toast({
            title: 'Session Ended',
            description: `Session for ${student.displayName || student.name} has been completed.`,
          });
        }}
      />
    </div>
  );
}
