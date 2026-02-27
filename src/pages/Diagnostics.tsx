import { useState } from 'react';
import { Server, RefreshCw, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBackendGuard, type BackendGuardState } from '@/hooks/useBackendGuard';
import { runHealthCheck, type HealthCheckResult } from '@/lib/healthCheck';

export default function Diagnostics() {
  const guard = useBackendGuard();
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const runHealth = async () => {
    setHealthLoading(true);
    try {
      const result = await runHealthCheck();
      setHealthResult(result);
    } finally {
      setHealthLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Server className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">System Diagnostics</h1>
      </div>

      {/* Backend Guard Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Backend Handshake
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 font-mono text-sm">
          <Row label="Status" value={guard.status} badge={guard.status === 'ok' ? 'success' : 'error'} />
          <Row label="Backend URL (masked)" value={guard.maskedUrl} />
          <Row label="App Slug" value={guard.appSlug ?? 'N/A'} badge={guard.appSlug === 'novatrack' ? 'success' : 'error'} />
          <Row label="Environment" value={guard.environmentName ?? 'N/A'} />
          <Row label="Last DB Ping" value={guard.lastPingAt ?? '—'} />
          {guard.errorMessage && (
            <div className="text-destructive text-xs bg-destructive/10 rounded p-2">{guard.errorMessage}</div>
          )}
        </CardContent>
      </Card>

      {/* Health Check */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Health Check
          </CardTitle>
          <Button variant="outline" size="sm" onClick={runHealth} disabled={healthLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${healthLoading ? 'animate-spin' : ''}`} />
            Run
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 font-mono text-sm">
          {healthResult ? (
            <>
              <Row label="Overall" value={healthResult.ok ? 'PASS' : 'FAIL'} badge={healthResult.ok ? 'success' : 'error'} />
              <Row label="Auth" value={healthResult.checks.auth.message} badge={healthResult.checks.auth.ok ? 'success' : 'error'} />
              <Row label="DB Read" value={healthResult.checks.dbRead.message} badge={healthResult.checks.dbRead.ok ? 'success' : 'error'} />
              <Row label="DB Write" value={healthResult.checks.dbWrite.message} badge={healthResult.checks.dbWrite.ok ? 'success' : 'error'} />
            </>
          ) : (
            <p className="text-muted-foreground text-xs">Click "Run" to execute health check.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, badge }: { label: string; value: string; badge?: 'success' | 'error' }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {badge === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
        {badge === 'error' && <XCircle className="w-3.5 h-3.5 text-destructive" />}
        <span className={badge === 'error' ? 'text-destructive' : 'text-foreground'}>{value}</span>
      </div>
    </div>
  );
}
