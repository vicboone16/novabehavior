import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { FileText, Clock, Loader2, ChevronDown, ChevronRight, CheckCircle2, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeacherSummariesProps {
  clientId: string;
}

export function TeacherSummaries({ clientId }: TeacherSummariesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [feedbackDraftId, setFeedbackDraftId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const { data: summaries, isLoading } = useQuery({
    queryKey: ["bcba-summaries", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iep_drafts")
        .select("id, title, sections, status, shared_at, created_at, created_by, draft_type, reviewed_at, reviewed_by, review_comment")
        .eq("client_id", clientId)
        .eq("draft_type", "bcba_summary")
        .eq("status", "shared")
        .order("shared_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const markReviewed = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from("iep_drafts")
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", draftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bcba-summaries", clientId] });
      toast({ title: "Marked as reviewed" });
    },
  });

  const sendFeedback = useMutation({
    mutationFn: async ({ draftId, comment }: { draftId: string; comment: string }) => {
      const { error } = await supabase
        .from("iep_drafts")
        .update({
          review_comment: comment,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", draftId);
      if (error) throw error;

      // Also notify the teacher who sent the summary
      const summary = summaries?.find((s) => s.id === draftId);
      if (summary?.created_by && summary.created_by !== user?.id) {
        await supabase.from("notifications").insert({
          user_id: summary.created_by,
          type: "summary_feedback",
          title: "Feedback on your teacher summary",
          message: comment.substring(0, 200),
          data: { draft_id: draftId, student_id: clientId } as any,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bcba-summaries", clientId] });
      setFeedbackDraftId(null);
      setFeedbackText("");
      toast({ title: "Feedback sent" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading summaries…
      </div>
    );
  }

  if (!summaries?.length) {
    return <p className="text-sm text-muted-foreground">No teacher summaries shared yet.</p>;
  }

  const reviewedCount = summaries.filter((s) => s.reviewed_at).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full text-left group">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Teacher Summaries
          </h3>
          <Badge variant="outline" className="ml-auto text-xs">
            {reviewedCount}/{summaries.length} reviewed
          </Badge>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 mt-3">
        {summaries.map((s) => {
          const sections = s.sections as Array<{ content?: string }> | null;
          const isReviewed = !!s.reviewed_at;
          const showFeedbackForm = feedbackDraftId === s.id;

          return (
            <Card key={s.id} className={isReviewed ? "border-muted" : "border-primary/30"}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    {isReviewed && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                    {s.title}
                  </CardTitle>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.shared_at && (
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {format(new Date(s.shared_at), "MMM d, yyyy")}
                      </Badge>
                    )}
                    {isReviewed && (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">
                        Reviewed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {sections?.[0]?.content ?? "No content available."}
                </pre>

                {s.review_comment && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm border">
                    <p className="font-medium text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Your Feedback
                    </p>
                    <p>{s.review_comment}</p>
                  </div>
                )}

                {showFeedbackForm && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Write feedback for the teacher…"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => { setFeedbackDraftId(null); setFeedbackText(""); }}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!feedbackText.trim() || sendFeedback.isPending}
                        onClick={() => sendFeedback.mutate({ draftId: s.id, comment: feedbackText.trim() })}
                      >
                        {sendFeedback.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                        Send
                      </Button>
                    </div>
                  </div>
                )}

                {!showFeedbackForm && (
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setFeedbackDraftId(s.id); setFeedbackText(s.review_comment ?? ""); }}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {s.review_comment ? "Edit Feedback" : "Add Feedback"}
                    </Button>
                    {!isReviewed && (
                      <Button
                        size="sm"
                        variant="default"
                        disabled={markReviewed.isPending}
                        onClick={() => markReviewed.mutate(s.id)}
                      >
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
      </CollapsibleContent>
    </Collapsible>
  );
}
