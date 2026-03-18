import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENCOUNTER_PROMPTS: Record<string, string> = {
  quick_note: `Extract: brief summary, action items/tasks. Keep concise.`,
  parent_interview: `Extract with emphasis on: caregiver concerns (verbatim), developmental/health context, behavior topographies, triggers, function clues, missing FBA info, follow-up questions.`,
  parent_training: `Extract with emphasis on: strategies modeled/reviewed, caregiver practice performance, barriers, homework/action items, caregiver response to coaching.`,
  teacher_consult: `Extract with emphasis on: classroom concerns, triggers in school setting, current supports tried, teacher requests, environmental variables, schedule/transition issues.`,
  fba_interview: `Extract with emphasis on: informant responses about behavior, setting events, antecedent/consequence patterns, behavior descriptions (topography/frequency/duration/intensity), function hypotheses.`,
  fba_observation: `Extract with emphasis on: observable behavior ONLY (no inference), ABC patterns observed, setting events, environmental variables, neutral objective language.`,
  rbt_supervision: `Extract with emphasis on: implementation strengths, corrective feedback, skills coached, integrity/fidelity concerns, growth areas, action plan items.`,
  bcba_supervision: `Extract with emphasis on: clinical discussion topics, case conceptualization, treatment modifications, ethical considerations, professional development.`,
  direct_session_debrief: `Extract with emphasis on: behaviors observed, skill acquisition progress, antecedents/consequences, intervention implementation, data highlights.`,
  classroom_observation: `Extract with emphasis on: setting/environment, student behavior in context, peer/staff interactions, antecedent/consequence patterns.`,
  team_meeting: `Extract with emphasis on: discussion topics, decisions made, action items with owners, follow-up dates, concerns raised.`,
  crisis_debrief: `Extract with emphasis on: crisis description, antecedent events, de-escalation strategies used, physical intervention, duration/resolution, safety concerns.`,
  private_dictation: `Extract: transcript and private summary only.`,
  personal_admin_note: `Extract: tasks, action items, brief summary.`,
  record_review_dictation: `Extract: key findings from record review, clinical impressions, recommendations.`,
};

const BASE_EXTRACTION_PROMPT = `You are Nova AI Clinical Capture, an ABA-specific clinical documentation engine.

CRITICAL RULES:
1. Distinguish between directly stated facts, observed behaviors, and inferences
2. Mark uncertain conclusions as "tentative" or "possible"
3. Use clinical, professional language
4. Never fabricate information not present in the transcript
5. Flag risk/safety concerns prominently
6. Note when information appears incomplete

ALWAYS extract these structured fields (return null if not present):
- participants: array of {name, role}
- setting: string
- reason_for_contact: string
- caregiver_concerns: array of strings
- teacher_concerns: array of strings
- observed_behaviors: array of {behavior, topography, frequency, duration, intensity}
- antecedents: array of strings
- consequences: array of strings
- replacement_behaviors_discussed: array of strings
- possible_function_clues: array of {behavior, hypothesized_function, evidence, confidence}
- medication_health_mentions: array of strings
- environmental_variables: array of strings
- barriers_to_treatment: array of strings
- safety_concerns: array of strings
- next_steps: array of strings
- profile_update_suggestions: array of strings

ALSO generate these summaries:
- one_line_summary: single sentence
- concise_summary: 2-3 sentence clinical summary
- detailed_clinical_summary: comprehensive clinical narrative
- parent_friendly_summary: plain-language summary for caregivers
- action_items: array of {task, assigned_to, due_date}
- missing_information: array of strings (gaps in data)
- risk_flags: array of strings`;

const EXTRACTION_TOOL = {
  type: "function" as const,
  function: {
    name: "clinical_extraction",
    description: "Extract structured clinical data from transcript",
    parameters: {
      type: "object",
      properties: {
        one_line_summary: { type: "string" },
        concise_summary: { type: "string" },
        detailed_clinical_summary: { type: "string" },
        parent_friendly_summary: { type: "string" },
        participants: { type: "array", items: { type: "object", properties: { name: { type: "string" }, role: { type: "string" } } } },
        setting: { type: "string" },
        reason_for_contact: { type: "string" },
        caregiver_concerns: { type: "array", items: { type: "string" } },
        teacher_concerns: { type: "array", items: { type: "string" } },
        observed_behaviors: { type: "array", items: { type: "object", properties: { behavior: { type: "string" }, topography: { type: "string" }, frequency: { type: "string" }, duration: { type: "string" }, intensity: { type: "string" } } } },
        antecedents: { type: "array", items: { type: "string" } },
        consequences: { type: "array", items: { type: "string" } },
        replacement_behaviors_discussed: { type: "array", items: { type: "string" } },
        possible_function_clues: { type: "array", items: { type: "object", properties: { behavior: { type: "string" }, hypothesized_function: { type: "string" }, evidence: { type: "string" }, confidence: { type: "string" } } } },
        medication_health_mentions: { type: "array", items: { type: "string" } },
        environmental_variables: { type: "array", items: { type: "string" } },
        barriers_to_treatment: { type: "array", items: { type: "string" } },
        safety_concerns: { type: "array", items: { type: "string" } },
        next_steps: { type: "array", items: { type: "string" } },
        action_items: { type: "array", items: { type: "object", properties: { task: { type: "string" }, assigned_to: { type: "string" }, due_date: { type: "string" } } } },
        missing_information: { type: "array", items: { type: "string" } },
        risk_flags: { type: "array", items: { type: "string" } },
        profile_update_suggestions: { type: "array", items: { type: "string" } },
      },
      required: ["one_line_summary", "concise_summary", "detailed_clinical_summary"],
      additionalProperties: false,
    },
  },
};

