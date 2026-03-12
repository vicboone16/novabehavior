import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, Target, Clock } from "lucide-react";

interface TeacherDataSessionsPanelProps {
  clientId: string;
}

export function TeacherDataSessionsPanel({ clientId }: TeacherDataSessionsPanelProps) {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["teacher-data-sessions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_data_sessions")
        .select("*, teacher_data_points(*)")
        .eq("client_id", clientId)
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading data sessions…
      </div>
    );
  }

  if (!sessions?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No teacher data sessions / probes recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const points = session.teacher_data_points ?? [];
        const correctCount = points.filter((p: any) => p.value_bool === true).length;
        const totalCount = points.length;
        const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : null;
        const duration = session.started_at && session.ended_at
          ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
          : null;

        return (
          <Card key={session.session_id} className="border-muted">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize">{session.mode}</Badge>
                    {duration != null && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {duration} min
                      </Badge>
                    )}
                    {pct != null && (
                      <Badge variant={pct >= 80 ? "default" : "outline"} className="text-xs">
                        {correctCount}/{totalCount} ({pct}%)
                      </Badge>
                    )}
                  </div>
                  {session.context_json && typeof session.context_json === "object" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(session.context_json as any).setting || ""} {(session.context_json as any).notes || ""}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground shrink-0 text-right">
                  {session.started_at && <p>{format(new Date(session.started_at), "MMM d, yyyy h:mm a")}</p>}
                  <p className="text-xs">{totalCount} data points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
