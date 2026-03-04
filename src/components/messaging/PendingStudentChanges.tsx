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
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  UserCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingStudentChangesProps {
  studentId: string;
  studentName: string;
}

interface PendingChange {
  id: string;
  student_id: string;
  submitted_by: string;
  field_changes: Record<string, { from: any; to: any; label?: string }>;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  submitter_name?: string;
}

export function PendingStudentChanges({ studentId, studentName }: PendingStudentChangesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const { data: changes, isLoading } = useQuery({
    queryKey: ["pending-student-changes", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_student_changes")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get submitter names
      const submitterIds = [...new Set((data || []).map((c) => c.submitted_by))];
      const { data: profiles } = submitterIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, first_name, last_name")
            .in("user_id", submitterIds)
        : { data: [] };

      const nameMap = new Map(
        (profiles || []).map((p) => [
          p.user_id,
          p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown",
        ])
      );

      return (data || []).map((c) => ({
        ...c,
        field_changes: (c.field_changes || {}) as Record<string, { from: any; to: any; label?: string }>,
        submitter_name: nameMap.get(c.submitted_by) || "Teacher",
      })) as PendingChange[];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ changeId, status, note }: { changeId: string; status: "approved" | "rejected"; note: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("pending_student_changes")
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_note: note || null,
        })
        .eq("id", changeId);
      if (error) throw error;

      // If approved, apply the changes to the student record
      if (status === "approved") {
        const change = changes?.find((c) => c.id === changeId);
        if (change) {
          const updates: Record<string, any> = {};
          Object.entries(change.field_changes).forEach(([field, val]) => {
            updates[field] = val.to;
          });

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from("students")
              .update(updates)
              .eq("id", studentId);
            if (updateError) throw updateError;
          }
        }
      }

      // Notify the teacher
      const change = changes?.find((c) => c.id === changeId);
      if (change) {
        await supabase.from("notifications").insert({
          user_id: change.submitted_by,
          type: "pending_change_reviewed",
          title: `Your edit for ${studentName} was ${status}`,
          message: note || `Change ${status} by supervisor.`,
          data: { student_id: studentId, change_id: changeId },
        });
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ["pending-student-changes", studentId] });
      setReviewingId(null);
      setReviewNote("");
      toast({
        title: params.status === "approved" ? "Changes approved & applied" : "Changes rejected",
        description: `Update for ${studentName} has been ${params.status}.`,
      });
    },
    onError: () => {
      toast({ title: "Error reviewing changes", variant: "destructive" });
    },
  });

  const pendingCount = changes?.filter((c) => c.status === "pending").length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading pending changes…
      </div>
    );
  }

  if (!changes?.length) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full text-left group">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5" /> Pending Teacher Edits
          </h3>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingCount} pending
            </Badge>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 mt-3">
        {changes.map((change) => {
          const isPending = change.status === "pending";
          const isReviewing = reviewingId === change.id;

          return (
            <Card
              key={change.id}
              className={
                isPending
                  ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                  : change.status === "approved"
                  ? "border-green-300/50 opacity-75"
                  : "border-red-300/50 opacity-75"
              }
            >
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isPending && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    {change.status === "approved" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {change.status === "rejected" && <XCircle className="h-4 w-4 text-red-500" />}
                    <CardTitle className="text-sm">
                      Edit from {change.submitter_name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(change.created_at), "MMM d, h:mm a")}
                    </Badge>
                    {!isPending && (
                      <Badge
                        variant={change.status === "approved" ? "default" : "destructive"}
                        className="text-xs capitalize"
                      >
                        {change.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {/* Field changes table */}
                <div className="rounded border overflow-hidden text-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-1.5 font-medium text-xs">Field</th>
                        <th className="text-left px-3 py-1.5 font-medium text-xs">Current</th>
                        <th className="text-left px-3 py-1.5 font-medium text-xs">Proposed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(change.field_changes).map(([field, val]) => (
                        <tr key={field} className="border-t">
                          <td className="px-3 py-1.5 font-medium text-xs text-muted-foreground">
                            {val.label || field.replace(/_/g, " ")}
                          </td>
                          <td className="px-3 py-1.5 text-xs line-through text-muted-foreground">
                            {String(val.from || "—")}
                          </td>
                          <td className="px-3 py-1.5 text-xs font-medium">
                            {String(val.to || "—")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {change.review_note && (
                  <div className="rounded bg-muted/50 p-2 text-xs">
                    <span className="font-medium">Review note:</span> {change.review_note}
                  </div>
                )}

                {isPending && !isReviewing && (
                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewingId(change.id)}
                    >
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ changeId: change.id, status: "approved", note: "" })}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                  </div>
                )}

                {isReviewing && (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      placeholder="Optional note for the teacher…"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => { setReviewingId(null); setReviewNote(""); }}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({ changeId: change.id, status: "rejected", note: reviewNote })}
                      >
                        {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({ changeId: change.id, status: "approved", note: reviewNote })}
                      >
                        {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Approve
                      </Button>
                    </div>
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
