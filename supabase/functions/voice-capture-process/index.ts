import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Encounter-specific system prompts for ABA clinical extraction
 */
const ENCOUNTER_PROMPTS: Record<string, string> = {
  quick_note: `Extract: brief summary, action items/tasks. Keep it concise. Do NOT generate full clinical artifacts.`,
  
  parent_interview: `Extract with emphasis on:
- Caregiver concerns (verbatim when possible)
- Developmental and health/medical context
- Behavior topographies described by caregiver
- Triggers/antecedents mentioned
- Function clues or hypotheses
- Missing information for FBA
- Follow-up questions to ask
Generate: FBA parent interview paragraph draft`,

  parent_training: `Extract with emphasis on:
- Strategies modeled/reviewed
- Caregiver practice performance
- Caregiver barriers and challenges
- Homework/action items assigned
- Caregiver response to coaching
Generate: Parent training note draft`,

  teacher_consult: `Extract with emphasis on:
- Classroom concerns reported
- Triggers/antecedents in school setting
- Current supports and accommodations tried
- Teacher requests
- Environmental variables
- Schedule/transition issues
- Follow-up plan
Generate: Teacher consult note draft`,

  fba_interview: `Extract with emphasis on:
- Informant responses about behavior
- Setting events and establishing operations
- Antecedent patterns
- Consequence patterns
- Behavior descriptions (topography, frequency, duration, intensity)
- Function hypotheses
- Missing assessment data
Generate: FBA interview paragraph draft`,

  fba_observation: `Extract with emphasis on:
- Observable behavior ONLY (no inference)
- ABC patterns observed
- Setting events
- Environmental variables
- Neutral, objective language
- Possible hypothesized functions (clearly marked as hypotheses)
Generate: FBA observation paragraph draft`,

  rbt_supervision: `Extract with emphasis on:
- Implementation strengths observed
- Corrective feedback provided
- Skills coached
- Integrity/fidelity concerns
- Growth areas identified
- Action plan items
Generate: Supervision note draft`,

  bcba_supervision: `Extract with emphasis on:
- Clinical discussion topics
- Case conceptualization points
- Treatment modifications discussed
- Ethical considerations
- Professional development
- Action items
Generate: Supervision note draft`,

  direct_session_debrief: `Extract with emphasis on:
- Behaviors observed during session
- Skill acquisition progress
- Antecedents and consequences
- Intervention implementation details
- Data collection highlights
- Notable events
Generate: Session note draft`,

  classroom_observation: `Extract with emphasis on:
- Setting and environmental description
- Student behavior in context
- Peer interactions
- Staff interactions
- Antecedent/consequence patterns
- Environmental supports present/absent
Generate: Observation summary draft`,

  team_meeting: `Extract with emphasis on:
- Discussion topics
- Decisions made
- Action items with owners
- Follow-up dates
- Concerns raised
Generate: Team meeting summary draft`,

  crisis_debrief: `Extract with emphasis on:
- Crisis description
- Antecedent events
- De-escalation strategies used
- Physical intervention (if any)
- Duration and resolution
- Safety concerns
- Follow-up needed
Generate: Crisis debrief note draft`,

  private_dictation: `Extract: transcript and private summary only. Do NOT generate chart-linked clinical artifacts unless explicitly asked.`,

  personal_admin_note: `Extract: tasks, action items, and a brief summary. Keep private.`,

  record_review_dictation: `Extract: key findings from record review, clinical impressions, recommendations. Generate: Clinical summary draft.`,
};

