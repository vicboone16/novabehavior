/**
 * diagnosticLogger.test.ts
 * Tests for the structured diagnostic logger.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { log, getLogBuffer, decodeSupabaseError, logger } from '@/lib/diagnosticLogger';

// Reset buffer between tests by re-importing (module cache keeps buffer alive, 
// so we drain it via the exported getter instead).
beforeEach(() => {
  // Clear console spies
  vi.restoreAllMocks();
});

describe('diagnosticLogger — log()', () => {
  it('pushes an entry into the buffer', () => {
    const before = getLogBuffer().length;
    log('info', 'TestTag', 'hello world');
    const after = getLogBuffer();
    expect(after.length).toBeGreaterThan(before);
    const last = after[after.length - 1];
    expect(last.level).toBe('info');
    expect(last.tag).toBe('TestTag');
    expect(last.message).toBe('hello world');
  });

  it('records timestamp in ISO format', () => {
    log('debug', 'T', 'ts check');
    const last = getLogBuffer().slice(-1)[0];
    expect(last.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('attaches extras (url, method, statusCode, duration)', () => {
    log('error', 'Net', 'request failed', { body: 'bad' }, {
      url: '/api/test',
      method: 'POST',
      statusCode: 500,
      duration: 1200,
    });
    const last = getLogBuffer().slice(-1)[0];
    expect(last.url).toBe('/api/test');
    expect(last.method).toBe('POST');
    expect(last.statusCode).toBe(500);
    expect(last.duration).toBe(1200);
  });

  it('logger.network() logs warn for slow requests (>800ms)', () => {
    logger.network({
      tag: 'Slow',
      url: '/slow',
      method: 'GET',
      statusCode: 200,
      duration: 900,
      ok: true,
    });
    const last = getLogBuffer().slice(-1)[0];
    expect(last.level).toBe('warn');
  });

  it('logger.network() logs error for failed requests', () => {
    logger.network({
      tag: 'Fail',
      url: '/fail',
      method: 'POST',
      statusCode: 500,
      duration: 100,
      ok: false,
      errorBody: { message: 'Internal server error' },
    });
    const last = getLogBuffer().slice(-1)[0];
    expect(last.level).toBe('error');
  });

  it('getLogBuffer() filters by level', () => {
    log('debug', 'F', 'debug entry');
    log('error', 'F', 'error entry');
    const errors = getLogBuffer('error');
    expect(errors.every(e => e.level === 'error')).toBe(true);
    const debugs = getLogBuffer('debug');
    expect(debugs.every(e => e.level === 'debug')).toBe(true);
  });
});

describe('diagnosticLogger — decodeSupabaseError()', () => {
  it('detects RLS denied errors', () => {
    const decoded = decodeSupabaseError({
      message: 'new row violates row-level security policy for table "students"',
      code: '42501',
    }, { table: 'students', operation: 'insert' });
    expect(decoded.category).toBe('rls_denied');
  });

  it('detects constraint violations', () => {
    const decoded = decodeSupabaseError({
      message: 'duplicate key value violates unique constraint "profiles_pkey"',
      code: '23505',
    });
    expect(decoded.category).toBe('constraint_violation');
  });

  it('detects schema mismatch (missing column)', () => {
    const decoded = decodeSupabaseError({
      message: 'column "nonexistent" of relation "students" does not exist',
      code: '42703',
    });
    expect(decoded.category).toBe('schema_mismatch');
  });

  it('detects network failures', () => {
    const decoded = decodeSupabaseError({
      message: 'Failed to fetch',
      code: '',
    });
    expect(decoded.category).toBe('network');
  });

  it('falls back to unknown for unrecognized errors', () => {
    const decoded = decodeSupabaseError({ message: 'Something unexpected', code: '99999' });
    expect(decoded.category).toBe('unknown');
  });
});
