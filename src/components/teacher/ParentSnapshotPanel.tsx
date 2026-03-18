import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ParentSnapshotPanelProps {
  clientId: string;
}

interface Snapshot {
  id: string;
  snapshot_date: string;
  points_earned: number;
  points_redeemed: number;
  engagement_pct: number | null;
  highlights: string | null;
  concerns: string | null;
  status: string;
  behaviors_today: any[];
}

export function ParentSnapshotPanel({ clientId }: ParentSnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from("parent_daily_snapshots" as any)
        .select("*")
        .eq("student_id", clientId)
        .order("snapshot_date", { ascending: false })
        .limit(30);
      setSnapshots((data as any[]) || []);
      setLoading(false);
    }
    fetch();
  }, [clientId]);

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (snapshots.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No parent snapshots generated yet — daily snapshots will appear here once created.</p>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {snapshots.map(s => (
        <div key={s.id} className="p-3 rounded-md border border-border/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{format(new Date(s.snapshot_date), "EEEE, MMM d")}</span>
            </div>
            <Badge className={
              s.status === "sent" ? "bg-emerald-500/15 text-emerald-600" :
              s.status === "draft" ? "bg-yellow-500/15 text-yellow-600" :
              "bg-muted text-muted-foreground"
            }>
              {s.status}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>⭐ {s.points_earned} earned</span>
            <span>🎁 {s.points_redeemed} redeemed</span>
            {s.engagement_pct != null && <span>📊 {Math.round(Number(s.engagement_pct))}% engagement</span>}
          </div>
          {s.highlights && <p className="text-xs text-foreground">{s.highlights}</p>}
          {s.concerns && <p className="text-xs text-destructive">{s.concerns}</p>}
        </div>
      ))}
    </div>
  );
}
