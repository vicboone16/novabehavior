import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendBrandedEmail(
  to: string,
  subject: string,
  htmlBody: string,
  resendApiKey: string
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "NovaTrack <noreply@novabehavior.com>",
      to: [to],
      subject,
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    throw new Error("Failed to send email");
  }

  return await res.json();
}

function buildPasswordResetEmail(resetUrl: string, agencyName: string, displayName: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1a1a1a; margin: 0; font-size: 22px;">NovaTrack</h2>
        <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0;">Data Collection &amp; Clinical Intelligence</p>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Hi ${displayName},
      </p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        NovaTrack is sending you this email to reset your password for <strong>${agencyName}'s</strong> data collection system.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
        If you didn't request this, you can safely ignore this email. This link will expire in 24 hours.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Sent by NovaTrack on behalf of ${agencyName}
      </p>
    </div>
  `;
}

function buildMagicLinkEmail(loginUrl: string, agencyName: string, displayName: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1a1a1a; margin: 0; font-size: 22px;">NovaTrack</h2>
        <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0;">Data Collection &amp; Clinical Intelligence</p>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Hi ${displayName},
      </p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        NovaTrack is sending you this email to log in to <strong>${agencyName}'s</strong> data collection system.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Log In to NovaTrack
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
        If you didn't request this, you can safely ignore this email. This link will expire in 24 hours.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Sent by NovaTrack on behalf of ${agencyName}
      </p>
    </div>
  `;
}

function buildWelcomeEmail(loginUrl: string, agencyName: string, displayName: string, tempPassword?: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1a1a1a; margin: 0; font-size: 22px;">NovaTrack</h2>
        <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0;">Data Collection &amp; Clinical Intelligence</p>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Hi ${displayName},
      </p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">
        Welcome! Your account has been created on NovaTrack for <strong>${agencyName}'s</strong> data collection system.
      </p>
      ${tempPassword ? `
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 8px;">Your temporary password:</p>
        <p style="font-family: monospace; font-size: 18px; color: #1a1a1a; margin: 0; font-weight: 600; letter-spacing: 1px;">${tempPassword}</p>
        <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">Please change this after your first login.</p>
      </div>
      ` : ''}
      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Log In to NovaTrack
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Sent by NovaTrack on behalf of ${agencyName}
      </p>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, user_id } = body;

    if (!action || !user_id) {
      return new Response(
        JSON.stringify({ error: "action and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: callerUser.id });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper: get agency name for the target user
    async function getAgencyName(targetUserId: string): Promise<string> {
      try {
        const { data: ctx } = await supabaseAdmin
          .from("user_agency_context")
          .select("current_agency_id")
          .eq("user_id", targetUserId)
          .single();

        if (ctx?.current_agency_id) {
          const { data: agency } = await supabaseAdmin
            .from("agencies")
            .select("name")
            .eq("id", ctx.current_agency_id)
            .single();
          if (agency?.name) return agency.name;
        }

        // Fallback: primary membership
        const { data: membership } = await supabaseAdmin
          .from("agency_memberships")
          .select("agency_id, agencies(name)")
          .eq("user_id", targetUserId)
          .eq("status", "active")
          .order("is_primary", { ascending: false })
          .limit(1)
          .single();

        if (membership?.agencies && (membership.agencies as any).name) {
          return (membership.agencies as any).name;
        }
      } catch {
        // ignore
      }
      return "your organization";
    }

    // Helper: get display name
    async function getDisplayName(targetUserId: string): Promise<string> {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, first_name")
        .eq("user_id", targetUserId)
        .single();
      return profile?.display_name || profile?.first_name || "there";
    }

    // ─── ACTION: delete_user ───────────────────────────────────
    if (action === "delete_user") {
      if (user_id === callerUser.id) {
        return new Response(
          JSON.stringify({ error: "Cannot delete your own account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message || "Failed to delete user" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "User permanently deleted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: send_password_reset ──────────────────────────
    if (action === "send_password_reset") {
      const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (getUserError || !targetUser?.user?.email) {
        return new Response(
          JSON.stringify({ error: "User not found or has no email" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: targetUser.user.email,
      });

      if (linkError || !linkData?.properties?.action_link) {
        return new Response(
          JSON.stringify({ error: linkError?.message || "Failed to generate reset link" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send branded email via Resend
      if (resendApiKey) {
        const [agencyName, displayName] = await Promise.all([
          getAgencyName(user_id),
          getDisplayName(user_id),
        ]);

        const html = buildPasswordResetEmail(linkData.properties.action_link, agencyName, displayName);
        await sendBrandedEmail(
          targetUser.user.email,
          `Reset your password — ${agencyName}`,
          html,
          resendApiKey
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Password reset email sent",
          email: targetUser.user.email,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: generate_magic_link ──────────────────────────
    if (action === "generate_magic_link") {
      const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (getUserError || !targetUser?.user?.email) {
        return new Response(
          JSON.stringify({ error: "User not found or has no email" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: targetUser.user.email,
      });

      if (linkError || !linkData?.properties?.action_link) {
        return new Response(
          JSON.stringify({ error: linkError?.message || "Failed to generate magic link" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send branded email via Resend
      if (resendApiKey) {
        const [agencyName, displayName] = await Promise.all([
          getAgencyName(user_id),
          getDisplayName(user_id),
        ]);

        const html = buildMagicLinkEmail(linkData.properties.action_link, agencyName, displayName);
        await sendBrandedEmail(
          targetUser.user.email,
          `Log in to NovaTrack — ${agencyName}`,
          html,
          resendApiKey
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Login link email sent",
          email: targetUser.user.email,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: send_welcome_email ───────────────────────────
    if (action === "send_welcome_email") {
      const { temp_password } = body;
      const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (getUserError || !targetUser?.user?.email) {
        return new Response(
          JSON.stringify({ error: "User not found or has no email" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (resendApiKey) {
        const [agencyName, displayName] = await Promise.all([
          getAgencyName(user_id),
          getDisplayName(user_id),
        ]);

        const siteUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "https://novabehavior.lovable.app";
        const loginUrl = "https://novabehavior.lovable.app/auth";
        const html = buildWelcomeEmail(loginUrl, agencyName, displayName, temp_password);
        await sendBrandedEmail(
          targetUser.user.email,
          `Welcome to NovaTrack — ${agencyName}`,
          html,
          resendApiKey
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Welcome email sent",
          email: targetUser?.user?.email,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("manage-user error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
