import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DomainScore {
  domain_key: string;
  domain_name: string;
  standard_score: number | null;
  percentile: number | null;
  adaptive_level: string | null;
  v_scale_sum: number | null;
}

interface SubdomainScore {
  domain_key: string;
  domain_name: string;
  subdomain_key: string;
  subdomain_name: string;
  raw_score: number | null;
  v_scale_score: number | null;
  age_equivalent: string | null;
  gsv: number | null;
}

interface ReportRequest {
  report_type: "domain_level" | "comprehensive";
  output_context?: "adaptive_summary" | "iep_present_levels" | "fba_summary" | "reassessment" | "full_report";
  student_name: string;
  student_id_display?: string;
  gender?: string;
  birth_date: string;
  age_display: string;
  test_date: string;
  respondent_name?: string;
  respondent_relationship?: string;
  examiner_name?: string;
  administration_language?: string;
  form_name: string;
  abc_standard_score: number | null;
  abc_percentile: number | null;
  abc_adaptive_level: string | null;
  domain_scores: DomainScore[];
  subdomain_scores: SubdomainScore[];
  prior_abc_score?: number | null;
  prior_test_date?: string;
}

function getAdaptiveInterpretation(ss: number | null): string {
  if (ss == null) return "adaptive functioning could not be determined";
  if (ss >= 115) return "above average adaptive functioning";
  if (ss >= 86) return "generally adequate adaptive functioning";
  if (ss >= 71) return "moderately low adaptive functioning, suggesting some support needs across daily activities";
  return "significantly delayed adaptive functioning, indicating substantial support needs across daily activities";
}

const SYSTEM_PROMPT = `You are a clinical report writer for ABA and adaptive behavior assessments.
Generate professional narrative sections for a Vineland Adaptive Behavior Scales, Third Edition (Vineland-3) report.

Guidelines:
- Use clinical, professional language appropriate for ABA reassessments, school reports, and adaptive behavior summaries
- Describe adaptive functioning cautiously and accurately
- Use percentile rank and standard score language correctly (Mean=100, SD=15 for domains/composite; Mean=15, SD=3 for v-scale)
- Identify relative strengths and weaknesses ONLY when supported by score comparisons (at least 1 SD difference)
- Generate domain interpretation paragraphs using scored data
- Avoid exaggerated conclusions or diagnostic statements
- Use person-first language
- Reference the respondent by name and relationship when available
- Use CAPITALIZED section headings

Return ONLY valid JSON. No markdown wrapping.`;

function buildPromptForContext(body: ReportRequest): { userPrompt: string; responseSchema: string } {
  const scoreSummary = `
Student: ${body.student_name}
Age: ${body.age_display}
Test Date: ${body.test_date}
Form: ${body.form_name}
Respondent: ${body.respondent_name || "Not specified"} (${body.respondent_relationship || "Not specified"})
Examiner: ${body.examiner_name || "Not specified"}

Adaptive Behavior Composite: SS=${body.abc_standard_score}, Percentile=${body.abc_percentile}, Level=${body.abc_adaptive_level}

Domain Scores:
${body.domain_scores.map(d => `  ${d.domain_name}: SS=${d.standard_score}, Percentile=${d.percentile}, Level=${d.adaptive_level}, v-sum=${d.v_scale_sum}`).join("\n")}

Subdomain Scores:
${body.subdomain_scores.map(s => `  ${s.subdomain_name} (${s.domain_name}): Raw=${s.raw_score}, v=${s.v_scale_score}, AE=${s.age_equivalent || "N/A"}, GSV=${s.gsv || "N/A"}`).join("\n")}
${body.prior_abc_score != null ? `\nPrior ABC Standard Score: ${body.prior_abc_score} (${body.prior_test_date || "prior"})` : ""}
`.trim();

  const ctx = body.output_context || "full_report";

  if (ctx === "adaptive_summary") {
    return {
      userPrompt: `Generate a 1-2 paragraph Adaptive Behavior Summary for this Vineland-3 assessment:\n\n${scoreSummary}`,
      responseSchema: '{"adaptive_summary":"..."}'
    };
  }
  if (ctx === "iep_present_levels") {
    return {
      userPrompt: `Generate IEP Present Levels text based on this Vineland-3 assessment. Include ABC score, domain interpretation, and support needs:\n\n${scoreSummary}`,
      responseSchema: '{"iep_present_levels":"..."}'
    };
  }
  if (ctx === "fba_summary") {
    return {
      userPrompt: `Generate a brief FBA Adaptive Functioning Summary paragraph based on this Vineland-3 assessment. Link adaptive deficits to potential behavioral implications:\n\n${scoreSummary}`,
      responseSchema: '{"fba_summary":"..."}'
    };
  }
  if (ctx === "reassessment") {
    return {
      userPrompt: `Generate a clinical reassessment narrative for this Vineland-3 assessment. Include overall pattern, domain interpretations, and longitudinal notes if prior scores exist:\n\n${scoreSummary}`,
      responseSchema: '{"reassessment_narrative":"..."}'
    };
  }

  // full_report
  const isComprehensive = body.report_type === "comprehensive";
  return {
    userPrompt: `Generate a ${isComprehensive ? "Comprehensive" : "Domain-Level"} Vineland-3 report narrative for:\n\n${scoreSummary}\n\n${isComprehensive ? "Include detailed subdomain interpretation and strength/weakness analysis." : "Focus on domain-level interpretation."}`,
    responseSchema: JSON.stringify({
      overall_summary: "paragraph",
      communication_narrative: "paragraph",
      daily_living_skills_narrative: "paragraph",
      socialization_narrative: "paragraph",
      motor_skills_narrative: "paragraph or null",
      strengths_weaknesses: "paragraph",
      recommendations: ["recommendation strings"],
    }),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ReportRequest = await req.json();
    const { userPrompt, responseSchema } = buildPromptForContext(body);

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n\nReturn JSON matching this schema: ${responseSchema}` },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return new Response(JSON.stringify({ error: `AI generation failed: ${errText}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const narratives = JSON.parse(jsonStr);

    return new Response(JSON.stringify({ success: true, narratives, report_type: body.report_type, output_context: body.output_context || "full_report" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
