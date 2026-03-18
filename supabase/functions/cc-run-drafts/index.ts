import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENCOUNTER_DRAFT_MAP: Record<string, Array<{ key: string; label: string }>> = {
  quick_note: [
    { key: "private_note", label: "Private Note" },
    { key: "task_list", label: "Task List" },
  ],
  parent_interview: [
    { key: "private_note", label: "Private Note" },
    { key: "fba_parent_interview_paragraph", label: "FBA Parent Interview Paragraph" },
    { key: "task_list", label: "Task List" },
  ],
  parent_training: [
    { key: "parent_training_note", label: "Parent Training Note" },
    { key: "private_note", label: "Private Note" },
    { key: "task_list", label: "Task List" },
  ],
  teacher_consult: [
    { key: "teacher_consult_note", label: "Teacher Consult Note" },
    { key: "private_note", label: "Private Note" },
    { key: "task_list", label: "Task List" },
  ],
  fba_observation: [
    { key: "fba_observation_paragraph", label: "FBA Observation Paragraph" },
    { key: "private_note", label: "Private Note" },
    { key: "task_list", label: "Task List" },
  ],
  rbt_supervision: [
    { key: "supervision_note", label: "Supervision Note" },
    { key: "private_note", label: "Private Note" },
    { key: "task_list", label: "Task List" },
  ],
  bcba_supervision: [
    { key: "supervision_note", label: "Supervision Note" },
    { key: "private_note", label: "Private Note" },
    { key: "task_list", label: "Task List" },
  ],
  direct_session_debrief: [
    { key: "session_note", label: "Session Note" },
    { key: "soap_note", label: "SOAP Note" },
    { key: "narrative_note", label: "Narrative Note" },
    { key: "task_list", label: "Task List" },
  ],
  team_meeting: [
    { key: "team_meeting_summary", label: "Team Meeting Summary" },
    { key: "task_list", label: "Task List" },
  ],
  crisis_debrief: [
    { key: "narrative_note", label: "Narrative Note" },
    { key: "private_note", label: "Private Note" },
    { key: "task_list", label: "Task List" },
  ],
  classroom_observation: [
    { key: "fba_observation_paragraph", label: "Observation Paragraph" },
    { key: "narrative_note", label: "Narrative Note" },
    { key: "task_list", label: "Task List" },
  ],
  private_dictation: [
    { key: "private_note", label: "Private Note" },
    { key: "task_list", label: "Task List" },
  ],
  personal_admin_note: [
    { key: "private_note", label: "Private Note" },
    { key: "task_list", label: "Task List" },
  ],
  fba_interview: [
    { key: "fba_parent_interview_paragraph", label: "FBA Interview Paragraph" },
    { key: "narrative_note", label: "Narrative Note" },
    { key: "task_list", label: "Task List" },
  ],
  record_review_dictation: [
    { key: "narrative_note", label: "Clinical Summary" },
    { key: "task_list", label: "Task List" },
  ],
};

const DEFAULT_DRAFTS = [
  { key: "narrative_note", label: "Narrative Note" },
  { key: "task_list", label: "Task List" },
];

