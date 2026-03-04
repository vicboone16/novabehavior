import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MessageType = "message" | "task_assignment" | "data_share" | "pdf_share" | "summary";

export interface StaffMessage {
  id: string;
  student_id: string;
  sender_id: string;
  recipient_id: string | null;
  message_type: MessageType;
  subject: string | null;
  content: string;
  metadata: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  parent_message_id: string | null;
  app_source: string;
  created_at: string;
  sender_name?: string;
  attachments?: StaffMessageAttachment[];
  // teacher_messages extras
  is_reviewed?: boolean;
  is_completed?: boolean;
  _table: "staff_messages" | "teacher_messages";
}

export interface StaffMessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string | null;
  file_type: string | null;
  attachment_type: string;
  metadata: Record<string, any>;
}

function buildNameMap(profiles: Array<{ user_id: string; display_name: string | null; first_name: string | null; last_name: string | null }> | null) {
  return new Map(
    (profiles || []).map((p) => [
      p.user_id,
      p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown",
    ])
  );
}

export function useStaffMessages(studentId: string | undefined, recipientId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["staff-messages", studentId, recipientId],
    enabled: !!studentId && !!user,
    queryFn: async () => {
      if (!studentId || !user) return [];

      // Fetch from both tables in parallel
      let staffQuery = supabase
        .from("staff_messages")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });

      let teacherQuery = supabase
        .from("teacher_messages")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });

      if (recipientId) {
        const filter = `and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`;
        staffQuery = staffQuery.or(filter);
        teacherQuery = teacherQuery.or(filter);
      }

      const [staffRes, teacherRes] = await Promise.all([staffQuery, teacherQuery]);

      const staffRows = (staffRes.data || []).map((m) => ({ ...m, _table: "staff_messages" as const }));
      const teacherRows = (teacherRes.data || []).map((m) => ({ ...m, _table: "teacher_messages" as const }));

      const allMessages = [...staffRows, ...teacherRows].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Deduplicate by id (in case any message exists in both)
      const seen = new Set<string>();
      const deduped = allMessages.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      // Fetch sender profiles
      const senderIds = [...new Set(deduped.map((m) => m.sender_id))];
      const { data: profiles } = senderIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, first_name, last_name")
            .in("user_id", senderIds)
        : { data: [] };

      const nameMap = buildNameMap(profiles);

      // Fetch attachments from both tables
      const staffMsgIds = staffRows.map((m) => m.id);
      const teacherMsgIds = teacherRows.map((m) => m.id);

      const [staffAttRes, teacherAttRes] = await Promise.all([
        staffMsgIds.length
          ? supabase.from("staff_message_attachments").select("*").in("message_id", staffMsgIds)
          : Promise.resolve({ data: [] }),
        teacherMsgIds.length
          ? supabase.from("teacher_message_attachments").select("*").in("message_id", teacherMsgIds)
          : Promise.resolve({ data: [] }),
      ]);

      const attachMap = new Map<string, StaffMessageAttachment[]>();
      [...(staffAttRes.data || []), ...(teacherAttRes.data || [])].forEach((a) => {
        if (!attachMap.has(a.message_id)) attachMap.set(a.message_id, []);
        attachMap.get(a.message_id)!.push(a as StaffMessageAttachment);
      });

      return deduped.map((m) => ({
        ...m,
        metadata: (m.metadata || {}) as Record<string, any>,
        sender_name: nameMap.get(m.sender_id) || "Unknown",
        attachments: attachMap.get(m.id) || [],
      })) as StaffMessage[];
    },
  });
}

export function useSendStaffMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      studentId: string;
      recipientId: string;
      messageType: MessageType;
      subject?: string;
      content: string;
      metadata?: Record<string, any>;
      agencyId?: string;
      parentMessageId?: string;
      useTeacherTable?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Write to teacher_messages so teacher app sees it too
      const table = params.useTeacherTable ? "teacher_messages" : "teacher_messages";

      const { data, error } = await supabase
        .from(table)
        .insert({
          student_id: params.studentId,
          sender_id: user.id,
          recipient_id: params.recipientId,
          message_type: params.messageType,
          subject: params.subject || null,
          content: params.content,
          metadata: params.metadata || {},
          agency_id: params.agencyId || null,
          parent_message_id: params.parentMessageId || null,
          app_source: "novatrack",
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification
      await supabase.from("notifications").insert({
        user_id: params.recipientId,
        type: "staff_message",
        title: params.subject || "New message from BCBA",
        message: params.content.substring(0, 200),
        data: { student_id: params.studentId, message_id: data.id },
      });

      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ["staff-messages", params.studentId] });
    },
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, table }: { messageId: string; table: "staff_messages" | "teacher_messages" }) => {
      const { error } = await supabase
        .from(table)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-messages"] });
    },
  });
}

export function useUnreadMessageCount(studentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-messages", studentId],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return 0;

      let q1 = supabase
        .from("staff_messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      let q2 = supabase
        .from("teacher_messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (studentId) {
        q1 = q1.eq("student_id", studentId);
        q2 = q2.eq("student_id", studentId);
      }

      const [r1, r2] = await Promise.all([q1, q2]);
      return (r1.count || 0) + (r2.count || 0);
    },
    refetchInterval: 30000,
  });
}
