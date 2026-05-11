import { useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';

export type SuggestionLevel = 'optimal' | 'too-long' | 'too-short' | 'ceiling' | 'floor' | null;

export interface IntervalSuggestion {
  rate: number;
  level: SuggestionLevel;
  message: string;
  hint?: string;
}

export function useIntervalSmartSuggestion(
  studentId: string,
  behaviorId: string,
  currentIntervalLength: number,
): IntervalSuggestion | null {
  const { getIntervalData } = useDataStore();

  return useMemo(() => {
    const data = getIntervalData(studentId, behaviorId);
    const completed = data.filter(e => e.occurred !== undefined && !e.voided);
    if (completed.length < 6) return null;

    const rate = completed.filter(e => e.occurred).length / completed.length;
    const pct = Math.round(rate * 100);

    if (rate > 0.85) return {
      rate, level: 'ceiling',
      message: `${pct}% — near ceiling`,
      hint: 'Consider duration recording or shorter intervals',
    };
    if (rate > 0.60) return {
      rate, level: 'too-long',
      message: `${pct}% — high occurrence`,
      hint: `Try ~${Math.round(currentIntervalLength * 0.7)}s intervals for finer resolution`,
    };
    if (rate < 0.05) return {
      rate, level: 'floor',
      message: `${pct}% — very low rate`,
      hint: 'Consider frequency tracking or longer intervals',
    };
    if (rate < 0.15) return {
      rate, level: 'too-short',
      message: `${pct}% — low occurrence`,
      hint: `Try ~${Math.round(currentIntervalLength * 1.5)}s intervals`,
    };

    return {
      rate, level: 'optimal',
      message: `${pct}% occurrence — good range`,
    };
  }, [getIntervalData, studentId, behaviorId, currentIntervalLength]);
}
