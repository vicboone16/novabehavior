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

INTENT DETECTION — before acting, determine the user's intent:
- GENERAL: question answering, behavioral analysis, explaining data, summarizing info
- DATA_ENTRY: logging behavior/skill data, ingesting historical notes, converting narrative to structured data
- SOAP_NOTE: writing an ABA SOAP note
- NARRATIVE_NOTE: writing a narrative session note
- CAREGIVER_NOTE: writing a caregiver communication note
- COMBINED: note generation AND data logging together

If intent is unclear or confidence is low, stay in general assistant mode and offer actions.

WHEN CLIENT CONTEXT IS PROVIDED:
Use the client context to match behaviors/skills to existing targets. Always attempt to match existing targets before suggesting new ones.

SMART DATA EXTRACTION — when user provides narrative behavioral info, extract:
- behavior name, skill/program name
- measurement type (frequency, duration, latency, interval, trial-based, ABC)
- counts, durations, latencies, rates
- prompting levels
- session date, start/end times
- antecedent/consequence for ABC data
- caregiver updates

MEASUREMENT CLASSIFICATION:
- Frequency: "3 times", "4 instances"
- Duration: "lasted 10 minutes"
- Latency: "took 2 minutes to begin"
- Interval: "occurred in 8 of 10 intervals"
- Trial-based: "8/10 correct"
- ABC: "Antecedent… Behavior… Consequence…"

CLARIFICATION RULES — ask only when missing info affects:
- data accuracy, graph accuracy, target matching
- note validity, posting destination, client linkage
Do NOT interrupt for trivial details that can be inferred.

SOAP NOTE STRUCTURE:
S — Subjective: caregiver report, client presentation, environmental factors
O — Objective: services delivered, session duration, programs targeted, behavior data, prompting, measurable performance
A — Assessment: clinical interpretation, progress status, barriers, behavior trends
P — Plan: next steps, target modifications, caregiver collaboration, follow-up

