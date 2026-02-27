import { ShieldAlert, AlertTriangle, Server, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
      <Card className="max-w-lg w-full border-destructive/50">
        <CardHeader className="text-center space-y-2">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <CardTitle className="text-xl text-destructive">Wrong Backend Connected</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm text-center">
            The connected backend does not match the expected NovaTrack configuration.
            The application cannot load until this is resolved.
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

          {guard.errorMessage && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{guard.errorMessage}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Contact your administrator to ensure the correct backend is connected.
          </p>
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
        {status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
        {status === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
        <span className={status === 'error' ? 'text-destructive' : 'text-foreground'}>{value}</span>
      </div>
    </div>
  );
}
