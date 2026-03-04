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

export function useStaffMessages(studentId: string | undefined, recipientId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["staff-messages", studentId, recipientId],
    enabled: !!studentId && !!user,
    queryFn: async () => {
      if (!studentId || !user) return [];

      let query = supabase
        .from("staff_messages")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });

      // If viewing a specific thread with a recipient
      if (recipientId) {
        query = query.or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", senderIds);

      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown"]));

      // Fetch attachments for all messages
      const messageIds = (data || []).map((m) => m.id);
      const { data: attachments } = messageIds.length
        ? await supabase
            .from("staff_message_attachments")
            .select("*")
            .in("message_id", messageIds)
        : { data: [] };

      const attachMap = new Map<string, StaffMessageAttachment[]>();
      (attachments || []).forEach((a) => {
        if (!attachMap.has(a.message_id)) attachMap.set(a.message_id, []);
        attachMap.get(a.message_id)!.push(a as StaffMessageAttachment);
      });

      return (data || []).map((m) => ({
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
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("staff_messages")
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
        title: params.subject || "New message",
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
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("staff_messages")
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
      let query = supabase
        .from("staff_messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (studentId) query = query.eq("student_id", studentId);

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });
}
