import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractionRequest {
  documentType: 'fba' | 'bip' | 'iep' | 'psycho-ed' | 'progress-report' | 'intake' | 'other';
  documentText?: string;
  fileUrl?: string;
  fileName?: string;
}

// Background info extraction prompt (shared across all document types)
const BACKGROUND_INFO_PROMPT = `
Additionally, extract any background information about the student that you find in the document. Include this in a "backgroundInfo" object with these fields (only include fields that have data):
- referralReason: Why the student was referred
- referralSource: Who made the referral (teacher, parent, etc.)
- presentingConcerns: Primary concerns from the referral
- educationalHistory: Schools attended, grade retention, academic performance
- previousPlacements: Special education placements, alternative schools
- diagnoses: Any diagnoses mentioned (ADHD, ASD, learning disabilities, etc.)
- medicalInfo: Relevant medical history, medications, sensory needs
- previousBIPs: Summary of previous behavior intervention plans
- strategiesTried: Interventions and strategies previously attempted
- whatWorked: Effective strategies from the past
- whatDidntWork: Ineffective strategies
- homeEnvironment: Relevant home environment factors
- familyStructure: Family composition, caregivers, siblings
- culturalConsiderations: Cultural, linguistic, or religious considerations
- behaviorsOfConcernSummary: Narrative summary of behavioral concerns
`;

const EXTRACTION_PROMPTS: Record<string, string> = {
  fba: `You are an expert at analyzing Functional Behavior Assessments (FBAs). Extract the following information from the document text provided:

1. Target Behaviors: List each target behavior with its operational definition
2. Antecedents: Common triggers or events that occur before the behavior
3. Consequences: What happens after the behavior occurs
4. Hypothesized Functions: The hypothesized function(s) of the behavior (attention, escape, tangible, sensory)
5. Setting Events: Environmental or contextual factors
6. Assessment Tools Used: Any assessment tools mentioned (FAST, QABF, MAS, etc.)
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with the following structure:
{
  "targetBehaviors": [{"name": "string", "definition": "string"}],
  "antecedents": [{"value": "string"}],
  "consequences": [{"value": "string"}],
  "hypothesizedFunctions": [{"value": "string"}],
  "settingEvents": [{"value": "string"}],
  "assessmentTools": [{"value": "string"}],
  "backgroundInfo": { ... }
}

Only include fields that are found in the document. If a field is not found, omit it or use an empty array.`,

  bip: `You are an expert at analyzing Behavior Intervention Plans (BIPs). Extract the following information from the document text provided:

1. Replacement Behaviors: Alternative behaviors being taught
2. Preventative Strategies: Antecedent modifications and prevention strategies
3. Teaching Strategies: How replacement behaviors will be taught
4. Reactive Strategies: Response procedures when problem behavior occurs
5. Crisis Procedures: Emergency or crisis management procedures
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with the following structure:
{
  "replacementBehaviors": [{"name": "string", "definition": "string"}],
  "preventativeStrategies": [{"value": "string"}],
  "teachingStrategies": [{"value": "string"}],
  "reactiveStrategies": [{"value": "string"}],
  "crisisProcedures": [{"value": "string"}],
  "backgroundInfo": { ... }
}

Only include fields that are found in the document. If a field is not found, omit it or use an empty array.`,

  iep: `You are an expert at analyzing Individualized Education Programs (IEPs). Extract the following information from the document text provided:

1. Goals: Academic, behavioral, and social-emotional learning goals
2. Accommodations: Classroom and testing accommodations
3. Behavior Supports: Any behavior support plans or strategies
4. Service Minutes: Related services and their frequency/duration
5. Review Dates: Important dates for review or reassessment
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with the following structure:
{
  "goals": [{"text": "string", "type": "academic|behavioral|sel"}],
  "accommodations": [{"value": "string"}],
  "behaviorSupports": [{"value": "string"}],
  "serviceMinutes": [{"service": "string", "minutes": number}],
  "reviewDates": [{"date": "string"}],
  "backgroundInfo": { ... }
}

Only include fields that are found in the document. If a field is not found, omit it or use an empty array.`,

  'psycho-ed': `You are an expert at analyzing psychological and educational evaluation reports. Extract key information including:

1. Cognitive/IQ Scores
2. Achievement Scores
3. Diagnoses
4. Recommendations
5. Eligibility Determinations
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with relevant fields found in the document, including backgroundInfo.`,

  'progress-report': `You are an expert at analyzing progress reports. Extract key information including:

1. Goals and Current Progress
2. Data Trends
3. Recommendations
4. Next Steps
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with relevant fields found in the document, including backgroundInfo.`,

  intake: `You are an expert at analyzing client intake documents. Extract key background information from the document.
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with the backgroundInfo object containing all relevant fields found in the document.`,

  other: `Extract any relevant educational or behavioral information from this document. Look for:

1. Student information
2. Goals or objectives
3. Behavioral data
4. Recommendations
5. Services or supports
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with relevant fields found in the document, including backgroundInfo.`
};

