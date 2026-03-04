import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssignedTeacher {
  user_id: string;
  full_name: string;
  email: string;
  app_scope: string;
}

export function useStudentTeachers(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student-teachers", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];

      // Get users with teacher-scoped access to this student
      const { data: accessRows, error } = await supabase
        .from("user_student_access")
        .select("user_id, app_scope")
        .eq("student_id", studentId)
        .in("app_scope", ["novateachers", "teacherhub"]);

      if (error) throw error;
      if (!accessRows?.length) return [];

      const userIds = [...new Set(accessRows.map((r) => r.user_id))];

      // Get profile info for these users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return userIds
        .map((uid) => {
          const profile = profileMap.get(uid);
          const name = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Unknown";
          return {
            user_id: uid,
            full_name: name,
            email: profile?.email || "",
            app_scope: accessRows.find((r) => r.user_id === uid)?.app_scope || "teacherhub",
          };
        })
        .filter((t) => t.full_name !== "Unknown") as AssignedTeacher[];
    },
  });
}
