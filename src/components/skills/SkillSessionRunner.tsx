/**
 * SkillSessionRunner
 * 
 * The main session UI that appears when a skill acquisition session is active.
 * Shows the current target with data collection controls, navigation between
 * targets, and a running summary sidebar.
 */

import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Square,
  Play,
  Pause,
  Target,
  Timer,
  Check,
  X,
  RotateCcw,
  Plus,
  Minus,
  ListChecks,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  onRecordTrial: (
    targetId: string,
    outcome: 'correct' | 'incorrect' | 'no_response' | 'prompted',
    promptLevelId: string | null,
    isIndependent: boolean,
    notes?: string,
  ) => Promise<void>;
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
  targetList,
  activeTargetId,
  activeIndex,
  sessionId,
  sessionStartTime,
  onRecordTrial,
  onUndoTrial,
  onSaveFrequency,
  onSaveDuration,
  onRecordTAStep,
  onSetFrequencyCount,
  onSetTimerState,
  onSetActiveTarget,
  onNextTarget,
  onPrevTarget,
  onEndSession,
  onDataRecorded,
}: SkillSessionRunnerProps) {
  const promptLevels = usePromptLevels();
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Auto-select Independent prompt
  useEffect(() => {
    if (promptLevels.length > 0 && !selectedPromptId) {
      const indep = promptLevels.find(pl => pl.abbreviation === 'I');
      setSelectedPromptId(indep?.id || promptLevels[promptLevels.length - 1]?.id || '');
    }
  }, [promptLevels, selectedPromptId]);

  // Timer for session elapsed
  useEffect(() => {
    if (!sessionStartTime) return;
    const interval = setInterval(() => {
      setElapsedMinutes(Math.floor((Date.now() - sessionStartTime.getTime()) / 60000));
    }, 10000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Timer tick for active target duration/latency
  const activeState = targetList.find(t => t.target.id === activeTargetId);
  useEffect(() => {
    if (!activeState?.timerRunning) return;
    const interval = setInterval(() => {
      onSetTimerState(activeState.target.id, true, activeState.timerSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeState?.timerRunning, activeState?.timerSeconds, activeState?.target.id]);

  if (!activeState) return null;

  const stats = getTargetStats(activeState);
  const method = activeState.program.method;
  const isDTTLike = ['discrete_trial', 'net', 'probe'].includes(method);
  const isTaskAnalysis = method === 'task_analysis';
  const isFrequency = method === 'frequency';
  const isDuration = method === 'duration' || method === 'latency';
  const isInterval = method === 'interval';

  const isIndependent = (promptId: string) => {
    const pl = promptLevels.find(p => p.id === promptId);
    return pl?.abbreviation === 'I' || (pl as any)?.counts_as_prompted === false;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Card className="border-primary/30 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Skill Acquisition Session</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {targetList.length} target{targetList.length !== 1 ? 's' : ''}
              </Badge>
              {sessionStartTime && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {elapsedMinutes}m
                </span>
              )}
            </div>
            <Button variant="destructive" size="sm" onClick={() => setShowEndConfirm(true)}>
              <Square className="h-3.5 w-3.5 mr-1" />
              End Session
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ── Target navigation strip ── */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={activeIndex <= 0} onClick={onPrevTarget}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <ScrollArea className="flex-1">
              <div className="flex gap-1 pb-1">
                {targetList.map((ts, i) => {
                  const s = getTargetStats(ts);
                  const isActive = ts.target.id === activeTargetId;
                  return (
                    <button
                      key={ts.target.id}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : s.total > 0
                            ? 'bg-muted text-foreground'
                            : 'bg-muted/50 text-muted-foreground'
                      }`}
                      onClick={() => onSetActiveTarget(ts.target.id)}
                    >
                      {ts.target.name}
                      {s.total > 0 && (
                        <span className="ml-1 opacity-75">
                          {s.percentCorrect}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={activeIndex >= targetList.length - 1} onClick={onNextTarget}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          {/* ── Current target header ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-semibold">{activeState.target.name}</span>
            <Badge variant="outline" className="text-xs">
              {SKILL_METHOD_LABELS[method as keyof typeof SKILL_METHOD_LABELS] || method}
            </Badge>
          </div>

          {activeState.target.operational_definition && (
            <p className="text-sm text-muted-foreground bg-muted/30 rounded p-2">
              {activeState.target.operational_definition}
            </p>
          )}

          {activeState.target.sd_instructions && (
            <p className="text-sm text-muted-foreground italic">
              <strong>SD:</strong> {activeState.target.sd_instructions}
            </p>
          )}

          {/* ── DTT / NET / Probe ── */}
          {isDTTLike && (
            <>
              {/* Stats */}
              <div className="flex items-center gap-3 text-lg">
                <span className="font-bold">{stats.correct}/{stats.total}</span>
                <span className="text-muted-foreground text-sm">correct</span>
                {stats.total > 0 && (
                  <>
                    <div className="flex-1">
                      <Progress value={stats.percentCorrect} className="h-2" />
                    </div>
                    <span className="text-lg font-bold" style={{
                      color: stats.percentCorrect >= 80 ? 'hsl(var(--chart-2))' : stats.percentCorrect >= 50 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))',
                    }}>
                      {stats.percentCorrect}%
                    </span>
                  </>
                )}
              </div>

              {/* Prompt selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Prompt:</span>
                <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {promptLevels.map(pl => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.name} ({pl.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trial buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  className="h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onRecordTrial(
                    activeState.target.id,
                    'correct',
                    selectedPromptId || null,
                    isIndependent(selectedPromptId),
                  )}
                >
                  <Check className="h-5 w-5 mr-1" />
                  Correct
                </Button>
                <Button
                  className="h-14 text-base font-bold bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => onRecordTrial(
                    activeState.target.id,
                    'incorrect',
                    selectedPromptId || null,
                    isIndependent(selectedPromptId),
                  )}
                >
                  <X className="h-5 w-5 mr-1" />
                  Incorrect
                </Button>
                <Button
                  variant="outline"
                  className="h-14 text-base font-bold"
                  onClick={() => onRecordTrial(
                    activeState.target.id,
                    'no_response',
                    selectedPromptId || null,
                    false,
                  )}
                >
                  NR
                </Button>
              </div>

              {/* Undo + next */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onUndoTrial(activeState.target.id)} disabled={activeState.trials.length === 0}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Undo
                </Button>
                <div className="flex-1" />
                {activeIndex < targetList.length - 1 && stats.total > 0 && (
                  <Button variant="outline" size="sm" onClick={onNextTarget}>
                    Next Target
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>

              {/* Trial tape */}
              {activeState.trials.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {activeState.trials.slice(-20).map(t => (
                    <span
                      key={t.id}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        t.outcome === 'correct' ? 'bg-emerald-500' : t.outcome === 'no_response' ? 'bg-gray-400' : 'bg-red-500'
                      }`}
                    >
                      {t.outcome === 'correct' ? '+' : t.outcome === 'no_response' ? '–' : '−'}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Task Analysis ── */}
          {isTaskAnalysis && (
            <TaskAnalysisCollector
              target={activeState.target}
              program={activeState.program}
              sessionId={sessionId}
              onRecordStep={async (stepId, outcome, promptLevelId) =>
                onRecordTAStep(activeState.target.id, stepId, outcome, promptLevelId)
              }
              onComplete={() => {
                if (activeIndex < targetList.length - 1) {
                  onNextTarget();
                }
              }}
            />
          )}

          {/* ── Frequency ── */}
          {isFrequency && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" className="h-10 w-10"
                  onClick={() => onSetFrequencyCount(activeState.target.id, Math.max(0, activeState.frequencyCount - 1))}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="text-4xl font-bold w-20 text-center">{activeState.frequencyCount}</span>
                <Button variant="outline" size="icon" className="h-10 w-10"
                  onClick={() => onSetFrequencyCount(activeState.target.id, activeState.frequencyCount + 1)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => {
                    onSaveFrequency(activeState.target.id, activeState.frequencyCount);
                    onSetFrequencyCount(activeState.target.id, 0);
                    if (activeIndex < targetList.length - 1) onNextTarget();
                  }}
                  disabled={activeState.frequencyCount === 0}
                >
                  Save ({activeState.frequencyCount})
                </Button>
                {activeIndex < targetList.length - 1 && (
                  <Button variant="outline" onClick={onNextTarget}>
                    Skip <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── Duration / Latency ── */}
          {isDuration && (
            <div className="space-y-3">
              <div className="text-center">
                <span className="text-4xl font-mono font-bold">{formatTime(activeState.timerSeconds)}</span>
                <div className="flex gap-2 justify-center mt-2">
                  {!activeState.timerRunning ? (
                    <Button onClick={() => onSetTimerState(activeState.target.id, true)}>
                      <Play className="h-4 w-4 mr-1" /> Start
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => onSetTimerState(activeState.target.id, false)}>
                      <Pause className="h-4 w-4 mr-1" /> Stop
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => onSetTimerState(activeState.target.id, false, 0)}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Reset
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    onSetTimerState(activeState.target.id, false);
                    onSaveDuration(activeState.target.id, activeState.timerSeconds, method === 'latency' ? 'latency' : 'duration');
                    onSetTimerState(activeState.target.id, false, 0);
                    if (activeIndex < targetList.length - 1) onNextTarget();
                  }}
                  disabled={activeState.timerSeconds === 0}
                >
                  Save {method === 'latency' ? 'Latency' : 'Duration'} ({formatTime(activeState.timerSeconds)})
                </Button>
              </div>
            </div>
          )}

          {/* ── Interval placeholder ── */}
          {isInterval && (
            <div className="text-center py-4 text-muted-foreground">
              <p>Interval recording for skill targets uses the same flow as DTT.</p>
              <p className="text-sm">Record each interval observation as Correct / Incorrect.</p>
            </div>
          )}

          <Separator />

          {/* ── Session summary strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {targetList.map(ts => {
              const s = getTargetStats(ts);
              const isActive = ts.target.id === activeTargetId;
              return (
                <div
                  key={ts.target.id}
                  className={`p-2 rounded-md cursor-pointer border transition-colors ${isActive ? 'border-primary bg-primary/5' : s.total > 0 ? 'bg-muted' : 'bg-muted/30'}`}
                  onClick={() => onSetActiveTarget(ts.target.id)}
                >
                  <p className="text-xs font-medium truncate">{ts.target.name}</p>
                  {s.total > 0 ? (
                    <p className="text-sm font-bold" style={{
                      color: s.percentCorrect >= 80 ? 'hsl(var(--chart-2))' : s.percentCorrect >= 50 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))',
                    }}>
                      {s.correct}/{s.total} ({s.percentCorrect}%)
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* End session confirmation */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Skill Acquisition Session?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                let total = 0;
                let withData = 0;
                for (const ts of targetList) {
                  total++;
                  if (getTargetStats(ts).total > 0 || ts.frequencyCount > 0 || ts.timerSeconds > 0 || Object.keys(ts.taStepResults).length > 0) {
                    withData++;
                  }
                }
                return `${withData} of ${total} targets have data recorded. All data is already saved to the database.`;
              })()}
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
