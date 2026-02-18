import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendTelehealthLinkRequest {
  recipientEmail: string;
  recipientName: string;
  studentName: string;
  provider: "zoom" | "whereby";
  meetingLink: string;
  meetingPassword?: string;
  scheduledTime?: string;
  staffName?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const body: SendTelehealthLinkRequest = await req.json();

    if (!body.recipientEmail || !body.meetingLink || !body.provider) {
      throw new Error("Missing required fields: recipientEmail, meetingLink, provider");
    }

    const providerLabel = body.provider === "zoom" ? "Zoom" : "Whereby";
    const scheduledInfo = body.scheduledTime
      ? `<p style="font-size: 14px; color: #4b5563;">
           <strong>Scheduled:</strong> ${new Date(body.scheduledTime).toLocaleString("en-US", {
             weekday: "long",
             year: "numeric",
             month: "long",
             day: "numeric",
             hour: "numeric",
             minute: "2-digit",
           })}
         </p>`
      : "";

    const passwordInfo = body.meetingPassword
      ? `<p style="font-size: 14px; color: #4b5563;"><strong>Meeting Password:</strong> ${body.meetingPassword}</p>`
      : "";

    const notesInfo = body.notes
      ? `<p style="font-size: 14px; color: #6b7280; font-style: italic;">${body.notes}</p>`
      : "";

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 24px 28px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 600;">Telehealth Session Link</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">via ${providerLabel}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151; margin-top: 0;">Hello <strong>${body.recipientName}</strong>,</p>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
            You have a telehealth session scheduled for <strong>${body.studentName}</strong>${body.staffName ? ` with <strong>${body.staffName}</strong>` : ""}.
          </p>
          ${scheduledInfo}
          ${passwordInfo}
          ${notesInfo}
          <div style="margin: 28px 0; text-align: center;">
            <a href="${body.meetingLink}" 
               style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);">
              Join ${providerLabel} Session
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
            ${body.provider === "whereby"
              ? "No app installation is required. Click the button above to join directly in your browser."
              : "You may need the Zoom app installed. Click the button above to join."
            }
          </p>
          <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">
            If you did not expect this email, you can safely ignore it.
          </p>
        </div>
      </div>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Nova Behavior <noreply@novabehavior.com>",
      to: [body.recipientEmail],
      subject: `Telehealth Session Link - ${body.studentName}`,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log("Telehealth link email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-telehealth-link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
