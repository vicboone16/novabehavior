import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getBearer(req: Request): string | null {
  const h = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim();
}

/**
 * True only when the caller presented the exact service-role key.
 * Used to lock internal orchestration/stage functions.
 */
export function isServiceRoleCaller(req: Request): boolean {
  const token = getBearer(req);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!token || !serviceKey) return false;
  return token === serviceKey;
}

export function jsonError(message: string, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/**
 * Validates a user JWT and (optionally) requires an admin role.
 * Returns the user id or null when unauthorized.
 */
export async function getAuthenticatedUser(req: Request): Promise<{ id: string } | null> {
  const token = getBearer(req);
  if (!token) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id };
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: { role: string }) => ["admin", "super_admin"].includes(r.role));
}
