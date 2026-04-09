import { useState } from 'react';
import { 
  X, User, Target, ChevronLeft, Minimize2, Maximize2,
  Filter, RotateCcw, Pause, Play, Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Student, DataCollectionMethod, METHOD_LABELS } from '@/types/behavior';
import { FrequencyTracker } from './FrequencyTracker';
import { DurationTracker } from './DurationTracker';
import { ABCTracker } from './ABCTracker';
import { CompactIntervalTracker } from './CompactIntervalTracker';
import { CompactSkillTracker } from './CompactSkillTracker';
import { SkillTargetSessionSelector } from './SkillTargetSessionSelector';
import { useDataStore } from '@/store/dataStore';
import { useSyncedIntervalState } from './SyncedIntervalController';

interface ExpandedStudentViewProps {
  student: Student;
  onClose: () => void;
}

export function ExpandedStudentView({ student, onClose }: ExpandedStudentViewProps) {
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
    addDTTSession,
  } = useDataStore();
  
  const { syncedInterval, syncedTime } = useSyncedIntervalState();
  
  const [activeSkillTargetIds, setActiveSkillTargetIds] = useState<string[]>(
    () => (student.skillTargets || []).map(t => t.id)
  );

  const isPaused = isStudentSessionPaused(student.id);
  const hasEnded = isStudentSessionEnded(student.id);

  const skillTargets = student.skillTargets || [];
  const dttSessions = student.dttSessions || [];

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

  const toggleSkillTarget = (targetId: string) => {
    setActiveSkillTargetIds(prev => 
      prev.includes(targetId) 
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  const handleAddDTTSession = (session: any) => {
    addDTTSession(student.id, session);
  };

  const activeSkillTargets = skillTargets.filter(t => activeSkillTargetIds.includes(t.id));

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div 
        className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-4"
        style={{ borderBottomColor: `${student.color}40` }}
      >
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${student.color}20` }}
        >
          <User className="w-5 h-5" style={{ color: student.color }} />
        </div>
        
        <div className="flex-1">
          <h1 className="text-lg font-bold">{student.displayName || student.name}</h1>
          <p className="text-xs text-muted-foreground">
            {student.behaviors.length} behaviors • {skillTargets.length} skill targets
          </p>
        </div>

        {/* Session controls */}
        {!hasEnded && (
          <div className="flex items-center gap-2">
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              onClick={() => isPaused ? resumeStudentSession(student.id) : pauseStudentSession(student.id)}
            >
              {isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          </div>
        )}

        {hasEnded && (
          <Badge variant="secondary" className="text-sm">
            <Square className="w-3 h-3 mr-1" />
            Session Ended
          </Badge>
        )}
      </div>

      {/* Main content */}
      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="container max-w-4xl py-6 space-y-6">
          {/* Skill Acquisition Section */}
          {skillTargets.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Skill Acquisition
                  </CardTitle>
                  <SkillTargetSessionSelector
                    skillTargets={skillTargets}
                    activeTargetIds={activeSkillTargetIds}
                    onToggleTarget={toggleSkillTarget}
                    onSelectAll={() => setActiveSkillTargetIds(skillTargets.map(t => t.id))}
                    onDeselectAll={() => setActiveSkillTargetIds([])}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {skillTargets.map(target => (
                    <CompactSkillTracker
                      key={target.id}
                      studentId={student.id}
                      skillTarget={target}
                      studentColor={student.color}
                      sessions={dttSessions.filter(s => s.skillTargetId === target.id)}
                      activeTargetIds={activeSkillTargetIds}
                      onToggleActive={toggleSkillTarget}
                      onAddTrial={() => {}}
                      onSaveSession={handleAddDTTSession}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Behavior Reduction Section */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Behavior Data Collection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Frequency */}
              {frequencyBehaviors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Frequency ({frequencyBehaviors.length})
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {frequencyBehaviors.map(behavior => (
                      <FrequencyTracker
                        key={behavior.id}
                        studentId={student.id}
                        behavior={behavior}
                        studentColor={student.color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Duration */}
              {durationBehaviors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Duration ({durationBehaviors.length})
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {durationBehaviors.map(behavior => (
                      <DurationTracker
                        key={behavior.id}
                        studentId={student.id}
                        behavior={behavior}
                        studentColor={student.color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Interval */}
              {intervalBehaviors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Interval ({intervalBehaviors.length})
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
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
                </div>
              )}

              {/* ABC */}
              {abcBehaviors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    ABC ({abcBehaviors.length})
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {abcBehaviors.map(behavior => (
                      <ABCTracker
                        key={behavior.id}
                        studentId={student.id}
                        behavior={behavior}
                        studentColor={student.color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {student.behaviors.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No behaviors configured. Go to the Students tab to add behaviors.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