async function extractTextFromPdf(fileUrl: string, apiKey: string): Promise<string> {
  console.log('Fetching PDF from URL:', fileUrl);
  
  // Fetch the PDF file
  const pdfResponse = await fetch(fileUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
  }

  // Get the PDF as base64
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBytes = new Uint8Array(pdfBuffer);
  
  // Convert to base64 in chunks to avoid stack overflow
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < pdfBytes.length; i += chunkSize) {
    const chunk = pdfBytes.subarray(i, Math.min(i + chunkSize, pdfBytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const pdfBase64 = btoa(binary);

  console.log('PDF size:', pdfBytes.length, 'bytes');

  // Use Gemini's vision capability to extract text from PDF
  const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { 
          role: "user", 
          content: [
            {
              type: "text",
              text: "Extract ALL text content from this PDF document. Maintain the structure and organization of the content as much as possible. Include all sections, headers, bullet points, tables, and data. Return only the extracted text content, nothing else."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`
              }
            }
          ]
        }
      ],
    }),
  });

  if (!extractionResponse.ok) {
    const errorText = await extractionResponse.text();
    console.error("PDF extraction error:", extractionResponse.status, errorText);
    
    if (extractionResponse.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    if (extractionResponse.status === 402) {
      throw new Error("CREDITS_EXHAUSTED");
    }
    
    throw new Error("Failed to extract text from PDF");
  }

  const extractionResult = await extractionResponse.json();
  const extractedText = extractionResult.choices?.[0]?.message?.content || '';
  
  console.log('Extracted text length:', extractedText.length);
  
  return extractedText;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - require valid user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('User authenticated:', user.id);

    const { documentType, documentText, fileUrl, fileName }: ExtractionRequest = await req.json();

    if (!documentType) {
      return new Response(
        JSON.stringify({ error: "Document type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // We need either documentText or fileUrl
    if (!documentText && !fileUrl) {
      return new Response(
        JSON.stringify({ error: "Document text or file URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let textToProcess = documentText || '';

    // If we have a file URL (for PDFs), extract text first
    if (fileUrl && !documentText) {
      try {
        textToProcess = await extractTextFromPdf(fileUrl, LOVABLE_API_KEY);
        
        if (!textToProcess || textToProcess.length < 50) {
          return new Response(
            JSON.stringify({ error: "Could not extract sufficient text from the PDF. The document may be empty, scanned without OCR, or in an unsupported format." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (err) {
        console.error('PDF processing error:', err);
        
        if (err instanceof Error) {
          if (err.message === "RATE_LIMIT") {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (err.message === "CREDITS_EXHAUSTED") {
            return new Response(
              JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ error: "Failed to process PDF file. Please try uploading a text-based document or a clearer PDF." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Limit document text size
    const MAX_DOCUMENT_SIZE = 100000;
    if (textToProcess.length > MAX_DOCUMENT_SIZE) {
      textToProcess = textToProcess.substring(0, MAX_DOCUMENT_SIZE);
    }

    const systemPrompt = EXTRACTION_PROMPTS[documentType] || EXTRACTION_PROMPTS.other;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the document text to analyze:\n\n${textToProcess}` }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const extractedContent = aiResponse.choices?.[0]?.message?.content;

    if (!extractedContent) {
      throw new Error("No content returned from AI");
    }

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(extractedContent);
    } catch (e) {
      console.error("Failed to parse AI response:", extractedContent);
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(
      JSON.stringify({ extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Extract document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