IMPORTANT RULES:
- Never provide medical advice or diagnoses
- Never fabricate numerical data
- Distinguish caregiver report from observed facts
- Use person-first language unless identity-first is preferred
- Maintain HIPAA-appropriate language
- Always recommend consulting qualified professionals for complex cases
- Label missing info clearly; allow draft mode
- Do not auto-create behavior targets silently`;

// ── Tool definitions for structured output ────────────────────────────────────
const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "extract_structured_data",
      description: "Extract structured behavioral/clinical data from user input. Call this when the user provides session data, behavior counts, skill trial data, or historical notes that should be logged as structured data.",
      parameters: {
        type: "object",
        properties: {
          session_date: { type: "string", description: "ISO date string (YYYY-MM-DD)" },
          session_start: { type: "string", description: "HH:MM format" },
          session_end: { type: "string", description: "HH:MM format" },
          behaviors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                matched_target_id: { type: "string", description: "ID of matched existing target, or null" },
                measurement_type: { type: "string", enum: ["frequency", "duration", "latency", "interval", "rate"] },
                value: { type: "number" },
                unit: { type: "string" },
                confidence: { type: "number", description: "0-1 confidence in target match" }
              },
              required: ["name", "measurement_type", "value"]
            }
          },
          skills: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                matched_target_id: { type: "string", description: "ID of matched existing target, or null" },
                trials_correct: { type: "number" },
                trials_total: { type: "number" },
                prompt_level: { type: "string" },
                confidence: { type: "number" }
              },
              required: ["name"]
            }
          },
          abc_events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                antecedent: { type: "string" },
                behavior: { type: "string" },
                consequence: { type: "string" }
              },
              required: ["antecedent", "behavior", "consequence"]
            }
          },
          caregiver_updates: {
            type: "array",
            items: { type: "string" }
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
      description: "Generate a professional ABA SOAP note from the session information provided.",
      parameters: {
        type: "object",
        properties: {
          subjective: { type: "string", description: "S section: caregiver report, client presentation" },
          objective: { type: "string", description: "O section: session details, measurable data" },
          assessment: { type: "string", description: "A section: clinical interpretation" },
          plan: { type: "string", description: "P section: next steps" },
          session_date: { type: "string" },
          session_duration_minutes: { type: "number" },
          missing_info: { type: "array", items: { type: "string" }, description: "Info that was missing and inferred or omitted" }
        },
        required: ["subjective", "objective", "assessment", "plan"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_narrative_note",
      description: "Generate a narrative session note (less formal than SOAP).",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Full narrative note content" },
          session_date: { type: "string" },
          note_type: { type: "string", enum: ["session_summary", "incident_summary", "service_summary", "historical_reconstruction"] }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_caregiver_note",
      description: "Generate a caregiver communication note.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Full caregiver note content" },
          note_date: { type: "string" },
          tags: { type: "array", items: { type: "string" }, description: "Tags like 'parent_update', 'home_concern', 'recommendation'" }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_clarification",
      description: "Ask the user targeted clarifying questions when critical information is missing or ambiguous. Only use when the missing info materially affects data accuracy, note validity, target matching, or posting destination.",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" }, description: "Suggested answers if applicable" }
              },
              required: ["question"]
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

  parts.push(`CLIENT: ${student.name}`);
  if (student.date_of_birth) parts.push(`DOB: ${student.date_of_birth}`);
  if (student.grade) parts.push(`Grade: ${student.grade}`);
  if (student.school) parts.push(`School: ${student.school}`);

  // Active behavior targets
  const { data: targets } = await supabase
    .from("student_targets")
    .select("id, title, description, data_collection_type, status, mastery_status")
    .eq("student_id", clientId)
    .eq("status", "active")
    .limit(30);

  if (targets?.length) {
    parts.push("\nACTIVE TARGETS:");
    for (const t of targets) {
      parts.push(`- [${t.id}] ${t.title} (${t.data_collection_type || "unspecified"}) — mastery: ${t.mastery_status || "in_progress"}`);
    }
  }

  // Existing behaviors from student JSON
  if (student.behaviors && Array.isArray(student.behaviors)) {
    const behaviorNames = student.behaviors
      .filter((b: any) => b && b.name)
      .map((b: any) => `${b.name}${b.aliases ? ` (aliases: ${b.aliases.join(", ")})` : ""}`)
      .slice(0, 20);
    if (behaviorNames.length) {
      parts.push("\nBEHAVIOR DEFINITIONS:");
      parts.push(behaviorNames.join("; "));
    }
  }

  // Recent behavior session data (last 5 sessions)
  const { data: recentData } = await supabase
    .from("behavior_session_data")
    .select("session_id, behavior_id, frequency, duration_total, observation_minutes, data_state, created_at")
    .eq("student_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (recentData?.length) {
    parts.push("\nRECENT SESSION DATA (latest):");
    for (const d of recentData.slice(0, 10)) {
      const metrics = [];
      if (d.frequency != null) metrics.push(`freq=${d.frequency}`);
      if (d.duration_total != null) metrics.push(`dur=${d.duration_total}s`);
      if (d.observation_minutes) metrics.push(`obs=${d.observation_minutes}min`);
      parts.push(`- behavior_id:${d.behavior_id} ${metrics.join(", ")} (${d.data_state})`);
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
      parts.push(`- [${n.note_type}/${n.subtype}] ${content}...`);
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
        systemContent += "\n\nIMPORTANT: A client is selected. When the user's request involves clinical data, notes, or documentation, use the available tools to provide structured output that can be saved. Match behaviors/skills to the ACTIVE TARGETS listed above.";
      } catch (e) {
        console.error("Failed to load client context:", e);
      }
    } else {
      systemContent += "\n\nNo client is currently selected. If the user asks you to log data, write a session note, or perform client-specific actions, remind them to select a client first.";
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

    // For streaming with tool calls, we need to collect tool calls then process them
    // The gateway streams SSE — we pass through but also intercept tool_calls
    // Strategy: collect the full response, check for tool_calls, then either:
    //   a) stream content directly (no tool calls)
    //   b) process tool calls and create a combined response

    const responseBody = response.body;
    if (!responseBody) {
      throw new Error("No response body from AI gateway");
    }

    // We'll collect streamed chunks to detect tool calls
    const reader = responseBody.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let toolCalls: any[] = [];
    let hasToolCalls = false;
    const allChunks: string[] = [];

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
          allChunks.push(line + "\n");
        } catch {
          // partial JSON, skip
        }
      }
    }

    // Build final response with embedded tool call data
    let finalContent = fullContent;

    if (hasToolCalls && toolCalls.length > 0) {
      // Embed tool call results as parseable markers in the response
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

    // Create a new SSE stream with the final content
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
