import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendObservationEmailRequest {
  requestId: string;
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

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { requestId }: SendObservationEmailRequest = await req.json();

    if (!requestId) {
      throw new Error("Missing requestId");
    }

    // Fetch the observation request
    const { data: request, error: fetchError } = await supabase
      .from("observation_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      throw new Error(`Observation request not found: ${fetchError?.message}`);
    }

    // Build the observation form URL
    const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://novabehavior.lovable.app";
    const formUrl = `${appUrl}/observation/${request.access_token}`;

    const requestTypeLabels: Record<string, string> = {
      behavior_observation: "Behavior Observation",
      frequency_count: "Frequency Count",
      abc_recording: "ABC Recording",
      interval_recording: "Interval Recording",
    };
    const requestTypeLabel = requestTypeLabels[request.request_type] || request.request_type;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Teacher Observation Request</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hello <strong>${request.recipient_name}</strong>,</p>
          <p>You've been asked to complete a <strong>${requestTypeLabel}</strong> observation.</p>
          ${request.instructions ? `<p><em>Instructions:</em> ${request.instructions}</p>` : ""}
          <div style="margin: 24px 0; text-align: center;">
            <a href="${formUrl}" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Open Observation Form
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            No login is required. Simply click the button above to begin recording your observations.
          </p>
          ${request.expires_at ? `<p style="color: #6b7280; font-size: 12px;">This link expires on ${new Date(request.expires_at).toLocaleDateString()}.</p>` : ""}
        </div>
      </div>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Nova Behavior <noreply@novabehavior.com>",
      to: [request.recipient_email],
      subject: `Observation Request: ${requestTypeLabel}`,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    // Update the request status
    await supabase
      .from("observation_requests")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    console.log("Observation email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, emailId: emailData?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-observation-email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