const BASE_EXTRACTION_PROMPT = `You are Nova AI Clinical Capture, an ABA-specific clinical documentation engine.

Your job is to analyze a voice recording transcript and produce structured clinical outputs.

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
- follow_up_steps: array of strings
- action_items: array of {task, assigned_to, due_date}
- missing_information: array of strings
- risk_flags: array of strings`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    // Service-role client for storage downloads during processing
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const userId = claimsData.claims.sub;

    const { recording_id, action, question, draft_id, transform_type } = await req.json();
    if (!recording_id) {
      return new Response(JSON.stringify({ error: "recording_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fetch recording
    const { data: recording, error: recErr } = await supabase
      .from("voice_recordings")
      .select("*")
      .eq("id", recording_id)
      .single();

    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── Ask AI action ──
    if (action === "ask_ai" && question) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "AI not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get transcript
      const { data: trans } = await supabase
        .from("voice_transcripts")
        .select("full_text")
        .eq("recording_id", recording_id)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      if (!trans?.full_text) {
        return new Response(JSON.stringify({ answer: "No transcript available yet. Process the recording first." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Save question
      const { data: savedQ } = await supabase.from("voice_ai_questions").insert({
        recording_id,
        asked_by: userId,
        question_text: question,
      }).select().single();

      const qaRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: `You are Nova AI Clinical Capture, an ABA-specific clinical assistant. Answer questions grounded in the provided transcript.

RULES:
- Only reference information present in the transcript
- Distinguish between directly stated, observed, and inferred
- Mark uncertain conclusions with qualifying language like "possibly", "appears to"
- If information is not in the transcript, say so clearly
- Use clinical, professional language
- Be concise but thorough`,
            },
            {
              role: "user",
              content: `TRANSCRIPT:\n---\n${trans.full_text}\n---\n\nQUESTION: ${question}`,
            },
          ],
        }),
      });

      let answer = "Unable to generate response.";
      if (qaRes.ok) {
        const qaData = await qaRes.json();
        answer = qaData.choices?.[0]?.message?.content || answer;
      }

      // Save answer
      if (savedQ) {
        await supabase.from("voice_ai_answers").insert({
          question_id: savedQ.id,
          answer_text: answer,
          model_name: "google/gemini-3-flash-preview",
        });
      }

      return new Response(JSON.stringify({ answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── Transform Draft action ──
    if (action === "transform_draft" && draft_id && transform_type) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "AI not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: draft } = await supabase
        .from("voice_ai_drafts")
        .select("*")
        .eq("id", draft_id)
        .single();

      if (!draft?.content) {
        return new Response(JSON.stringify({ error: "Draft not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const transformPrompts: Record<string, string> = {
        shorter: "Rewrite this clinical note to be significantly shorter and more concise while preserving all essential clinical information.",
        more_objective: "Rewrite this clinical note using more objective, neutral, and observable language. Remove subjective interpretations.",
        school_safe: "Rewrite this clinical note using school-appropriate, educator-friendly wording. Avoid clinical jargon where possible.",
        parent_friendly: "Rewrite this clinical note in parent-friendly language. Make it accessible and supportive while preserving key information.",
        translate_spanish: "Translate this clinical note into Spanish, maintaining clinical accuracy and professional tone.",
      };

      const prompt = transformPrompts[transform_type] || `Transform this note: ${transform_type}`;

      const tfRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are an expert ABA clinical documentation writer. Transform the provided note as instructed. Output only the transformed note, no preamble." },
            { role: "user", content: `${prompt}\n\nORIGINAL NOTE:\n---\n${draft.content}\n---` },
          ],
        }),
      });

      let transformed = draft.content;
      if (tfRes.ok) {
        const tfData = await tfRes.json();
        transformed = tfData.choices?.[0]?.message?.content || transformed;
      }

      // Update draft with transformed content
      await supabase.from("voice_ai_drafts").update({
        content: transformed,
        tone: transform_type === "translate_spanish" ? "clinical" : transform_type,
        output_language: transform_type === "translate_spanish" ? "es" : draft.output_language,
        is_user_edited: true,
      }).eq("id", draft_id);

      return new Response(JSON.stringify({ content: transformed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Update status for full pipeline
    await supabase.from("voice_recordings").update({
      status: "processing",
      transcript_status: "processing",
      ai_status: "processing",
    }).eq("id", recording_id);

    // Log AI run
    const { data: aiRun } = await supabase.from("voice_ai_runs").insert({
      recording_id,
      run_type: "full_pipeline",
      model_name: "google/gemini-3-flash-preview",
      status: "running",
      started_at: new Date().toISOString(),
    }).select().single();

    // ── Step 1: Get audio chunks and transcribe ──
    const { data: chunks } = await supabase
      .from("voice_recording_chunks")
      .select("*")
      .eq("recording_id", recording_id)
      .order("chunk_index", { ascending: true });

    let fullTranscriptText = "";
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (ELEVENLABS_API_KEY && chunks && chunks.length > 0) {
      // Download and concatenate audio chunks
      const audioBlobs: Uint8Array[] = [];
      for (const chunk of chunks) {
        if (chunk.storage_path) {
          const { data: fileData } = await supabase.storage
            .from("voice-recordings")
            .download(chunk.storage_path);
          if (fileData) {
            const arrayBuf = await fileData.arrayBuffer();
            audioBlobs.push(new Uint8Array(arrayBuf));
          }
        }
      }

      if (audioBlobs.length > 0) {
        // Combine chunks into single blob for transcription
        const totalLen = audioBlobs.reduce((acc, b) => acc + b.length, 0);
        const combined = new Uint8Array(totalLen);
        let offset = 0;
        for (const blob of audioBlobs) {
          combined.set(blob, offset);
          offset += blob.length;
        }

        // Send to ElevenLabs Scribe
        const formData = new FormData();
        formData.append("file", new Blob([combined], { type: "audio/webm" }), "recording.webm");
        formData.append("model_id", "scribe_v2");
        formData.append("diarize", "true");
        formData.append("tag_audio_events", "false");

        if (recording.language_mode && recording.language_mode !== "auto") {
          const langMap: Record<string, string> = { en: "eng", es: "spa" };
          const langCode = langMap[recording.language_mode];
          if (langCode) formData.append("language_code", langCode);
        }

        const transcribeRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
          body: formData,
        });

        if (transcribeRes.ok) {
          const transcription = await transcribeRes.json();
          fullTranscriptText = transcription.text || "";

          // Save transcript
          const { data: savedTranscript } = await supabase.from("voice_transcripts").insert({
            recording_id,
            version_number: 1,
            source_language: recording.language_mode || "auto",
            status: "completed",
            full_text: fullTranscriptText,
            speaker_count: transcription.words
              ? new Set(transcription.words.map((w: any) => w.speaker).filter(Boolean)).size
              : 0,
            created_by_model: "scribe_v2",
          }).select().single();

          // Save segments with speaker info
          if (transcription.words && savedTranscript) {
            // Group words into speaker turns
            let currentSpeaker = "";
            let currentText = "";
            let segStart = 0;
            let segIndex = 0;
            const segments: any[] = [];

            for (const word of transcription.words) {
              if (word.speaker !== currentSpeaker && currentText) {
                segments.push({
                  transcript_id: savedTranscript.id,
                  segment_index: segIndex++,
                  speaker_id: null,
                  text: currentText.trim(),
                  start_ms: Math.round(segStart * 1000),
                  end_ms: Math.round(word.start * 1000),
                  language_code: recording.language_mode,
                });
                currentText = "";
                segStart = word.start;
              }
              currentSpeaker = word.speaker || "";
              currentText += word.text + " ";
            }
            if (currentText) {
              segments.push({
                transcript_id: savedTranscript.id,
                segment_index: segIndex,
                text: currentText.trim(),
                start_ms: Math.round(segStart * 1000),
                end_ms: null,
                language_code: recording.language_mode,
              });
            }

            if (segments.length > 0) {
              await supabase.from("voice_transcript_segments").insert(segments);
            }

            // Create speaker records
            const speakerLabels = new Set(
              transcription.words.map((w: any) => w.speaker).filter(Boolean)
            );
            for (const label of speakerLabels) {
              await supabase.from("voice_speakers").insert({
                recording_id,
                speaker_label: label,
                speaker_role: "unknown",
              });
            }
          }

          await supabase.from("voice_recordings").update({
            transcript_status: "completed",
            detected_languages: transcription.language_code
              ? [transcription.language_code]
              : null,
          }).eq("id", recording_id);
        } else {
          const errText = await transcribeRes.text();
          console.error("Transcription failed:", errText);
          await supabase.from("voice_recordings").update({
            transcript_status: "failed",
          }).eq("id", recording_id);
        }
      }
    }

    // ── Step 2: AI Extraction + Draft Generation via Lovable AI ──
    if (fullTranscriptText) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        console.error("LOVABLE_API_KEY not configured");
      } else {
        const encounterType = recording.encounter_type || "quick_note";
        const encounterPrompt = ENCOUNTER_PROMPTS[encounterType] || ENCOUNTER_PROMPTS.quick_note;

        // ── AI Call: Structured Extraction ──
        try {
          const extractionRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: `${BASE_EXTRACTION_PROMPT}\n\nENCOUNTER-SPECIFIC INSTRUCTIONS:\n${encounterPrompt}` },
                { role: "user", content: `Analyze this clinical recording transcript and extract all structured data:\n\n---\n${fullTranscriptText}\n---` },
              ],
              tools: [{
                type: "function",
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
                      follow_up_steps: { type: "array", items: { type: "string" } },
                      action_items: { type: "array", items: { type: "object", properties: { task: { type: "string" }, assigned_to: { type: "string" }, due_date: { type: "string" } } } },
                      missing_information: { type: "array", items: { type: "string" } },
                      risk_flags: { type: "array", items: { type: "string" } },
                    },
                    required: ["one_line_summary", "concise_summary", "detailed_clinical_summary"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "clinical_extraction" } },
            }),
          });

          if (extractionRes.ok) {
            const extractionData = await extractionRes.json();
            const toolCall = extractionData.choices?.[0]?.message?.tool_calls?.[0];
            
            if (toolCall?.function?.arguments) {
              let extracted;
              try {
                extracted = JSON.parse(toolCall.function.arguments);
              } catch {
                extracted = toolCall.function.arguments;
              }

              // Save summaries
              const summaryTypes = ["one_line_summary", "concise_summary", "detailed_clinical_summary", "parent_friendly_summary"];
              for (const st of summaryTypes) {
                if (extracted[st]) {
                  await supabase.from("voice_ai_extractions").insert({
                    recording_id,
                    extraction_type: st,
                    json_payload: { text: extracted[st] },
                    confidence_score: 0.9,
                  });
                }
              }

              // Save structured extractions
              const structuredFields = [
                "participants", "caregiver_concerns", "teacher_concerns",
                "observed_behaviors", "antecedents", "consequences",
                "replacement_behaviors_discussed", "possible_function_clues",
                "medication_health_mentions", "environmental_variables",
                "barriers_to_treatment", "safety_concerns", "follow_up_steps",
                "action_items", "missing_information", "risk_flags",
              ];
              for (const field of structuredFields) {
                if (extracted[field] && (Array.isArray(extracted[field]) ? extracted[field].length > 0 : true)) {
                  await supabase.from("voice_ai_extractions").insert({
                    recording_id,
                    extraction_type: field,
                    json_payload: { items: extracted[field] },
                    confidence_score: 0.85,
                  });
                }
              }

              // Save scalar extractions
              for (const field of ["setting", "reason_for_contact"]) {
                if (extracted[field]) {
                  await supabase.from("voice_ai_extractions").insert({
                    recording_id,
                    extraction_type: field,
                    json_payload: { value: extracted[field] },
                  });
                }
              }

              // Save tasks
              if (extracted.action_items?.length > 0) {
                for (const item of extracted.action_items) {
                  await supabase.from("voice_tasks").insert({
                    recording_id,
                    client_id: recording.client_id || null,
                    task_text: item.task,
                    status: "pending",
                  });
                }
              }
            }
          } else {
            const errText = await extractionRes.text();
            console.error("AI extraction failed:", extractionRes.status, errText);
          }
        } catch (aiErr) {
          console.error("AI extraction error:", aiErr);
        }

        // ── AI Call: Draft Note Generation ──
        try {
          const draftTypes = getDraftTypesForEncounter(encounterType);
          
          for (const draftType of draftTypes) {
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
                    content: `You are an expert ABA clinical documentation writer. Generate a ${draftType.label} based on the transcript below.

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
                    content: `Generate a ${draftType.label} from this transcript:\n\n---\n${fullTranscriptText}\n---`,
                  },
                ],
              }),
            });

            if (draftRes.ok) {
              const draftData = await draftRes.json();
              const content = draftData.choices?.[0]?.message?.content;
              if (content) {
                await supabase.from("voice_ai_drafts").insert({
                  recording_id,
                  draft_type: draftType.key,
                  tone: "clinical",
                  output_language: recording.language_mode === "es" ? "es" : "en",
                  content,
                  model_name: "google/gemini-3-flash-preview",
                });
              }
            }
          }
        } catch (draftErr) {
          console.error("Draft generation error:", draftErr);
        }
      }
    }

    // ── Finalize ──
    await supabase.from("voice_recordings").update({
      status: fullTranscriptText ? "review_ready" : "audio_secured",
      ai_status: fullTranscriptText ? "completed" : "pending",
    }).eq("id", recording_id);

    if (aiRun) {
      await supabase.from("voice_ai_runs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", aiRun.id);
    }

    // Audit
    await supabase.from("voice_audit_log").insert({
      recording_id,
      user_id: userId,
      action_type: "processing_completed",
      metadata_json: { transcript_length: fullTranscriptText.length },
    });

    return new Response(JSON.stringify({
      success: true,
      transcript_length: fullTranscriptText.length,
      status: fullTranscriptText ? "review_ready" : "audio_secured",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Voice capture process error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Returns the draft note types to generate based on encounter type.
 */
function getDraftTypesForEncounter(encounterType: string): Array<{ key: string; label: string }> {
  const base = [
    { key: "narrative_note", label: "Narrative Note" },
  ];

  switch (encounterType) {
    case "quick_note":
      return [{ key: "private_note", label: "Private Note" }];

    case "parent_interview":
      return [
        ...base,
        { key: "fba_parent_interview_paragraph", label: "FBA Parent Interview Paragraph" },
      ];

    case "parent_training":
      return [
        ...base,
        { key: "parent_training_note", label: "Parent Training Note" },
      ];

    case "teacher_consult":
      return [
        ...base,
        { key: "teacher_consult_note", label: "Teacher Consult Note" },
      ];

    case "fba_interview":
      return [
        { key: "fba_parent_interview_paragraph", label: "FBA Interview Paragraph" },
        ...base,
      ];

    case "fba_observation":
      return [
        { key: "fba_observation_paragraph", label: "FBA Observation Paragraph" },
        ...base,
      ];

    case "rbt_supervision":
    case "bcba_supervision":
      return [
        { key: "supervision_note", label: "Supervision Note" },
        ...base,
      ];

    case "direct_session_debrief":
      return [
        { key: "session_note", label: "Session Note" },
        { key: "soap_note", label: "SOAP Note" },
        ...base,
      ];

    case "team_meeting":
      return [
        { key: "team_meeting_summary", label: "Team Meeting Summary" },
      ];

    case "crisis_debrief":
      return [
        { key: "crisis_debrief_note", label: "Crisis Debrief Note" },
        ...base,
      ];

    case "classroom_observation":
      return [
        { key: "fba_observation_paragraph", label: "Observation Paragraph" },
        ...base,
      ];

    case "private_dictation":
    case "personal_admin_note":
      return [{ key: "private_note", label: "Private Note" }];

    case "record_review_dictation":
      return [
        { key: "clinical_summary", label: "Clinical Summary" },
      ];

    default:
      return base;
  }
}
