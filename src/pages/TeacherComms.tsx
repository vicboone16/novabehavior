import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Search,
  Inbox,
  ClipboardList,
  Send,
  FileText,
  BarChart3,
  CheckCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// ── Pending Changes Section ──
export function PendingChangesPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: changes, isLoading } = useQuery({
    queryKey: ["all-pending-changes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_student_changes")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get student names + submitter names
      const studentIds = [...new Set((data || []).map((c) => c.student_id))];
      const submitterIds = [...new Set((data || []).map((c) => c.submitted_by))];

      const [studentsRes, profilesRes] = await Promise.all([
        studentIds.length
          ? supabase.from("students").select("id, first_name, last_name").in("id", studentIds)
          : Promise.resolve({ data: [] }),
        submitterIds.length
          ? supabase.from("profiles").select("user_id, display_name, first_name, last_name").in("user_id", submitterIds)
          : Promise.resolve({ data: [] }),
      ]);

      const studentMap = new Map(
        (studentsRes.data || []).map((s) => [s.id, `${s.first_name || ""} ${s.last_name || ""}`.trim()])
      );
      const nameMap = new Map(
        (profilesRes.data || []).map((p) => [
          p.user_id,
          p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Teacher",
        ])
      );

      return (data || []).map((c) => ({
        ...c,
        field_changes: (c.field_changes || {}) as Record<string, { from: any; to: any; label?: string }>,
        student_name: studentMap.get(c.student_id) || "Unknown Student",
        submitter_name: nameMap.get(c.submitted_by) || "Teacher",
      }));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ changeId, status, note }: { changeId: string; status: "approved" | "rejected"; note: string }) => {
      if (!user) throw new Error("Not authenticated");

      const change = changes?.find((c) => c.id === changeId);
      if (!change) throw new Error("Change not found");

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

      if (status === "approved") {
        const updates: Record<string, any> = {};
        Object.entries(change.field_changes).forEach(([field, val]) => {
          updates[field] = val.to;
        });
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from("students")
            .update(updates)
            .eq("id", change.student_id);
          if (updateError) throw updateError;
        }
      }

      // Notify submitter
      await supabase.from("notifications").insert({
        user_id: change.submitted_by,
        type: "pending_change_reviewed",
        title: `Your edit for ${change.student_name} was ${status}`,
        message: note || `Change ${status} by supervisor.`,
        data: { student_id: change.student_id, change_id: changeId },
      });
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ["all-pending-changes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-changes-count"] });
      setReviewingId(null);
      setReviewNote("");
      toast({
        title: params.status === "approved" ? "Changes approved & applied" : "Changes rejected",
      });
    },
    onError: () => {
      toast({ title: "Error reviewing changes", variant: "destructive" });
    },
  });

  const filtered = (changes || []).filter(
    (c) =>
      !searchTerm ||
      c.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.submitter_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading pending changes…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student or teacher…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{filtered.length} pending</Badge>
      </div>

      {!filtered.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No pending changes to review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((change) => {
            const isReviewing = reviewingId === change.id;

            return (
              <Card key={change.id} className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <CardTitle className="text-sm">
                        <button
                          className="hover:underline text-primary"
                          onClick={() => navigate(`/students/${change.student_id}`)}
                        >
                          {change.student_name}
                        </button>
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        from {change.submitter_name}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(change.created_at), "MMM d, h:mm a")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
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
                            <td className="px-3 py-1.5 text-xs font-medium">{String(val.to || "—")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!isReviewing && (
                    <div className="flex gap-2 justify-end pt-1">
                      <Button size="sm" variant="outline" onClick={() => setReviewingId(change.id)}>
                        Review with Note
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({ changeId: change.id, status: "rejected", note: "" })}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({ changeId: change.id, status: "approved", note: "" })}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
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
        </div>
      )}
    </div>
  );
}

// ── Messages Inbox Section ──
const typeIcons: Record<string, React.ElementType> = {
  message: MessageSquare,
  task_assignment: ClipboardList,
  data_share: BarChart3,
  pdf_share: FileText,
  summary: FileText,
};
const typeLabels: Record<string, string> = {
  message: "Message",
  task_assignment: "Task",
  data_share: "Data",
  pdf_share: "PDF",
  summary: "Summary",
};

