import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function SMSBehaviorQueue() {
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["sms-behavior-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_behavior_log")
        .select("*")
        .in("status", ["pending", "needs_student"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sms_behavior_log")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-behavior-log"] });
      toast.success("Entry approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sms_behavior_log")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-behavior-log"] });
      toast.success("Entry rejected");
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading SMS entries…</p>;
  }

  if (!entries?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No pending SMS entries to review.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.raw_body}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    {entry.entry_type}
                  </Badge>
                  {entry.status === "needs_student" && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertTriangle className="w-3 h-3" /> Needs student
                    </Badge>
                  )}
                  {entry.parsed_student_code && (
                    <Badge variant="secondary" className="text-xs">
                      Student: {entry.parsed_student_code}
                    </Badge>
                  )}
                  {entry.parsed_behavior_code && (
                    <Badge variant="secondary" className="text-xs">
                      Behavior: {entry.parsed_behavior_code}
                    </Badge>
                  )}
                  {entry.count != null && (
                    <Badge variant="secondary" className="text-xs">
                      ×{entry.count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(entry.created_at), "MMM d, h:mm a")} · {entry.from_phone}
                </p>
              </div>
              {entry.status === "pending" && (
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => approveMutation.mutate(entry.id)}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => rejectMutation.mutate(entry.id)}
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
