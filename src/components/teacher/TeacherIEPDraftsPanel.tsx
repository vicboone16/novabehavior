import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";

interface TeacherIEPDraftsPanelProps {
  clientId: string;
}

export function TeacherIEPDraftsPanel({ clientId }: TeacherIEPDraftsPanelProps) {
  const { data: drafts, isLoading } = useQuery({
    queryKey: ["teacher-iep-drafts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iep_drafts")
        .select("id, title, status, draft_type, shared_at, created_at, reviewed_at, review_comment, sections")
        .eq("client_id", clientId)
        .in("draft_type", ["bcba_summary", "teacher_draft"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading IEP drafts…
      </div>
    );
  }

  if (!drafts?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No shared IEP drafts yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {drafts.map((draft) => {
        const sections = draft.sections as Array<{ content?: string }> | null;
        const isReviewed = !!draft.reviewed_at;

        return (
          <Card key={draft.id} className={isReviewed ? "border-muted" : "border-primary/30"}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{draft.title}</span>
                    {isReviewed && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                  </div>
                  {sections?.[0]?.content && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {sections[0].content}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-xs capitalize">{draft.draft_type?.replace("_", " ")}</Badge>
                  <Badge variant="secondary" className="text-xs">
                    {draft.status}
                  </Badge>
                  {draft.shared_at && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(draft.shared_at), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
