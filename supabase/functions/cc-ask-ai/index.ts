import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { recording_id, org_id, transcript_id, question } = await req.json();
    if (!recording_id || !org_id || !question) {
      return new Response(JSON.stringify({ error: "recording_id, org_id, and question required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate access
    const { data: recording, error: recErr } = await supabase
      .from("voice_recordings")
      .select("id, org_id")
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
      return new Response(JSON.stringify({ answer: "No transcript available. Process the recording first." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load extractions for grounding context
    const { data: extractions } = await supabase.from("voice_ai_extractions").select("extraction_type, json_payload").eq("recording_id", recording_id);
    const extractionContext = extractions?.map(e => `[${e.extraction_type}]: ${JSON.stringify(e.json_payload)}`).join("\n") || "";

    // Save question
    const { data: savedQ } = await supabase.from("voice_ai_questions").insert({
      recording_id,
      asked_by: userId,
      question_text: question,
    }).select().single();

    // Generate answer
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
            content: `You are Nova AI Clinical Capture, an ABA-specific clinical assistant. Answer questions grounded in the provided transcript and extractions.

RULES:
- Only reference information present in the transcript
- Clearly distinguish: directly stated, observed, and inferred
- Mark uncertain conclusions with qualifying language ("possibly", "appears to")
- If information is not in the transcript, say so clearly — do NOT invent
- Use clinical, professional language
- Be concise but thorough
- When citing transcript content, reference approximate timestamps or speaker turns when available`,
          },
          {
            role: "user",
            content: `TRANSCRIPT:\n---\n${trans.full_text}\n---\n\nEXTRACTIONS:\n${extractionContext}\n\nQUESTION: ${question}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "grounded_answer",
            description: "Provide a transcript-grounded answer with evidence citations",
            parameters: {
              type: "object",
              properties: {
                answer_text: { type: "string", description: "The complete answer" },
                evidence_type: { type: "string", enum: ["directly_stated", "observed", "inferred", "not_in_transcript", "mixed"] },
                supporting_quotes: { type: "array", items: { type: "string" }, description: "Direct quotes from transcript supporting the answer" },
                confidence: { type: "number", description: "0-1 confidence in the answer" },
                missing_info: { type: "array", items: { type: "string" }, description: "Information that would help answer but is not in transcript" },
              },
              required: ["answer_text", "evidence_type", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "grounded_answer" } },
      }),
    });

    let answer = "Unable to generate response.";
    let groundingJson: Record<string, unknown> = {};

    if (qaRes.ok) {
      const qaData = await qaRes.json();
      const toolCall = qaData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          answer = parsed.answer_text || answer;
          groundingJson = {
            evidence_type: parsed.evidence_type,
            supporting_quotes: parsed.supporting_quotes,
            confidence: parsed.confidence,
            missing_info: parsed.missing_info,
          };
        } catch {
          answer = qaData.choices?.[0]?.message?.content || answer;
        }
      } else {
        answer = qaData.choices?.[0]?.message?.content || answer;
      }
    } else {
      const status = qaRes.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Save answer
    let answerId: string | null = null;
    if (savedQ) {
      const { data: savedA } = await supabase.from("voice_ai_answers").insert({
        question_id: savedQ.id,
        answer_text: answer,
        model_name: "google/gemini-3-flash-preview",
        grounding_json: groundingJson,
      }).select("id").single();
      answerId = savedA?.id || null;
    }

    return new Response(JSON.stringify({
      question_id: savedQ?.id,
      answer_id: answerId,
      answer_text: answer,
      grounding: groundingJson,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("cc-ask-ai error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
