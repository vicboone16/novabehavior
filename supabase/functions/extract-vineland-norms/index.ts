import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Norm row types
interface SubdomainNormRow {
  form_key: string;
  age_band_key: string;
  domain_key: string;
  subdomain_key: string;
  raw_score: number;
  v_scale_score: number | null;
  age_equivalent: string | null;
  gsv: number | null;
  source_version: string;
}

interface DomainNormRow {
  form_key: string;
  age_band_key: string;
  domain_key: string;
  vscale_sum: number;
  standard_score: number | null;
  percentile: number | null;
  adaptive_level: string | null;
  source_version: string;
}

interface CompositeNormRow {
  form_key: string;
  age_band_key: string;
  composite_key: string;
  lookup_key: number;
  standard_score: number | null;
  percentile: number | null;
  adaptive_level: string | null;
  source_version: string;
}

interface ExtractionResult {
  subdomain_norms: SubdomainNormRow[];
  domain_norms: DomainNormRow[];
  composite_norms: CompositeNormRow[];
}

const EXTRACTION_PROMPT = `You are extracting scoring norm tables from a Vineland-3 manual appendix page.

IMPORTANT: Convert ALL visible scoring table rows into structured JSON. Do NOT summarize. Extract every row.

Normalize keys as follows:

FORM KEYS (determine from appendix letter):
- Appendix B → "comprehensive_interview"
- Appendix C → "parent_caregiver"  
- Appendix D → "teacher"
- Appendix E → "maladaptive_optional"

DOMAIN KEYS: communication, daily_living_skills, socialization, motor_skills, maladaptive_behavior

SUBDOMAIN KEYS: receptive, expressive, written, personal, domestic, community, interpersonal_relationships, play_and_leisure, coping_skills, gross_motor, fine_motor, internalizing, externalizing, critical_items

AGE BAND FORMAT: Convert age ranges like "6:0–6:11" to "6y_0m_to_6y_11m"

If a raw score range maps to a single v-scale score (e.g., raw 43-47 → v-scale 12), expand into individual rows (one per raw score value).

Return a JSON object with this exact structure:
{
  "subdomain_norms": [
    {"form_key":"...","age_band_key":"...","domain_key":"...","subdomain_key":"...","raw_score":18,"v_scale_score":11,"age_equivalent":"5:8","gsv":87,"source_version":"vineland3_appendix_c"}
  ],
  "domain_norms": [
    {"form_key":"...","age_band_key":"...","domain_key":"...","vscale_sum":32,"standard_score":78,"percentile":7,"adaptive_level":"Moderately Low","source_version":"vineland3_appendix_c"}
  ],
  "composite_norms": [
    {"form_key":"...","age_band_key":"...","composite_key":"adaptive_behavior_composite","lookup_key":108,"standard_score":76,"percentile":5,"adaptive_level":"Moderately Low","source_version":"vineland3_appendix_c"}
  ]
}

If a page has no scoring tables (e.g., it's text-only or instructions), return:
{"subdomain_norms":[],"domain_norms":[],"composite_norms":[]}

Only output valid JSON. No markdown, no explanation.`;

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
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

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      pdf_url = "https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/vineland-3/vineland-3-manual-appendices-b-e.pdf",
      page_start = 1,
      page_end = 10,
      dry_run = false,
    } = body;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // We'll process pages by sending the PDF URL to Gemini with page range instructions
    const results: ExtractionResult = {
      subdomain_norms: [],
      domain_norms: [],
      composite_norms: [],
    };

    const errors: string[] = [];
    const batchSize = 5; // Process 5 pages per Gemini call

    for (let batchStart = page_start; batchStart <= page_end; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize - 1, page_end);

      try {
        const geminiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: EXTRACTION_PROMPT,
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Extract all scoring norm table rows from pages ${batchStart} to ${batchEnd} of this Vineland-3 appendix PDF. Return ONLY valid JSON with the three arrays: subdomain_norms, domain_norms, composite_norms.`,
                  },
                  {
                    type: "image_url",
                    image_url: { url: pdf_url },
                  },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 16000,
          }),
        });

        if (!geminiResponse.ok) {
          const errText = await geminiResponse.text();
          errors.push(`Pages ${batchStart}-${batchEnd}: API error ${geminiResponse.status}: ${errText}`);
          continue;
        }

        const geminiData = await geminiResponse.json();
        const content = geminiData.choices?.[0]?.message?.content || "";

        // Parse JSON from response (handle markdown code blocks)
        let jsonStr = content.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }

        const parsed: ExtractionResult = JSON.parse(jsonStr);

        if (parsed.subdomain_norms?.length) {
          results.subdomain_norms.push(...parsed.subdomain_norms);
        }
        if (parsed.domain_norms?.length) {
          results.domain_norms.push(...parsed.domain_norms);
        }
        if (parsed.composite_norms?.length) {
          results.composite_norms.push(...parsed.composite_norms);
        }
      } catch (err) {
        errors.push(`Pages ${batchStart}-${batchEnd}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Insert into database unless dry_run
    let insertedCounts = { subdomain: 0, domain: 0, composite: 0 };

    if (!dry_run && (results.subdomain_norms.length || results.domain_norms.length || results.composite_norms.length)) {
      // Insert subdomain norms in batches of 100
      if (results.subdomain_norms.length) {
        const rows = results.subdomain_norms.map(r => ({
          ...r,
          is_active: true,
        }));
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const { error: insertErr } = await serviceClient
            .from("vineland3_norm_lookup_subdomains")
            .upsert(batch, {
              onConflict: "form_key,age_band_key,subdomain_key,raw_score",
              ignoreDuplicates: false,
            });
          if (insertErr) {
            errors.push(`Subdomain insert batch ${i}: ${insertErr.message}`);
          } else {
            insertedCounts.subdomain += batch.length;
          }
        }
      }

      // Insert domain norms
      if (results.domain_norms.length) {
        const rows = results.domain_norms.map(r => ({
          ...r,
          is_active: true,
        }));
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const { error: insertErr } = await serviceClient
            .from("vineland3_norm_lookup_domains")
            .upsert(batch, {
              onConflict: "form_key,age_band_key,domain_key,vscale_sum",
              ignoreDuplicates: false,
            });
          if (insertErr) {
            errors.push(`Domain insert batch ${i}: ${insertErr.message}`);
          } else {
            insertedCounts.domain += batch.length;
          }
        }
      }

      // Insert composite norms
      if (results.composite_norms.length) {
        const rows = results.composite_norms.map(r => ({
          ...r,
          is_active: true,
        }));
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const { error: insertErr } = await serviceClient
            .from("vineland3_norm_lookup_composites")
            .upsert(batch, {
              onConflict: "form_key,age_band_key,composite_key,lookup_key",
              ignoreDuplicates: false,
            });
          if (insertErr) {
            errors.push(`Composite insert batch ${i}: ${insertErr.message}`);
          } else {
            insertedCounts.composite += batch.length;
          }
        }
      }

      // Log import history
      await serviceClient.from("vineland3_norm_import_history").insert({
        imported_by: user.id,
        source_filename: `pdf_extraction_pages_${page_start}_to_${page_end}`,
        table_type: "all",
        row_count: insertedCounts.subdomain + insertedCounts.domain + insertedCounts.composite,
        status: errors.length > 0 ? "partial" : "success",
        notes: JSON.stringify({
          source_url: pdf_url,
          page_range: `${page_start}-${page_end}`,
          inserted: insertedCounts,
          errors: errors.length,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        extracted: {
          subdomain_norms: results.subdomain_norms.length,
          domain_norms: results.domain_norms.length,
          composite_norms: results.composite_norms.length,
        },
        inserted: dry_run ? null : insertedCounts,
        errors,
        sample: {
          subdomain: results.subdomain_norms.slice(0, 3),
          domain: results.domain_norms.slice(0, 3),
          composite: results.composite_norms.slice(0, 3),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
