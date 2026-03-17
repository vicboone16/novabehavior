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
}

const NARRATIVE_PROMPT = `You are a clinical report writer for ABA and adaptive behavior assessments.
Generate professional narrative sections for a Vineland Adaptive Behavior Scales, Third Edition (Vineland-3) report.

Guidelines:
- Use clinical, professional language appropriate for ABA reassessments, school reports, and adaptive behavior summaries
- Describe adaptive functioning cautiously and accurately
- Use percentile rank and standard score language correctly (Mean=100, SD=15 for domains/composite; Mean=15, SD=3 for subdomains)
- Identify relative strengths and weaknesses ONLY when supported by score comparisons (at least 1 SD difference between domains)
- Generate domain interpretation paragraphs using the scored data
- Avoid exaggerated conclusions
- Use person-first language
- Do NOT make diagnostic statements
- Reference the respondent by name and relationship when available

Return a JSON object with these fields:
{
  "overall_summary": "paragraph summarizing the assessment purpose, form used, ABC score, and domain overview",
  "communication_narrative": "paragraph interpreting communication domain and subdomains",
  "daily_living_skills_narrative": "paragraph interpreting DLS domain and subdomains",
  "socialization_narrative": "paragraph interpreting socialization domain and subdomains",
  "motor_skills_narrative": "paragraph interpreting motor domain if applicable, or null",
  "strengths_weaknesses": "paragraph identifying relative strengths and weaknesses based on score comparisons",
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}

Only output valid JSON. No markdown wrapping.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ReportRequest = await req.json();

    // Build data summary for AI
    const scoreSummary = `
Student: ${body.student_name}
Age: ${body.age_display}
Test Date: ${body.test_date}
Form: ${body.form_name}
Respondent: ${body.respondent_name || "Not specified"} (${body.respondent_relationship || "Not specified"})

Adaptive Behavior Composite: SS=${body.abc_standard_score}, Percentile=${body.abc_percentile}, Level=${body.abc_adaptive_level}

Domain Scores:
${body.domain_scores.map(d => `  ${d.domain_name}: SS=${d.standard_score}, Percentile=${d.percentile}, Level=${d.adaptive_level}, v-sum=${d.v_scale_sum}`).join("\n")}

Subdomain Scores:
${body.subdomain_scores.map(s => `  ${s.subdomain_name} (${s.domain_name}): Raw=${s.raw_score}, v=${s.v_scale_score}, AE=${s.age_equivalent || "N/A"}, GSV=${s.gsv || "N/A"}`).join("\n")}
`.trim();

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: NARRATIVE_PROMPT },
          { role: "user", content: `Generate the Vineland-3 report narrative sections for this assessment:\n\n${scoreSummary}` },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return new Response(JSON.stringify({ error: `AI generation failed: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const narratives = JSON.parse(jsonStr);

    return new Response(JSON.stringify({ success: true, narratives }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
