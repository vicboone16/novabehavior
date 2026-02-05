import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============ Types ============

interface ExtractionRequest {
  file_path?: string;
  file_url?: string;
  document_text?: string;
  document_type_hint?: string;
  student_id?: string;
  options?: {
    force_ocr?: boolean;
    extract_tables?: boolean;
    confidence_threshold?: number;
  };
}

interface SourceReference {
  page: number;
  snippet: string;
}

interface ExtractedField {
  value: unknown;
  confidence: number;
  source: SourceReference;
  evidence_type: 'labeled' | 'inferred' | 'weak';
}

interface ExtractionResult {
  document: {
    document_id: string;
    filename: string;
    detected_doc_type: string;
    pages: number;
    ingestion_profile: string;
  };
  entities: {
    client: {
      full_name: ExtractedField;
      dob?: ExtractedField;
      grade?: ExtractedField;
      school?: ExtractedField;
    };
    doc_payload: unknown;
  };
  confidence: {
    overall: number;
    field_confidence: Array<{
      field_path: string;
      score: number;
      source: SourceReference;
    }>;
    warnings: string[];
    requires_review_reasons: string[];
  };
  proposed_actions: Array<{
    action_id: string;
    action_type: string;
    target: string;
    summary: string;
    requires_review: boolean;
  }>;
  background_info?: Record<string, unknown>;
  raw_extraction?: unknown;
}

// ============ Clinical Extraction Prompts ============

const CLINICAL_SYSTEM_PROMPT = `You are a clinical-grade document intelligence system for special education and ABA workflows.

CRITICAL RULES:
1. ACCURACY IS PARAMOUNT - Never guess or infer critical data
2. PRESERVE ORIGINAL WORDING - Extract verbatim whenever possible
3. CONFIDENCE SCORING - Rate each field's confidence (0-1) based on clarity
4. SOURCE TRACING - Include page numbers and source snippets for all extracted data
5. FLAG AMBIGUITY - If unclear, mark confidence low and flag for review

ENTITY IDENTIFICATION (CRITICAL - ZERO TOLERANCE FOR ERRORS):
The CLIENT/STUDENT is the person RECEIVING services. This is the MOST IMPORTANT extraction.

STEP 1 - REQUIRED LABELS: ONLY extract a name as CLIENT/STUDENT if it appears IMMEDIATELY AFTER one of these labels:
  - "Student Name:", "Student:", "Client:", "Child's Name:", "Examinee:", "Learner:", "Individual:", "Name:"
  - The label should be on the same line or directly above the name

STEP 2 - EXPLICIT REJECTION: NEVER extract a name that appears with ANY of these patterns:
  - Near professional titles: "BCBA", "BCaBA", "RBT", "Teacher", "Parent", "Evaluator", "Case Manager", "Psychologist"
  - In signature blocks: "Signature:", "Signed:", "Approved by:", "Reviewed by:", "Prepared by:", "Conducted by:", "Administered by:"
  - With professional credentials: MA, M.Ed., PhD, BCBA-D, RBT, LPC, LCSW, OT, SLP, Ed.D., Psy.D., MSW
  - In meeting attendee lists unless explicitly labeled as "Student:" or "Client:"
  - Names that appear primarily in headers/footers as document authors

STEP 3 - VALIDATION:
  - If DOB indicates adult (18+ based on document date), flag for review - this is likely staff, not client
  - Cross-check: Does this name appear with pronouns like "he/she will" or "the student will"? That confirms it's the client
  - If no labeled name found, set confidence to 0.3 and add warning "No labeled student name found"

STEP 4 - EVIDENCE:
  - Always include evidence_type: "labeled" (found after explicit label like "Student:") or "inferred" (pattern-based)
  - Include source_snippet showing the EXACT text around the name including any label
  - If evidence_type is "inferred", confidence should be max 0.7

For each extracted field, provide:
- value: The extracted data
- confidence: 0-1 score based on clarity and certainty
- source_page: Page number where found
- source_snippet: Exact text snippet from document
- evidence_type: "labeled" (clearly labeled), "inferred" (pattern-based), or "weak" (uncertain)`;

