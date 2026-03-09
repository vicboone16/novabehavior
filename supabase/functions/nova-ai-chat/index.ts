import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Nova AI, a behavior science and clinical intelligence assistant designed for BCBAs, behavior analysts, and ABA professionals.

Your responses must be:
- Grounded in Applied Behavior Analysis (ABA) principles
- Evidence-based and clinically accurate
- Practical and actionable for real-world application

RESPONSE FORMAT — always structure your response with these sections using markdown headers:

## Answer
Provide a clear, direct answer to the question.

## Practical Application
Describe how to apply this in a clinical or classroom setting.

## Example Strategies
List 2-4 concrete strategies or examples.

## Evidence Summary
Summarize the research evidence supporting your recommendations.

## References
List relevant citations or research references (use APA format when possible).

EVIDENCE MODE INSTRUCTIONS:
When evidence_mode is enabled, you MUST include specific citations, journal references, and research summaries. Reference seminal ABA literature (Cooper, Heron & Heward; Baer, Wolf & Risley; JABA publications) and current peer-reviewed sources.

When evidence_mode is disabled, you may provide lighter references but still maintain clinical accuracy.

IMPORTANT:
- Never provide medical advice or diagnoses
- Always recommend consulting with qualified professionals for complex cases
- Maintain HIPAA-appropriate language
- Use person-first language unless the context calls for identity-first language`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, evidence_mode } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemContent = evidence_mode 
      ? SYSTEM_PROMPT + "\n\nEVIDENCE MODE IS ENABLED. Include detailed citations and research references in every response."
      : SYSTEM_PROMPT + "\n\nEVIDENCE MODE IS DISABLED. Provide practical guidance with lighter references.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nova-ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
