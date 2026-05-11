import { useRef } from 'react';
import { ScheduleType } from '@/types/behavior';

function uniformInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildVISchedule(meanSeconds: number, count: number): number[] {
  const min = Math.max(5, Math.round(meanSeconds * 0.5));
  const max = Math.round(meanSeconds * 1.5);
  return Array.from({ length: count }, () => uniformInt(min, max));
}

function buildVRSchedule(meanRatio: number, count: number): number[] {
  const min = 1;
  const max = Math.max(2, Math.round(meanRatio * 2) - 1);
  return Array.from({ length: count }, () => uniformInt(min, max));
}

export function useVariableSchedule(
  scheduleType: ScheduleType,
  totalSlots: number,
  meanSeconds?: number,
  meanRatio?: number,
) {
  const scheduleRef = useRef<number[]>([]);

  const generateSchedule = () => {
    if (scheduleType === 'VI' && meanSeconds) {
      scheduleRef.current = buildVISchedule(meanSeconds, totalSlots);
    } else if (scheduleType === 'VR' && meanRatio) {
      scheduleRef.current = buildVRSchedule(meanRatio, totalSlots);
    } else {
      scheduleRef.current = [];
    }
  };

  // Length of this specific interval index (VI only)
  const getIntervalLength = (index: number, baseLength: number): number => {
    if (scheduleType !== 'VI' || !scheduleRef.current[index]) return baseLength;
    return scheduleRef.current[index];
  };

  // Response count needed before reinforcement at this slot (VR only)
  const getRatioTarget = (slotIndex: number): number => {
    if (scheduleType !== 'VR' || !scheduleRef.current[slotIndex]) return meanRatio ?? 1;
    return scheduleRef.current[slotIndex];
  };

  return { generateSchedule, getIntervalLength, getRatioTarget };
}