/**
 * Internal stage function — called by cc-process-recording with service-role key.
 * Does NOT call auth.getClaims.
 * 
 * DRAFT VERSIONING: Never deletes user-edited or approved drafts.
 * Only replaces system-generated, unapproved drafts.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { recording_id, org_id, transcript_id, encounter_type = "quick_note", requested_drafts } = await req.json();
    if (!recording_id || !org_id) {
      return new Response(JSON.stringify({ error: "recording_id and org_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate
    const { data: recording, error: recErr } = await supabase
      .from("voice_recordings")
      .select("id, org_id, language_mode")
      .eq("id", recording_id)
      .single();
    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (recording.org_id && recording.org_id !== org_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load transcript
    let transQuery = supabase.from("voice_transcripts").select("id, full_text").eq("recording_id", recording_id);
    if (transcript_id) { transQuery = transQuery.eq("id", transcript_id); }
    else { transQuery = transQuery.order("version_number", { ascending: false }).limit(1); }
    const { data: trans } = await transQuery.single();
    if (!trans?.full_text) {
      return new Response(JSON.stringify({ error: "No transcript available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load extractions for context
    const { data: extractions } = await supabase.from("voice_ai_extractions").select("extraction_type, json_payload").eq("recording_id", recording_id);
    const extractionContext = extractions?.map(e => `[${e.extraction_type}]: ${JSON.stringify(e.json_payload)}`).join("\n") || "";

    // Create AI run
    const { data: aiRun } = await supabase.from("voice_ai_runs").insert({
      recording_id,
      run_type: "draft_generation",
      model_name: "google/gemini-3-flash-preview",
      status: "running",
      started_at: new Date().toISOString(),
    }).select("id").single();

    try {
      // Determine draft set
      let draftTypes: Array<{ key: string; label: string }>;
      if (requested_drafts && Array.isArray(requested_drafts) && requested_drafts.length > 0) {
        draftTypes = requested_drafts.map((key: string) => ({
          key,
          label: key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        }));
      } else {
        draftTypes = ENCOUNTER_DRAFT_MAP[encounter_type] || DEFAULT_DRAFTS;
      }

      // SAFE CLEANUP: Only delete system-generated, non-edited, non-approved drafts
      // Preserve user-edited and approved drafts
      await supabase.from("voice_ai_drafts")
        .delete()
        .eq("recording_id", recording_id)
        .eq("is_user_edited", false)
        .is("approved_at", null);

      const createdDrafts: Array<{ id: string; draft_type: string }> = [];

      // Determine output language from language_mode
      const langMode = (recording.language_mode || "auto").toLowerCase();
      const outputLang = (langMode === "spanish" || langMode === "es") ? "es" : "en";

      for (const dt of draftTypes) {
        // Skip if a user-edited or approved draft of this type already exists
        const { data: existingEdited } = await supabase.from("voice_ai_drafts")
          .select("id")
          .eq("recording_id", recording_id)
          .eq("draft_type", dt.key)
          .or("is_user_edited.eq.true,approved_at.not.is.null")
          .limit(1);

        if (existingEdited && existingEdited.length > 0) {
          continue; // Don't overwrite user work
        }

        const draftRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are an expert ABA clinical documentation writer. Generate a ${dt.label} based on the transcript and extractions below.

RULES:
- Write in clinical, professional tone
- Be concise but thorough
- Distinguish stated facts from observations from inferences
- Mark uncertain items with qualifying language
- Never fabricate details not in the transcript
- Use person-first language
- Include relevant clinical details
- Format appropriately for the note type`,
              },
              {
                role: "user",
                content: `Generate a ${dt.label} from this transcript:\n\n---\n${trans.full_text}\n---\n\nEXTRACTIONS:\n${extractionContext}`,
              },
            ],
          }),
        });

        if (draftRes.ok) {
          const draftData = await draftRes.json();
          const content = draftData.choices?.[0]?.message?.content;
          if (content) {
            const { data: saved } = await supabase.from("voice_ai_drafts").insert({
              recording_id,
              draft_type: dt.key,
              tone: "clinical",
              output_language: outputLang,
              content,
              model_name: "google/gemini-3-flash-preview",
              is_user_edited: false,
            }).select("id, draft_type").single();
            if (saved) createdDrafts.push(saved);
          }
        } else {
          console.error(`Draft ${dt.key} generation failed: ${draftRes.status}`);
        }
      }

      if (aiRun) {
        await supabase.from("voice_ai_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", aiRun.id);
      }

      return new Response(JSON.stringify({
        drafts_created: createdDrafts.length,
        draft_ids: createdDrafts.map(d => d.id),
        draft_types: createdDrafts.map(d => d.draft_type),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (stageError) {
      console.error("Draft stage error:", stageError);
      const errMsg = stageError instanceof Error ? stageError.message : "Draft generation failed";
      if (aiRun) {
        await supabase.from("voice_ai_runs").update({ status: "failed", error_message: errMsg, completed_at: new Date().toISOString() }).eq("id", aiRun.id);
      }
      await supabase.from("voice_recordings").update({
        status: "ai_failed_retryable",
        ai_status: "failed",
      }).eq("id", recording_id);
      return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("cc-run-drafts error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
