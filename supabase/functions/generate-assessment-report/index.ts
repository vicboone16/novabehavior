import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DomainScore {
  domain: string;
  raw: number;
  max: number;
  percent: number;
  status: string;
}

interface ReportRequest {
  assessmentType: "vbmapp" | "ablls-r" | "afls";
  aflsModule?: string;
  studentName: string;
  studentAge: string;
  domainScores: DomainScore[];
  overallMastery: number;
  strengths: string[];
  priorities: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ReportRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { assessmentType, aflsModule, studentName, studentAge, domainScores, overallMastery, strengths, priorities } = body;

    const assessmentLabel =
      assessmentType === "vbmapp"
        ? "Verbal Behavior Milestones Assessment and Placement Program (VB-MAPP)"
        : assessmentType === "ablls-r"
        ? "Assessment of Basic Language and Learning Skills – Revised (ABLLS-R)"
        : `Assessment of Functional Living Skills (AFLS) – ${aflsModule || "module"}`;

    const domainSummary = domainScores
      .map(
        (d) =>
          `- ${d.domain}: raw score ${d.raw}/${d.max} (${d.percent}% mastery) [${d.status}]`
      )
      .join("\n");

    const systemPrompt = `You are a Board Certified Behavior Analyst (BCBA) writing a clinical assessment report. Write in third-person, professional clinical language. Reference specific scores and percentages. Be concise but thorough.`;

    const userPrompt = `Generate clinical narratives for a ${assessmentLabel} evaluation.

Student: ${studentName}, Age: ${studentAge}
Overall Mastery: ${overallMastery}%

Domain Scores:
${domainSummary}

Strengths: ${strengths.join(", ") || "None identified yet"}
Priority Areas: ${priorities.join(", ") || "None identified yet"}

Please provide a JSON response using the suggest_report_content tool with:
1. domainNarratives: For each domain listed above, write 2-3 sentences explaining what the score means functionally for this student. Use the exact domain name as the key.
2. summary: A comprehensive clinical summary paragraph (4-6 sentences) covering overall performance, notable strengths, and areas of concern.
3. recommendations: An array of 4-8 specific, actionable clinical recommendations based on the priority areas and scores. Each recommendation should be a complete sentence.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_report_content",
                description:
                  "Return domain narratives, summary, and recommendations for the assessment report.",
                parameters: {
                  type: "object",
                  properties: {
                    domainNarratives: {
                      type: "object",
                      description:
                        "Key-value pairs where key is domain name and value is a 2-3 sentence clinical narrative",
                      additionalProperties: { type: "string" },
                    },
                    summary: {
                      type: "string",
                      description:
                        "A comprehensive clinical summary paragraph (4-6 sentences)",
                    },
                    recommendations: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "4-8 specific, actionable clinical recommendations",
                    },
                  },
                  required: [
                    "domainNarratives",
                    "summary",
                    "recommendations",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_report_content" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content;
      return new Response(
        JSON.stringify({ error: "No structured output received", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-assessment-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
