import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase before importing the module
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: (...args: any[]) => {
        mockUpdate(...args);
        return {
          eq: (...eqArgs: any[]) => {
            mockEq(...eqArgs);
            return Promise.resolve({ error: null });
          },
        };
      },
    })),
  },
}));

import {
  onHistoricalDataChanged,
  emitHistoricalDataChanged,
  hasUnsavedHistoricalData,
  initHistoricalDataSync,
  flushPendingHistoricalData,
  getHistoricalSyncStatus,
  onSyncStatusChanged,
  _testResetState,
} from '@/lib/historicalDataSync';

describe('historicalDataSync', () => {
  beforeEach(() => {
    _testResetState();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Event system tests ──────────────────────────────────────────────────
  describe('event system', () => {
    it('onHistoricalDataChanged registers a listener and returns unsubscribe', () => {
      const listener = vi.fn();
      const unsub = onHistoricalDataChanged(listener);

      emitHistoricalDataChanged('student-1');
      expect(listener).toHaveBeenCalledWith('student-1');
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      emitHistoricalDataChanged('student-1');
      expect(listener).toHaveBeenCalledTimes(1); // no new call
    });

    it('emitHistoricalDataChanged calls all registered listeners', () => {
      const l1 = vi.fn();
      const l2 = vi.fn();
      onHistoricalDataChanged(l1);
      onHistoricalDataChanged(l2);

      emitHistoricalDataChanged('student-2');
      expect(l1).toHaveBeenCalledWith('student-2');
      expect(l2).toHaveBeenCalledWith('student-2');
    });

    it('unsubscribing one listener does not affect others', () => {
      const l1 = vi.fn();
      const l2 = vi.fn();
      const unsub1 = onHistoricalDataChanged(l1);
      onHistoricalDataChanged(l2);

      unsub1();
      emitHistoricalDataChanged('student-3');
      expect(l1).not.toHaveBeenCalled();
      expect(l2).toHaveBeenCalledWith('student-3');
    });
  });

  // ── Pending state tracking tests ────────────────────────────────────────
  describe('pending state tracking', () => {
    it('returns false for unknown students', () => {
      expect(hasUnsavedHistoricalData('unknown')).toBe(false);
    });

    it('returns true after emitting a change via initHistoricalDataSync', () => {
      const getter = vi.fn().mockReturnValue({
        frequencyEntries: [{ id: '1', timestamp: new Date() }],
        durationEntries: [],
      });

      initHistoricalDataSync(getter);
      emitHistoricalDataChanged('student-1');

      expect(hasUnsavedHistoricalData('student-1')).toBe(true);
    });

    it('returns false after successful save', async () => {
      const getter = vi.fn().mockReturnValue({
        frequencyEntries: [{ id: '1', timestamp: new Date() }],
        durationEntries: [],
      });

      initHistoricalDataSync(getter);
      emitHistoricalDataChanged('student-1');
      expect(hasUnsavedHistoricalData('student-1')).toBe(true);

      // Advance past debounce
      await vi.advanceTimersByTimeAsync(600);

      expect(hasUnsavedHistoricalData('student-1')).toBe(false);
    });
  });

  // ── Sync status tests ──────────────────────────────────────────────────
  describe('sync status', () => {
    it('defaults to idle for unknown students', () => {
      expect(getHistoricalSyncStatus('unknown')).toBe('idle');
    });

    it('transitions pending → synced on successful save', async () => {
      const statuses: string[] = [];
      onSyncStatusChanged((id, status) => {
        if (id === 'student-1') statuses.push(status);
      });

      const getter = vi.fn().mockReturnValue({
        frequencyEntries: [],
        durationEntries: [],
      });

      initHistoricalDataSync(getter);
      emitHistoricalDataChanged('student-1');

      expect(statuses).toContain('pending');

      await vi.advanceTimersByTimeAsync(600);

      expect(statuses).toContain('synced');
      expect(getHistoricalSyncStatus('student-1')).toBe('synced');
    });

    it('sets status to idle when getter returns null', async () => {
      const getter = vi.fn().mockReturnValue(null);

      initHistoricalDataSync(getter);
      emitHistoricalDataChanged('student-1');

      await vi.advanceTimersByTimeAsync(600);

      expect(getHistoricalSyncStatus('student-1')).toBe('idle');
      expect(hasUnsavedHistoricalData('student-1')).toBe(false);
    });
  });

  // ── Save flow tests ─────────────────────────────────────────────────────
  describe('save flow', () => {
    it('saves data to database after debounce', async () => {
      const getter = vi.fn().mockReturnValue({
        frequencyEntries: [{ id: 'e1', timestamp: new Date('2025-01-15') }],
        durationEntries: [],
      });

      initHistoricalDataSync(getter);
      emitHistoricalDataChanged('student-1');

      // Before debounce: no Supabase call
      expect(mockUpdate).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(600);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockEq).toHaveBeenCalledWith('id', 'student-1');
    });

    it('debounces multiple rapid emissions into one save', async () => {
      const getter = vi.fn().mockReturnValue({
        frequencyEntries: [{ id: 'e1', timestamp: new Date() }],
        durationEntries: [],
      });

      initHistoricalDataSync(getter);

      emitHistoricalDataChanged('student-1');
      await vi.advanceTimersByTimeAsync(200);
      emitHistoricalDataChanged('student-1');
      await vi.advanceTimersByTimeAsync(200);
      emitHistoricalDataChanged('student-1');

      // Wait for debounce to fire
      await vi.advanceTimersByTimeAsync(600);

      // Should only have saved once despite 3 emissions
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('clears pending without Supabase call when getter returns null', async () => {
      const getter = vi.fn().mockReturnValue(null);

      initHistoricalDataSync(getter);
      emitHistoricalDataChanged('student-1');

      await vi.advanceTimersByTimeAsync(600);

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(hasUnsavedHistoricalData('student-1')).toBe(false);
    });
  });

  // ── Flush tests ──────────────────────────────────────────────────────────
  describe('flushPendingHistoricalData', () => {
    it('saves all pending students immediately', async () => {
      const data: Record<string, any> = {
        's1': { frequencyEntries: [{ id: '1', timestamp: new Date() }], durationEntries: [] },
        's2': { frequencyEntries: [], durationEntries: [{ id: '2', timestamp: new Date() }] },
      };

      const getter = vi.fn((id: string) => data[id] || null);
      initHistoricalDataSync(getter);

      emitHistoricalDataChanged('s1');
      emitHistoricalDataChanged('s2');

      // Flush immediately (don't wait for debounce)
      await flushPendingHistoricalData(getter);

      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(hasUnsavedHistoricalData('s1')).toBe(false);
      expect(hasUnsavedHistoricalData('s2')).toBe(false);
    });

    it('does nothing when there are no pending changes', async () => {
      const getter = vi.fn().mockReturnValue(null);
      await flushPendingHistoricalData(getter);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
