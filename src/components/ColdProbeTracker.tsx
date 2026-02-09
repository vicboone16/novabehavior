import { useState, useCallback } from 'react';
import { Check, X, RotateCcw, MessageSquare, Save, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  SkillTarget, 
  PromptLevel, 
  PROMPT_LEVEL_LABELS,
  PROMPT_LEVEL_ORDER,
} from '@/types/behavior';
import { useToast } from '@/hooks/use-toast';

export interface ColdProbeTrial {
  id: string;
  skillTargetId: string;
  timestamp: Date;
  isCorrect: boolean;
  promptNeeded: boolean;
  promptLevel?: PromptLevel;
  promptCount?: number;
  note?: string;
}

export interface ColdProbeSession {
  id: string;
  studentId: string;
  date: Date;
  trials: ColdProbeTrial[];
  notes?: string;
}

interface ColdProbeTrackerProps {
  studentId: string;
  skillTargets: SkillTarget[];
  studentColor: string;
  onSaveSession: (session: ColdProbeSession) => void;
}

export function ColdProbeTracker({
  studentId,
  skillTargets,
  studentColor,
  onSaveSession,
}: ColdProbeTrackerProps) {
  const { toast } = useToast();
  const [trials, setTrials] = useState<ColdProbeTrial[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [showPromptOptions, setShowPromptOptions] = useState(false);
  const [pendingPromptLevel, setPendingPromptLevel] = useState<PromptLevel>('verbal');
  const [pendingPromptCount, setPendingPromptCount] = useState<number>(1);
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);
  const [trialNotes, setTrialNotes] = useState<Record<string, string>>({});
  const [sessionNotes, setSessionNotes] = useState('');

  // Get trials for a specific skill target
  const getTrialsForTarget = useCallback((targetId: string) => {
    return trials.filter(t => t.skillTargetId === targetId);
  }, [trials]);

  // Calculate stats for a target
  const getTargetStats = useCallback((targetId: string) => {
    const targetTrials = getTrialsForTarget(targetId);
    if (targetTrials.length === 0) return { correct: 0, total: 0, percentCorrect: 0, promptedCount: 0 };
    
    const correct = targetTrials.filter(t => t.isCorrect).length;
    const promptedCount = targetTrials.filter(t => t.promptNeeded).length;
    
    return {
      correct,
      total: targetTrials.length,
      percentCorrect: Math.round((correct / targetTrials.length) * 100),
      promptedCount,
    };
  }, [getTrialsForTarget]);

  const recordTrial = (targetId: string, isCorrect: boolean, promptNeeded: boolean, promptLevel?: PromptLevel, promptCount?: number) => {
    const trial: ColdProbeTrial = {
      id: crypto.randomUUID(),
      skillTargetId: targetId,
      timestamp: new Date(),
      isCorrect,
      promptNeeded,
      promptLevel: promptNeeded ? promptLevel : undefined,
      promptCount: promptNeeded ? promptCount : undefined,
      note: trialNotes[targetId] || undefined,
    };
    
    setTrials(prev => [...prev, trial]);
    setTrialNotes(prev => ({ ...prev, [targetId]: '' }));
    setShowPromptOptions(false);
    
    toast({
      title: isCorrect ? '✓ Correct' : '✗ Incorrect',
      description: promptNeeded ? `Prompted (${PROMPT_LEVEL_LABELS[promptLevel!]})` : 'Independent response',
    });
  };

  const handleCorrect = (targetId: string) => {
    recordTrial(targetId, true, false);
  };

  const handleIncorrect = (targetId: string) => {
    recordTrial(targetId, false, false);
  };

  const handlePromptedCorrect = (targetId: string) => {
    recordTrial(targetId, true, true, pendingPromptLevel, pendingPromptCount);
  };

  const handlePromptedIncorrect = (targetId: string) => {
    recordTrial(targetId, false, true, pendingPromptLevel, pendingPromptCount);
  };

  const undoLastTrial = (targetId: string) => {
    setTrials(prev => {
      const targetTrials = prev.filter(t => t.skillTargetId === targetId);
      if (targetTrials.length === 0) return prev;
      const lastTrial = targetTrials[targetTrials.length - 1];
      return prev.filter(t => t.id !== lastTrial.id);
    });
  };

  const handleSaveSession = () => {
    if (trials.length === 0) {
      toast({
        title: 'No data to save',
        description: 'Record at least one trial before saving.',
        variant: 'destructive',
      });
      return;
    }

    const session: ColdProbeSession = {
      id: crypto.randomUUID(),
      studentId,
      date: new Date(),
      trials,
      notes: sessionNotes || undefined,
    };

    onSaveSession(session);
    setTrials([]);
    setSessionNotes('');
    
    toast({
      title: 'Session saved',
      description: `${trials.length} trials recorded`,
    });
  };

  const activeTargets = skillTargets.filter(t => t.status !== 'mastered');

  if (activeTargets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No active skill targets</p>
          <p className="text-xs text-muted-foreground mt-1">Add skill targets in the Skill Acquisition section</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Cold Probe Data Collection
            {trials.length > 0 && (
              <Badge variant="secondary">{trials.length} trials</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[600px] overflow-y-auto">
            <div className="space-y-3">
              {activeTargets.map((target) => {
                const stats = getTargetStats(target.id);
                const targetTrials = getTrialsForTarget(target.id);
                const isExpanded = selectedTarget === target.id;
                
                return (
                  <Collapsible
                    key={target.id}
                    open={isExpanded}
                    onOpenChange={() => setSelectedTarget(isExpanded ? '' : target.id)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                          style={{ borderLeftWidth: 3, borderLeftColor: studentColor }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{target.name}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {target.domain || 'General'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {stats.total > 0 && (
                              <>
                                <Badge variant="secondary" className="text-xs">
                                  {stats.correct}/{stats.total}
                                </Badge>
                                {stats.promptedCount > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {stats.promptedCount} prompted
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="p-3 border-t space-y-3">
                          {/* Progress bar */}
                          {stats.total > 0 && (
                            <div className="space-y-1">
                              <Progress value={stats.percentCorrect} className="h-2" />
                              <p className="text-xs text-muted-foreground text-center">
                                {stats.percentCorrect}% correct
                              </p>
                            </div>
                          )}

                          {/* Quick buttons for independent responses */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleCorrect(target.id)}
                            >
                              <Check className="w-5 h-5 mr-2" />
                              Correct (+)
                            </Button>
                            <Button
                              variant="destructive"
                              className="h-12"
                              onClick={() => handleIncorrect(target.id)}
                            >
                              <X className="w-5 h-5 mr-2" />
                              Incorrect (−)
                            </Button>
                          </div>

                          {/* Prompted response section */}
                          <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">Prompted Response</Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => setShowPromptOptions(!showPromptOptions)}
                              >
                                {showPromptOptions ? 'Hide options' : 'Show options'}
                              </Button>
                            </div>

                            {showPromptOptions && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Prompt Level</Label>
                                    <Select
                                      value={pendingPromptLevel}
                                      onValueChange={(v) => setPendingPromptLevel(v as PromptLevel)}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {PROMPT_LEVEL_ORDER.map(level => (
                                          <SelectItem key={level} value={level} className="text-xs">
                                            {PROMPT_LEVEL_LABELS[level]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs"># of Prompts</Label>
                                    <Select
                                      value={String(pendingPromptCount)}
                                      onValueChange={(v) => setPendingPromptCount(Number(v))}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[1, 2, 3, 4, 5].map(n => (
                                          <SelectItem key={n} value={String(n)} className="text-xs">
                                            {n}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    size="sm"
                                    className="h-9 bg-amber-600 hover:bg-amber-700 text-white"
                                    onClick={() => handlePromptedCorrect(target.id)}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Prompted +
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 border-destructive text-destructive hover:bg-destructive/10"
                                    onClick={() => handlePromptedIncorrect(target.id)}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Prompted −
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Note for this trial */}
                          <div className="space-y-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs gap-1 p-0"
                              onClick={() => setShowNoteInput(showNoteInput === target.id ? null : target.id)}
                            >
                              <MessageSquare className="w-3 h-3" />
                              {showNoteInput === target.id ? 'Hide note' : 'Add note for current trial'}
                            </Button>
                            {showNoteInput === target.id && (
                              <Textarea
                                placeholder="Note for this trial..."
                                value={trialNotes[target.id] || ''}
                                onChange={(e) => setTrialNotes(prev => ({ ...prev, [target.id]: e.target.value }))}
                                className="text-xs min-h-[60px]"
                              />
                            )}
                          </div>

                          {/* Recent trials */}
                          {targetTrials.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Recent trials</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs gap-1"
                                  onClick={() => undoLastTrial(target.id)}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Undo
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {targetTrials.slice(-10).map((trial) => (
                                  <div
                                    key={trial.id}
                                    className={`
                                      w-6 h-6 rounded text-xs flex items-center justify-center font-medium
                                      ${trial.isCorrect 
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' 
                                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}
                                      ${trial.promptNeeded ? 'ring-2 ring-amber-500' : ''}
                                    `}
                                    title={trial.promptNeeded ? `Prompted: ${PROMPT_LEVEL_LABELS[trial.promptLevel!]} (${trial.promptCount}x)` : 'Independent'}
                                  >
                                    {trial.isCorrect ? '+' : '−'}
                                  </div>
                                ))}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Ring = prompted response
                              </p>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>

          {/* Session notes */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Session Notes</Label>
            <Textarea
              placeholder="Overall notes for this cold probe session..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Save button */}
          <Button
            className="w-full gap-2"
            onClick={handleSaveSession}
            disabled={trials.length === 0}
            style={{ backgroundColor: studentColor }}
          >
            <Save className="w-4 h-4" />
            Save Cold Probe Session ({trials.length} trials)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
