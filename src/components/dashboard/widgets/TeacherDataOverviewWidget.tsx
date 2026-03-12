import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertTriangle, Target, BarChart3 } from "lucide-react";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

export function TeacherDataOverviewWidget() {
  const { user } = useAuth();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-data-overview-widget"],
    queryFn: async () => {
      // Get current week summaries
      const { data: summaries } = await supabase
        .from("teacher_weekly_summaries")
        .select("*")
        .gte("week_start", weekStart.toISOString().split("T")[0])
        .lte("week_start", weekEnd.toISOString().split("T")[0])
        .limit(100);

      // Get pending review count
      const { count: pendingCount } = await supabase
        .from("teacher_weekly_summaries")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft");

      // Get recent ABC events count this week
      const { count: abcCount } = await supabase
        .from("teacher_abc_events")
        .select("*", { count: "exact", head: true })
        .gte("occurred_at", weekStart.toISOString());

      // Get active data sessions this week
      const { count: sessionCount } = await supabase
        .from("teacher_data_sessions")
        .select("*", { count: "exact", head: true })
        .gte("started_at", weekStart.toISOString());

      const allSummaries = summaries ?? [];
      const avgEngagement = allSummaries.length > 0
        ? allSummaries.reduce((a, s) => a + (Number(s.engagement_pct) || 0), 0) / allSummaries.length
        : null;
      const avgPrompt = allSummaries.length > 0
        ? allSummaries.reduce((a, s) => a + (Number(s.prompt_completion_pct) || 0), 0) / allSummaries.length
        : null;

      // Aggregate top antecedents
      const antecedentMap: Record<string, number> = {};
      allSummaries.forEach((s) => {
        const ants = Array.isArray(s.top_antecedents) ? s.top_antecedents as Array<{ antecedent: string; count: number }> : [];
        ants.forEach((a) => {
          antecedentMap[a.antecedent] = (antecedentMap[a.antecedent] || 0) + (a.count || 1);
        });
      });
      const topAnts = Object.entries(antecedentMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([antecedent, count]) => ({ antecedent, count }));

      return {
        pendingCount: pendingCount ?? 0,
        abcCount: abcCount ?? 0,
        sessionCount: sessionCount ?? 0,
        avgEngagement,
        avgPrompt,
        topAntecedents: topAnts,
        summaryCount: allSummaries.length,
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-muted/50 p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Pending Review</p>
          <p className="text-xl font-bold">{data.pendingCount}</p>
        </div>
        <div className="rounded-md bg-muted/50 p-2.5 text-center">
          <p className="text-xs text-muted-foreground">ABC Entries</p>
          <p className="text-xl font-bold">{data.abcCount}</p>
        </div>
        {data.avgEngagement != null && (
          <div className="rounded-md bg-muted/50 p-2.5 text-center">
            <p className="text-xs text-muted-foreground">Avg Engagement</p>
            <p className="text-xl font-bold">{Math.round(data.avgEngagement)}%</p>
          </div>
        )}
        {data.avgPrompt != null && (
          <div className="rounded-md bg-muted/50 p-2.5 text-center">
            <p className="text-xs text-muted-foreground">Prompt Completion</p>
            <p className="text-xl font-bold">{Math.round(data.avgPrompt)}%</p>
          </div>
        )}
      </div>

      {/* Top triggers */}
      {data.topAntecedents.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Top Triggers This Week
          </p>
          <div className="flex flex-wrap gap-1">
            {data.topAntecedents.map((a, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {a.antecedent} ({a.count})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Data sessions */}
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">{data.sessionCount}</span> probe sessions this week
      </div>
    </div>
  );
}
