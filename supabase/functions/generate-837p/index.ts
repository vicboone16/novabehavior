import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Claim837P {
  claimNumber: string;
  patientName: string;
  patientDob: string;
  patientGender: string;
  patientAddress: string;
  subscriberId: string;
  payerName: string;
  payerId: string;
  renderingProviderNpi: string;
  renderingProviderName: string;
  billingProviderNpi: string;
  billingProviderName: string;
  billingProviderTaxId: string;
  billingProviderAddress: string;
  diagnosisCodes: string[];
  placeOfService: string;
  serviceLines: {
    cptCode: string;
    modifiers: string[];
    units: number;
    charge: number;
    serviceDate: string;
    diagnosisPointers: number[];
  }[];
}

function padSegment(value: string, length: number): string {
  return (value || '').padEnd(length).substring(0, length);
}

function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, '').substring(0, 8);
}

function generate837P(claims: Claim837P[], submitterInfo: { name: string; id: string; contactName: string; contactPhone: string }): string {
  const segments: string[] = [];
  const timestamp = new Date();
  const controlNumber = timestamp.getTime().toString().slice(-9);
  const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = timestamp.toISOString().slice(11, 16).replace(':', '');

  // ISA - Interchange Control Header
  segments.push(`ISA*00*          *00*          *ZZ*${padSegment(submitterInfo.id, 15)}*ZZ*OFFICEALLY     *${dateStr.slice(2)}*${timeStr}*^*00501*${controlNumber}*0*P*:~`);
  
  // GS - Functional Group Header
  segments.push(`GS*HC*${submitterInfo.id}*OFFICEALLY*${dateStr}*${timeStr}*${controlNumber}*X*005010X222A1~`);
  
  // ST - Transaction Set Header
  segments.push(`ST*837*0001*005010X222A1~`);
  
  // BHT - Beginning of Hierarchical Transaction
  segments.push(`BHT*0019*00*${controlNumber}*${dateStr}*${timeStr}*CH~`);

  // Submitter
  segments.push(`NM1*41*2*${submitterInfo.name}*****46*${submitterInfo.id}~`);
  segments.push(`PER*IC*${submitterInfo.contactName}*TE*${submitterInfo.contactPhone}~`);

  // Receiver
  segments.push(`NM1*40*2*OFFICE ALLY*****46*330897513~`);

  let hlCounter = 1;

  claims.forEach((claim, claimIdx) => {
    // HL - Billing Provider
    const billingHL = hlCounter++;
    segments.push(`HL*${billingHL}**20*1~`);
    
    // Billing Provider
    const nameParts = claim.billingProviderName.split(' ');
    segments.push(`NM1*85*2*${claim.billingProviderName}*****XX*${claim.billingProviderNpi}~`);
    segments.push(`N3*${claim.billingProviderAddress}~`);
    segments.push(`REF*EI*${claim.billingProviderTaxId}~`);

    // HL - Subscriber
    const subscriberHL = hlCounter++;
    segments.push(`HL*${subscriberHL}*${billingHL}*22*0~`);
    segments.push(`SBR*P*18*****CI*${claim.payerId}~`);

    // Patient/Subscriber Name
    const patientParts = claim.patientName.split(' ');
    const lastName = patientParts.length > 1 ? patientParts.slice(-1)[0] : patientParts[0];
    const firstName = patientParts.length > 1 ? patientParts.slice(0, -1).join(' ') : '';
    segments.push(`NM1*IL*1*${lastName}*${firstName}****MI*${claim.subscriberId}~`);
    segments.push(`DMG*D8*${formatDate(claim.patientDob)}*${claim.patientGender}~`);

    // Payer
    segments.push(`NM1*PR*2*${claim.payerName}*****PI*${claim.payerId}~`);

    // CLM - Claim Information
    const totalCharge = claim.serviceLines.reduce((s, sl) => s + sl.charge, 0);
    segments.push(`CLM*${claim.claimNumber}*${totalCharge.toFixed(2)}***${claim.placeOfService}:B:1*Y*A*Y*Y~`);

    // Diagnosis Codes
    const diagRefs = claim.diagnosisCodes.map((code, i) => `ABK:${code}`);
    if (diagRefs.length > 0) {
      segments.push(`HI*${diagRefs.join('*')}~`);
    }

    // Rendering Provider
    if (claim.renderingProviderNpi !== claim.billingProviderNpi) {
      const rpParts = claim.renderingProviderName.split(' ');
      const rpLast = rpParts.length > 1 ? rpParts.slice(-1)[0] : rpParts[0];
      const rpFirst = rpParts.length > 1 ? rpParts.slice(0, -1).join(' ') : '';
      segments.push(`NM1*82*1*${rpLast}*${rpFirst}****XX*${claim.renderingProviderNpi}~`);
    }

    // Service Lines
    claim.serviceLines.forEach((sl, lineIdx) => {
      const modStr = sl.modifiers.length > 0 ? `:${sl.modifiers.join(':')}` : '';
      const diagPointers = sl.diagnosisPointers.map(p => p.toString()).join(':') || '1';
      segments.push(`LX*${lineIdx + 1}~`);
      segments.push(`SV1*HC:${sl.cptCode}${modStr}*${sl.charge.toFixed(2)}*UN*${sl.units}***${diagPointers}~`);
      segments.push(`DTP*472*D8*${formatDate(sl.serviceDate)}~`);
    });
  });

  // SE - Transaction Set Trailer
  segments.push(`SE*${segments.length - 2}*0001~`);
  // GE - Functional Group Trailer
  segments.push(`GE*1*${controlNumber}~`);
  // IEA - Interchange Control Trailer
  segments.push(`IEA*1*${controlNumber}~`);

  return segments.join('\n');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !data?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { claims: claimsInput, submitterInfo } = await req.json();
    
    if (!claimsInput || !Array.isArray(claimsInput) || claimsInput.length === 0) {
      return new Response(JSON.stringify({ error: 'No claims provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const defaultSubmitter = {
      name: submitterInfo?.name || 'PROVIDER',
      id: submitterInfo?.id || '000000000',
      contactName: submitterInfo?.contactName || 'Contact',
      contactPhone: submitterInfo?.contactPhone || '0000000000',
    };

    const fileContent = generate837P(claimsInput, defaultSubmitter);
    
    return new Response(JSON.stringify({
      success: true,
      claimCount: claimsInput.length,
      fileContent,
      filename: `837P_${new Date().toISOString().slice(0, 10)}_${claimsInput.length}claims.txt`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
