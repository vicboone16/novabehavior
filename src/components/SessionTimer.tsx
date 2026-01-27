import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTimer } from '@/hooks/useTimer';

export function SessionTimer() {
  const { formattedTime, isRunning, toggle, reset } = useTimer();

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Session Time</p>
            <p className="timer-display text-foreground">{formattedTime}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isRunning ? 'default' : 'outline'}
            size="sm"
            onClick={toggle}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