const DOC_TYPE_PROMPTS: Record<string, string> = {
  IEP: `Extract from this IEP document:

1. CLIENT IDENTITY (critical - must be accurate):
   - full_name: Student's complete name (the CHILD receiving services, NOT teachers/staff/parents)
   - dob: Date of birth
   - grade: Current grade level
   - school: School name
   
   IMPORTANT: The student is the person the IEP is ABOUT, not the people who wrote it or attend meetings.
   Look for "Student Name:", "Student:", or similar labels. Ignore names near "Teacher:", "Parent:", "Case Manager:", etc.

2. GOALS (each with source reference):
   - goal_text: Full goal text verbatim
   - domain: Academic/Behavioral/Social-Emotional/Adaptive/Communication/Motor
   - measurement_type: percent/frequency/duration/trials/other
   - baseline: Current performance level
   - mastery_criteria: Criteria for mastery
   - objectives: Any sub-objectives

3. SERVICES:
   - service_name: Service type
   - provider_role: Who provides it
   - minutes_per_session: Session length
   - frequency: How often
   - setting: Where delivered

4. ACCOMMODATIONS:
   - accommodation_text: Full text
   - category: Testing/Classroom/Behavior/Other

5. DATES:
   - effective_date: When IEP begins
   - review_date: Annual review date

Return as JSON with confidence scores and source references for each field.`,

  FBA: `Extract from this Functional Behavior Assessment:

1. CLIENT IDENTITY (critical):
   - full_name: The STUDENT/CLIENT whose behavior is being assessed (NOT the clinician/evaluator)
   - dob, grade, school
   
   IMPORTANT: The client is the child/student being evaluated, NOT the BCBA, psychologist, or teacher who conducted the assessment.
   Look for labels like "Student:", "Client:", "Individual:". Ignore names near "Conducted by:", "Evaluator:", "BCBA:", etc.

2. TARGET BEHAVIORS (for each):
   - behavior_name: Name of behavior
   - operational_definition: Exact definition from document
   - hypothesized_function: attention/escape/access/automatic
   - antecedents: Triggers identified
   - consequences: What maintains the behavior
   - setting_events: Environmental factors
   - replacement_behaviors: Alternatives suggested

3. ASSESSMENT METHODS:
   - Methods used (interviews, observations, rating scales)

4. SUMMARY & RECOMMENDATIONS:
   - Summary of findings
   - Specific recommendations

5. BACKGROUND INFORMATION:
   - referral_reason
   - previous_interventions
   - relevant_history

Return as JSON with confidence scores and source references.`,

  BIP: `Extract from this Behavior Intervention Plan:

1. CLIENT IDENTITY (critical):
   - full_name: The STUDENT/CLIENT for whom the plan was created (NOT staff members)
   - dob, grade, school
   
   IMPORTANT: The client is the child receiving behavioral support, NOT the teachers, therapists, or parents implementing the plan.

2. TARGET BEHAVIORS:
   - List of behaviors addressed

3. INTERVENTION STRATEGIES:
   - prevention_strategies: Antecedent modifications
   - teaching_strategies: Skill building approaches
   - response_strategies: How to respond to behavior
   - reinforcement_plan: Reward system details
   - crisis_plan: Emergency procedures

4. DATA COLLECTION PLAN:
   - How progress will be measured

5. TEAM RESPONSIBILITIES:
   - Who does what

Return as JSON with confidence scores and source references.`,

  ASSESSMENT_REPORT: `Extract from this assessment/evaluation report:

1. CLIENT IDENTITY (critical):
   - full_name: The STUDENT/CLIENT being assessed (NOT the examiner/evaluator)
   - dob, grade, school
   
   IMPORTANT: The client is the individual being evaluated, NOT the professional who administered the assessment.
   Look for "Examinee:", "Student:", "Client:". Ignore "Examiner:", "Administered by:", "Evaluator:".

2. ASSESSMENT TYPE:
   - Type of assessment (VB-MAPP, ABLLS-R, Vineland, etc.)
   - Assessment date
   - Administered by

3. SCORES (for each domain/item):
   - domain: Assessment domain
   - code: Item code if applicable
   - score: Numeric or categorical score
   - age_equivalent: If provided

4. SUMMARY:
   - Strengths identified
   - Areas of need
   - Recommendations

Return as JSON with confidence scores and source references.`,

  OTHER: `Extract any relevant educational/clinical information:

1. CLIENT IDENTITY if present:
   - The CLIENT is the person RECEIVING services (usually a child/student)
   - NOT the clinician, teacher, parent, or evaluator
   - Look for "Student:", "Client:", "Child:" labels
   
2. Any goals, services, or accommodations
3. Assessment data
4. Recommendations
5. Important dates

Return as JSON with confidence scores and source references.`
};

