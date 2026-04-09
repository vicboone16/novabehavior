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
  ChevronRight,
  ChevronDown,
  Expand,
  Pause,
  Play,
  Square,
  RotateCcw,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDataStore } from '@/store/dataStore';
import { useSyncedIntervalState } from './SyncedIntervalController';
import { toast } from '@/hooks/use-toast';

interface HorizontalStudentRowProps {
  student: Student;
  onExpand?: () => void;
  defaultExpanded?: boolean;
}

const ALL_METHODS: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];

export function HorizontalStudentRow({ student, onExpand, defaultExpanded = true }: HorizontalStudentRowProps) {
  const { 
    syncedIntervalsRunning,
    sessionFocus,
    isSessionBehaviorActive,
    getSessionBehaviorMethods,
    isStudentMethodActive,
    pauseStudentSession,
    resumeStudentSession,
    isStudentSessionPaused,
    isStudentSessionEnded,
    getStudentSessionStatus,
    resetStudentSessionStatus,
    addDTTSession,
  } = useDataStore();
  const { syncedInterval, syncedTime } = useSyncedIntervalState();
  
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [activeSkillTargetIds, setActiveSkillTargetIds] = useState<string[]>(
    () => (student.skillTargets || []).map(t => t.id)
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['behaviors', 'skills']));

  const skillTargets = student.skillTargets || [];
  const dttSessions = student.dttSessions || [];

  const isPaused = isStudentSessionPaused(student.id);
  const hasEnded = isStudentSessionEnded(student.id);
  const sessionStatus = getStudentSessionStatus(student.id);

  // Filter behaviors based on session focus mode and student method toggles
  const getActiveBehaviorsForMethod = (method: DataCollectionMethod) => {
    if (!isStudentMethodActive(student.id, method)) return [];
    
    return student.behaviors.filter(b => {
      const behaviorMethods = b.methods || [b.type];
      if (!behaviorMethods.includes(method)) return false;
      
      if (sessionFocus.enabled) {
        if (!isSessionBehaviorActive(student.id, b.id)) return false;
        const activeMethods = getSessionBehaviorMethods(student.id, b.id);
        if (!activeMethods.includes(method)) return false;
      }
      
      return true;
    });
  };

  const frequencyBehaviors = getActiveBehaviorsForMethod('frequency');
  const durationBehaviors = getActiveBehaviorsForMethod('duration');
  const abcBehaviors = getActiveBehaviorsForMethod('abc');
  const intervalBehaviors = getActiveBehaviorsForMethod('interval');

  const hasBehaviors = student.behaviors.length > 0;
  const hasSkills = skillTargets.length > 0;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const totalPauseTime = sessionStatus?.pauseDurations.reduce((sum, d) => sum + d, 0) || 0;
  const formatPauseDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  return (
    <div className={`bg-card border rounded-xl overflow-hidden ${
      hasEnded ? 'border-muted opacity-60' : isPaused ? 'border-warning' : 'border-border'
    }`}>
      {/* Student Header Row - Always visible */}
      <div 
        className="flex items-center gap-3 p-3 border-b bg-card cursor-pointer"
        style={{ borderBottomColor: `${student.color}40` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>

        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${student.color}20` }}
        >
          <User className="w-4 h-4" style={{ color: student.color }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm truncate">
              {student.displayName || student.name}
            </h3>
            {student.dateOfBirth && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm cursor-help">
                      {ZODIAC_SYMBOLS[getZodiacSign(new Date(student.dateOfBirth))]}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {ZODIAC_LABELS[getZodiacSign(new Date(student.dateOfBirth))]}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isPaused && (
              <Badge variant="outline" className="bg-warning/20 text-warning-foreground text-[10px]">
                Paused {totalPauseTime > 0 && `(${formatPauseDuration(totalPauseTime)})`}
              </Badge>
            )}
            {hasEnded && (
              <Badge variant="outline" className="text-[10px]">
                Ended
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {student.dateOfBirth && (() => {
              const age = calculateAge(new Date(student.dateOfBirth));
              return `${age.years}y ${age.months}m • `;
            })()}
            {student.behaviors.length} behaviors
            {skillTargets.length > 0 && ` • ${skillTargets.length} skills`}
          </p>
        </div>

        {/* Action buttons */}
        <TooltipProvider>
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            {onExpand && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onExpand}>
                    <Expand className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Full data sheet</TooltipContent>
              </Tooltip>
            )}

            {!hasEnded && (
              <>
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
                    {isPaused ? 'Resume' : 'Pause'}
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
                  <TooltipContent side="bottom" className="text-xs">End session</TooltipContent>
                </Tooltip>
              </>
            )}

            {hasEnded && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => resetStudentSessionStatus(student.id)}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Collapsible content - horizontal layout with sections */}
      {isExpanded && !hasEnded && (
        <div className="p-3 space-y-3">
          {/* Skills Section */}
          {hasSkills && (
            <Collapsible open={expandedSections.has('skills')} onOpenChange={() => toggleSection('skills')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 bg-primary/10 rounded-md px-2 py-1 cursor-pointer hover:bg-primary/15">
                  <ChevronRight className={`w-3 h-3 transition-transform ${expandedSections.has('skills') ? 'rotate-90' : ''}`} />
                  <Target className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Skills</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1">
                    {activeSkillTargetIds.length}/{skillTargets.length}
                  </Badge>
                  <div className="flex-1" />
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
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-2 mt-2">
                  {skillTargets.filter(t => activeSkillTargetIds.includes(t.id)).map(target => (
                    <div key={target.id} className="flex-1 min-w-[200px] max-w-[300px]">
                      <CompactSkillTracker
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
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Behavior Reduction Section */}
          {hasBehaviors && (
            <Collapsible open={expandedSections.has('behaviors')} onOpenChange={() => toggleSection('behaviors')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 bg-secondary/30 rounded-md px-2 py-1 cursor-pointer hover:bg-secondary/40">
                  <ChevronRight className={`w-3 h-3 transition-transform ${expandedSections.has('behaviors') ? 'rotate-90' : ''}`} />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Behaviors</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1">
                    {frequencyBehaviors.length + durationBehaviors.length + intervalBehaviors.length + abcBehaviors.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                  {/* Frequency Column */}
                  {frequencyBehaviors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                        {METHOD_LABELS['frequency']}
                      </h4>
                      {frequencyBehaviors.map(behavior => (
                        <FrequencyTracker
                          key={behavior.id}
                          studentId={student.id}
                          behavior={behavior}
                          studentColor={student.color}
                        />
                      ))}
                    </div>
                  )}

                  {/* Duration Column */}
                  {durationBehaviors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                        {METHOD_LABELS['duration']}
                      </h4>
                      {durationBehaviors.map(behavior => (
                        <DurationTracker
                          key={behavior.id}
                          studentId={student.id}
                          behavior={behavior}
                          studentColor={student.color}
                        />
                      ))}
                    </div>
                  )}

                  {/* Interval Column */}
                  {intervalBehaviors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                        {METHOD_LABELS['interval']}
                      </h4>
                      {intervalBehaviors.map(behavior => (
                        <CompactIntervalTracker
                          key={behavior.id}
                          studentId={student.id}
                          behavior={behavior}
                          studentColor={student.color}
                          syncedMode={syncedIntervalsRunning}
                          syncedRunning={syncedIntervalsRunning}
                          syncedInterval={syncedInterval}
                          syncedTime={syncedTime}
                        />
                      ))}
                    </div>
                  )}

                  {/* ABC Column */}
                  {abcBehaviors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                        {METHOD_LABELS['abc']}
                      </h4>
                      {abcBehaviors.map(behavior => (
                        <ABCTracker
                          key={behavior.id}
                          studentId={student.id}
                          behavior={behavior}
                          studentColor={student.color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {!hasBehaviors && !hasSkills && (
            <p className="text-center text-muted-foreground py-4 text-xs">
              No behaviors or skills configured.
            </p>
          )}
        </div>
      )}

      {hasEnded && isExpanded && (
        <div className="text-center py-6 text-muted-foreground">
          <Square className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Session Ended</p>
          <p className="text-xs mt-1">Click "Reset" to resume data collection.</p>
        </div>
      )}

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
