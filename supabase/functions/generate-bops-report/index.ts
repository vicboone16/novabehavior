import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// PROMPT LIBRARY — each report type has its own clinical prompt
// ═══════════════════════════════════════════════════════════

const PROMPTS: Record<string, string> = {

  // ─── FULL CLINICAL / FBA ───
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
Return valid JSON:
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

  // ─── IEP ───
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

  // ─── PARENT ───
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

  // ─── CLINICIAN QUICK (SOAP) ───
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

  // ─── MASKING & CAMOUFLAGE INDEX™ (Standalone) ───
  masking_camouflage: `You are a senior clinical psychologist generating a Masking & Camouflage Index™ report.

Use ONLY the provided structured data. Do not hallucinate.

CLINICAL RULES:
- If total masking score is 72-95: describe as "moderate" masking, recommend increased observation across settings, monitoring post-demand fatigue, gathering cross-informant discrepancies.
- If total masking score is 96+: describe as "elevated/high" masking, recommend full autism-informed differential evaluation, assess internalized distress/anxiety, review home-school discrepancy.
- If Internalized Distress Risk is flagged: add language about emotional suppression, anxiety/internalizing symptoms, and emotional check-ins.
- If Home-School Discrepancy is flagged: add language about setting-based behavior differences and after-school dysregulation.
- If Missed ASD Risk is flagged: add concern for under-recognized neurodevelopmental presentation.
- Reference the top 3 masking domains by name.

STYLE: Professional clinical narrative. Paragraph format. No emojis.

OUTPUT FORMAT:
Return valid JSON:
{
  "title": "Masking & Camouflage Index™ Report",
  "sections": [
    {"key":"identifying_info","title":"Identifying Information","text":"..."},
    {"key":"reason","title":"Reason for Assessment","text":"..."},
    {"key":"masking_summary","title":"Masking & Camouflage Summary","text":"..."},
    {"key":"domain_analysis","title":"Domain-Level Analysis","text":"..."},
    {"key":"flags","title":"Clinical Flags","text":"..."},
    {"key":"recommendations","title":"Recommendations","text":"..."}
  ]
}`,

  // ─── NEURODIVERGENT ARCHETYPE PROFILER™ (Standalone) ───
  archetype_profiler: `You are a neurodevelopmental clinician generating a Neurodivergent Archetype Profiler™ report.

Use ONLY the provided structured data. Do not hallucinate.

ARCHETYPE INTERPRETATION RULES:
- Masked Observer: child studies social environments carefully, relies on observation/performance rather than intuitive ease.
- Sensory Seeker: nervous system seeks input/movement/stimulation, may be mistaken for impulsivity.
- Overwhelmed Reactor: meaningful load sensitivity, distress visible when demands exceed regulation capacity.
- Misread Leader: autonomy/intensity/assertiveness may be misread as opposition.
- Silent Processor: internal processing style overlooked in fast-paced/verbally demanding settings.

Describe primary and secondary archetypes with clinical interpretation. Humanize the findings.

STYLE: Professional, empathetic. Paragraph format. No emojis.

OUTPUT FORMAT:
Return valid JSON:
{
  "title": "Neurodivergent Archetype Profiler™ Report",
  "sections": [
    {"key":"identifying_info","title":"Identifying Information","text":"..."},
    {"key":"archetype_summary","title":"Archetype Summary","text":"..."},
    {"key":"primary_interpretation","title":"Primary Archetype Interpretation","text":"..."},
    {"key":"secondary_interpretation","title":"Secondary Archetype Interpretation","text":"..."},
    {"key":"clinical_implications","title":"Clinical Implications","text":"..."},
    {"key":"recommendations","title":"Recommendations","text":"..."}
  ]
}`,

  // ─── BEHAVIOR MISINTERPRETATION INDEX™ (Standalone) ───
  misinterpretation_index: `You are a behavioral clinician generating a Behavior Misinterpretation Index™ report.

Use ONLY the provided structured data. Do not hallucinate.

TRANSLATION RULES:
- If top pattern is "Defiance": behavior may reflect autonomy needs, confusion, overwhelm, or communication difficulty.
- If "Noncompliance": may be linked to executive functioning, unclear expectations, slow processing, demand-capacity mismatch.
- If "Aggression": may reflect dysregulation, sensory overload, accumulated frustration rather than goal-directed harm.
- If "Avoidance": may reflect anxiety, overwhelm, or low confidence rather than simple refusal.

Describe what adults may be getting wrong and alternative explanations.

STYLE: Professional clinical narrative. No emojis.

OUTPUT FORMAT:
Return valid JSON:
{
  "title": "Behavior Misinterpretation Index™ Report",
  "sections": [
    {"key":"identifying_info","title":"Identifying Information","text":"..."},
    {"key":"misinterpretation_summary","title":"Misinterpretation Summary","text":"..."},
    {"key":"pattern_analysis","title":"Pattern Analysis","text":"..."},
    {"key":"alternative_explanations","title":"Alternative Explanations","text":"..."},
    {"key":"recommendations","title":"Recommendations","text":"..."}
  ]
}`,

  // ─── PARENT EFFECTIVENESS FORMULA™ (Standalone) ───
  parent_effectiveness: `You are a clinical behaviorist generating a Parent Effectiveness Formula™ report.

Use ONLY the provided structured data. Do not hallucinate.

PROFILE LANGUAGE RULES:
- High knowledge / low application: understanding stronger than execution, need modeling and rehearsal.
- Willing but overwhelmed: receptive but stress load interferes with follow-through.
- Cultural mismatch: challenges reflect mismatch between treatment style and caregiver values.
- Strong implementation potential: good coaching success potential with standard support.

Sound predictive, not judgmental. Identify strengths and vulnerabilities.

STYLE: Professional, empathetic, solution-oriented. No emojis.

OUTPUT FORMAT:
Return valid JSON:
{
  "title": "Parent Effectiveness Formula™ Report",
  "sections": [
    {"key":"identifying_info","title":"Identifying Information","text":"..."},
    {"key":"effectiveness_summary","title":"Effectiveness Summary","text":"..."},
    {"key":"strengths","title":"Relative Strengths","text":"..."},
    {"key":"vulnerabilities","title":"Primary Vulnerabilities","text":"..."},
    {"key":"profile_interpretation","title":"Profile Interpretation","text":"..."},
    {"key":"recommendations","title":"Recommendations","text":"..."}
  ]
}`,

  // ─── BCBA PARENT TRAINING COMPETENCY EVALUATOR™ (Standalone) ───
  bcba_ptce: `You are a supervising BCBA generating a Parent Training Competency Evaluator™ report.

Use ONLY the provided structured data. Do not hallucinate.

BARRIER SUBTYPE RULES:
- Passive resistance: engagement present but follow-through inconsistent.
- Emotional resistance: emotional readiness interferes with feedback use.
- Skill-based barrier: willing but lacks procedural fluency.
- Overwhelmed but willing: buy-in present but capacity strained.
- Cultural/value conflict: difficulty may reflect treatment-fit concerns.

TIER RULES:
- Tier 4: Barrier-first intervention — reduce fidelity expectations, address stress first.
- Tier 3: Intensive coaching — increase direct modeling, real-time checks.
- Tier 2: Structured coaching — written carryover plans, practice goals.
- Tier 1/Advanced: shift toward consultation and refinement.

Be clinician-forward and concrete.

STYLE: Clinical, actionable. No emojis.

OUTPUT FORMAT:
Return valid JSON:
{
  "title": "BCBA Parent Training Competency Evaluator™ Report",
  "sections": [
    {"key":"identifying_info","title":"Identifying Information","text":"..."},
    {"key":"competency_summary","title":"Competency Summary","text":"..."},
    {"key":"strengths","title":"Caregiver Strengths","text":"..."},
    {"key":"barriers","title":"Barriers","text":"..."},
    {"key":"tier_assignment","title":"Coaching Tier Assignment","text":"..."},
    {"key":"recommendations","title":"Recommendations","text":"..."}
  ]
}`,

  // ─── MASTER CLINICAL NARRATIVE ENGINE™ ───
  master_clinical: `You are a senior Board Certified Behavior Analyst generating a comprehensive Clinical Narrative Engine™ Master Report.

This master report integrates findings from FIVE clinical tools into ONE integrated clinical story:
1. Masking & Camouflage Index™
2. Neurodivergent Archetype Profiler™
3. Behavior Misinterpretation Index™
4. Parent Effectiveness Formula™
5. BCBA Parent Training Competency Evaluator™

Plus BOPS behavioral profiling (archetypes, indices, domain scores), clinical indices, and placement intelligence.

Use ONLY the provided structured data. Do not hallucinate.

CRITICAL: This should read like ONE integrated clinical story, NOT five separate tools stapled together.

SECTION INSTRUCTIONS:

1. IDENTIFYING INFORMATION: Child name, DOB/age, date, assessor, settings, informants from data.

2. REASON FOR ASSESSMENT: "This integrated clinical summary was completed to better understand the child's neurodevelopmental presentation, potential masking patterns, adult interpretation of behavior, and parent training readiness factors influencing intervention success."

3. ASSESSMENT TOOLS ADMINISTERED: List all 5 tools plus any BOPS tools used.

4. SUMMARY OF MAJOR FINDINGS (Executive Summary): Answer: What profile is emerging? What is being missed? What is the caregiver capacity picture? What should happen next? Use template: "Results suggest a presentation characterized by [masking level], [distress pattern], and [misinterpretation pattern]. The child's profile is most consistent with a [Primary Archetype] presentation..."

5. SECTION A - MASKING & CAMOUFLAGE SUMMARY: Pull total masking score, severity, top 3 domains, flag logic. Add flag language for Missed ASD Risk, Internalized Distress Risk, Home-School Discrepancy.

6. SECTION B - NEURODIVERGENT ARCHETYPE SUMMARY: Describe primary and secondary archetypes with humanized clinical interpretation.

7. SECTION C - BEHAVIOR MISINTERPRETATION SUMMARY: Explain what adults may be getting wrong. Apply translation rules for Defiance, Noncompliance, Aggression, Avoidance patterns.

8. SECTION D - PARENT EFFECTIVENESS SUMMARY: Sound predictive not judgmental. Apply profile language for knowledge/application/regulation/cultural fit/capacity/environment.

9. SECTION E - BCBA PARENT TRAINING COMPETENCY SUMMARY: Clinician-forward. Apply barrier subtype and tier assignment language.

10. INTEGRATED CLINICAL INTERPRETATION: The most important paragraph. Pull everything together: "Taken together, current findings suggest that the child's presentation is likely more complex than a surface-level behavior interpretation alone would indicate..."

11. INTERVENTION RECOMMENDATIONS organized as:
    - Immediate Clinical Priorities (2-4 most urgent)
    - Classroom/School Supports
    - Parent Training/Caregiver Supports
    - Regulation/Sensory Supports
    - Further Assessment Recommendations

12. PROGNOSIS

STYLE: Professional clinical narrative. Paragraph format. No emojis. No raw data dumps.

OUTPUT FORMAT:
Return valid JSON:
{
  "title": "Clinical Narrative Engine™ Master Report",
  "sections": [
    {"key":"identifying_info","title":"I. Identifying Information","text":"..."},
    {"key":"reason_for_assessment","title":"II. Reason for Assessment","text":"..."},
    {"key":"tools_administered","title":"III. Assessment Tools Administered","text":"..."},
    {"key":"executive_summary","title":"IV. Summary of Major Findings","text":"..."},
    {"key":"masking_summary","title":"Section A. Masking & Camouflage Summary","text":"..."},
    {"key":"archetype_summary","title":"Section B. Neurodivergent Archetype Summary","text":"..."},
    {"key":"misinterpretation_summary","title":"Section C. Behavior Misinterpretation Summary","text":"..."},
    {"key":"parent_effectiveness","title":"Section D. Parent Effectiveness Summary","text":"..."},
    {"key":"bcba_ptce","title":"Section E. BCBA Parent Training Competency Summary","text":"..."},
    {"key":"integrated_interpretation","title":"Integrated Clinical Interpretation","text":"..."},
    {"key":"immediate_priorities","title":"Immediate Clinical Priorities","text":"..."},
    {"key":"classroom_supports","title":"Classroom & School Supports","text":"..."},
    {"key":"parent_training","title":"Parent Training & Caregiver Supports","text":"..."},
    {"key":"regulation_sensory","title":"Regulation & Sensory Supports","text":"..."},
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

    // Validate report_type
    const validTypes = Object.keys(PROMPTS);
    if (!validTypes.includes(report_type)) {
      return new Response(JSON.stringify({ error: `Invalid report_type. Valid: ${validTypes.join(", ")}` }), {
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

    // 2) Get clinical narrative if master/standalone report
    let narrativeText = null;
    const narrativeTypes = ["master_clinical", "masking_camouflage", "archetype_profiler",
      "misinterpretation_index", "parent_effectiveness", "bcba_ptce"];
    if (narrativeTypes.includes(report_type) || include_narrative) {
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
      report_type,
    };

    // 5) Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = PROMPTS[report_type];
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResp.json();
    const content = aiResult.choices?.[0]?.message?.content;
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { title: "Report", sections: [{ key: "full_text", title: "Report", text: content }] };
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
        p_ai_prompt_version: "v3-narrative-engine",
      },
    );

    if (saveError) {
      console.error("Save error:", saveError);
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