// ============ URL Validation ============

function validateFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' ||
        hostname.match(/^(127|10|192\.168|172\.(1[6-9]|2[0-9]|3[01]))\./) ||
        hostname === '169.254.169.254') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ============ Document Detection ============

function detectDocumentType(text: string, hint?: string): string {
  if (hint && ['IEP', 'FBA', 'BIP', 'ASSESSMENT_REPORT'].includes(hint)) {
    return hint;
  }

  const textLower = text.toLowerCase();
  
  // IEP indicators
  if (textLower.includes('individualized education program') ||
      textLower.includes('annual goals') ||
      textLower.includes('special education services') ||
      textLower.includes('least restrictive environment')) {
    return 'IEP';
  }
  
  // FBA indicators
  if (textLower.includes('functional behavior assessment') ||
      textLower.includes('hypothesized function') ||
      textLower.includes('antecedent-behavior-consequence') ||
      textLower.includes('function of behavior')) {
    return 'FBA';
  }
  
  // BIP indicators
  if (textLower.includes('behavior intervention plan') ||
      textLower.includes('behavior support plan') ||
      textLower.includes('prevention strategies') ||
      textLower.includes('replacement behavior')) {
    return 'BIP';
  }
  
  // Assessment indicators
  if (textLower.includes('vb-mapp') ||
      textLower.includes('ablls') ||
      textLower.includes('vineland') ||
      textLower.includes('assessment results')) {
    return 'ASSESSMENT_REPORT';
  }
  
  return 'OTHER';
}

// ============ Extract with Vision ============

