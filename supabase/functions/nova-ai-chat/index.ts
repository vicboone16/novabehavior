import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Master Copilot System Prompt ──────────────────────────────────────────────
const COPILOT_PROMPT = `You are Nova AI, the primary intelligent assistant inside Nova Track Core.

Your role is to act as a clinical copilot, documentation assistant, and smart data ingestion engine for behavioral and ABA service documentation.

You must preserve all existing capabilities (answering questions, explaining graphs, summarizing profiles, behavioral analysis, clinical insights, navigation help, documentation assistance) while also supporting advanced workflows.

CORE BEHAVIOR — you support multiple request types:
• answering behavior science questions
• explaining graphs or trends
• summarizing client profiles
• assisting with behavioral analysis
• generating clinical insights
• helping users navigate the system
• assisting with documentation
• smart historical data ingestion
• structured behavioral data logging
• ABA SOAP note generation
• narrative note generation
• caregiver note generation
• posting notes to correct locations
• clarifying missing information

INTENT DETECTION — before acting, determine the user's intent from these families:
- general_assistant: question answering, behavioral analysis, explaining data, summarizing info, documentation help, navigation help
- structured_data_ingestion: logging behavior/skill data, converting narrative to structured data
- historical_data_ingestion: ingesting historical or back-entered notes
- soap_note_generation: writing an ABA SOAP note
- narrative_note_generation: writing a narrative session note
- caregiver_note_generation: writing a caregiver communication note
- note_posting: routing a note to session/narrative/caregiver pages
- combined_workflow: note generation AND data logging together

If intent confidence is low, stay in general assistant mode and offer action suggestions.

WHEN CLIENT CONTEXT IS PROVIDED:
Use the client context to match behaviors/skills to existing targets. Always attempt to match existing targets before suggesting new ones.

TARGET MATCHING ORDER:
1. exact target name match
2. alias match
3. close lexical match
4. semantic similarity match
5. historical client-specific usage patterns

Match statuses: matched_existing_target, matched_existing_target_via_alias, ambiguous_match_review_needed, no_match_new_target_suggested

SMART DATA EXTRACTION — when user provides narrative behavioral info, extract:
- behavior name, skill/program name
- measurement type (frequency, duration, latency, interval, trial_based, abc, rate)
- counts, durations, latencies, rates
- prompting levels
- session date, start/end times
- antecedent/consequence for ABC data
- caregiver updates

MEASUREMENT CLASSIFICATION:
- Frequency: "3 times", "4 instances", "twice"
- Duration: "lasted 10 minutes", "from 10:02 to 10:15"
- Latency: "took 2 minutes to comply", "latency was 45 seconds"
- Interval: "occurred in 8 of 10 intervals", "present during 75% of intervals"
- Trial-based: "8/10 correct", "3 of 5 independent", "required gestural prompts"
- ABC: "Antecedent… Behavior… Consequence…"

DATA NORMALIZATION:
- Duration → canonical seconds
- Latency → canonical seconds
- Trial accuracy → percent + raw numerator/denominator
- Interval occurrence → percent + raw intervals
- If count and observation window exist, calculate rate (per minute and per hour)
- Preserve both raw and derived values; mark derived values with is_derived=true

CLARIFICATION RULES — ask only when missing info affects:
- client assignment, session assignment, target matching
- measurement type, graph accuracy, note validity, posting destination
Do NOT interrupt for trivial details that can be inferred.

SOAP NOTE STRUCTURE:
S — Subjective: caregiver report, client presentation, environmental factors, sleep/medication/illness/routine changes
O — Objective: session duration, services delivered, programs targeted, behavior data, prompting levels, measurable performance, interventions used
A — Assessment: clinical interpretation, progress status, barriers, behavior trends, regulation/tolerance, function patterns
P — Plan: next steps, target modifications, caregiver collaboration, follow-up recommendations

IMPORTANT RULES:
- Never provide medical advice or diagnoses
- Never fabricate numerical data
- Distinguish caregiver report from observed facts
- Use person-first language unless identity-first is preferred
- Maintain HIPAA-appropriate language
- Always recommend consulting qualified professionals for complex cases
- Label missing info clearly; allow draft mode
- Do not auto-create behavior targets silently — suggest and let user confirm
- Preserve raw input text for auditability
- Support one input generating multiple structured entries and/or notes
- After generating notes or data, suggest correct posting destination
- Support combined workflows: data + note in one action

RESPONSE FORMAT:
When using tools, provide a natural language summary explaining what you found/extracted/generated. The tool calls provide the structured data — your text response should be conversational and helpful, summarizing the extracted items, noting any ambiguities, and offering available actions.

When NOT using tools (general assistant mode), respond naturally as you always have with clear markdown formatting.`;

