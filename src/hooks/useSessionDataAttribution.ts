/**
 * useSessionDataAttribution
 *
 * Wraps the shared session sync to provide convenient publishers for each
 * data type. Data collection components import this to stamp entries with
 * the collecting staff member's identity and sync them across devices.
 *
 * Usage:
 *   const { publishFrequency, publishABC, publishDuration, publishInterval } =
 *     useSessionDataAttribution(currentSessionId);
 *
 *   // After incrementing in the store:
 *   publishFrequency({ entryId, studentId, behaviorId, count, timestamp });
 */
import { useCallback } from 'react';
import { useSharedSessionSync, SharedEntryType } from './useSharedSessionSync';
import { useDataStore } from '@/store/dataStore';

interface FrequencyPayload {
  entryId: string;
  studentId: string;
  behaviorId: string;
  count: number;
  timestamp: string;
}

interface ABCPayload {
  entryId: string;
  studentId: string;
  behaviorId: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  functions?: string[];
  timestamp: string;
  frequencyCount?: number;
}

interface DurationPayload {
  entryId: string;
  studentId: string;
  behaviorId: string;
  durationSeconds: number;
  startTime: string;
  endTime?: string;
}

interface IntervalPayload {
  entryId: string;
  studentId: string;
  behaviorId: string;
  intervalNumber: number;
  occurred: boolean;
  samplingType: string;
  timestamp: string;
}

interface SkillPayload {
  entryId: string;
  studentId: string;
  skillTargetId: string;
  response: string;
  timestamp: string;
  trialNumber?: number;
}

interface LatencyPayload {
  entryId: string;
  studentId: string;
  behaviorId: string;
  latencySeconds: number;
  antecedentTime: string;
  behaviorOnsetTime: string;
  timestamp: string;
}

export function useSessionDataAttribution(sessionId: string | null) {
  const { publishEntry } = useSharedSessionSync(sessionId);
  const { currentSessionId } = useDataStore();

  const publish = useCallback(
    (
      type: SharedEntryType,
      entryId: string,
      studentId: string,
      behaviorId: string | null | undefined,
      payload: Record<string, unknown>
    ) => {
      const sid = sessionId || currentSessionId;
      if (!sid) return;
      publishEntry({
        sessionId: sid,
        entryType: type,
        entryId,
        studentId,
        behaviorId,
        payload,
      });
    },
    [sessionId, currentSessionId, publishEntry]
  );

  const publishFrequency = useCallback(
    (p: FrequencyPayload) =>
      publish('frequency', p.entryId, p.studentId, p.behaviorId, {
        count: p.count,
        timestamp: p.timestamp,
        behaviorId: p.behaviorId,
      }),
    [publish]
  );

  const publishABC = useCallback(
    (p: ABCPayload) =>
      publish('abc', p.entryId, p.studentId, p.behaviorId, {
        antecedent: p.antecedent,
        behavior: p.behavior,
        consequence: p.consequence,
        functions: p.functions,
        timestamp: p.timestamp,
        frequencyCount: p.frequencyCount ?? 1,
        behaviorId: p.behaviorId,
      }),
    [publish]
  );

  const publishDuration = useCallback(
    (p: DurationPayload) =>
      publish('duration', p.entryId, p.studentId, p.behaviorId, {
        durationSeconds: p.durationSeconds,
        startTime: p.startTime,
        endTime: p.endTime,
        behaviorId: p.behaviorId,
      }),
    [publish]
  );

  const publishInterval = useCallback(
    (p: IntervalPayload) =>
      publish('interval', p.entryId, p.studentId, p.behaviorId, {
        intervalNumber: p.intervalNumber,
        occurred: p.occurred,
        samplingType: p.samplingType,
        timestamp: p.timestamp,
        behaviorId: p.behaviorId,
      }),
    [publish]
  );

  const publishSkill = useCallback(
    (p: SkillPayload) =>
      publish('skill', p.entryId, p.studentId, p.skillTargetId, {
        skillTargetId: p.skillTargetId,
        response: p.response,
        trialNumber: p.trialNumber,
        timestamp: p.timestamp,
      }),
    [publish]
  );

  const publishLatency = useCallback(
    (p: LatencyPayload) =>
      publish('latency', p.entryId, p.studentId, p.behaviorId, {
        latencySeconds: p.latencySeconds,
        antecedentTime: p.antecedentTime,
        behaviorOnsetTime: p.behaviorOnsetTime,
        timestamp: p.timestamp,
        behaviorId: p.behaviorId,
      }),
    [publish]
  );

  return {
    publishFrequency,
    publishABC,
    publishDuration,
    publishInterval,
    publishSkill,
    publishLatency,
  };
}
