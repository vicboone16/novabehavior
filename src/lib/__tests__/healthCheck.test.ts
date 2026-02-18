/**
 * healthCheck.test.ts
 * Tests for the health check utility.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing healthCheck
vi.mock('@/integrations/supabase/client', () => {
  const mockUpdate = vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  }));
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      limit: vi.fn(() => Promise.resolve({ data: [{ id: 'p1' }], error: null })),
    })),
    update: mockUpdate,
  }));

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: 'user-1', email: 'test@example.com' },
              access_token: 'token',
            },
          },
          error: null,
        }),
      },
      from: mockFrom,
    },
  };
});

import { runHealthCheck } from '@/lib/healthCheck';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('healthCheck — runHealthCheck()', () => {
  it('returns ok=true when all checks pass', async () => {
    const result = await runHealthCheck();
    expect(result.ok).toBe(true);
    expect(result.checks.auth.ok).toBe(true);
    expect(result.checks.dbRead.ok).toBe(true);
    expect(result.checks.dbWrite.ok).toBe(true);
  });

  it('includes timestamp in ISO format', async () => {
    const result = await runHealthCheck();
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('reports auth failure correctly when no session', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    const result = await runHealthCheck();
    expect(result.checks.auth.ok).toBe(false);
    expect(result.checks.auth.message).toMatch(/no active session/i);
    expect(result.ok).toBe(false);
  });

  it('reports DB read failure', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn(() => ({
        limit: vi.fn(() =>
          Promise.resolve({ data: null, error: { message: 'permission denied' } })
        ),
      })),
      update: vi.fn(),
    });
    const result = await runHealthCheck();
    expect(result.checks.dbRead.ok).toBe(false);
    expect(result.ok).toBe(false);
  });

  it('includes latency measurements', async () => {
    const result = await runHealthCheck();
    expect(result.checks.auth.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.checks.dbRead.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.checks.dbWrite.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
