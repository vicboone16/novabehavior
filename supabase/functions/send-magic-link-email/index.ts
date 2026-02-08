import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type LinkType = "observation" | "questionnaire" | "custom_form" | "consent";

interface SendMagicLinkRequest {
  type: LinkType;
  recordId: string;
}

interface EmailPayload {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  heading: string;
  body: string;
  buttonText: string;
  formUrl: string;
  expiresAt?: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, recordId }: SendMagicLinkRequest = await req.json();

    if (!type || !recordId) {
      throw new Error("Missing required fields: type, recordId");
    }

    const appUrl =
      Deno.env.get("APP_URL") ||
      req.headers.get("origin") ||
      "https://novabehavior.lovable.app";

    let emailPayload: EmailPayload;

    switch (type) {
      case "observation": {
        const { data: request, error } = await supabase
          .from("observation_requests")
          .select("*")
          .eq("id", recordId)
          .single();
        if (error || !request) throw new Error(`Observation request not found: ${error?.message}`);

        const typeLabels: Record<string, string> = {
          behavior_observation: "Behavior Observation",
          frequency_count: "Frequency Count",
          abc_recording: "ABC Recording",
          interval_recording: "Interval Recording",
          antecedent_log: "Antecedent Log",
          skills_checklist: "Skills Checklist",
        };
        const typeLabel = typeLabels[request.request_type] || request.request_type;

        emailPayload = {
          recipientEmail: request.recipient_email,
          recipientName: request.recipient_name,
          subject: `Observation Request: ${typeLabel}`,
          heading: "Teacher Observation Request",
          body: `You've been asked to complete a <strong>${typeLabel}</strong> observation.${
            request.instructions ? `<br/><em>Instructions:</em> ${request.instructions}` : ""
          }`,
          buttonText: "Open Observation Form",
          formUrl: `${appUrl}/observation/${request.access_token}`,
          expiresAt: request.expires_at,
        };

        // Update status
        await supabase
          .from("observation_requests")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", recordId);
        break;
      }

      case "questionnaire": {
        const { data: invitation, error } = await supabase
          .from("questionnaire_invitations")
          .select("*, questionnaire_templates(*)")
          .eq("id", recordId)
          .single();
        if (error || !invitation) throw new Error(`Questionnaire invitation not found: ${error?.message}`);

        const templateName = invitation.questionnaire_templates?.name || "Questionnaire";

        const formTypeLabels: Record<string, string> = {
          custom: "Questionnaire",
          abas3: "ABAS-3 Assessment",
          socially_savvy: "Socially Savvy Assessment",
          brief_record_review: "Brief Record Review",
          brief_teacher_input: "Brief Teacher Input",
        };
        const formLabel = formTypeLabels[invitation.form_type] || templateName;

        emailPayload = {
          recipientEmail: invitation.recipient_email,
          recipientName: invitation.recipient_name,
          subject: `${formLabel} - Please Complete`,
          heading: `${formLabel} Request`,
          body: `You've been asked to complete the <strong>${templateName}</strong> form. Your input is important and will be used to support the student's care plan.`,
          buttonText: "Open Form",
          formUrl: `${appUrl}/questionnaire/${invitation.access_token}`,
          expiresAt: invitation.expires_at,
        };

        // Update sent_at
        await supabase
          .from("questionnaire_invitations")
          .update({ sent_at: new Date().toISOString(), status: "sent" })
          .eq("id", recordId);
        break;
      }

      case "custom_form": {
        const { data: submission, error } = await supabase
          .from("custom_form_submissions")
          .select("*, custom_forms(*)")
          .eq("id", recordId)
          .single();
        if (error || !submission) throw new Error(`Custom form submission not found: ${error?.message}`);

        const formTitle = submission.custom_forms?.title || "Form";

        emailPayload = {
          recipientEmail: submission.respondent_email,
          recipientName: submission.respondent_name || "Recipient",
          subject: `${formTitle} - Please Complete`,
          heading: `${formTitle}`,
          body: `You've been asked to complete the <strong>${formTitle}</strong> form.${
            submission.custom_forms?.description
              ? `<br/><em>${submission.custom_forms.description}</em>`
              : ""
          }`,
          buttonText: "Open Form",
          formUrl: `${appUrl}/form/${submission.access_token}`,
          expiresAt: submission.expires_at,
        };

        // Update sent_at
        await supabase
          .from("custom_form_submissions")
          .update({ sent_at: new Date().toISOString(), status: "sent" })
          .eq("id", recordId);
        break;
      }

      case "consent": {
        // Future: consent form magic links
        throw new Error("Consent form email not yet implemented");
      }

      default:
        throw new Error(`Unknown link type: ${type}`);
    }

    // Send the email
    const htmlContent = buildEmailHtml(emailPayload);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Nova Behavior <onboarding@resend.dev>",
      to: [emailPayload.recipientEmail],
      subject: emailPayload.subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log(`Magic link email sent successfully (${type}):`, emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-magic-link-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function buildEmailHtml(payload: EmailPayload): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 24px 28px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 600;">${payload.heading}</h1>
      </div>
      <div style="background-color: #f9fafb; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #374151; margin-top: 0;">Hello <strong>${payload.recipientName}</strong>,</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">${payload.body}</p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${payload.formUrl}" 
             style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);">
            ${payload.buttonText}
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
          No login is required. Simply click the button above to begin.
        </p>
        ${
          payload.expiresAt
            ? `<p style="color: #9ca3af; font-size: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                This link expires on ${new Date(payload.expiresAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.
              </p>`
            : ""
        }
        <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">
          If you did not expect this email, you can safely ignore it.
        </p>
      </div>
    </div>
  `;
}

serve(handler);
