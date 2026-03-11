import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, RefreshCw, AlertTriangle, CheckCircle2, Info, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Finding {
  id: string;
  category: string;
  level: 'error' | 'warn' | 'info';
  name: string;
  description: string;
  details?: string;
  remediation?: string;
}

interface ScanResult {
  scan_id: string | null;
  summary: {
    total_findings: number;
    errors: number;
    warnings: number;
    info: number;
    scanned_at: string;
  };
  findings: Finding[];
  duration_ms: number;
}

interface HistoricalScan {
  id: string;
  scan_type: string;
  status: string;
  summary: any;
  findings: any[];
  duration_ms: number;
  created_at: string;
}

const LEVEL_CONFIG = {
  error: { icon: AlertTriangle, color: 'text-destructive', badge: 'destructive' as const, label: 'Error' },
  warn: { icon: AlertTriangle, color: 'text-amber-500', badge: 'secondary' as const, label: 'Warning' },
  info: { icon: Info, color: 'text-blue-500', badge: 'outline' as const, label: 'Info' },
};

export function SecurityScanTab() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoricalScan[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-security-scan');
      if (error) throw error;
      setResult(data as ScanResult);
      toast({ title: 'Security scan completed', description: `Found ${data.summary.total_findings} findings in ${data.duration_ms}ms` });
      loadHistory();
    } catch (err: any) {
      toast({ title: 'Scan failed', description: err.message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from('security_scan_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setHistory((data as HistoricalScan[]) || []);
    setHistoryLoaded(true);
  };

  if (!historyLoaded) {
    loadHistory();
  }

  const findings = result?.findings || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Full-Stack Security Scan
              </CardTitle>
              <CardDescription>
                Scan database (RLS, SECURITY DEFINER, storage), edge functions, and client-side patterns
              </CardDescription>
            </div>
            <Button onClick={runScan} disabled={scanning} className="gap-2">
              {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {scanning ? 'Scanning...' : 'Run Scan'}
            </Button>
          </div>
        </CardHeader>

        {result && (
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-card text-center">
                <p className="text-2xl font-bold">{result.summary.total_findings}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-3 rounded-lg border bg-destructive/10 text-center">
                <p className="text-2xl font-bold text-destructive">{result.summary.errors}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
              <div className="p-3 rounded-lg border bg-amber-500/10 text-center">
                <p className="text-2xl font-bold text-amber-500">{result.summary.warnings}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
              <div className="p-3 rounded-lg border bg-blue-500/10 text-center">
                <p className="text-2xl font-bold text-blue-500">{result.summary.info}</p>
                <p className="text-xs text-muted-foreground">Info</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Completed in {result.duration_ms}ms
              {result.scan_id && ` · Scan ID: ${result.scan_id.slice(0, 8)}…`}
            </p>

            {/* Findings */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {findings
                  .sort((a, b) => {
                    const order = { error: 0, warn: 1, info: 2 };
                    return order[a.level] - order[b.level];
                  })
                  .map((finding, i) => {
                    const config = LEVEL_CONFIG[finding.level];
                    const Icon = config.icon;
                    return (
                      <div key={`${finding.id}-${i}`} className="p-3 rounded-lg border space-y-1.5">
                        <div className="flex items-start gap-2">
                          <Icon className={`w-4 h-4 mt-0.5 ${config.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{finding.name}</span>
                              <Badge variant={config.badge} className="text-[10px]">{config.label}</Badge>
                              <Badge variant="outline" className="text-[10px]">{finding.category}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{finding.description}</p>
                            {finding.details && (
                              <pre className="text-[10px] text-muted-foreground mt-1 bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                {finding.details}
                              </pre>
                            )}
                            {finding.remediation && (
                              <p className="text-xs text-primary mt-1">
                                <strong>Fix:</strong> {finding.remediation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Scan History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-2.5 rounded border text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    setResult({
                      scan_id: scan.id,
                      summary: scan.summary,
                      findings: scan.findings as Finding[],
                      duration_ms: scan.duration_ms,
                    });
                  }}
                >
                  <div className="flex items-center gap-2">
                    {scan.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(scan.created_at), 'PPpp')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {scan.summary?.total_findings || 0} findings
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{scan.duration_ms}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
