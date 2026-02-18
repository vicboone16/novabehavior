/**
 * Health Check diagnostic utility.
 * Validates auth, DB read, DB write, and basic connectivity.
 * No third-party keys needed.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/diagnosticLogger';

export interface HealthCheckResult {
  ok: boolean;
  timestamp: string;
  checks: {
    auth: CheckResult;
    dbRead: CheckResult;
    dbWrite: CheckResult;
  };
}

export interface CheckResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export async function runHealthCheck(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();
  logger.info('HealthCheck', 'Running health check...');

  // ── Auth check ─────────────────────────────────────────────────────────────
  let authCheck: CheckResult;
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const t0 = Date.now();
    const { data } = await supabase.auth.getSession();
    const latencyMs = Date.now() - t0;
    const session = data?.session;
    userId = session?.user.id ?? null;
    userEmail = session?.user.email ?? null;
    authCheck = session
      ? { ok: true,  message: `Authenticated as ${userEmail}`, latencyMs }
      : { ok: false, message: 'No active session', latencyMs };
  } catch (e: any) {
    authCheck = { ok: false, message: `Auth error: ${e?.message ?? e}` };
  }

  // ── DB read check ──────────────────────────────────────────────────────────
  let dbReadCheck: CheckResult;
  try {
    const t0 = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latencyMs = Date.now() - t0;
    dbReadCheck = error
      ? { ok: false, message: `Read error: ${error.message}`, latencyMs }
      : { ok: true,  message: 'DB read OK', latencyMs };
  } catch (e: any) {
    dbReadCheck = { ok: false, message: `DB read threw: ${e?.message ?? e}` };
  }

  // ── DB write check (idempotent: update own profile timestamp) ───────────────
  let dbWriteCheck: CheckResult;
  try {
    if (!userId) {
      dbWriteCheck = { ok: false, message: 'Skipped — no auth session' };
    } else {
      const t0 = Date.now();
      const { error } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() } as any)
        .eq('user_id', userId);
      const latencyMs = Date.now() - t0;
      dbWriteCheck = error
        ? { ok: false, message: `Write error: ${error.message}`, latencyMs }
        : { ok: true,  message: 'DB write OK', latencyMs };
    }
  } catch (e: any) {
    dbWriteCheck = { ok: false, message: `DB write threw: ${e?.message ?? e}` };
  }

  const overall = authCheck.ok && dbReadCheck.ok && dbWriteCheck.ok;

  const report: HealthCheckResult = {
    ok: overall,
    timestamp,
    checks: { auth: authCheck, dbRead: dbReadCheck, dbWrite: dbWriteCheck },
  };

  logger[overall ? 'info' : 'warn'](
    'HealthCheck',
    `Health check complete — ${overall ? 'ALL OK' : 'ISSUES FOUND'}`,
    report
  );

  return report;
}
