import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  full_clinical: `You are a Board Certified Behavior Analyst generating a clinical behavioral assessment report.

Use ONLY the provided structured data. Do not hallucinate or invent data.
Write in a professional, clinical tone suitable for school documentation, FBAs, and IEPs.

INSTRUCTIONS:
1. Generate a Behavioral Overview Summary using totals, averages, and trends.
2. Describe behavior topography and measurement types used (frequency, duration, interval, ABC).
3. Identify primary and secondary behavioral functions based on function scores.
4. Summarize antecedent and consequence patterns using ABC clusters.
5. Interpret interval data as level of behavioral interference.
6. Describe temporal patterns including peak day, high-risk times, and variability.
7. Assign severity level (low, moderate, high) based on frequency and interval data.
8. Identify skill deficits and map them to replacement behaviors.
9. Generate 3-5 intervention recommendations aligned with function.
10. Provide a prognosis statement based on data consistency and responsiveness potential.

STYLE RULES:
- Be concise but clinical
- Avoid bullet overload unless listing
- No emojis
- Use natural professional language

OUTPUT FORMAT:
Return valid JSON with this structure:
{
  "title": "BOPS Behavioral Intelligence Report",
  "sections": [
    {"key":"behavioral_overview","title":"Behavioral Overview","text":"..."},
    {"key":"topography","title":"Topography & Measurement Profile","text":"..."},
    {"key":"functional_analysis","title":"Functional Analysis","text":"..."},
    {"key":"temporal_analysis","title":"Temporal Analysis","text":"..."},
    {"key":"abc_integration","title":"ABC & Interval Integration","text":"..."},
    {"key":"severity","title":"Risk & Severity","text":"..."},
    {"key":"replacement_skills","title":"Replacement Skills","text":"..."},
    {"key":"intervention_plan","title":"Intervention Plan","text":"..."},
    {"key":"prognosis","title":"Prognosis","text":"..."},
    {"key":"summary_statement","title":"Summary Statement","text":"..."}
  ]
}`,

  iep: `You are a Board Certified Behavior Analyst writing a concise IEP-compliant behavioral summary.

Use ONLY the provided structured data. Write in IEP-appropriate language.

OUTPUT FORMAT:
Return valid JSON:
{
  "title": "IEP Behavioral Summary",
  "sections": [
    {"key":"behavior_summary","title":"Behavior Summary","text":"..."},
    {"key":"present_levels","title":"Present Levels","text":"..."},
    {"key":"functional_interpretation","title":"Functional Interpretation","text":"..."},
    {"key":"impact","title":"Impact on Access","text":"..."},
    {"key":"goals","title":"Goals Recommended","text":"..."},
    {"key":"services","title":"Services Recommended","text":"..."},
    {"key":"progress_monitoring","title":"Progress Monitoring","text":"..."}
  ]
}`,

  parent: `You are a behavioral specialist writing a parent-friendly summary of a child's behavioral assessment.

Use ONLY the provided data. Write in warm, accessible language. Avoid jargon.

OUTPUT FORMAT:
Return valid JSON:
{
  "title": "Parent Behavioral Summary",
  "sections": [
    {"key":"what_we_observed","title":"What We Observed","text":"..."},
    {"key":"why_happening","title":"Why It's Happening","text":"..."},
    {"key":"what_this_means","title":"What This Means","text":"..."},
    {"key":"what_we_will_teach","title":"What We're Going to Teach","text":"..."},
    {"key":"what_you_will_see","title":"What You'll See","text":"..."}
  ]
}`,

  clinician_quick: `You are a BCBA writing a SOAP-style clinician quick summary.

Use ONLY the provided data. Be terse and clinical.

OUTPUT FORMAT:
Return valid JSON:
{
  "title": "Clinician Quick Summary (SOAP)",
  "sections": [
    {"key":"subjective","title":"S (Subjective)","text":"..."},
    {"key":"objective","title":"O (Objective)","text":"..."},
    {"key":"assessment","title":"A (Assessment)","text":"..."},
    {"key":"plan","title":"P (Plan)","text":"..."}
  ]
}`,

  master_clinical: `You are a senior Board Certified Behavior Analyst generating a comprehensive Clinical Narrative Engine™ Master Report.

This master report integrates findings from multiple clinical tools:
- BOPS behavioral profiling (archetypes, indices, domain scores)
- Clinical indices (Storm, Escalation, Hidden Need, Sensory Load, Power Conflict, Social Complexity, Recovery Burden)
- Placement intelligence (CFI models, best fit)
- Clinical narrative recommendations

Use ONLY the provided structured data. Do not hallucinate.

INSTRUCTIONS:
1. Write an integrated clinical story, not separate tool outputs stapled together.
2. Generate identifying information section from provided data.
3. List assessment tools administered.
4. Write an executive summary answering: What profile is emerging? What is being missed? What should happen next?
5. Write a section on the behavioral archetype profile with clinical interpretation.
6. Write a section on clinical indices with severity and interference analysis.
7. Write an integrated clinical interpretation paragraph tying everything together.
8. Generate categorized intervention recommendations:
   - Immediate clinical priorities (2-4 most urgent)
   - Classroom/school supports
   - Parent training/caregiver supports
   - Further assessment recommendations

STYLE: Professional clinical narrative. No emojis. Paragraph format with clear headers.

OUTPUT FORMAT:
Return valid JSON:
{
  "title": "Clinical Narrative Engine™ Master Report",
  "sections": [
    {"key":"identifying_info","title":"Identifying Information","text":"..."},
    {"key":"reason_for_assessment","title":"Reason for Assessment","text":"..."},
    {"key":"tools_administered","title":"Assessment Tools Administered","text":"..."},
    {"key":"executive_summary","title":"Summary of Major Findings","text":"..."},
    {"key":"archetype_profile","title":"Behavioral Archetype Profile","text":"..."},
    {"key":"clinical_indices","title":"Clinical Indices Analysis","text":"..."},
    {"key":"integrated_interpretation","title":"Integrated Clinical Interpretation","text":"..."},
    {"key":"immediate_priorities","title":"Immediate Clinical Priorities","text":"..."},
    {"key":"classroom_supports","title":"Classroom & School Supports","text":"..."},
    {"key":"parent_training","title":"Parent Training & Caregiver Supports","text":"..."},
    {"key":"further_assessment","title":"Further Assessment Recommendations","text":"..."},
    {"key":"prognosis","title":"Prognosis","text":"..."}
  ]
}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate user
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) userId = user.id;
    }

    const body = await req.json();
    const {
      student_id,
      report_type = "full_clinical",
      session_id = null,
      include_narrative = false,
    } = body;

    if (!student_id) {
      return new Response(JSON.stringify({ error: "student_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Get BOPS dashboard data
    const { data: dashData } = await supabaseAdmin
      .from("v_student_bops_dashboard")
      .select("*")
      .eq("student_id", student_id)
      .maybeSingle();

    // 2) Get clinical narrative if master report
    let narrativeText = null;
    if (report_type === "master_clinical" || include_narrative) {
      const { data: narrative } = await supabaseAdmin.rpc(
        "generate_clinical_narrative_text",
        { p_student_id: student_id },
      );
      narrativeText = narrative;
    }

    // 3) Get clinical recommendations
    const { data: recommendations } = await supabaseAdmin.rpc(
      "generate_clinical_recommendations",
      { p_student_id: student_id },
    );

    // 4) Build payload
    const payload = {
      student_id,
      student_name: dashData?.student_name || "Student",
      assessment_date: dashData?.assessment_date,
      training_name: dashData?.calculated_training_name,
      clinical_name: dashData?.calculated_clinical_name,
      profile_type: dashData?.calculated_profile_type,
      primary_archetype: dashData?.primary_archetype,
      secondary_archetype: dashData?.secondary_archetype,
      tertiary_archetype: dashData?.tertiary_archetype,
      storm_score: dashData?.storm_score,
      escalation_index: dashData?.escalation_index,
      hidden_need_index: dashData?.hidden_need_index,
      sensory_load_index: dashData?.sensory_load_index,
      power_conflict_index: dashData?.power_conflict_index,
      social_complexity_index: dashData?.social_complexity_index,
      recovery_burden_index: dashData?.recovery_burden_index,
      best_fit_model: dashData?.best_fit_model_name,
      best_fit_score: dashData?.best_fit_score,
      best_fit_band: dashData?.best_fit_band,
      clinical_narrative: narrativeText,
      recommendations,
    };

    // 5) Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = PROMPTS[report_type] || PROMPTS.full_clinical;
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `DATA INPUT:\n${JSON.stringify(payload, null, 2)}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResp.json();
    const content = aiResult.choices?.[0]?.message?.content;
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { title: "BOPS Report", sections: [{ key: "full_text", title: "Report", text: content }] };
    }

    // 6) Store report
    const { data: reportId, error: saveError } = await supabaseAdmin.rpc(
      "create_bops_report",
      {
        p_student_id: student_id,
        p_report_type: report_type,
        p_generated_text: parsed.sections?.map((s: any) => s.text).join("\n\n") || content,
        p_generated_json: parsed,
        p_source_metrics: payload,
        p_date_start: null,
        p_date_end: null,
        p_date_range_label: null,
        p_generated_by: userId,
        p_ai_prompt_version: "v2-nova",
      },
    );

    if (saveError) {
      console.error("Save error:", saveError);
      // Return AI result even if save fails
      return new Response(
        JSON.stringify({ ok: true, report: parsed, save_error: saveError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, report_id: reportId, report: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-bops-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
