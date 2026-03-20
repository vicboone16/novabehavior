import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgencyContext } from "@/hooks/useAgencyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { AlertTriangle, Loader2, Plus, Pencil, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface TeacherABCLogsPanelProps {
  clientId: string;
}

interface ABCLog {
  event_id: string;
  client_id: string;
  behavior: string;
  antecedent: string;
  consequence: string;
  is_problem: boolean;
  intensity: number | null;
  setting: string | null;
  notes: string | null;
  occurred_at: string;
}

const EMPTY_FORM = {
  behavior: '',
  antecedent: '',
  consequence: '',
  is_problem: true,
  intensity: 3,
  setting: '',
  notes: '',
};

export function TeacherABCLogsPanel({ clientId }: TeacherABCLogsPanelProps) {
  const { user } = useAuth();
  const { currentAgency } = useAgencyContext();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingLog, setEditingLog] = useState<ABCLog | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

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
      return (data ?? []) as ABCLog[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof EMPTY_FORM & { event_id?: string }) => {
      if (values.event_id) {
        const { error } = await supabase
          .from("teacher_abc_events")
          .update({
            behavior: values.behavior,
            antecedent: values.antecedent,
            consequence: values.consequence,
            is_problem: values.is_problem,
            intensity: values.intensity,
            setting: values.setting || null,
            notes: values.notes || null,
          })
          .eq("event_id", values.event_id);
        if (error) throw error;
      } else {
        // Get agency_id from user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("agency_id")
          .eq("id", user?.id)
          .single();
        
        const { error } = await supabase
          .from("teacher_abc_events")
          .insert({
            agency_id: profile?.agency_id || '',
            client_id: clientId,
            created_by: user?.id || '',
            behavior: values.behavior,
            antecedent: values.antecedent,
            consequence: values.consequence,
            is_problem: values.is_problem,
            intensity: values.intensity,
            setting: values.setting || null,
            notes: values.notes || null,
            occurred_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-abc-logs", clientId] });
      setShowDialog(false);
      setEditingLog(null);
      setForm(EMPTY_FORM);
      toast.success(editingLog ? "ABC log updated" : "ABC log added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("teacher_abc_events")
        .delete()
        .eq("event_id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-abc-logs", clientId] });
      toast.success("ABC log deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openAdd = () => {
    setEditingLog(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (log: ABCLog) => {
    setEditingLog(log);
    setForm({
      behavior: log.behavior || '',
      antecedent: log.antecedent || '',
      consequence: log.consequence || '',
      is_problem: log.is_problem ?? true,
      intensity: log.intensity ?? 3,
      setting: log.setting || '',
      notes: log.notes || '',
    });
    setShowDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading ABC logs…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openAdd} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Add ABC Entry
        </Button>
      </div>

      {!logs?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No ABC / trigger logs recorded yet. Click "Add ABC Entry" to create one.
          </CardContent>
        </Card>
      ) : (
        logs.map((log) => (
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
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="text-xs text-muted-foreground text-right">
                    <p>{format(new Date(log.occurred_at), "MMM d, yyyy")}</p>
                    <p>{format(new Date(log.occurred_at), "h:mm a")}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(log)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this ABC entry?")) deleteMutation.mutate(log.event_id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLog ? "Edit ABC Entry" : "New ABC Entry"}</DialogTitle>
            <DialogDescription>
              Record the antecedent, behavior, and consequence for this event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Antecedent (what happened before)</Label>
              <Textarea
                value={form.antecedent}
                onChange={e => setForm(f => ({ ...f, antecedent: e.target.value }))}
                placeholder="e.g., Transition from recess to math class"
                rows={2}
              />
            </div>
            <div>
              <Label>Behavior (what the student did)</Label>
              <Input
                value={form.behavior}
                onChange={e => setForm(f => ({ ...f, behavior: e.target.value }))}
                placeholder="e.g., Screaming, elopement"
              />
            </div>
            <div>
              <Label>Consequence (what happened after)</Label>
              <Textarea
                value={form.consequence}
                onChange={e => setForm(f => ({ ...f, consequence: e.target.value }))}
                placeholder="e.g., Removed from classroom, verbal redirect"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Intensity (1–5)</Label>
                <Select
                  value={String(form.intensity)}
                  onValueChange={v => setForm(f => ({ ...f, intensity: Number(v) }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Setting</Label>
                <Input
                  value={form.setting}
                  onChange={e => setForm(f => ({ ...f, setting: e.target.value }))}
                  placeholder="e.g., Classroom, cafeteria"
                />
              </div>
            </div>
            <div>
              <Label>Problem Behavior?</Label>
              <Select
                value={form.is_problem ? "yes" : "no"}
                onValueChange={v => setForm(f => ({ ...f, is_problem: v === "yes" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No (replacement/positive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional context..."
                rows={2}
              />
            </div>
            <Button
              onClick={() => saveMutation.mutate({ ...form, event_id: editingLog?.event_id })}
              disabled={!form.behavior.trim() || !form.antecedent.trim() || !form.consequence.trim() || saveMutation.isPending}
              className="w-full gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingLog ? "Update Entry" : "Save Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
