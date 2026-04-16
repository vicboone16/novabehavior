import { useState, useEffect } from 'react';
import {
  Check,
  X,
  RotateCcw,
  Square,
  Play,
  Timer,
  Plus,
  Minus,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTargetDataCollection } from '@/hooks/useTargetDataCollection';
import { usePromptLevels } from '@/hooks/useSkillPrograms';
import type { SkillTarget, SkillProgram } from '@/types/skillPrograms';
import {
  SKILL_METHOD_LABELS,
} from '@/types/skillPrograms';
import { PHASE_LABELS, type TargetPhase } from '@/types/criteriaEngine';

interface TargetDataCollectionPanelProps {
  target: SkillTarget;
  program: SkillProgram;
  onClose: () => void;
  onDataRecorded?: () => void;
}

export function TargetDataCollectionPanel({
  target,
  program,
  onClose,
  onDataRecorded,
}: TargetDataCollectionPanelProps) {
  const promptLevels = usePromptLevels();
  const {
    trials,
    stats,
    isRecording,
    startSession,
    recordTrial,
    undoLastTrial,
    endSession,
    recordMeasurement,
  } = useTargetDataCollection(target.id, program.method);

  const [selectedPromptId, setSelectedPromptId] = useState('');

  // Auto-select "Independent" prompt level
  useEffect(() => {
    if (promptLevels.length > 0 && !selectedPromptId) {
      const indep = promptLevels.find(pl => pl.abbreviation === 'I');
      setSelectedPromptId(indep?.id || promptLevels[promptLevels.length - 1]?.id || '');
    }
  }, [promptLevels, selectedPromptId]);

  // Frequency counter state
  const [freqCount, setFreqCount] = useState(0);

  // Duration timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    }
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

  const handleCorrect = () => {
    recordTrial('correct', selectedPromptId || null, isIndependent(selectedPromptId) ?? false);
  };

  const handleIncorrect = () => {
    recordTrial('incorrect', selectedPromptId || null, isIndependent(selectedPromptId) ?? false);
  };

  const handleNoResponse = () => {
    recordTrial('no_response', selectedPromptId || null, false);
  };

  const handleEndSession = () => {
    endSession();
    onDataRecorded?.();
    onClose();
  };

  const handleSaveFrequency = () => {
    recordMeasurement(freqCount, 'frequency');
    setFreqCount(0);
    onDataRecorded?.();
    onClose();
  };

  const handleSaveDuration = () => {
    setTimerRunning(false);
    recordMeasurement(timerSeconds, 'duration');
    setTimerSeconds(0);
    onDataRecorded?.();
    onClose();
  };

  const isDTTLike = ['discrete_trial', 'net', 'probe'].includes(program.method);
  const isTaskAnalysis = program.method === 'task_analysis';
  const isFrequency = program.method === 'frequency';
  const isDuration = program.method === 'duration' || program.method === 'latency';

  // Auto-start session
  useEffect(() => {
    if (!isRecording && isDTTLike) {
      startSession();
    }
  }, []);

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Recording Data</span>
            <Badge variant="outline" className="text-xs">
              {SKILL_METHOD_LABELS[program.method as keyof typeof SKILL_METHOD_LABELS] || program.method}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (trials.length > 0) {
                endSession();
                onDataRecorded?.();
              }
              onClose();
            }}
          >
            <Square className="h-3.5 w-3.5 mr-1" />
            {trials.length > 0 ? 'End & Close' : 'Cancel'}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          <strong>{target.name}</strong> — {program.name}
          {(target as any).phase && (
            <Badge variant="outline" className="ml-2 text-xs">
              {PHASE_LABELS[(target as any).phase as TargetPhase] || (target as any).phase}
            </Badge>
          )}
        </p>

        {/* ── DTT / NET / Probe ── */}
        {(isDTTLike || isTaskAnalysis) && (
          <>
            {/* Running stats */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold">
                  {stats.correct}/{stats.total}
                </span>
                <span className="text-xs text-muted-foreground">correct</span>
              </div>
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
              <Button className="h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCorrect}>
                <Check className="h-5 w-5 mr-1" />
                Correct
              </Button>
              <Button className="h-12 text-sm font-bold bg-red-600 hover:bg-red-700 text-white" onClick={handleIncorrect}>
                <X className="h-5 w-5 mr-1" />
                Incorrect
              </Button>
              <Button variant="outline" className="h-12 text-sm font-bold" onClick={handleNoResponse}>
                NR
              </Button>
            </div>

            {/* Undo + End Session */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={undoLastTrial} disabled={trials.length === 0}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Undo Last
              </Button>
              <div className="flex-1" />
              {trials.length > 0 && (
                <Button variant="secondary" size="sm" onClick={handleEndSession}>
                  End Session ({stats.total} trials)
                </Button>
              )}
            </div>

            {/* Recent trial tape */}
            {trials.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {trials.slice(-20).map((t, i) => (
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

        {/* ── Frequency ── */}
        {isFrequency && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setFreqCount(c => Math.max(0, c - 1))}>
                <Minus className="h-5 w-5" />
              </Button>
              <span className="text-4xl font-bold w-20 text-center">{freqCount}</span>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setFreqCount(c => c + 1)}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            <Button className="w-full" onClick={handleSaveFrequency} disabled={freqCount === 0}>
              Save Frequency Count
            </Button>
          </div>
        )}

        {/* ── Duration / Latency ── */}
        {isDuration && (
          <div className="space-y-3">
            <div className="text-center">
              <span className="text-4xl font-mono font-bold">{formatTime(timerSeconds)}</span>
              <div className="flex gap-2 justify-center mt-2">
                {!timerRunning ? (
                  <Button onClick={() => setTimerRunning(true)}>
                    <Play className="h-4 w-4 mr-1" /> Start
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setTimerRunning(false)}>
                    <Pause className="h-4 w-4 mr-1" /> Stop
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setTimerRunning(false); setTimerSeconds(0); }}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveDuration} disabled={timerSeconds === 0}>
              Save {program.method === 'latency' ? 'Latency' : 'Duration'} ({formatTime(timerSeconds)})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
