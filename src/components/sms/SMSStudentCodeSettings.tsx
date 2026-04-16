import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function SMSStudentCodeSettings() {
  const queryClient = useQueryClient();
  const [newCode, setNewCode] = useState("");
  const [newStudentId, setNewStudentId] = useState("");

  const { data: codes, isLoading } = useQuery({
    queryKey: ["sms-student-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_student_codes")
        .select("*")
        .order("code");
      if (error) throw error;
      return data;
    },
  });

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

  const studentName = (id: string) => {
    const s = students?.find((s) => s.id === id);
    return s ? `${s.first_name} ${s.last_name}` : id;
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("sms_student_codes")
        .insert({ code: newCode.toUpperCase().trim(), student_id: newStudentId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-student-codes"] });
      setNewCode("");
      setNewStudentId("");
      toast.success("Student code added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_student_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-student-codes"] });
      toast.success("Student code removed");
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Student Codes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-xs">Code</Label>
            <Input
              placeholder="KALEL"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Student</Label>
            <Select value={newStudentId} onValueChange={setNewStudentId}>
              <SelectTrigger className="h-8 text-sm">
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
          <div className="flex items-end">
            <Button
              size="sm"
              className="h-8"
              disabled={!newCode.trim() || !newStudentId}
              onClick={() => addMutation.mutate()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-1.5">
            {codes?.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1.5">
                <span>
                  <code className="font-mono text-xs bg-muted px-1 rounded">{c.code}</code>{" "}
                  <span className="text-muted-foreground">→</span>{" "}
                  <span className="text-xs">{studentName(c.student_id)}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => deleteMutation.mutate(c.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            {!codes?.length && (
              <p className="text-xs text-muted-foreground">No student codes configured yet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
