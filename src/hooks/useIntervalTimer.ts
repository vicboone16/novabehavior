import { useState, useRef, useCallback, useEffect } from 'react';

interface UseIntervalTimerProps {
  intervalLength: number; // in seconds
  totalIntervals: number;
  onIntervalComplete?: (intervalNumber: number) => void;
}

export function useIntervalTimer({
  intervalLength,
  totalIntervals,
  onIntervalComplete,
}: UseIntervalTimerProps) {
  const [currentInterval, setCurrentInterval] = useState(0);
  const [timeInInterval, setTimeInInterval] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    if (!isRunning && !isComplete) {
      setIsRunning(true);
    }
  }, [isRunning, isComplete]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setCurrentInterval(0);
    setTimeInInterval(0);
    setIsComplete(false);
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeInInterval((prev) => {
          const newTime = prev + 1;
          if (newTime >= intervalLength) {
            setCurrentInterval((prevInterval) => {
              const newInterval = prevInterval + 1;
              if (onIntervalComplete) {
                onIntervalComplete(prevInterval);
              }
              if (newInterval >= totalIntervals) {
                setIsComplete(true);
                setIsRunning(false);
              }
              return newInterval;
            });
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, intervalLength, totalIntervals, onIntervalComplete]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    currentInterval,
    timeInInterval,
    isRunning,
    isComplete,
    start,
    pause,
    reset,
    formattedTime: formatTime(timeInInterval),
    formatTime,
    progress: (timeInInterval / intervalLength) * 100,
    totalProgress: ((currentInterval * intervalLength + timeInInterval) / (totalIntervals * intervalLength)) * 100,
  };
}
