import { useState, useEffect, useRef } from 'react';
import { Timer, Play, Square, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LatencyEntry, Behavior } from '@/types/behavior';

interface LatencyTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
  entries: LatencyEntry[];
  onRecordLatency: (entry: Omit<LatencyEntry, 'id'>) => void;
  sessionId?: string;
}

type TrackerState = 'idle' | 'waiting' | 'timing' | 'complete';

export function LatencyTracker({
  studentId,
  behavior,
  studentColor,
  entries,
  onRecordLatency,
  sessionId,
}: LatencyTrackerProps) {
  const [state, setState] = useState<TrackerState>('idle');
  const [antecedentTime, setAntecedentTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (state === 'timing' && antecedentTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - antecedentTime.getTime()) / 1000);
        setElapsedSeconds(elapsed);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, antecedentTime]);

  const handleStartAntecedent = () => {
    setAntecedentTime(new Date());
    setElapsedSeconds(0);
    setState('timing');
  };

  const handleBehaviorOccurred = () => {
    if (!antecedentTime) return;

    const behaviorOnsetTime = new Date();
    const latencySeconds = Math.floor((behaviorOnsetTime.getTime() - antecedentTime.getTime()) / 1000);

    onRecordLatency({
      studentId,
      behaviorId: behavior.id,
      antecedentTime,
      behaviorOnsetTime,
      latencySeconds,
      sessionId,
      notes: notes.trim() || undefined,
    });

    setState('complete');
    setTimeout(() => {
      handleReset();
    }, 2000);
  };

  const handleReset = () => {
    setState('idle');
    setAntecedentTime(null);
    setElapsedSeconds(0);
    setNotes('');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get recent latency entries for this behavior
  const recentEntries = entries
    .filter(e => e.behaviorId === behavior.id)
    .slice(-5)
    .reverse();

  // Calculate average latency
  const avgLatency = recentEntries.length > 0
    ? Math.round(recentEntries.reduce((sum, e) => sum + e.latencySeconds, 0) / recentEntries.length)
    : null;

  return (
    <Card className="border-l-4" style={{ borderLeftColor: studentColor }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="w-4 h-4" />
            {behavior.name} - Latency
          </CardTitle>
          {avgLatency !== null && (
            <Badge variant="outline" className="text-xs">
              Avg: {formatTime(avgLatency)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center py-4 bg-secondary/30 rounded-lg">
          <div className="text-4xl font-mono font-bold text-foreground">
            {formatTime(elapsedSeconds)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {state === 'idle' && 'Press Start when giving instruction'}
            {state === 'timing' && 'Waiting for behavior to occur...'}
            {state === 'complete' && 'Latency recorded!'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {state === 'idle' && (
            <Button onClick={handleStartAntecedent} className="gap-2">
              <Play className="w-4 h-4" />
              Start (Instruction Given)
            </Button>
          )}

          {state === 'timing' && (
            <>
              <Button onClick={handleBehaviorOccurred} variant="default" className="gap-2">
                <Square className="w-4 h-4" />
                Behavior Occurred
              </Button>
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </>
          )}

          {state === 'complete' && (
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              New Trial
            </Button>
          )}
        </div>

        {/* Notes (shown when timing) */}
        {state === 'timing' && (
          <div className="space-y-2">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this trial..."
              rows={2}
              className="text-sm"
            />
          </div>
        )}

        {/* Recent Latencies */}
        {recentEntries.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Recent Latencies</Label>
            <div className="flex flex-wrap gap-2">
              {recentEntries.map((entry, idx) => (
                <Badge key={entry.id || idx} variant="secondary" className="text-xs gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(entry.latencySeconds)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
