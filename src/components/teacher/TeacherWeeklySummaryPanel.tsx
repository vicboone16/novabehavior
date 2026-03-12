import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { BarChart3, CheckCircle2, Clock, Loader2, MessageSquare, Send, TrendingUp, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeacherWeeklySummaryPanelProps {
  clientId: string;
}

interface WeeklySummary {
  summary_id: string;
  agency_id: string;
  client_id: string;
  week_start: string;
  week_end: string;
  summary_data: Record<string, unknown>;
  behavior_totals: Array<{ behavior: string; count: number; trend?: string }>;
  engagement_pct: number | null;
  prompt_completion_pct: number | null;
  top_antecedents: Array<{ antecedent: string; count: number }>;
  skill_probe_summary: Array<{ target: string; correct: number; total: number }>;
  notes: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_by: string;
  created_at: string;
}

export function TeacherWeeklySummaryPanel({ clientId }: TeacherWeeklySummaryPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const { data: summaries, isLoading } = useQuery({
    queryKey: ["teacher-weekly-summaries", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_weekly_summaries")
        .select("*")
        .eq("client_id", clientId)
        .order("week_start", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as unknown as WeeklySummary[];
    },
  });

  const markReviewed = useMutation({
    mutationFn: async ({ summaryId, comment }: { summaryId: string; comment?: string }) => {
      const { error } = await supabase
        .from("teacher_weekly_summaries")
        .update({
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_comment: comment || null,
          status: "reviewed",
        })
        .eq("summary_id", summaryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-weekly-summaries", clientId] });
      setFeedbackId(null);
      setFeedbackText("");
      toast({ title: "Summary reviewed" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading weekly summaries…
      </div>
    );
  }

  if (!summaries?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No teacher weekly summaries available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {summaries.map((s) => {
        const isReviewed = s.status === "reviewed";
        const behaviorTotals = Array.isArray(s.behavior_totals) ? s.behavior_totals : [];
        const topAntecedents = Array.isArray(s.top_antecedents) ? s.top_antecedents : [];
        const skillProbes = Array.isArray(s.skill_probe_summary) ? s.skill_probe_summary : [];

        return (
          <Card key={s.summary_id} className={isReviewed ? "border-muted" : "border-primary/30"}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {isReviewed && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                  <BarChart3 className="h-4 w-4" />
                  Week of {format(new Date(s.week_start), "MMM d")} – {format(new Date(s.week_end), "MMM d, yyyy")}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <Badge variant={isReviewed ? "outline" : "secondary"} className={isReviewed ? "text-green-700 border-green-300 bg-green-50" : ""}>
                    {isReviewed ? "Reviewed" : "Pending Review"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Metrics row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {s.engagement_pct != null && (
                  <div className="rounded-md bg-muted/50 p-2 text-center">
                    <p className="text-xs text-muted-foreground">Engagement</p>
                    <p className="text-lg font-semibold">{Math.round(s.engagement_pct)}%</p>
                  </div>
                )}
                {s.prompt_completion_pct != null && (
                  <div className="rounded-md bg-muted/50 p-2 text-center">
                    <p className="text-xs text-muted-foreground">Prompt Completion</p>
                    <p className="text-lg font-semibold">{Math.round(s.prompt_completion_pct)}%</p>
                  </div>
                )}
                {behaviorTotals.length > 0 && (
                  <div className="rounded-md bg-muted/50 p-2 text-center">
                    <p className="text-xs text-muted-foreground">Behaviors Logged</p>
                    <p className="text-lg font-semibold">{behaviorTotals.reduce((a, b) => a + (b.count || 0), 0)}</p>
                  </div>
                )}
                {skillProbes.length > 0 && (
                  <div className="rounded-md bg-muted/50 p-2 text-center">
                    <p className="text-xs text-muted-foreground">Skill Probes</p>
                    <p className="text-lg font-semibold">{skillProbes.length}</p>
                  </div>
                )}
              </div>

              {/* Behavior totals */}
              {behaviorTotals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Behavior Totals
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {behaviorTotals.map((b, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {b.behavior}: {b.count} {b.trend && `(${b.trend})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Top antecedents */}
              {topAntecedents.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Top Antecedents / Triggers
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {topAntecedents.map((a, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {a.antecedent} ({a.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill probe progress */}
              {skillProbes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Skill Probe Progress</p>
                  <div className="space-y-1">
                    {skillProbes.map((sp, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="truncate">{sp.target}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {sp.correct}/{sp.total} ({sp.total > 0 ? Math.round((sp.correct / sp.total) * 100) : 0}%)
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {s.notes && (
                <p className="text-sm text-muted-foreground italic">"{s.notes}"</p>
              )}

              {/* Review comment */}
              {s.review_comment && (
                <div className="rounded-md bg-muted/50 p-3 text-sm border">
                  <p className="font-medium text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> BCBA Feedback
                  </p>
                  <p>{s.review_comment}</p>
                </div>
              )}

              {/* Feedback form */}
              {feedbackId === s.summary_id && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write feedback for this weekly summary…"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setFeedbackId(null); setFeedbackText(""); }}>Cancel</Button>
                    <Button
                      size="sm"
                      disabled={!feedbackText.trim() || markReviewed.isPending}
                      onClick={() => markReviewed.mutate({ summaryId: s.summary_id, comment: feedbackText.trim() })}
                    >
                      {markReviewed.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                      Review & Send Feedback
                    </Button>
                  </div>
                </div>
              )}

              {feedbackId !== s.summary_id && (
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setFeedbackId(s.summary_id); setFeedbackText(s.review_comment ?? ""); }}>
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {s.review_comment ? "Edit Feedback" : "Add Feedback"}
                  </Button>
                  {!isReviewed && (
                    <Button size="sm" disabled={markReviewed.isPending} onClick={() => markReviewed.mutate({ summaryId: s.summary_id })}>
                      {markReviewed.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Mark Reviewed
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
