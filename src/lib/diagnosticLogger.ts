/**
 * Structured Diagnostic Logger
 * Captures debug/info/warn/error with context — no third-party keys required.
 * Placeholder hooks for Sentry/LogRocket/Datadog behind env toggles.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  route: string;
  tag: string;           // component or context tag
  message: string;
  data?: unknown;
  userId?: string;
  sessionId?: string;
  duration?: number;     // for perf entries (ms)
  statusCode?: number;   // for network entries
  url?: string;          // for network entries
  method?: string;
}

// In-memory ring buffer (last 500 entries)
const LOG_BUFFER_SIZE = 500;
const logBuffer: LogEntry[] = [];

function pushEntry(entry: LogEntry) {
  if (logBuffer.length >= LOG_BUFFER_SIZE) logBuffer.shift();
  logBuffer.push(entry);
}

// Monitoring adapter — logs to console only in dev.
// Replace the body of `ship()` to forward to Sentry / LogRocket / Datadog.
function ship(entry: LogEntry) {
  if (import.meta.env.VITE_ENABLE_REMOTE_LOGGING === 'true') {
    // TODO: forward to remote monitoring service
    // e.g. Sentry.captureMessage(entry.message, { level: entry.level, extra: entry })
  }
}

function getRoute(): string {
  try {
    return window.location.pathname;
  } catch {
    return 'unknown';
  }
}

export function log(
  level: LogLevel,
  tag: string,
  message: string,
  data?: unknown,
  extras?: Partial<Pick<LogEntry, 'userId' | 'sessionId' | 'duration' | 'statusCode' | 'url' | 'method'>>
): void {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    route: getRoute(),
    tag,
    message,
    ...(data !== undefined && { data }),
    ...extras,
  };

  pushEntry(entry);
  ship(entry);

  if (import.meta.env.DEV) {
    const prefix = `[${entry.timestamp.slice(11, 23)}][${entry.level.toUpperCase()}][${entry.tag}]`;
    switch (level) {
      case 'debug': console.debug(prefix, message, data ?? ''); break;
      case 'info':  console.info(prefix, message, data ?? '');  break;
      case 'warn':  console.warn(prefix, message, data ?? '');  break;
      case 'error': console.error(prefix, message, data ?? ''); break;
    }
  }
}

export const logger = {
  debug: (tag: string, msg: string, data?: unknown) => log('debug', tag, msg, data),
  info:  (tag: string, msg: string, data?: unknown) => log('info',  tag, msg, data),
  warn:  (tag: string, msg: string, data?: unknown) => log('warn',  tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) => log('error', tag, msg, data),
  /** Log a network request result */
  network: (opts: {
    tag: string;
    url: string;
    method: string;
    statusCode: number;
    duration: number;
    ok: boolean;
    errorBody?: unknown;
  }) => {
    const level: LogLevel = !opts.ok ? 'error' : opts.duration > 800 ? 'warn' : 'info';
    log(level, opts.tag, `${opts.method} ${opts.url} → ${opts.statusCode} (${opts.duration}ms)`, opts.errorBody, {
      url: opts.url,
      method: opts.method,
      statusCode: opts.statusCode,
      duration: opts.duration,
    });
  },
};

/** Retrieve recent log entries, optionally filtered by level. */
export function getLogBuffer(filter?: LogLevel): LogEntry[] {
  if (!filter) return [...logBuffer];
  return logBuffer.filter(e => e.level === filter);
}

/** Decode a Supabase error object into human-readable category + message */
export interface SupabaseErrorDecoded {
  category: 'rls_denied' | 'constraint_violation' | 'schema_mismatch' | 'auth_expired' | 'network' | 'unknown';
  message: string;
  raw: unknown;
}

export function decodeSupabaseError(error: unknown, opts?: { table?: string; operation?: string }): SupabaseErrorDecoded {
  const raw = error as any;
  const msg: string = raw?.message || raw?.error_description || String(error);
  const code: string = raw?.code || '';
  const hint: string = raw?.hint || '';

  let category: SupabaseErrorDecoded['category'] = 'unknown';

  if (
    msg.includes('row-level security') ||
    msg.includes('policy') ||
    code === 'PGRST301' ||
    code === '42501'
  ) {
    category = 'rls_denied';
  } else if (
    code === '23505' || code === '23503' || code === '23502' ||
    msg.includes('violates') || msg.includes('constraint')
  ) {
    category = 'constraint_violation';
  } else if (
    code === '42703' || code === '42P01' ||
    msg.includes('column') || msg.includes('relation') || msg.includes('does not exist')
  ) {
    category = 'schema_mismatch';
  } else if (
    code === 'PGRST301' || msg.includes('JWT') || msg.includes('token') ||
    msg.includes('expired') || msg.includes('not authenticated')
  ) {
    category = 'auth_expired';
  } else if (
    msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')
  ) {
    category = 'network';
  }

  const context = opts ? ` [${opts.table ?? '?'}.${opts.operation ?? '?'}]` : '';
  logger.error('SupabaseError', `${category}${context}: ${msg}`, { code, hint, raw });

  return { category, message: msg, raw };
}
