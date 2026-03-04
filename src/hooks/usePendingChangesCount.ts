import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePendingChangesCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-changes-count"],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!user) return { pendingChanges: 0, unreadMessages: 0, total: 0 };

      const [changesRes, messagesRes] = await Promise.all([
        supabase
          .from("pending_student_changes")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("teacher_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("is_read", false),
      ]);

      const pendingChanges = changesRes.count || 0;
      const unreadMessages = messagesRes.count || 0;
      return { pendingChanges, unreadMessages, total: pendingChanges + unreadMessages };
    },
  });
}
