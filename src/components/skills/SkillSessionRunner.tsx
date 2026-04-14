import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Square, Play, Pause, Target, Timer,
  Check, X, RotateCcw, Plus, Minus, ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePromptLevels } from '@/hooks/useSkillPrograms';
import { TaskAnalysisCollector } from './TaskAnalysisCollector';
import type { TargetSessionState } from '@/hooks/useSessionTargetCollection';
import { getTargetStats } from '@/hooks/useSessionTargetCollection';
import { SKILL_METHOD_LABELS } from '@/types/skillPrograms';

interface SkillSessionRunnerProps {
  targetList: TargetSessionState[];
  activeTargetId: string | null;
  activeIndex: number;
  sessionId: string | null;
  sessionStartTime: Date | null;
  onRecordTrial: (targetId: string, outcome: 'correct' | 'incorrect' | 'no_response' | 'prompted', promptLevelId: string | null, isIndependent: boolean, notes?: string) => Promise<void>;
  onUndoTrial: (targetId: string) => Promise<void>;
  onSaveFrequency: (targetId: string, count: number) => Promise<void>;
  onSaveDuration: (targetId: string, seconds: number, type: 'duration' | 'latency') => Promise<void>;
  onRecordTAStep: (targetId: string, stepId: string, outcome: string, promptLevelId: string | null) => Promise<void>;
  onSetFrequencyCount: (targetId: string, count: number) => void;
  onSetTimerState: (targetId: string, running: boolean, seconds?: number) => void;
  onSetActiveTarget: (targetId: string) => void;
  onNextTarget: () => void;
  onPrevTarget: () => void;
  onEndSession: () => void;
  onDataRecorded?: () => void;
}

