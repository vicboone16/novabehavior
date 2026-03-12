import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AlertTriangle, Loader2 } from "lucide-react";

interface TeacherABCLogsPanelProps {
  clientId: string;
}

export function TeacherABCLogsPanel({ clientId }: TeacherABCLogsPanelProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["teacher-abc-logs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_abc_events")
        .select("*")
        .eq("client_id", clientId)
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading ABC logs…
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No teacher ABC / trigger logs recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <Card key={log.event_id} className="border-muted">
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={log.is_problem ? "destructive" : "secondary"} className="text-xs">
                    {log.behavior}
                  </Badge>
                  {log.intensity && (
                    <Badge variant="outline" className="text-xs">
                      Intensity: {log.intensity}/5
                    </Badge>
                  )}
                  {log.setting && (
                    <Badge variant="outline" className="text-xs">{log.setting}</Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mt-1">
                  <div><span className="font-medium">A:</span> {log.antecedent}</div>
                  <div><span className="font-medium">B:</span> {log.behavior}</div>
                  <div><span className="font-medium">C:</span> {log.consequence}</div>
                </div>
                {log.notes && <p className="text-xs text-muted-foreground italic mt-1">{log.notes}</p>}
              </div>
              <div className="text-xs text-muted-foreground shrink-0 text-right">
                <p>{format(new Date(log.occurred_at), "MMM d, yyyy")}</p>
                <p>{format(new Date(log.occurred_at), "h:mm a")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