async function extractWithVision(
  fileBase64: string,
  mimeType: string,
  apiKey: string
): Promise<string> {
  console.log('Extracting with vision model...');
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract ALL text from this document image. Preserve:
- Page structure and sections
- Tables (format as structured data)
- Headers and bullet points
- All text content verbatim

Return the complete extracted text.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${fileBase64}`
              }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Vision extraction failed: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || '';
}

// ============ Clinical Extraction ============

async function performClinicalExtraction(
  text: string,
  docType: string,
  apiKey: string
): Promise<unknown> {
  const prompt = DOC_TYPE_PROMPTS[docType] || DOC_TYPE_PROMPTS.OTHER;
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: CLINICAL_SYSTEM_PROMPT },
        { role: "user", content: `${prompt}\n\nDOCUMENT TEXT:\n${text.substring(0, 80000)}` }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_document_data",
            description: "Extract structured data from the clinical document",
            parameters: {
              type: "object",
              properties: {
                client: {
                  type: "object",
                  properties: {
                    full_name: {
                      type: "object",
                      properties: {
                        value: { type: "string" },
                        confidence: { type: "number" },
                        source_page: { type: "number" },
                        source_snippet: { type: "string" },
                        evidence_type: { type: "string", enum: ["labeled", "inferred", "weak"] }
                      },
                      required: ["value", "confidence"]
                    },
                    dob: {
                      type: "object",
                      properties: {
                        value: { type: "string" },
                        confidence: { type: "number" },
                        source_page: { type: "number" },
                        source_snippet: { type: "string" },
                        evidence_type: { type: "string" }
                      }
                    },
                    grade: {
                      type: "object",
                      properties: {
                        value: { type: "string" },
                        confidence: { type: "number" },
                        source_page: { type: "number" }
                      }
                    },
                    school: {
                      type: "object",
                      properties: {
                        value: { type: "string" },
                        confidence: { type: "number" },
                        source_page: { type: "number" }
                      }
                    }
                  },
                  required: ["full_name"]
                },
                goals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      goal_text: { type: "string" },
                      domain: { type: "string" },
                      measurement_type: { type: "string" },
                      baseline: { type: "string" },
                      mastery_criteria: { type: "string" },
                      objectives: { type: "array", items: { type: "string" } },
                      confidence: { type: "number" },
                      source_page: { type: "number" },
                      source_snippet: { type: "string" }
                    },
                    required: ["goal_text", "confidence"]
                  }
                },
                services: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      service_name: { type: "string" },
                      provider_role: { type: "string" },
                      minutes_per_session: { type: "number" },
                      frequency: { type: "string" },
                      setting: { type: "string" },
                      confidence: { type: "number" },
                      source_page: { type: "number" }
                    }
                  }
                },
                accommodations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      category: { type: "string" },
                      confidence: { type: "number" },
                      source_page: { type: "number" }
                    }
                  }
                },
                target_behaviors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      behavior_name: { type: "string" },
                      operational_definition: { type: "string" },
                      hypothesized_function: { type: "array", items: { type: "string" } },
                      antecedents: { type: "array", items: { type: "string" } },
                      consequences: { type: "array", items: { type: "string" } },
                      replacement_behaviors: { type: "array", items: { type: "string" } },
                      confidence: { type: "number" },
                      source_page: { type: "number" },
                      source_snippet: { type: "string" }
                    }
                  }
                },
                intervention_strategies: {
                  type: "object",
                  properties: {
                    prevention_strategies: { type: "array", items: { type: "string" } },
                    teaching_strategies: { type: "array", items: { type: "string" } },
                    response_strategies: { type: "array", items: { type: "string" } },
                    reinforcement_plan: { type: "string" },
                    crisis_plan: { type: "string" }
                  }
                },
                assessment_scores: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      domain: { type: "string" },
                      code: { type: "string" },
                      score: { type: "string" },
                      confidence: { type: "number" },
                      source_page: { type: "number" }
                    }
                  }
                },
                dates: {
                  type: "object",
                  properties: {
                    effective_date: { type: "string" },
                    review_date: { type: "string" },
                    assessment_date: { type: "string" }
                  }
                },
                background_info: {
                  type: "object",
                  properties: {
                    referral_reason: { type: "string" },
                    previous_interventions: { type: "string" },
                    diagnoses: { type: "string" },
                    medical_info: { type: "string" },
                    family_info: { type: "string" }
                  }
                },
                summary: { type: "string" },
                recommendations: { type: "array", items: { type: "string" } },
                overall_extraction_confidence: { type: "number" },
                extraction_warnings: { type: "array", items: { type: "string" } }
              },
              required: ["client"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "extract_document_data" } }
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("CREDITS_EXHAUSTED");
    throw new Error(`Extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  
  throw new Error("No extraction result");
}

// ============ Build Extraction Result ============