/**
 * Internal stage function — called by cc-process-recording with service-role key.
 * Does NOT call auth.getClaims.
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

    const { recording_id, org_id, transcript_id, encounter_type = "quick_note", save_intent } = await req.json();
    if (!recording_id || !org_id) {
      return new Response(JSON.stringify({ error: "recording_id and org_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate recording
    const { data: recording, error: recErr } = await supabase
      .from("voice_recordings")
      .select("id, org_id, client_id")
      .eq("id", recording_id)
      .single();
    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (recording.org_id && recording.org_id !== org_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load transcript
    let transcriptQuery = supabase.from("voice_transcripts").select("id, full_text").eq("recording_id", recording_id);
    if (transcript_id) {
      transcriptQuery = transcriptQuery.eq("id", transcript_id);
    } else {
      transcriptQuery = transcriptQuery.order("version_number", { ascending: false }).limit(1);
    }
    const { data: trans } = await transcriptQuery.single();
    if (!trans?.full_text) {
      return new Response(JSON.stringify({ error: "No transcript available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create AI runs
    const runIds: string[] = [];
    for (const runType of ["summary_generation", "structured_extraction"]) {
      const { data: run } = await supabase.from("voice_ai_runs").insert({
        recording_id,
        run_type: runType,
        model_name: "google/gemini-3-flash-preview",
        status: "running",
        started_at: new Date().toISOString(),
      }).select("id").single();
      if (run) runIds.push(run.id);
    }

    try {
      const encounterPrompt = ENCOUNTER_PROMPTS[encounter_type] || ENCOUNTER_PROMPTS.quick_note;

      const extractionRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: `${BASE_EXTRACTION_PROMPT}\n\nENCOUNTER-SPECIFIC:\n${encounterPrompt}` },
            { role: "user", content: `Analyze this clinical recording transcript and extract all structured data:\n\n---\n${trans.full_text}\n---` },
          ],
          tools: [EXTRACTION_TOOL],
          tool_choice: { type: "function", function: { name: "clinical_extraction" } },
        }),
      });

      if (!extractionRes.ok) {
        throw new Error(`AI extraction returned ${extractionRes.status}`);
      }

      const extractionData = await extractionRes.json();
      const toolCall = extractionData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) throw new Error("No extraction data returned");

      let extracted: Record<string, any>;
      try { extracted = JSON.parse(toolCall.function.arguments); } catch { throw new Error("Invalid extraction JSON"); }

      // Delete old extractions for idempotency
      await supabase.from("voice_ai_extractions").delete().eq("recording_id", recording_id);

      let extractionCount = 0;

      // All fields stored as extraction_type TEXT — no enum constraint
      // Summaries stored alongside structured fields in voice_ai_extractions
      const allFields = [
        // Summary fields
        "one_line_summary", "concise_summary", "detailed_clinical_summary", "parent_friendly_summary",
        // Structured extraction fields
        "participants", "setting", "reason_for_contact",
        "caregiver_concerns", "teacher_concerns", "observed_behaviors",
        "antecedents", "consequences", "replacement_behaviors_discussed",
        "possible_function_clues", "medication_health_mentions", "environmental_variables",
        "barriers_to_treatment", "safety_concerns", "next_steps",
        "action_items", "missing_information", "risk_flags", "profile_update_suggestions",
      ];

      for (const field of allFields) {
        const val = extracted[field];
        if (val == null) continue;
        if (Array.isArray(val) && val.length === 0) continue;
        if (typeof val === "string" && val.trim() === "") continue;

        let payload: Record<string, any>;
        if (typeof val === "string") {
          payload = { text: val };
        } else if (Array.isArray(val)) {
          payload = { items: val };
        } else {
          payload = { value: val };
        }

        await supabase.from("voice_ai_extractions").insert({
          recording_id,
          extraction_type: field,
          json_payload: payload,
          confidence_score: 0.85,
        });
        extractionCount++;
      }

      // Save tasks (voice_tasks.status is TEXT — use "open" for consistency)
      if (extracted.action_items?.length > 0) {
        // Delete old auto-generated tasks for idempotency
        await supabase.from("voice_tasks").delete().eq("recording_id", recording_id);
        for (const item of extracted.action_items) {
          await supabase.from("voice_tasks").insert({
            recording_id,
            client_id: recording.client_id || null,
            task_text: item.task,
            status: "open",
          });
        }
      }

      // Mark runs completed
      for (const runId of runIds) {
        await supabase.from("voice_ai_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", runId);
      }

      await supabase.from("voice_recordings").update({ ai_status: "extraction_completed" }).eq("id", recording_id);

      return new Response(JSON.stringify({
        extraction_count: extractionCount,
        summaries_available: ["one_line_summary", "concise_summary", "detailed_clinical_summary", "parent_friendly_summary"].filter(s => extracted[s]),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (stageError) {
      console.error("Extraction stage error:", stageError);
      const errMsg = stageError instanceof Error ? stageError.message : "Extraction failed";
      for (const runId of runIds) {
        await supabase.from("voice_ai_runs").update({ status: "failed", error_message: errMsg, completed_at: new Date().toISOString() }).eq("id", runId);
      }
      await supabase.from("voice_recordings").update({
        status: "ai_failed_retryable",
        ai_status: "failed",
      }).eq("id", recording_id);
      return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("cc-run-extraction error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
