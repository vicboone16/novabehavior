import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Clock, AlertTriangle, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EditState {
  student_id: string;
  behavior_id: string;
  count: number | null;
  duration_seconds: number | null;
  logged_at: string;
}

export function SMSBehaviorQueue() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});

  // Fetch pending entries
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

  // Fetch students for dropdown
  const { data: students } = useQuery({
    queryKey: ["sms-students-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("is_archived", false)
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch behaviors for dropdown
  const { data: behaviors } = useQuery({
    queryKey: ["sms-behaviors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("behaviors")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const getEditState = (entry: any): EditState => {
    if (edits[entry.id]) return edits[entry.id];
    return {
      student_id: entry.student_id || "",
      behavior_id: entry.behavior_id || "",
      count: entry.count,
      duration_seconds: entry.duration_seconds,
      logged_at: entry.logged_at || entry.created_at,
    };
  };

  const updateEdit = (id: string, patch: Partial<EditState>) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...getEditState(entries?.find((e) => e.id === id)!), ...prev[id], ...patch },
    }));
  };

  const approveMutation = useMutation({
    mutationFn: async ({ id, edit }: { id: string; edit: EditState }) => {
      if (!edit.student_id) throw new Error("Please select a student");
      if (!edit.behavior_id) throw new Error("Please select a behavior");

      const { error } = await supabase
        .from("sms_behavior_log")
        .update({
          student_id: edit.student_id,
          behavior_id: edit.behavior_id,
          count: edit.count,
          duration_seconds: edit.duration_seconds,
          logged_at: edit.logged_at,
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-behavior-log"] });
      toast.success("Entry approved and saved");
    },
    onError: (e: any) => toast.error(e.message),
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

  const studentName = (id: string) => {
    const s = students?.find((s) => s.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "";
  };

  const behaviorName = (id: string) => {
    const b = behaviors?.find((b) => b.id === id);
    return b ? b.name : "";
  };

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const edit = getEditState(entry);

        return (
          <Card
            key={entry.id}
            className={`transition-all ${entry.status === "needs_student" ? "border-l-4 border-l-destructive" : "border-l-4 border-l-primary"}`}
          >
            <CardContent className="p-4 space-y-2">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-sm font-medium">{entry.raw_body}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {entry.entry_type}
                    </Badge>
                    {entry.status === "needs_student" && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" /> Needs student
                      </Badge>
                    )}
                    {edit.student_id && (
                      <Badge variant="secondary" className="text-xs">
                        {studentName(edit.student_id) || entry.parsed_student_code}
                      </Badge>
                    )}
                    {edit.behavior_id && (
                      <Badge variant="secondary" className="text-xs">
                        {behaviorName(edit.behavior_id) || entry.parsed_behavior_code}
                      </Badge>
                    )}
                    {edit.count != null && (
                      <Badge variant="secondary" className="text-xs">
                        ×{edit.count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(entry.created_at), "MMM d, h:mm a")} · {entry.from_phone}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {/* Expanded edit form */}
              {isExpanded && (
                <div className="pt-2 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Student picker */}
                    <div>
                      <Label className="text-xs mb-1 block">Student</Label>
                      <Select
                        value={edit.student_id}
                        onValueChange={(v) => updateEdit(entry.id, { student_id: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select student…" />
                        </SelectTrigger>
                        <SelectContent>
                          {students?.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.first_name} {s.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Behavior picker */}
                    <div>
                      <Label className="text-xs mb-1 block">Behavior</Label>
                      <Select
                        value={edit.behavior_id}
                        onValueChange={(v) => updateEdit(entry.id, { behavior_id: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select behavior…" />
                        </SelectTrigger>
                        <SelectContent>
                          {behaviors?.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Count */}
                    <div>
                      <Label className="text-xs mb-1 block">Count</Label>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-xs"
                        value={edit.count ?? ""}
                        onChange={(e) =>
                          updateEdit(entry.id, {
                            count: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <Label className="text-xs mb-1 block">Duration (sec)</Label>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-xs"
                        value={edit.duration_seconds ?? ""}
                        onChange={(e) =>
                          updateEdit(entry.id, {
                            duration_seconds:
                              e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    {/* Logged at */}
                    <div className="col-span-2">
                      <Label className="text-xs mb-1 block">Date / Time</Label>
                      <Input
                        type="datetime-local"
                        className="h-8 text-xs"
                        value={
                          edit.logged_at
                            ? format(new Date(edit.logged_at), "yyyy-MM-dd'T'HH:mm")
                            : ""
                        }
                        onChange={(e) =>
                          updateEdit(entry.id, {
                            logged_at: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : entry.created_at,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => rejectMutation.mutate(entry.id)}
                    >
                      <X className="w-3.5 h-3.5 text-destructive" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => approveMutation.mutate({ id: entry.id, edit })}
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </Button>
                  </div>
                </div>
              )}

              {/* Collapsed action buttons */}
              {!isExpanded && (
                <div className="flex gap-1.5 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => rejectMutation.mutate(entry.id)}
                  >
                    <X className="w-3 h-3 text-destructive" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setExpandedId(entry.id)}
                  >
                    <Pencil className="w-3 h-3" /> Review & Approve
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