export function SkillSessionRunner({
  targetList, activeTargetId, activeIndex, sessionId, sessionStartTime,
  onRecordTrial, onUndoTrial, onSaveFrequency, onSaveDuration, onRecordTAStep,
  onSetFrequencyCount, onSetTimerState, onSetActiveTarget, onNextTarget, onPrevTarget,
  onEndSession, onDataRecorded,
}: SkillSessionRunnerProps) {
  const promptLevels = usePromptLevels();
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    if (promptLevels.length > 0 && !selectedPromptId) {
      const indep = promptLevels.find(pl => pl.abbreviation === 'I');
      setSelectedPromptId(indep?.id || promptLevels[promptLevels.length - 1]?.id || '');
    }
  }, [promptLevels, selectedPromptId]);

  useEffect(() => {
    if (!sessionStartTime) return;
    const interval = setInterval(() => {
      setElapsedMinutes(Math.floor((Date.now() - sessionStartTime.getTime()) / 60000));
    }, 10000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const activeState = targetList.find(t => t.target.id === activeTargetId);

  useEffect(() => {
    if (!activeState?.timerRunning) return;
    const interval = setInterval(() => {
      onSetTimerState(activeState.target.id, true, activeState.timerSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeState?.timerRunning, activeState?.timerSeconds, activeState?.target.id, onSetTimerState]);

  if (!activeState) return null;

  const stats = getTargetStats(activeState);
  const method = activeState.program.method;
  const isDTTLike = ['discrete_trial', 'net', 'probe'].includes(method);
  const isTaskAnalysis = method === 'task_analysis';
  const isFrequency = method === 'frequency';
  const isDuration = method === 'duration' || method === 'latency';

  const isIndependent = (promptId: string) => {
    const pl = promptLevels.find(p => p.id === promptId);
    return pl?.abbreviation === 'I';
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Card className="border-primary/40 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Skill Acquisition Session</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                {targetList.length} target{targetList.length !== 1 ? 's' : ''}
              </Badge>
              {sessionStartTime && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Timer className="w-3 h-3" /> {elapsedMinutes}m
                </span>
              )}
            </div>
            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => setShowEndConfirm(true)}>
              <Square className="w-3 h-3 mr-1" /> End Session
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Target navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={activeIndex <= 0} onClick={onPrevTarget}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <ScrollArea className="flex-1">
              <div className="flex gap-1 pb-1">
                {targetList.map((ts) => {
                  const s = getTargetStats(ts);
                  const isActive = ts.target.id === activeTargetId;
                  return (
                    <button
                      key={ts.target.id}
                      className={`shrink-0 px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                        isActive ? 'bg-primary text-primary-foreground'
                          : s.total > 0 ? 'bg-muted text-foreground'
                            : 'bg-muted/50 text-muted-foreground'
                      }`}
                      onClick={() => onSetActiveTarget(ts.target.id)}
                    >
                      {ts.target.name}
                      {s.total > 0 && (
                        <span className="ml-1 opacity-70">{s.percentCorrect}%</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={activeIndex >= targetList.length - 1} onClick={onNextTarget}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Separator />

          {/* Current target header */}
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{activeState.target.name}</span>
            <Badge variant="outline" className="text-[10px]">
              {SKILL_METHOD_LABELS[method as keyof typeof SKILL_METHOD_LABELS] || method}
            </Badge>
          </div>

          {activeState.target.operational_definition && (
            <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
              {activeState.target.operational_definition}
            </p>
          )}

          {activeState.target.sd_instructions && (
            <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 rounded p-2">
              <strong>SD:</strong> {activeState.target.sd_instructions}
            </p>
          )}

          {/* DTT / NET / Probe */}
          {isDTTLike && (
            <>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="text-2xl font-bold text-foreground">{stats.correct}/{stats.total}</span>
                  <p className="text-[10px] text-muted-foreground">correct</p>
                </div>
                {stats.total > 0 && (
                  <>
                    <Progress value={stats.percentCorrect} className="flex-1 h-2" />
                    <span className="text-lg font-bold" style={{
                      color: stats.percentCorrect >= 80 ? 'hsl(var(--chart-2))' : stats.percentCorrect >= 50 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))',
                    }}>{stats.percentCorrect}%</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Prompt:</span>
                <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                  <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {promptLevels.map(pl => (
                      <SelectItem key={pl.id} value={pl.id}>{pl.name} ({pl.abbreviation})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="h-12 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400"
                  onClick={() => onRecordTrial(activeState.target.id, 'correct', selectedPromptId || null, isIndependent(selectedPromptId))}>
                  <Check className="w-5 h-5 mr-1" /> Correct
                </Button>
                <Button variant="outline" className="h-12 bg-red-50 dark:bg-red-950/30 border-red-300 hover:bg-red-100 text-red-700 dark:text-red-400"
                  onClick={() => onRecordTrial(activeState.target.id, 'incorrect', selectedPromptId || null, isIndependent(selectedPromptId))}>
                  <X className="w-5 h-5 mr-1" /> Incorrect
                </Button>
                <Button variant="outline" className="h-12"
                  onClick={() => onRecordTrial(activeState.target.id, 'no_response', selectedPromptId || null, false)}>
                  NR
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUndoTrial(activeState.target.id)} disabled={activeState.trials.length === 0}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Undo
                </Button>
                <Separator orientation="vertical" className="h-4" />
                {activeIndex < targetList.length - 1 && stats.total > 0 && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onNextTarget}>
                    Next Target <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>

              {activeState.trials.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {activeState.trials.slice(-20).map(t => (
                    <span key={t.id} className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      t.outcome === 'correct' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                        : t.outcome === 'no_response' ? 'bg-muted text-muted-foreground'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {t.outcome === 'correct' ? '+' : t.outcome === 'no_response' ? '–' : '−'}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Task Analysis */}
          {isTaskAnalysis && sessionId && (
            <TaskAnalysisCollector
              target={activeState.target}
              program={activeState.program}
              sessionId={sessionId}
              onRecordStep={async (stepId, outcome, promptLevelId) => {
                await onRecordTAStep(activeState.target.id, stepId, outcome, promptLevelId);
              }}
            />
          )}

          {/* Frequency */}
          {isFrequency && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" className="h-10 w-10"
                  onClick={() => onSetFrequencyCount(activeState.target.id, Math.max(0, activeState.frequencyCount - 1))}>
                  <Minus className="w-5 h-5" />
                </Button>
                <span className="text-4xl font-bold text-foreground w-16 text-center">{activeState.frequencyCount}</span>
                <Button variant="outline" size="icon" className="h-10 w-10"
                  onClick={() => onSetFrequencyCount(activeState.target.id, activeState.frequencyCount + 1)}>
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { onSaveFrequency(activeState.target.id, activeState.frequencyCount); onSetFrequencyCount(activeState.target.id, 0); }}>
                  Save Count
                </Button>
                {activeIndex < targetList.length - 1 && (
                  <Button variant="outline" onClick={onNextTarget}>
                    Next <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Duration / Latency */}
          {isDuration && (
            <div className="space-y-3">
              <div className="text-center space-y-2">
                <span className="text-4xl font-mono font-bold text-foreground">{formatTime(activeState.timerSeconds)}</span>
                <div className="flex items-center justify-center gap-2">
                  {!activeState.timerRunning
                    ? <Button variant="outline" onClick={() => onSetTimerState(activeState.target.id, true)}><Play className="w-4 h-4 mr-1" /> Start</Button>
                    : <Button variant="outline" onClick={() => onSetTimerState(activeState.target.id, false)}><Pause className="w-4 h-4 mr-1" /> Stop</Button>
                  }
                  <Button variant="ghost" onClick={() => onSetTimerState(activeState.target.id, false, 0)}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => {
                  onSetTimerState(activeState.target.id, false);
                  onSaveDuration(activeState.target.id, activeState.timerSeconds, method === 'latency' ? 'latency' : 'duration');
                  onSetTimerState(activeState.target.id, false, 0);
                }}>
                  Save {method === 'latency' ? 'Latency' : 'Duration'} ({formatTime(activeState.timerSeconds)})
                </Button>
                {activeIndex < targetList.length - 1 && (
                  <Button variant="outline" onClick={onNextTarget}>
                    Next <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Session summary strip */}
          <Separator />
          <div className="flex flex-wrap gap-2 text-[10px]">
            {targetList.map(ts => {
              const s = getTargetStats(ts);
              if (s.total === 0 && Object.keys(ts.taStepResults).length === 0 && ts.frequencyCount === 0) return null;
              return (
                <Badge key={ts.target.id} variant="outline" className="text-[10px]">
                  {ts.target.name}: {
                    ts.program.method === 'frequency' ? `freq ${ts.frequencyCount}`
                      : ts.program.method === 'task_analysis' ? `${Object.keys(ts.taStepResults).length} steps`
                        : `${s.percentCorrect}% (${s.total})`
                  }
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* End Session Confirm */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Skill Acquisition Session?</AlertDialogTitle>
            <AlertDialogDescription>
              All recorded data has been saved. This will finalize the session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Recording</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onEndSession(); onDataRecorded?.(); }}>
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