function buildExtractionResult(
  rawExtraction: Record<string, unknown>,
  docType: string,
  filename: string
): ExtractionResult {
  const extraction = rawExtraction as Record<string, unknown>;
  const client = extraction.client as Record<string, unknown> || {};
  const fullName = client.full_name as Record<string, unknown> || {};
  
  // Build field confidence entries
  const fieldConfidence: Array<{ field_path: string; score: number; source: SourceReference }> = [];
  
  if (fullName.value) {
    fieldConfidence.push({
      field_path: '$.entities.client.full_name',
      score: (fullName.confidence as number) || 0.5,
      source: {
        page: (fullName.source_page as number) || 1,
        snippet: (fullName.source_snippet as string) || String(fullName.value)
      }
    });
  }

  // Calculate overall confidence
  const overallConfidence = (extraction.overall_extraction_confidence as number) || 0.7;
  const warnings = (extraction.extraction_warnings as string[]) || [];
  
  // Determine review requirements
  const requiresReviewReasons: string[] = [];
  if (overallConfidence < 0.85) {
    requiresReviewReasons.push(`Overall confidence (${Math.round(overallConfidence * 100)}%) below threshold`);
  }
  if ((fullName.confidence as number || 0) < 0.9) {
    requiresReviewReasons.push('Client name confidence is low');
  }

  // Build proposed actions
  const proposedActions: ExtractionResult['proposed_actions'] = [];
  
  // Goals → CREATE_PROGRAM_ITEM
  const goals = extraction.goals as Array<Record<string, unknown>> || [];
  for (const goal of goals) {
    proposedActions.push({
      action_id: crypto.randomUUID(),
      action_type: 'CREATE_PROGRAM_ITEM',
      target: 'skill_target',
      summary: `Create target: ${(goal.goal_text as string || '').substring(0, 50)}...`,
      requires_review: (goal.confidence as number || 0) < 0.85
    });
  }

  // Behaviors → CREATE_PROGRAM_ITEM
  const behaviors = extraction.target_behaviors as Array<Record<string, unknown>> || [];
  for (const behavior of behaviors) {
    proposedActions.push({
      action_id: crypto.randomUUID(),
      action_type: 'CREATE_PROGRAM_ITEM',
      target: 'behavior_program',
      summary: `Create behavior: ${behavior.behavior_name}`,
      requires_review: (behavior.confidence as number || 0) < 0.85
    });
  }

  return {
    document: {
      document_id: crypto.randomUUID(),
      filename,
      detected_doc_type: docType,
      pages: 1, // Will be updated with actual count
      ingestion_profile: 'native_text_pdf'
    },
    entities: {
      client: {
        full_name: {
          value: fullName.value || '',
          confidence: (fullName.confidence as number) || 0.5,
          source: {
            page: (fullName.source_page as number) || 1,
            snippet: (fullName.source_snippet as string) || ''
          },
          evidence_type: (fullName.evidence_type as 'labeled' | 'inferred' | 'weak') || 'inferred'
        },
        ...(client.dob ? { dob: client.dob as ExtractedField } : {}),
        ...(client.grade ? { grade: client.grade as ExtractedField } : {}),
        ...(client.school ? { school: client.school as ExtractedField } : {})
      },
      doc_payload: {
        type: docType,
        goals,
        services: extraction.services,
        accommodations: extraction.accommodations,
        target_behaviors: behaviors,
        intervention_strategies: extraction.intervention_strategies,
        assessment_scores: extraction.assessment_scores,
        dates: extraction.dates,
        summary: extraction.summary,
        recommendations: extraction.recommendations
      }
    },
    confidence: {
      overall: overallConfidence,
      field_confidence: fieldConfidence,
      warnings,
      requires_review_reasons: requiresReviewReasons
    },
    proposed_actions: proposedActions,
    background_info: extraction.background_info as Record<string, unknown>,
    raw_extraction: extraction
  };
}

// ============ Main Handler ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request: ExtractionRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let documentText = request.document_text || '';
    let filename = 'document';

    // Handle file URL
    if (request.file_url && !documentText) {
      if (!validateFileUrl(request.file_url)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid file URL' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileResponse = await fetch(request.file_url);
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch file');
      }

      const contentType = fileResponse.headers.get('content-type') || '';
      const buffer = await fileResponse.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // For images, use vision extraction
      if (contentType.includes('image')) {
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binary);
        
        documentText = await extractWithVision(base64, contentType, LOVABLE_API_KEY);
      } else {
        // For PDFs, try text extraction first
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binary);

        // Use Gemini to extract from PDF
        const pdfResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [{
              role: "user",
              content: `Extract ALL text from this PDF document (base64 encoded). Preserve structure, tables, and formatting:

${base64.substring(0, 60000)}

Return the complete extracted text.`
            }]
          }),
        });

        if (pdfResponse.ok) {
          const pdfResult = await pdfResponse.json();
          documentText = pdfResult.choices?.[0]?.message?.content || '';
        }
      }

      if (!documentText || documentText.length < 50) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Could not extract text from document. Try a different format.' 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Detect document type
    const docType = detectDocumentType(documentText, request.document_type_hint);
    console.log(`Detected document type: ${docType}`);

    // Perform clinical extraction
    const rawExtraction = await performClinicalExtraction(
      documentText,
      docType,
      LOVABLE_API_KEY
    );

    // Build structured result
    const result = buildExtractionResult(
      rawExtraction as Record<string, unknown>,
      docType,
      filename
    );

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        result,
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Clinical extraction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'RATE_LIMIT') {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (errorMessage === 'CREDITS_EXHAUSTED') {
      return new Response(
        JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits.' }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
