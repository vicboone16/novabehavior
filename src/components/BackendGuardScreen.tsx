import { ShieldAlert, AlertTriangle, Server, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { BackendGuardState } from '@/hooks/useBackendGuard';

interface Props {
  guard: BackendGuardState;
}

export function BackendGuardScreen({ guard }: Props) {
  const isBlocked = guard.status !== 'ok' && guard.status !== 'checking';

  if (guard.status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Server className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-muted-foreground text-sm">Verifying backend connection…</p>
        </div>
      </div>
    );
  }

  if (!isBlocked) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-xl w-full border-destructive/50">
        <CardHeader className="text-center space-y-2">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <CardTitle className="text-xl text-destructive">Backend Verification Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm text-center">
            We could not complete startup checks, so the app was paused to avoid loading into an invalid state.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm font-mono">
            <DiagRow label="Backend URL" value={guard.maskedUrl} />
            <DiagRow
              label="App Slug"
              value={guard.appSlug ?? 'N/A'}
              status={guard.appSlug === 'novatrack' ? 'ok' : 'error'}
            />
            <DiagRow label="Environment" value={guard.environmentName ?? 'N/A'} />
            <DiagRow label="Last Ping" value={guard.lastPingAt ?? '—'} />
            <DiagRow label="Status" value={guard.status} status="error" />
          </div>

          {(guard.errorMessage || guard.diagnostic) && (
            <div className="bg-destructive/10 rounded-lg p-3 space-y-2 text-sm">
              {guard.errorMessage && (
                <div className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{guard.errorMessage}</span>
                </div>
              )}
              {guard.diagnostic && (
                <div className="font-mono text-xs space-y-1">
                  <DiagLine label="Step" value={guard.diagnostic.step} />
                  {guard.diagnostic.table && <DiagLine label="Table" value={guard.diagnostic.table} />}
                  {guard.diagnostic.rpc && <DiagLine label="RPC" value={guard.diagnostic.rpc} />}
                  {guard.diagnostic.query && <DiagLine label="Query" value={guard.diagnostic.query} />}
                  {guard.diagnostic.code && <DiagLine label="Code" value={guard.diagnostic.code} />}
                  <DiagLine label="Message" value={guard.diagnostic.message} />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={guard.retry}>Retry Check</Button>
            <Button className="flex-1" onClick={() => window.location.reload()}>Refresh App</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DiagRow({ label, value, status }: { label: string; value: string; status?: 'ok' | 'error' }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
        {status === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
        <span className={status === 'error' ? 'text-destructive' : 'text-foreground'}>{value}</span>
      </div>
    </div>
  );
}

function DiagLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right break-all">{value}</span>
    </div>
  );
}

