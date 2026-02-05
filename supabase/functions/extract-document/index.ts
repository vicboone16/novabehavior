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

CRITICAL - EXTRACT CLIENT IDENTITY FIRST:
The CLIENT/STUDENT is the person RECEIVING services (the child being assessed), NOT the clinician or evaluator.
- ONLY use names that appear IMMEDIATELY AFTER these labels: "Student Name:", "Student:", "Client:", "Child's Name:", "Examinee:", "Learner:"
- REJECT any name appearing near: "BCBA", "Teacher", "Parent", "Evaluator", "Prepared by:", "Signature:", "Conducted by:"
- REJECT names with credentials: MA, M.Ed., PhD, BCBA-D, RBT, LPC
- If no labeled student name exists, set studentConfidence to 0.3
- Include sourceLabel showing the exact label found (e.g., "Found after 'Student Name:'")

Extract:

1. Student Information:
   - student_name: The student's name (following rules above)
   - student_dob: Date of birth
   - student_grade: Grade level
   - student_school: School name
   - studentConfidence: 0-1 confidence score
   - sourceLabel: The label that preceded the name

2. Target Behaviors: List each target behavior with its operational definition
3. Antecedents: Common triggers or events that occur before the behavior
4. Consequences: What happens after the behavior occurs
5. Hypothesized Functions: The hypothesized function(s) of the behavior (attention, escape, tangible, sensory)
6. Setting Events: Environmental or contextual factors
7. Assessment Tools Used: Any assessment tools mentioned (FAST, QABF, MAS, etc.)
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with the following structure:
{
  "student": {
    "name": "string",
    "dob": "string",
    "grade": "string",
    "school": "string",
    "confidence": number,
    "sourceLabel": "string"
  },
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

CRITICAL - EXTRACT CLIENT IDENTITY FIRST:
The CLIENT/STUDENT is the person RECEIVING services (the child with the behavior plan), NOT the staff implementing it.
- ONLY use names that appear IMMEDIATELY AFTER these labels: "Student Name:", "Student:", "Client:", "Child's Name:", "Learner:"
- REJECT any name appearing near: "BCBA", "Teacher", "Parent", "Case Manager", "Prepared by:", "Signature:"
- REJECT names with credentials: MA, M.Ed., PhD, BCBA-D, RBT
- If no labeled student name exists, set studentConfidence to 0.3

Extract:

1. Student Information:
   - student_name, student_dob, student_grade, student_school
   - studentConfidence: 0-1, sourceLabel: the label found

2. Replacement Behaviors: Alternative behaviors being taught
3. Preventative Strategies: Antecedent modifications and prevention strategies
4. Teaching Strategies: How replacement behaviors will be taught
5. Reactive Strategies: Response procedures when problem behavior occurs
6. Crisis Procedures: Emergency or crisis management procedures
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with the following structure:
{
  "student": {
    "name": "string",
    "dob": "string",
    "grade": "string",
    "school": "string",
    "confidence": number,
    "sourceLabel": "string"
  },
  "replacementBehaviors": [{"name": "string", "definition": "string"}],
  "preventativeStrategies": [{"value": "string"}],
  "teachingStrategies": [{"value": "string"}],
  "reactiveStrategies": [{"value": "string"}],
  "crisisProcedures": [{"value": "string"}],
  "backgroundInfo": { ... }
}

Only include fields that are found in the document. If a field is not found, omit it or use an empty array.`,

  iep: `You are an expert at analyzing Individualized Education Programs (IEPs). Extract the following information from the document text provided:

CRITICAL - EXTRACT CLIENT IDENTITY FIRST:
The CLIENT/STUDENT is the person RECEIVING services (the student the IEP is written FOR), NOT teachers or staff.
- ONLY use names that appear IMMEDIATELY AFTER these labels: "Student Name:", "Student:", "Child's Name:", "Learner:", "Name of Student:"
- REJECT any name appearing near: "Teacher", "Parent", "Case Manager", "Special Education Teacher", "Signature:"
- REJECT names with credentials or job titles
- If no labeled student name exists, set studentConfidence to 0.3

Extract:

1. Student Information:
   - student_name, student_dob, student_grade, student_school
   - studentConfidence: 0-1, sourceLabel: the label found

2. Goals: Academic, behavioral, and social-emotional learning goals
3. Accommodations: Classroom and testing accommodations
4. Behavior Supports: Any behavior support plans or strategies
5. Service Minutes: Related services and their frequency/duration
6. Review Dates: Important dates for review or reassessment
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with the following structure:
{
  "student": {
    "name": "string",
    "dob": "string",
    "grade": "string",
    "school": "string",
    "confidence": number,
    "sourceLabel": "string"
  },
  "goals": [{"text": "string", "type": "academic|behavioral|sel"}],
  "accommodations": [{"value": "string"}],
  "behaviorSupports": [{"value": "string"}],
  "serviceMinutes": [{"service": "string", "minutes": number}],
  "reviewDates": [{"date": "string"}],
  "backgroundInfo": { ... }
}

Only include fields that are found in the document. If a field is not found, omit it or use an empty array.`,

  'psycho-ed': `You are an expert at analyzing psychological and educational evaluation reports. Extract key information including:

CRITICAL - EXTRACT CLIENT IDENTITY FIRST:
The CLIENT is the person BEING EVALUATED (usually a child), NOT the examiner or psychologist.
- ONLY use names after labels: "Examinee:", "Student:", "Client:", "Child's Name:", "Name:"
- REJECT any name near: "Examiner:", "Psychologist:", "Evaluator:", "Administered by:", "Ph.D.", "Psy.D."
- If no labeled name found, set confidence to 0.3

1. Student/Examinee Information (name, dob, grade, school, confidence, sourceLabel)
2. Cognitive/IQ Scores
3. Achievement Scores
4. Diagnoses
5. Recommendations
6. Eligibility Determinations
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with student info and relevant fields found in the document, including backgroundInfo.`,

  'progress-report': `You are an expert at analyzing progress reports. Extract key information including:

CRITICAL - EXTRACT CLIENT IDENTITY FIRST:
The CLIENT is the person the progress report is ABOUT (the student), NOT the therapist writing it.
- ONLY use names after labels: "Student:", "Client:", "Learner:", "Name:"
- REJECT any name near: "BCBA:", "Therapist:", "Prepared by:", "Written by:"
- If no labeled name found, set confidence to 0.3

1. Student Information (name, dob, grade, school, confidence, sourceLabel)
2. Goals and Current Progress
3. Data Trends
4. Recommendations
5. Next Steps
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with student info and relevant fields found in the document, including backgroundInfo.`,

  intake: `You are an expert at analyzing client intake documents. Extract key background information from the document.

CRITICAL - EXTRACT CLIENT IDENTITY FIRST:
The CLIENT is the person BEING REFERRED for services (usually a child), NOT the parent or referrer.
- ONLY use names after labels: "Client:", "Child:", "Student:", "Patient:", "Name of Child:"
- Parent/guardian names should go in a separate field, NOT as the client
- If no labeled client name found, set confidence to 0.3

1. Client Information (name, dob, grade, school, confidence, sourceLabel)
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with client info and the backgroundInfo object containing all relevant fields found in the document.`,

  other: `Extract any relevant educational or behavioral information from this document. Look for:

CRITICAL - EXTRACT CLIENT IDENTITY FIRST (if present):
The CLIENT/STUDENT is the person RECEIVING services, NOT staff or document authors.
- ONLY use names after labels: "Student:", "Client:", "Child:", "Learner:", "Name:"
- REJECT names with credentials (BCBA, PhD, etc.) or near signature blocks
- If no labeled name found, set confidence to 0.3

1. Student information
2. Goals or objectives
3. Behavioral data
4. Recommendations
5. Services or supports
${BACKGROUND_INFO_PROMPT}

Return the data as a JSON object with student info (if found) and relevant fields, including backgroundInfo.`
};

// Validate file URL to prevent SSRF attacks
function validateFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      console.error('URL validation failed: not HTTPS');
      return false;
    }
    
    // Get Supabase URL to validate against
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      console.error('URL validation failed: SUPABASE_URL not set');
      return false;
    }
    
    // Check if URL is from Supabase storage (allow signed URLs from our project)
    const supabaseDomain = new URL(supabaseUrl).hostname;
    if (!parsed.hostname.endsWith(supabaseDomain) && !parsed.hostname.includes('supabase')) {
      console.error('URL validation failed: not a Supabase URL');
      return false;
    }
    
    // Block private IP ranges and localhost
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' ||
        hostname.match(/^127\./) ||
        hostname.match(/^10\./) ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./) ||
        hostname.match(/^192\.168\./) ||
        hostname.match(/^169\.254\./) ||
        hostname.match(/^0\./) ||
        hostname === '[::1]') {
      console.error('URL validation failed: private IP range');
      return false;
    }
    
    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254' || 
        hostname.includes('metadata.google') ||
        hostname.includes('metadata.aws')) {
      console.error('URL validation failed: cloud metadata endpoint');
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('URL validation failed: invalid URL', err);
    return false;
  }
}

async function extractTextFromPdf(fileUrl: string, apiKey: string): Promise<string> {
  console.log('Fetching PDF from URL:', fileUrl);
  
  // Validate URL to prevent SSRF attacks
  if (!validateFileUrl(fileUrl)) {
    throw new Error('Invalid file URL: only Supabase storage URLs are allowed');
  }
  
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

  // Try multiple approaches for PDF text extraction
  // Approach 1: Use Gemini with file upload format (supports PDFs natively)
  console.log('Attempting PDF extraction with Gemini file format...');
  
  try {
    // Gemini supports PDFs via the file_data format
    const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "user", 
            content: `I have a PDF document encoded in base64. Please extract ALL text content from this document, maintaining the structure and organization. Include all sections, headers, bullet points, tables, and data.

Here is the base64-encoded PDF content (this is the raw PDF file):
${pdfBase64.substring(0, 50000)}${pdfBase64.length > 50000 ? '...[truncated for size]' : ''}

Extract and return all the text content you can read from this PDF. If you cannot read the PDF content directly, please indicate that.`
          }
        ],
      }),
    });

    if (extractionResponse.ok) {
      const extractionResult = await extractionResponse.json();
      const extractedText = extractionResult.choices?.[0]?.message?.content || '';
      
      // Check if extraction was successful (not just an error message)
      if (extractedText.length > 100 && 
          !extractedText.toLowerCase().includes('cannot read') &&
          !extractedText.toLowerCase().includes('unable to extract') &&
          !extractedText.toLowerCase().includes('cannot extract')) {
        console.log('PDF extraction successful via text prompt, length:', extractedText.length);
        return extractedText;
      }
      console.log('Extraction returned but may not have content, trying alternative...');
    }
  } catch (err) {
    console.log('First extraction approach failed:', err);
  }

  // Approach 2: Try with GPT model which may handle base64 PDFs differently
  console.log('Attempting PDF extraction with GPT model...');
  
  try {
    const gptResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { 
            role: "user", 
            content: `This is a base64-encoded PDF document. Please analyze it and extract all text content:

${pdfBase64.substring(0, 30000)}

Extract all readable text maintaining structure (headers, sections, bullet points, tables). Return only the extracted text.`
          }
        ],
      }),
    });

    if (gptResponse.ok) {
      const gptResult = await gptResponse.json();
      const gptText = gptResult.choices?.[0]?.message?.content || '';
      
      if (gptText.length > 100 && 
          !gptText.toLowerCase().includes('cannot read') &&
          !gptText.toLowerCase().includes('unable to')) {
        console.log('PDF extraction successful via GPT, length:', gptText.length);
        return gptText;
      }
    }
  } catch (err) {
    console.log('GPT extraction failed:', err);
  }

  // If all approaches fail, throw an error
  console.error('All PDF extraction approaches failed');
  throw new Error("PDF_EXTRACTION_FAILED");
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
          if (err.message === "PDF_EXTRACTION_FAILED") {
            return new Response(
              JSON.stringify({ error: "Could not extract text from this PDF. The document may be scanned images without OCR text, password-protected, or in an unsupported format. Try converting to a Word document (.docx) or ensuring the PDF has selectable text." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ error: "Failed to process PDF file. Try uploading a Word document (.docx) for better results." }),
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
