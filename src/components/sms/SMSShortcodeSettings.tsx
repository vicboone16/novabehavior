import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function SMSShortcodeSettings() {
  const queryClient = useQueryClient();
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const { data: shortcodes, isLoading } = useQuery({
    queryKey: ["sms-behavior-shortcodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_behavior_shortcodes")
        .select("*")
        .is("student_id", null)
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("sms_behavior_shortcodes")
        .insert({ code: newCode.toUpperCase().trim(), label: newLabel.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-behavior-shortcodes"] });
      setNewCode("");
      setNewLabel("");
      toast.success("Shortcode added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_behavior_shortcodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-behavior-shortcodes"] });
      toast.success("Shortcode removed");
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Behavior Shortcodes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-xs">Code</Label>
            <Input
              placeholder="PA"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Label</Label>
            <Input
              placeholder="Physical Aggression"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              className="h-8"
              disabled={!newCode.trim() || !newLabel.trim()}
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
            {shortcodes?.map((sc) => (
              <div key={sc.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1.5">
                <span>
                  <code className="font-mono text-xs bg-muted px-1 rounded">{sc.code}</code>{" "}
                  <span className="text-muted-foreground">→</span> {sc.label}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => deleteMutation.mutate(sc.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            {!shortcodes?.length && (
              <p className="text-xs text-muted-foreground">No shortcodes configured yet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
