import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * satellite-gateway already exists — this is a dedicated parent-link resolver
 * that validates tokens and returns scoped, parent-safe data.
 *
 * POST /parent-link-gateway
 *   action: "resolve" | "send_message" | "praise"
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token
    const { data: link, error: linkErr } = await supabase
      .from("parent_access_links")
      .select("*")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (linkErr || !link) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired link" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This link has expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentId = link.student_id;

    // ── RESOLVE: return parent-safe data ──
    if (action === "resolve") {
      // Student name (first name only for privacy)
      const { data: student } = await supabase
        .from("students")
        .select("first_name, last_name")
        .eq("id", studentId)
        .single();

      // Latest parent insight
      const { data: insight } = await supabase
        .from("parent_insights")
        .select("*")
        .eq("student_id", studentId)
        .in("status", ["published", "reviewed"])
        .order("insight_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Points balance
      const { data: pointRows } = await supabase
        .from("beacon_points_ledger")
        .select("points_delta")
        .eq("student_id", studentId);

      const balance = (pointRows || []).reduce(
        (sum: number, r: any) => sum + (r.points_delta || 0), 0
      );

      // Recent messages (last 20)
      const { data: messages } = await supabase
        .from("parent_messages")
        .select("id, sender_type, sender_name, message_text, is_quick_reply, quick_reply_key, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(20);

      return new Response(
        JSON.stringify({
          student: {
            first_name: student?.first_name || "Your child",
            id: studentId,
          },
          insight,
          rewards: { balance },
          messages: (messages || []).reverse(),
          parent_name: link.parent_name,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SEND MESSAGE ──
    if (action === "send_message") {
      const { message_text, is_quick_reply, quick_reply_key } = body;
      if (!message_text || message_text.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Message cannot be empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (message_text.length > 500) {
        return new Response(
          JSON.stringify({ error: "Message too long (max 500 characters)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: msg, error: msgErr } = await supabase
        .from("parent_messages")
        .insert({
          student_id: studentId,
          agency_id: link.agency_id,
          sender_type: "parent",
          sender_name: link.parent_name || "Parent",
          sender_token: token,
          message_text: message_text.trim(),
          is_quick_reply: is_quick_reply || false,
          quick_reply_key: quick_reply_key || null,
        })
        .select("id, created_at")
        .single();

      if (msgErr) throw msgErr;

      return new Response(
        JSON.stringify({ ok: true, message: msg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── PRAISE ──
    if (action === "praise") {
      const { data: msg, error } = await supabase
        .from("parent_messages")
        .insert({
          student_id: studentId,
          agency_id: link.agency_id,
          sender_type: "parent",
          sender_name: link.parent_name || "Parent",
          sender_token: token,
          message_text: "Great job today! We're proud of you! 🌟",
          is_quick_reply: true,
          quick_reply_key: "praise_at_home",
        })
        .select("id, created_at")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, message: msg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("parent-link-gateway error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