// ── Tool definitions matching the full JSON contract ──────────────────────────
const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "extract_structured_data",
      description: "Extract structured behavioral/clinical data from user input. Call this when the user provides session data, behavior counts, skill trial data, ABC events, or historical notes that should be logged as structured data. Each behavior, skill, or ABC event should be a separate item in the arrays.",
      parameters: {
        type: "object",
        properties: {
          intent: { type: "string", enum: ["structured_data_ingestion", "historical_data_ingestion", "combined_workflow"] },
          intent_confidence: { type: "number", description: "0-1 confidence in intent classification" },
          session_date: { type: "string", description: "ISO date YYYY-MM-DD" },
          session_start: { type: "string", description: "HH:MM format" },
          session_end: { type: "string", description: "HH:MM format" },
          setting: { type: "string", description: "Location/setting if mentioned" },
          behaviors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item_id: { type: "string", description: "Temporary ID like temp-item-1" },
                item_type: { type: "string", enum: ["behavior_event", "skill_trial", "abc_event", "skill_or_behavior_measure"] },
                raw_text: { type: "string", description: "Original text describing this item" },
                target_match: {
                  type: "object",
                  properties: {
                    match_status: { type: "string", enum: ["matched_existing_target", "matched_existing_target_via_alias", "ambiguous_match_review_needed", "no_match_new_target_suggested"] },
                    target_id: { type: "string", description: "ID of matched existing target, or null" },
                    target_name: { type: "string" },
                    target_type: { type: "string", enum: ["behavior", "skill", "replacement_behavior", "routine", "other"] },
                    match_method: { type: "string", enum: ["exact_name", "alias_match", "semantic_similarity", "ambiguous"] },
                    match_confidence: { type: "number" },
                    alias_used: { type: "string" },
                    new_target_suggested: { type: "boolean" }
                  },
                  required: ["match_status", "target_type", "match_confidence"]
                },
                measurement: {
                  type: "object",
                  properties: {
                    measurement_type: { type: "string", enum: ["frequency", "duration", "latency", "interval", "trial_based", "abc", "rate"] },
                    raw_value_text: { type: "string" },
                    frequency_count: { type: "number" },
                    duration_seconds: { type: "number" },
                    latency_seconds: { type: "number" },
                    interval_occurrence: { type: "number" },
                    interval_total: { type: "number" },
                    trial_correct: { type: "number" },
                    trial_total: { type: "number" },
                    percent_value: { type: "number" },
                    observation_window_minutes: { type: "number" },
                    rate_per_minute: { type: "number" },
                    rate_per_hour: { type: "number" },
                    is_derived: { type: "boolean" }
                  },
                  required: ["measurement_type"]
                },
                prompting: {
                  type: "object",
                  properties: {
                    prompt_level: { type: "string" },
                    independence_level: { type: "string" }
                  }
                },
                context: {
                  type: "object",
                  properties: {
                    antecedent: { type: "string" },
                    behavior_description: { type: "string" },
                    consequence: { type: "string" },
                    perceived_function: { type: "string" },
                    notes: { type: "string" }
                  }
                },
                quality: {
                  type: "object",
                  properties: {
                    confidence: { type: "number" },
                    is_inferred: { type: "boolean" },
                    needs_review: { type: "boolean" },
                    warning_codes: { type: "array", items: { type: "string" } }
                  },
                  required: ["confidence"]
                }
              },
              required: ["item_id", "item_type", "raw_text", "target_match", "measurement", "quality"]
            }
          },
          caregiver_updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                raw_text: { type: "string" },
                topic: { type: "string" },
                summary: { type: "string" },
                confidence: { type: "number" }
              },
              required: ["raw_text", "summary"]
            }
          },
          suggested_new_targets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                proposed_name: { type: "string" },
                proposed_type: { type: "string", enum: ["behavior", "skill", "replacement_behavior"] },
                proposed_measurement_type: { type: "string" },
                operational_definition_draft: { type: "string" },
                source_phrase: { type: "string" },
                confidence: { type: "number" }
              },
              required: ["proposed_name", "proposed_type"]
            }
          },
          graph_updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                target_id: { type: "string" },
                graph_type: { type: "string", enum: ["frequency", "duration", "latency", "interval", "trial_based", "abc_timeline", "rate"] },
                trigger_recalculation: { type: "boolean" }
              }
            }
          }
        },
        required: ["behaviors"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_soap_note",
      description: "Generate a professional ABA SOAP note. Use when the user asks for a SOAP note or when enough session information is available. Distinguish subjective caregiver report from objective observation. Do not fabricate numerical data.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string", description: "Temporary ID like temp-note-1" },
          session_date: { type: "string" },
          session_duration_minutes: { type: "number" },
          content: {
            type: "object",
            properties: {
              subjective: { type: "string", description: "S: caregiver report, client presentation, environmental factors" },
              objective: { type: "string", description: "O: session details, measurable data, interventions" },
              assessment: { type: "string", description: "A: clinical interpretation, progress, barriers" },
              plan: { type: "string", description: "P: next steps, modifications, follow-up" }
            },
            required: ["subjective", "objective", "assessment", "plan"]
          },
          quality: {
            type: "object",
            properties: {
              confidence: { type: "number" },
              needs_review: { type: "boolean" },
              is_incomplete: { type: "boolean" },
              missing_info: { type: "array", items: { type: "string" } },
              warning_codes: { type: "array", items: { type: "string" } }
            }
          },
          posting_recommendation: {
            type: "object",
            properties: {
              recommended_destination: { type: "string", enum: ["session_notes", "narrative_notes", "caregiver_notes", "client_timeline"] },
              confidence: { type: "number" },
              reason: { type: "string" }
            }
          }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_narrative_note",
      description: "Generate a narrative session note (less formal than SOAP). Use for session summaries, incident summaries, service summaries, or historical reconstruction notes.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string" },
          session_date: { type: "string" },
          note_subtype: { type: "string", enum: ["session_summary", "incident_summary", "service_summary", "historical_reconstruction"] },
          content: {
            type: "object",
            properties: {
              body: { type: "string", description: "Full narrative note content" }
            },
            required: ["body"]
          },
          quality: {
            type: "object",
            properties: {
              confidence: { type: "number" },
              needs_review: { type: "boolean" },
              is_incomplete: { type: "boolean" },
              warning_codes: { type: "array", items: { type: "string" } }
            }
          },
          posting_recommendation: {
            type: "object",
            properties: {
              recommended_destination: { type: "string", enum: ["session_notes", "narrative_notes", "client_timeline"] },
              confidence: { type: "number" },
              reason: { type: "string" }
            }
          }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_caregiver_note",
      description: "Generate a caregiver communication note focused on updates received from or shared with caregivers, home concerns, recommendations, and follow-up points.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string" },
          note_date: { type: "string" },
          content: {
            type: "object",
            properties: {
              body: { type: "string", description: "Full caregiver note content" }
            },
            required: ["body"]
          },
          tags: { type: "array", items: { type: "string" }, description: "Tags like parent_update, home_concern, recommendation, sleep, medication" },
          quality: {
            type: "object",
            properties: {
              confidence: { type: "number" },
              needs_review: { type: "boolean" },
              is_incomplete: { type: "boolean" },
              warning_codes: { type: "array", items: { type: "string" } }
            }
          },
          posting_recommendation: {
            type: "object",
            properties: {
              recommended_destination: { type: "string", enum: ["caregiver_notes", "session_notes", "client_timeline"] },
              confidence: { type: "number" },
              reason: { type: "string" }
            }
          }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_clarification",
      description: "Ask the user targeted clarifying questions when critical information is missing or ambiguous. Only use when the missing info materially affects client assignment, session assignment, target matching, measurement type, graph accuracy, note validity, or posting destination.",
      parameters: {
        type: "object",
        properties: {
          reason_codes: {
            type: "array",
            items: { type: "string" },
            description: "Codes like missing_session_date, ambiguous_target_match, missing_client, unclear_measurement_type, unclear_posting_destination"
          },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_id: { type: "string" },
                question_text: { type: "string" },
                question_type: { type: "string", enum: ["date", "target_choice", "measurement_type", "destination", "yes_no", "free_text"] },
                required: { type: "boolean" },
                options: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      target_id: { type: "string" }
                    },
                    required: ["label"]
                  }
                },
                applies_to_item_ids: { type: "array", items: { type: "string" } }
              },
              required: ["question_id", "question_text", "question_type"]
            }
          }
        },
        required: ["questions"]
      }
    }
  }
];

