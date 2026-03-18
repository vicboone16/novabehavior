import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Gift, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface BeaconPointsPanelProps {
  clientId: string;
}

interface PointEntry {
  id: string;
  points_delta: number;
  reason: string | null;
  source: string;
  created_at: string;
}

interface RedemptionEntry {
  id: string;
  points_spent: number;
  status: string;
  redeemed_at: string;
  reward_name?: string;
}

export function BeaconPointsPanel({ clientId }: BeaconPointsPanelProps) {
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const [pRes, rRes] = await Promise.all([
        supabase
          .from("beacon_points_ledger" as any)
          .select("id, points_delta, reason, source, created_at")
          .eq("student_id", clientId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("beacon_reward_redemptions" as any)
          .select("id, points_spent, status, redeemed_at, reward_id")
          .eq("student_id", clientId)
          .order("redeemed_at", { ascending: false })
          .limit(20),
      ]);
      setPoints((pRes.data as any[]) || []);

      // Get reward names for redemptions
      const redemptionRows = (rRes.data as any[]) || [];
      if (redemptionRows.length > 0) {
        const rewardIds = [...new Set(redemptionRows.map((r: any) => r.reward_id))];
        const { data: rewards } = await supabase
          .from("beacon_rewards" as any)
          .select("id, name")
          .in("id", rewardIds);
        const rewardMap = new Map((rewards as any[] || []).map((r: any) => [r.id, r.name]));
        setRedemptions(redemptionRows.map((r: any) => ({
          ...r,
          reward_name: rewardMap.get(r.reward_id) || "Reward",
        })));
      } else {
        setRedemptions([]);
      }
      setLoading(false);
    }
    fetch();
  }, [clientId]);

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const totalEarned = points.filter(p => p.points_delta > 0).reduce((s, p) => s + p.points_delta, 0);
  const totalSpent = redemptions.reduce((s, r) => s + r.points_spent, 0);
  const balance = totalEarned - totalSpent;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Star className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold">{totalEarned}</p>
            <p className="text-xs text-muted-foreground">Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Gift className="w-4 h-4 mx-auto text-purple-500 mb-1" />
            <p className="text-lg font-bold">{totalSpent}</p>
            <p className="text-xs text-muted-foreground">Redeemed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
            <p className="text-lg font-bold">{balance}</p>
            <p className="text-xs text-muted-foreground">Balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Point Transactions */}
      <div>
        <h4 className="text-sm font-medium mb-2">Recent Points</h4>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No points recorded yet — once awarded via Beacon, they'll appear here.</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {points.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-md border border-border/50">
                <div className="min-w-0">
                  <p className="text-sm truncate">{p.reason || p.source}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(p.created_at), "MMM d, h:mm a")}</p>
                </div>
                <Badge className={p.points_delta > 0 ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"}>
                  {p.points_delta > 0 ? "+" : ""}{p.points_delta}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Redemption History */}
      <div>
        <h4 className="text-sm font-medium mb-2">Reward Redemptions</h4>
        {redemptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No rewards redeemed yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-md border border-border/50">
                <div className="min-w-0">
                  <p className="text-sm truncate">{r.reward_name}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(r.redeemed_at), "MMM d, h:mm a")}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{r.points_spent} pts</Badge>
                  <Badge className={r.status === "fulfilled" ? "bg-emerald-500/15 text-emerald-600" : "bg-yellow-500/15 text-yellow-600"} >
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
