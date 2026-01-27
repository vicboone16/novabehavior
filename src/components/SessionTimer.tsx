import { useState } from 'react';
import { Play, Pause, RotateCcw, Clock, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTimer } from '@/hooks/useTimer';

export function SessionTimer() {
  const { formattedTime, isRunning, toggle, reset } = useTimer();
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div className="bg-card border border-border rounded-xl p-2 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="timer-display text-foreground text-sm">{formattedTime}</span>
            {isRunning && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant={isRunning ? 'default' : 'outline'}
              size="sm"
              onClick={toggle}
              className="h-6 w-6 p-0"
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMinimized(false)}
              className="h-6 w-6 p-0"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsMinimized(true)}
            className="h-8 w-8 p-0"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