// ── Client context loader ─────────────────────────────────────────────────────
async function loadClientContext(supabase: any, clientId: string): Promise<string> {
  const parts: string[] = [];

  // Student profile
  const { data: student } = await supabase
    .from("students")
    .select("id, name, date_of_birth, grade, school, behaviors, narrative_notes, case_types")
    .eq("id", clientId)
    .single();

  if (!student) return "\n\n[CLIENT CONTEXT: Student not found]";

  parts.push(`CLIENT: ${student.name} (ID: ${student.id})`);
  if (student.date_of_birth) parts.push(`DOB: ${student.date_of_birth}`);
  if (student.grade) parts.push(`Grade: ${student.grade}`);
  if (student.school) parts.push(`School: ${student.school}`);

  // Active behavior targets
  const { data: targets } = await supabase
    .from("student_targets")
    .select("id, title, description, data_collection_type, status, mastery_status, target_id")
    .eq("student_id", clientId)
    .in("status", ["active", "archived"])
    .limit(50);

  if (targets?.length) {
    const active = targets.filter((t: any) => t.status === "active");
    const archived = targets.filter((t: any) => t.status === "archived");

    if (active.length) {
      parts.push("\nACTIVE TARGETS (use these for matching first):");
      for (const t of active) {
        parts.push(`- [ID:${t.id}] "${t.title}" type=${t.data_collection_type || "unspecified"} mastery=${t.mastery_status || "in_progress"}`);
        if (t.description) parts.push(`  Description: ${t.description.slice(0, 100)}`);
      }
    }
    if (archived.length) {
      parts.push("\nARCHIVED TARGETS (can match if reactivation needed):");
      for (const t of archived.slice(0, 10)) {
        parts.push(`- [ID:${t.id}] "${t.title}" type=${t.data_collection_type || "unspecified"}`);
      }
    }
  }

  // Existing behaviors from student JSON (includes aliases)
  if (student.behaviors && Array.isArray(student.behaviors)) {
    const behaviorList = student.behaviors
      .filter((b: any) => b && b.name)
      .map((b: any) => {
        let entry = `"${b.name}"`;
        if (b.aliases?.length) entry += ` (aliases: ${b.aliases.join(", ")})`;
        if (b.id) entry += ` [behaviorId:${b.id}]`;
        return entry;
      })
      .slice(0, 30);
    if (behaviorList.length) {
      parts.push("\nBEHAVIOR DEFINITIONS (with aliases for matching):");
      parts.push(behaviorList.join("\n"));
    }
  }

  // Recent behavior session data (last 5 sessions worth)
  const { data: recentData } = await supabase
    .from("behavior_session_data")
    .select("session_id, behavior_id, frequency, duration_total, observation_minutes, data_state, created_at")
    .eq("student_id", clientId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (recentData?.length) {
    parts.push("\nRECENT SESSION DATA (for trend context):");
    for (const d of recentData.slice(0, 15)) {
      const metrics = [];
      if (d.frequency != null) metrics.push(`freq=${d.frequency}`);
      if (d.duration_total != null) metrics.push(`dur=${d.duration_total}s`);
      if (d.observation_minutes) metrics.push(`obs=${d.observation_minutes}min`);
      parts.push(`- behavior_id:${d.behavior_id} ${metrics.join(", ")} state=${d.data_state} date=${d.created_at?.slice(0, 10)}`);
    }
  }

  // Recent enhanced session notes (last 3)
  const { data: recentNotes } = await supabase
    .from("enhanced_session_notes")
    .select("note_type, subtype, note_content, start_time, status")
    .eq("student_id", clientId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (recentNotes?.length) {
    parts.push("\nRECENT SESSION NOTES:");
    for (const n of recentNotes) {
      const content = typeof n.note_content === "object" ? JSON.stringify(n.note_content).slice(0, 200) : String(n.note_content).slice(0, 200);
      parts.push(`- [${n.note_type}/${n.subtype}] status=${n.status} ${content}...`);
    }
  }

  // Recent caregiver notes
  const { data: caregiverNotes } = await supabase
    .from("caregiver_notes")
    .select("content, note_date, tags")
    .eq("student_id", clientId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (caregiverNotes?.length) {
    parts.push("\nRECENT CAREGIVER NOTES:");
    for (const cn of caregiverNotes) {
      parts.push(`- [${cn.note_date}] tags=${(cn.tags || []).join(",")} ${cn.content?.slice(0, 150)}...`);
    }
  }

  return "\n\n--- CLIENT CONTEXT ---\n" + parts.join("\n") + "\n--- END CLIENT CONTEXT ---";
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !data?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, evidence_mode, client_id, system_suffix } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt
    let systemContent = COPILOT_PROMPT;

    if (evidence_mode) {
      systemContent += "\n\nEVIDENCE MODE IS ENABLED. Include detailed citations, journal references, and research summaries. Reference seminal ABA literature (Cooper, Heron & Heward; Baer, Wolf & Risley; JABA publications) and current peer-reviewed sources.";
    }

    if (system_suffix) {
      systemContent += "\n\n" + system_suffix;
    }

    // Load client context if provided
    if (client_id) {
      try {
        const contextBlock = await loadClientContext(supabase, client_id);
        systemContent += contextBlock;
        systemContent += `\n\nIMPORTANT: A client is selected (ID: ${client_id}). When the user's request involves clinical data, notes, or documentation:
1. Use the available tools to provide structured output
2. Match behaviors/skills to the ACTIVE TARGETS listed above using target IDs
3. For each extracted item, include a target_match with the matched target's ID and name
4. If a behavior name matches an alias, use match_status=matched_existing_target_via_alias
5. If ambiguous, use match_status=ambiguous_match_review_needed and explain in your response
6. If no match, use match_status=no_match_new_target_suggested
7. Include quality.confidence scores for each item
8. For combined workflows, call both extract_structured_data AND the appropriate note generation tool
9. Always include posting_recommendation with each generated note`;
      } catch (e) {
        console.error("Failed to load client context:", e);
      }
    } else {
      systemContent += "\n\nNo client is currently selected. If the user asks you to log data, write a session note, or perform client-specific actions, remind them to select a client first. You can still answer general behavior science questions, provide clinical guidance, and assist with documentation.";
    }

    // Build request body — include tools only when client is selected
    const requestBody: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
      stream: true,
    };

    if (client_id) {
      requestBody.tools = TOOL_DEFINITIONS;
      requestBody.tool_choice = "auto";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits depleted. Please add credits in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseBody = response.body;
    if (!responseBody) {
      throw new Error("No response body from AI gateway");
    }

    // Collect streamed response and detect tool calls
    const reader = responseBody.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let toolCalls: any[] = [];
    let hasToolCalls = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const choice = parsed.choices?.[0];
          if (choice?.delta?.content) {
            fullContent += choice.delta.content;
          }
          if (choice?.delta?.tool_calls) {
            hasToolCalls = true;
            for (const tc of choice.delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCalls[idx]) {
                toolCalls[idx] = { id: tc.id || "", function: { name: "", arguments: "" } };
              }
              if (tc.function?.name) toolCalls[idx].function.name = tc.function.name;
              if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
              if (tc.id) toolCalls[idx].id = tc.id;
            }
          }
        } catch {
          // partial JSON, skip
        }
      }
    }

    // Build final response with embedded tool call data as action markers
    let finalContent = fullContent;

    if (hasToolCalls && toolCalls.length > 0) {
      for (const tc of toolCalls) {
        try {
          const args = JSON.parse(tc.function.arguments);
          const marker = `\n\n<!--NOVA_ACTION:${JSON.stringify({ type: tc.function.name, data: args })}-->`;
          finalContent += marker;
        } catch (e) {
          console.error("Failed to parse tool call arguments:", e);
        }
      }
    }

    // Create SSE stream with final content
    const encoder = new TextEncoder();
    const sseData = `data: ${JSON.stringify({
      choices: [{ delta: { content: finalContent }, index: 0, finish_reason: "stop" }]
    })}\n\ndata: [DONE]\n\n`;

    return new Response(encoder.encode(sseData), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nova-ai-chat error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
