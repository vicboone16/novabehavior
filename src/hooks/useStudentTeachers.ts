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
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      return userIds
        .map((uid) => {
          const profile = profileMap.get(uid);
          return {
            user_id: uid,
            full_name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            app_scope: accessRows.find((r) => r.user_id === uid)?.app_scope || "teacherhub",
          };
        })
        .filter((t) => t.full_name !== "Unknown") as AssignedTeacher[];
    },
  });
}
