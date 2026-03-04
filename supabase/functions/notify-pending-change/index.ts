import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("Email service not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderEmail = claimsData.user.email || "Unknown";

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: "Request body must be a JSON object" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { clientId, clientName, fieldChanges } = body as Record<
      string,
      unknown
    >;

    if (
      !clientId ||
      typeof clientId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        clientId
      )
    ) {
      return new Response(
        JSON.stringify({ error: "clientId must be a valid UUID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (
      !clientName ||
      typeof clientName !== "string" ||
      clientName.length > 200
    ) {
      return new Response(
        JSON.stringify({
          error: "clientName is required and must be under 200 characters",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const safeClientName = escapeHtml(clientName.slice(0, 200));
    const safeSenderEmail = escapeHtml(senderEmail);

    // Build changes summary for email
    const changes =
      fieldChanges && typeof fieldChanges === "object"
        ? (fieldChanges as Record<string, { from?: string; to?: string; label?: string }>)
        : {};
    const changesRows = Object.entries(changes)
      .map(([field, val]) => {
        const safeField = escapeHtml(val?.label || field.replace(/_/g, " "));
        const safeOld = escapeHtml(String(val?.from || "—"));
        const safeNew = escapeHtml(String(val?.to || "—"));
        return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${safeField}</td><td style="padding:8px;border-bottom:1px solid #eee;color:#888;text-decoration:line-through">${safeOld}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${safeNew}</td></tr>`;
      })
      .join("");

    // Find assigned BCBAs via user_student_access
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: accessRows, error: accessError } = await serviceClient
      .from("user_student_access")
      .select("user_id")
      .eq("student_id", clientId);

    if (accessError) {
      throw new Error("Failed to look up assigned staff");
    }

    if (!accessRows || accessRows.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No assigned staff — no emails sent",
          sent: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userIds = [...new Set(accessRows.map((r: any) => r.user_id))];
    const { data: profiles } = await serviceClient
      .from("profiles")
      .select("user_id, email, first_name, last_name, role")
      .in("user_id", userIds);

    const bcbaProfiles = (profiles || []).filter(
      (p: any) =>
        p.role === "bcba" ||
        p.role === "admin" ||
        p.role === "owner" ||
        p.role === "super_admin" ||
        p.role === "clinical_director"
    );

    if (bcbaProfiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No BCBAs assigned — no emails sent",
          sent: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Also create in-app notifications
    for (const bcba of bcbaProfiles) {
      await serviceClient.from("notifications").insert({
        user_id: bcba.user_id,
        type: "pending_student_change",
        title: `✏️ Change request for ${safeClientName}`,
        message: `A teacher has requested edits. Review and approve or reject.`,
        data: { student_id: clientId },
      });
    }

    let sentCount = 0;
    for (const bcba of bcbaProfiles) {
      if (!bcba.email) continue;

      const safeName = escapeHtml(
        [bcba.first_name, bcba.last_name].filter(Boolean).join(" ") || "Supervisor"
      );

      const emailHtml = `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <div style="background:#f59e0b;color:white;padding:16px 24px;border-radius:8px 8px 0 0">
            <h2 style="margin:0;font-size:18px">✏️ Student Record Change Request</h2>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9">A teacher has requested changes for your review</p>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;padding:20px 24px;border-radius:0 0 8px 8px">
            <p style="margin:0 0 12px;font-size:14px">Hi ${safeName},</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px">
              <tr><td style="padding:6px 0;color:#666">Student</td><td style="padding:6px 0;font-weight:600">${safeClientName}</td></tr>
              <tr><td style="padding:6px 0;color:#666">Requested by</td><td style="padding:6px 0">${safeSenderEmail}</td></tr>
              <tr><td style="padding:6px 0;color:#666">Date</td><td style="padding:6px 0">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td></tr>
            </table>
            <h3 style="font-size:14px;margin:20px 0 8px">Proposed Changes</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;border-radius:6px">
              <thead><tr style="background:#f9fafb"><th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb">Field</th><th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb">Current</th><th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb">Proposed</th></tr></thead>
              <tbody>${changesRows}</tbody>
            </table>
            <div style="margin-top:20px;text-align:center">
              <p style="font-size:13px;color:#666">Log in to NovaTrack to review and approve or reject this change request.</p>
            </div>
          </div>
        </div>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NovaTrack <noreply@novabehavior.com>",
          to: [bcba.email],
          subject: `✏️ Change Request: ${safeClientName} — Review Required`,
          html: emailHtml,
        }),
      });

      if (res.ok) sentCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: bcbaProfiles.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("notify-pending-change error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
