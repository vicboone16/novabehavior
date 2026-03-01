import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText, Clock, Loader2 } from "lucide-react";

interface TeacherSummariesProps {
  clientId: string;
}

export function TeacherSummaries({ clientId }: TeacherSummariesProps) {
  const { data: summaries, isLoading } = useQuery({
    queryKey: ["bcba-summaries", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iep_drafts")
        .select("id, title, sections, status, shared_at, created_at, created_by, draft_type")
        .eq("client_id", clientId)
        .eq("draft_type", "bcba_summary")
        .eq("status", "shared")
        .order("shared_at", { ascending: false });
      if (error) throw error;
      return data;
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="h-5 w-5" /> Teacher Summaries
      </h3>
      {summaries.map((s) => {
        const sections = s.sections as Array<{ content?: string }> | null;
        return (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{s.title}</CardTitle>
                {s.shared_at && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(s.shared_at), "MMM d, yyyy")}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                {sections?.[0]?.content ?? "No content available."}
              </pre>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