export function MessagesInboxPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["supervisor-inbox-messages"],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      // Get messages sent TO the current user from teacher_messages
      const { data, error } = await supabase
        .from("teacher_messages")
        .select("*")
        .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
        .is("parent_message_id", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      // Get student + sender names
      const studentIds = [...new Set((data || []).map((m) => m.student_id))];
      const senderIds = [...new Set((data || []).map((m) => m.sender_id))];
      const recipientIds = [...new Set((data || []).filter((m) => m.recipient_id).map((m) => m.recipient_id!))];
      const allUserIds = [...new Set([...senderIds, ...recipientIds])];

      const [studentsRes, profilesRes] = await Promise.all([
        studentIds.length
          ? supabase.from("students").select("id, first_name, last_name").in("id", studentIds)
          : Promise.resolve({ data: [] }),
        allUserIds.length
          ? supabase.from("profiles").select("user_id, display_name, first_name, last_name").in("user_id", allUserIds)
          : Promise.resolve({ data: [] }),
      ]);

      const studentMap = new Map(
        (studentsRes.data || []).map((s) => [s.id, `${s.first_name || ""} ${s.last_name || ""}`.trim()])
      );
      const nameMap = new Map(
        (profilesRes.data || []).map((p) => [
          p.user_id,
          p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown",
        ])
      );

      // Get reply counts
      const msgIds = (data || []).map((m) => m.id);
      const { data: replies } = msgIds.length
        ? await supabase.from("teacher_messages").select("parent_message_id").in("parent_message_id", msgIds)
        : { data: [] };
      const replyCountMap = new Map<string, number>();
      (replies || []).forEach((r) => {
        const pid = r.parent_message_id!;
        replyCountMap.set(pid, (replyCountMap.get(pid) || 0) + 1);
      });

      return (data || []).map((m) => ({
        ...m,
        student_name: studentMap.get(m.student_id) || "Unknown Student",
        sender_name: nameMap.get(m.sender_id) || "Unknown",
        recipient_name: m.recipient_id ? nameMap.get(m.recipient_id) || "Unknown" : null,
        reply_count: replyCountMap.get(m.id) || 0,
      }));
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("teacher_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor-inbox-messages"] });
      queryClient.invalidateQueries({ queryKey: ["pending-changes-count"] });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ parentId, recipientId, studentId, content }: { parentId: string; recipientId: string; studentId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("teacher_messages").insert({
        student_id: studentId,
        sender_id: user.id,
        recipient_id: recipientId,
        message_type: "message",
        content,
        parent_message_id: parentId,
        app_source: "novatrack",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor-inbox-messages"] });
      setReplyingTo(null);
      setReplyContent("");
      toast({ title: "Reply sent" });
    },
    onError: () => {
      toast({ title: "Failed to send reply", variant: "destructive" });
    },
  });

  const filtered = (messages || []).filter(
    (m) =>
      !searchTerm ||
      m.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">{filtered.length} conversations</Badge>
      </div>

      {!filtered.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            const isUnread = !isMine && !msg.is_read;
            const Icon = typeIcons[msg.message_type] || MessageSquare;
            const isReplying = replyingTo === msg.id;

            return (
              <Card
                key={msg.id}
                className={`transition-all ${isUnread ? "border-primary/50 bg-primary/5" : ""}`}
                onClick={() => {
                  if (isUnread) markReadMutation.mutate(msg.id);
                }}
              >
                <CardHeader className="pb-1 pt-3 px-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {isUnread && <div className="h-2 w-2 rounded-full bg-primary" />}
                      <span className="font-medium text-sm">{isMine ? `To: ${msg.recipient_name}` : msg.sender_name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Icon className="h-2.5 w-2.5 mr-0.5" />
                        {typeLabels[msg.message_type] || msg.message_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        re:{" "}
                        <button
                          className="hover:underline text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/students/${msg.student_id}`);
                          }}
                        >
                          {msg.student_name}
                        </button>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {msg.reply_count > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {msg.reply_count} {msg.reply_count === 1 ? "reply" : "replies"}
                        </Badge>
                      )}
                      {isMine && msg.is_read && (
                        <CheckCheck className="h-3 w-3 text-primary" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                  {msg.subject && (
                    <CardTitle className="text-sm mt-1">{msg.subject}</CardTitle>
                  )}
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{msg.content}</p>

                  {!isMine && (
                    <div className="mt-2">
                      {!isReplying ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingTo(msg.id);
                          }}
                        >
                          <Send className="h-3 w-3 mr-1" /> Reply
                        </Button>
                      ) : (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <Textarea
                            placeholder="Type your reply…"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyContent(""); }}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={!replyContent.trim() || sendReplyMutation.isPending}
                              onClick={() =>
                                sendReplyMutation.mutate({
                                  parentId: msg.id,
                                  recipientId: msg.sender_id,
                                  studentId: msg.student_id,
                                  content: replyContent.trim(),
                                })
                              }
                            >
                              {sendReplyMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Send className="h-3 w-3 mr-1" />
                              )}
                              Send
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──
export default function TeacherComms() {
  const { data: counts } = useQuery({
    queryKey: ["pending-changes-count"],
    queryFn: async () => {
      const [changesRes, messagesRes] = await Promise.all([
        supabase.from("pending_student_changes").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("teacher_messages").select("id", { count: "exact", head: true }).eq("is_read", false),
      ]);
      return { pendingChanges: changesRes.count || 0, unreadMessages: messagesRes.count || 0 };
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Inbox className="h-6 w-6" />
          Teacher Communications
        </h1>
        <p className="text-sm text-muted-foreground">
          Review teacher messages, approve student record changes, and manage cross-app collaboration
        </p>
      </div>

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Messages
            {(counts?.unreadMessages || 0) > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">
                {counts!.unreadMessages}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Pending Changes
            {(counts?.pendingChanges || 0) > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">
                {counts!.pendingChanges}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <MessagesInboxPanel />
        </TabsContent>

        <TabsContent value="pending">
          <PendingChangesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
