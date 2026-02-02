import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ABAS3Question {
  id: string;
  number: number;
  text: string;
  domain: string;
}

interface ABAS3Domain {
  name: string;
  code: string;
  questions: ABAS3Question[];
}

const EXTRACTION_PROMPT = `You are an expert at analyzing ABAS-3 (Adaptive Behavior Assessment System, Third Edition) questionnaire forms.

Analyze the provided document text and extract ALL questions organized by domain.

ABAS-3 domains typically include:
- Communication (COM)
- Community Use (CU)
- Functional Academics (FA)
- School Living (SL) or Home Living (HL) or Home/School Living (HS)
- Health and Safety (HS)
- Leisure (LE)
- Self-Care (SC)
- Self-Direction (SD)
- Social (SO)
- Motor (MO) - for younger forms
- Work (WK) - for older forms/adults

For each question, extract:
1. The question number (as shown in the form)
2. The exact question text
3. The domain it belongs to

Return a JSON object with this exact structure:
{
  "domains": [
    {
      "name": "Communication",
      "code": "COM",
      "questions": [
        {"number": 1, "text": "Says the names of other people (for example, \\"Mama,\\" \\"Daddy,\\" or names of friends)."},
        {"number": 2, "text": "..."}
      ]
    }
  ]
}

IMPORTANT:
- Extract EVERY question from EVERY domain
- Preserve the exact wording of each question
- Include example text in parentheses
- Each domain typically has 20-26 questions
- Questions are numbered starting from 1 within each domain
- Ignore the rating scale columns (0, 1, 2, 3)
- Ignore examiner-only sections`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { documentText, formCode } = await req.json();

    if (!documentText || !formCode) {
      return new Response(JSON.stringify({ error: "Missing required fields: documentText, formCode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI proxy for Gemini
    const lovableApiUrl = Deno.env.get("LOVABLE_API_URL") || "https://api.lovable.dev";
    
    const response = await fetch(`${lovableApiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: EXTRACTION_PROMPT },
          { role: "user", content: `Document text:\n${documentText}` }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      return new Response(JSON.stringify({ error: "AI extraction failed", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const responseText = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: responseText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    // Flatten questions with domain info and generate IDs
    const allQuestions: ABAS3Question[] = [];
    extractedData.domains.forEach((domain: ABAS3Domain) => {
      domain.questions.forEach((q: { number: number; text: string }) => {
        allQuestions.push({
          id: `${formCode}_${domain.code}_${q.number}`,
          number: q.number,
          text: q.text,
          domain: domain.code,
        });
      });
    });

    // Update the template in the database
    const { error: updateError } = await supabase
      .from("abas3_form_templates")
      .update({
        domains: extractedData.domains.map((d: ABAS3Domain) => ({
          name: d.name,
          code: d.code,
          question_count: d.questions.length,
        })),
        questions: allQuestions,
        updated_at: new Date().toISOString(),
      })
      .eq("form_code", formCode);

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update database", details: updateError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        formCode,
        domainsExtracted: extractedData.domains.length,
        questionsExtracted: allQuestions.length,
        domains: extractedData.domains.map((d: ABAS3Domain) => ({
          name: d.name,
          code: d.code,
          questionCount: d.questions.length,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
