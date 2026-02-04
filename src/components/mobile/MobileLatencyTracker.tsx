import { useState, useEffect, useCallback } from 'react';
import { Play, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface MobileLatencyTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

type LatencyStep = 'ready' | 'waiting' | 'complete';

export function MobileLatencyTracker({ studentId, behavior, studentColor }: MobileLatencyTrackerProps) {
  const { addLatencyEntry, latencyEntries } = useDataStore();
  const [step, setStep] = useState<LatencyStep>('ready');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  // Get today's entries for this behavior
  const todayEntries = latencyEntries.filter(e => 
    e.studentId === studentId && 
    e.behaviorId === behavior.id &&
    new Date(e.antecedentTime).toDateString() === new Date().toDateString()
  );

  const avgLatency = todayEntries.length > 0
    ? todayEntries.reduce((sum, e) => sum + e.latencySeconds, 0) / todayEntries.length
    : 0;

  // Update elapsed time when waiting
  useEffect(() => {
    if (step !== 'waiting' || !startTime) {
      return;
    }

    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 100);
    return () => clearInterval(interval);
  }, [step, startTime]);

  const handleInstructionGiven = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    setStartTime(Date.now());
    setStep('waiting');
    setElapsed(0);
  }, []);

  const handleResponseOccurred = useCallback(() => {
    if (!startTime) return;

    const latencySeconds = (Date.now() - startTime) / 1000;
    
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }

    const now = new Date();
    addLatencyEntry({
      studentId,
      behaviorId: behavior.id,
      antecedentTime: new Date(startTime),
      behaviorOnsetTime: now,
      latencySeconds,
    });

    setLastLatency(latencySeconds);
    setStep('complete');
  }, [startTime, studentId, behavior.id, addLatencyEntry]);

  const handleReset = useCallback(() => {
    setStep('ready');
    setStartTime(null);
    setElapsed(0);
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(0);
    return `${mins}:${secs.padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      {/* Summary */}
      <div className="text-center mb-8">
        <p className="text-sm text-muted-foreground">Average Latency</p>
        <p className="text-2xl font-semibold">
          {avgLatency > 0 ? formatTime(avgLatency) : '--'}
          <span className="text-muted-foreground text-lg ml-1">
            ({todayEntries.length} trial{todayEntries.length !== 1 ? 's' : ''})
          </span>
        </p>
      </div>

      {/* Timer Display */}
      <div 
        className="w-48 h-48 rounded-full border-8 flex items-center justify-center mb-8 transition-colors"
        style={{ 
          borderColor: step === 'waiting' ? studentColor : step === 'complete' ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          backgroundColor: step === 'waiting' ? `${studentColor}10` : 'transparent',
        }}
      >
        <span 
          className="text-5xl font-mono font-bold tabular-nums"
          style={{ color: step === 'waiting' ? studentColor : 'inherit' }}
        >
          {step === 'complete' && lastLatency !== null 
            ? formatTime(lastLatency)
            : formatTime(elapsed)
          }
        </span>
      </div>

      {/* Behavior Name */}
      <p className="text-muted-foreground mb-6">{behavior.name}</p>

      {/* Action Buttons */}
      {step === 'ready' && (
        <Button
          onClick={handleInstructionGiven}
          size="lg"
          className="w-full max-w-xs h-16 text-xl font-semibold gap-3"
          style={{ backgroundColor: studentColor }}
        >
          <Play className="w-6 h-6" />
          INSTRUCTION GIVEN
        </Button>
      )}

      {step === 'waiting' && (
        <Button
          onClick={handleResponseOccurred}
          size="lg"
          className="w-full max-w-xs h-16 text-xl font-semibold gap-3"
          variant="default"
        >
          <CheckCircle className="w-6 h-6" />
          RESPONSE OCCURRED
        </Button>
      )}

      {step === 'complete' && (
        <div className="text-center space-y-4">
          <p className="text-primary font-medium">Latency recorded!</p>
          <Button
            onClick={handleReset}
            size="lg"
            className="w-full max-w-xs h-16 text-xl font-semibold gap-3"
            variant="outline"
          >
            <RotateCcw className="w-6 h-6" />
            NEXT TRIAL
          </Button>
        </div>
      )}
    </div>
  );
}
