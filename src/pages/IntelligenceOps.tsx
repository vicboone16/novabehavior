import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Play, RefreshCw, CheckCircle2, XCircle, Clock, Activity } from "lucide-react";
import { format } from "date-fns";

interface ComputeRun {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  agency_id: string | null;
  data_source_id: string | null;
  metrics_upserted_count: number;
  alerts_upserted_count: number;
  alerts_resolved_count: number;
  errors_json: Record<string, string> | null;
  duration_ms: number | null;
}

export default function IntelligenceOps() {
  const [runs, setRuns] = useState<ComputeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    const { data: superAdmin } = await supabase.rpc("is_super_admin", { _user_id: user.id });

    if (!isAdmin && !superAdmin) { navigate("/"); return; }

    setIsSuperAdmin(!!superAdmin);
    setAuthorized(true);
    fetchRuns();
  }

  async function fetchRuns() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("ci_compute_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      toast({ title: "Error loading runs", description: error.message, variant: "destructive" });
    } else {
      setRuns((data as unknown as ComputeRun[]) || []);
    }
    setLoading(false);
  }

  async function triggerRun() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-ci-metrics", {
        body: {},
      });

      if (error) throw error;

      toast({
        title: "Compute completed",
        description: `Run ${data?.run_id?.slice(0, 8) || "OK"} — ${data?.run?.metrics_upserted_count ?? "?"} metrics, ${data?.run?.alerts_upserted_count ?? "?"} alerts`,
      });

      fetchRuns();
    } catch (err: any) {
      toast({ title: "Compute failed", description: err.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "success":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case "running":
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30"><Clock className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/intelligence")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              CIE Operations
            </h1>
            <p className="text-sm text-muted-foreground">Compute run history & observability</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRuns} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isSuperAdmin && (
            <Button size="sm" onClick={triggerRun} disabled={running}>
              <Play className={`w-3.5 h-3.5 mr-1.5 ${running ? "animate-spin" : ""}`} />
              {running ? "Running…" : "Run Now"}
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {runs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Last Run</CardTitle></CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-sm font-semibold">{format(new Date(runs[0].started_at), "MMM d, HH:mm")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Status</CardTitle></CardHeader>
            <CardContent className="px-4 pb-3">{statusBadge(runs[0].status)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Duration</CardTitle></CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-sm font-semibold">{runs[0].duration_ms != null ? `${(runs[0].duration_ms / 1000).toFixed(1)}s` : "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Metrics / Alerts</CardTitle></CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-sm font-semibold">{runs[0].metrics_upserted_count} / {runs[0].alerts_upserted_count}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Runs table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Compute Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No compute runs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Metrics</TableHead>
                    <TableHead className="text-right">Alerts</TableHead>
                    <TableHead className="text-right">Resolved</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.run_id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(run.started_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>{statusBadge(run.status)}</TableCell>
                      <TableCell className="text-right text-xs">
                        {run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{run.metrics_upserted_count}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{run.alerts_upserted_count}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{run.alerts_resolved_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {run.agency_id ? run.agency_id.slice(0, 8) : "All"}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                        {run.errors_json?.message || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
