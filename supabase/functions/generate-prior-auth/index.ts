import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriorAuthRequest {
  studentId: string;
  payerId: string;
  serviceCodes: string[];
  unitsRequested: number;
  serviceStartDate: string;
  serviceEndDate: string;
  requestType: 'initial' | 'continuation' | 'modification' | 'expedited';
  diagnosisCodes?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PriorAuthRequest = await req.json();
    const { studentId, payerId, serviceCodes, unitsRequested, serviceStartDate, serviceEndDate, requestType, diagnosisCodes } = body;

    if (!studentId || !payerId || !serviceCodes?.length || !unitsRequested) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch student clinical data for AI justification
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id, first_name, last_name, date_of_birth,
        diagnosis_codes, behaviors, goals, 
        fba_findings, bip_data, background_info
      `)
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return new Response(
        JSON.stringify({ success: false, error: "Student not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recent session data for progress documentation
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select('session_date, duration_minutes, notes')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .limit(10);

    // Get skill acquisition data
    const { data: skillTargets } = await supabase
      .from('skill_targets')
      .select('target_name, status, mastery_criteria, current_phase')
      .eq('student_id', studentId)
      .eq('is_active', true);

    // Generate AI clinical justification using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    let aiJustification = "";
    let clinicalSummary = "";
    let medicalNecessity = "";
    let treatmentGoals: string[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-5-mini",
            messages: [
              {
                role: "system",
                content: `You are a clinical documentation specialist for ABA therapy prior authorization requests. 
Generate professional, insurance-compliant clinical justifications based on patient data.
Format output as JSON with fields: clinicalSummary, medicalNecessity, treatmentGoals (array), fullJustification`
              },
              {
                role: "user",
                content: `Generate a prior authorization justification for:

Patient Age: ${calculateAge(student.date_of_birth)} years
Diagnosis Codes: ${(diagnosisCodes || student.diagnosis_codes || ['F84.0']).join(', ')}
Requested Services: ${serviceCodes.join(', ')}
Units Requested: ${unitsRequested}
Service Period: ${serviceStartDate} to ${serviceEndDate}
Request Type: ${requestType}

Clinical Context:
- Behaviors: ${JSON.stringify(student.behaviors || [])}
- Current Goals: ${JSON.stringify(student.goals || [])}
- FBA Findings: ${JSON.stringify(student.fba_findings || {})}
- BIP Summary: ${student.bip_data ? 'Active BIP in place' : 'No current BIP'}
- Recent Sessions: ${recentSessions?.length || 0} sessions documented
- Active Skill Targets: ${skillTargets?.length || 0} targets in acquisition

Generate a compelling medical necessity justification.`
              }
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          try {
            const parsed = JSON.parse(content);
            clinicalSummary = parsed.clinicalSummary || "";
            medicalNecessity = parsed.medicalNecessity || "";
            treatmentGoals = parsed.treatmentGoals || [];
            aiJustification = parsed.fullJustification || content;
          } catch {
            // If not valid JSON, use as full justification
            aiJustification = content;
          }
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError);
        // Continue without AI - manual justification required
      }
    }

    // Create prior auth request record
    const { data: priorAuth, error: insertError } = await supabase
      .from('prior_auth_requests')
      .insert({
        student_id: studentId,
        payer_id: payerId,
        request_type: requestType,
        service_codes: serviceCodes,
        units_requested: unitsRequested,
        service_start_date: serviceStartDate,
        service_end_date: serviceEndDate,
        diagnosis_codes: diagnosisCodes || student.diagnosis_codes || ['F84.0'],
        clinical_summary: clinicalSummary,
        medical_necessity: medicalNecessity,
        treatment_goals: treatmentGoals,
        ai_generated_justification: aiJustification,
        supporting_documentation: {
          recentSessionCount: recentSessions?.length || 0,
          activeSkillTargets: skillTargets?.length || 0,
          hasFBA: !!student.fba_findings,
          hasBIP: !!student.bip_data,
        },
        status: aiJustification ? 'ready' : 'draft',
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create prior auth request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        priorAuthId: priorAuth.id,
        status: priorAuth.status,
        aiGenerated: !!aiJustification,
        justification: {
          clinicalSummary,
          medicalNecessity,
          treatmentGoals,
          fullJustification: aiJustification,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Prior auth generation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateAge(dob: string | null): number {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
