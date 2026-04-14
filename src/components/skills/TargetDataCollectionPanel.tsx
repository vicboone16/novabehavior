import { useState, useEffect } from 'react';
import { Check, X, RotateCcw, Square, Play, Timer, Plus, Minus, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTargetDataCollection } from '@/hooks/useTargetDataCollection';
import { usePromptLevels } from '@/hooks/useSkillPrograms';
import type { SkillTarget, SkillProgram } from '@/types/skillPrograms';
import { SKILL_METHOD_LABELS, TARGET_STATUS_LABELS } from '@/types/skillPrograms';
import { PHASE_LABELS, PHASE_COLORS, type TargetPhase } from '@/types/criteriaEngine';

interface TargetDataCollectionPanelProps {
  target: SkillTarget;
  program: SkillProgram;
  onClose: () => void;
  onDataRecorded?: () => void;
}

export function TargetDataCollectionPanel({ target, program, onClose, onDataRecorded }: TargetDataCollectionPanelProps) {
  const promptLevels = usePromptLevels();
  const { trials, stats, isRecording, startSession, recordTrial, undoLastTrial, endSession, recordMeasurement } =
    useTargetDataCollection(target.id, program.method);

  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [freqCount, setFreqCount] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    if (promptLevels.length > 0 && !selectedPromptId) {
      const indep = promptLevels.find(pl => pl.abbreviation === 'I');
      setSelectedPromptId(indep?.id || promptLevels[promptLevels.length - 1]?.id || '');
    }
  }, [promptLevels, selectedPromptId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning) { interval = setInterval(() => setTimerSeconds(s => s + 1), 1000); }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isIndependent = (promptId: string) => {
    const pl = promptLevels.find(p => p.id === promptId);
    return pl?.abbreviation === 'I';
  };

  const handleCorrect = () => recordTrial('correct', selectedPromptId || null, isIndependent(selectedPromptId));
  const handleIncorrect = () => recordTrial('incorrect', selectedPromptId || null, isIndependent(selectedPromptId));
  const handleNoResponse = () => recordTrial('no_response', selectedPromptId || null, false);

  const handleEndSession = () => { endSession(); onDataRecorded?.(); onClose(); };
  const handleSaveFrequency = () => { recordMeasurement(freqCount, 'frequency'); setFreqCount(0); onDataRecorded?.(); onClose(); };
  const handleSaveDuration = () => {
    setTimerRunning(false);
    recordMeasurement(timerSeconds, program.method === 'latency' ? 'latency' : 'duration');
    setTimerSeconds(0); onDataRecorded?.(); onClose();
  };

  const isDTTLike = ['discrete_trial', 'net', 'probe', 'task_analysis'].includes(program.method);
  const isFrequency = program.method === 'frequency';
  const isDuration = program.method === 'duration' || program.method === 'latency';

  useEffect(() => { if (!isRecording && isDTTLike) startSession(); }, []);

  return (
    <Card className="ml-8 mr-3 mb-2 border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Recording Data</span>
            <Badge variant="outline" className="text-[10px]">
              {SKILL_METHOD_LABELS[program.method as keyof typeof SKILL_METHOD_LABELS] || program.method}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { if (trials.length > 0) { endSession(); onDataRecorded?.(); } onClose(); }}>
            <Square className="w-3 h-3 mr-1" />
            {trials.length > 0 ? 'End & Close' : 'Cancel'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{target.name}</span> — {program.name}
          {(target as any).phase && (
            <Badge className={`${PHASE_COLORS[(target as any).phase as TargetPhase] || 'bg-slate-500'} text-white text-[10px] ml-2`}>
              {PHASE_LABELS[(target as any).phase as TargetPhase] || (target as any).phase}
            </Badge>
          )}
        </div>

        {/* DTT / NET / Probe / Task Analysis */}
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
              <Button variant="outline" className="h-12 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400" onClick={handleCorrect}>
                <Check className="w-5 h-5 mr-1" /> Correct
              </Button>
              <Button variant="outline" className="h-12 bg-red-50 dark:bg-red-950/30 border-red-300 hover:bg-red-100 text-red-700 dark:text-red-400" onClick={handleIncorrect}>
                <X className="w-5 h-5 mr-1" /> Incorrect
              </Button>
              <Button variant="outline" className="h-12" onClick={handleNoResponse}>NR</Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={undoLastTrial} disabled={trials.length === 0}>
                <RotateCcw className="w-3 h-3 mr-1" /> Undo Last
              </Button>
              <Separator orientation="vertical" className="h-4" />
              {trials.length > 0 && (
                <Button size="sm" className="h-7 text-xs" onClick={handleEndSession}>
                  End Session ({stats.total} trials)
                </Button>
              )}
            </div>

            {trials.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {trials.slice(-20).map((t) => (
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

        {/* Frequency */}
        {isFrequency && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setFreqCount(c => Math.max(0, c - 1))}>
                <Minus className="w-5 h-5" />
              </Button>
              <span className="text-4xl font-bold text-foreground w-16 text-center">{freqCount}</span>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setFreqCount(c => c + 1)}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <Button className="w-full" onClick={handleSaveFrequency}>Save Frequency Count</Button>
          </div>
        )}

        {/* Duration / Latency */}
        {isDuration && (
          <div className="space-y-3">
            <div className="text-center space-y-2">
              <span className="text-4xl font-mono font-bold text-foreground">{formatTime(timerSeconds)}</span>
              <div className="flex items-center justify-center gap-2">
                {!timerRunning
                  ? <Button variant="outline" onClick={() => setTimerRunning(true)}><Play className="w-4 h-4 mr-1" /> Start</Button>
                  : <Button variant="outline" onClick={() => setTimerRunning(false)}><Pause className="w-4 h-4 mr-1" /> Stop</Button>
                }
                <Button variant="ghost" onClick={() => { setTimerRunning(false); setTimerSeconds(0); }}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Reset
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveDuration}>
              Save {program.method === 'latency' ? 'Latency' : 'Duration'} ({formatTime(timerSeconds)})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
