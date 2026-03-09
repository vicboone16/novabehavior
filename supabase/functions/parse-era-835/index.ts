import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ERASegment {
  type: string;
  elements: string[];
}

interface ParsedRemittance {
  payerName: string;
  payerIdCode: string;
  payeeName: string;
  payeeNpi: string;
  checkEftNumber: string;
  paymentMethod: string;
  paymentDate: string;
  totalPaid: number;
  claims: ParsedClaim[];
}

interface ParsedClaim {
  patientName: string;
  patientId: string;
  claimNumber: string;
  totalCharge: number;
  totalPaid: number;
  serviceLines: ParsedServiceLine[];
}

interface ParsedServiceLine {
  cptCode: string;
  modifiers: string[];
  serviceDateFrom: string;
  serviceDateTo: string;
  billedAmount: number;
  allowedAmount: number;
  paidAmount: number;
  patientResponsibility: number;
  adjustmentReasonCodes: string[];
  adjustmentAmounts: number[];
  remarkCodes: string[];
}

function parseSegments(rawContent: string): ERASegment[] {
  // Handle different delimiters
  const segmentDelimiter = rawContent.includes('~') ? '~' : '\n';
  const elementDelimiter = rawContent.includes('*') ? '*' : '|';
  
  return rawContent
    .split(segmentDelimiter)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => {
      const elements = s.split(elementDelimiter);
      return { type: elements[0], elements };
    });
}

function parseERA835(rawContent: string): ParsedRemittance[] {
  const segments = parseSegments(rawContent);
  const remittances: ParsedRemittance[] = [];
  
  let currentRemittance: ParsedRemittance | null = null;
  let currentClaim: ParsedClaim | null = null;
  let currentServiceLine: ParsedServiceLine | null = null;

  for (const seg of segments) {
    switch (seg.type) {
      case 'BPR': // Payment info
        currentRemittance = {
          payerName: '',
          payerIdCode: '',
          payeeName: '',
          payeeNpi: '',
          checkEftNumber: seg.elements[10] || '',
          paymentMethod: seg.elements[4] || 'CHK',
          paymentDate: seg.elements[16] || '',
          totalPaid: parseFloat(seg.elements[2]) || 0,
          claims: [],
        };
        remittances.push(currentRemittance);
        break;

      case 'N1': // Name segments
        if (currentRemittance) {
          if (seg.elements[1] === 'PR') {
            currentRemittance.payerName = seg.elements[2] || '';
            currentRemittance.payerIdCode = seg.elements[4] || '';
          } else if (seg.elements[1] === 'PE') {
            currentRemittance.payeeName = seg.elements[2] || '';
            currentRemittance.payeeNpi = seg.elements[4] || '';
          }
        }
        break;

      case 'CLP': // Claim level
        if (currentRemittance) {
          currentClaim = {
            patientName: '',
            patientId: seg.elements[1] || '',
            claimNumber: seg.elements[7] || '',
            totalCharge: parseFloat(seg.elements[3]) || 0,
            totalPaid: parseFloat(seg.elements[4]) || 0,
            serviceLines: [],
          };
          currentRemittance.claims.push(currentClaim);
        }
        break;

      case 'NM1': // Patient name
        if (seg.elements[1] === 'QC' && currentClaim) {
          currentClaim.patientName = `${seg.elements[4] || ''} ${seg.elements[3] || ''}`.trim();
          if (seg.elements[9]) currentClaim.patientId = seg.elements[9];
        }
        break;

      case 'SVC': // Service line
        if (currentClaim) {
          const compositeCpt = (seg.elements[1] || '').split(':');
          currentServiceLine = {
            cptCode: compositeCpt[1] || compositeCpt[0] || '',
            modifiers: compositeCpt.slice(2).filter(Boolean),
            serviceDateFrom: '',
            serviceDateTo: '',
            billedAmount: parseFloat(seg.elements[2]) || 0,
            allowedAmount: 0,
            paidAmount: parseFloat(seg.elements[3]) || 0,
            patientResponsibility: 0,
            adjustmentReasonCodes: [],
            adjustmentAmounts: [],
            remarkCodes: [],
          };
          currentClaim.serviceLines.push(currentServiceLine);
        }
        break;

      case 'DTM': // Date
        if (seg.elements[1] === '472' && currentServiceLine) {
          currentServiceLine.serviceDateFrom = seg.elements[2] || '';
        }
        break;

      case 'CAS': // Adjustments
        if (currentServiceLine) {
          // CAS*CO*45*10.00*
          for (let i = 2; i < seg.elements.length; i += 3) {
            const code = seg.elements[i];
            const amount = parseFloat(seg.elements[i + 1]) || 0;
            if (code) {
              currentServiceLine.adjustmentReasonCodes.push(`${seg.elements[1]}-${code}`);
              currentServiceLine.adjustmentAmounts.push(amount);
            }
          }
        }
        break;

      case 'AMT': // Allowed amount
        if (seg.elements[1] === 'B6' && currentServiceLine) {
          currentServiceLine.allowedAmount = parseFloat(seg.elements[2]) || 0;
        }
        break;

      case 'LQ': // Remark codes
        if (currentServiceLine && seg.elements[2]) {
          currentServiceLine.remarkCodes.push(seg.elements[2]);
        }
        break;
    }
  }

  return remittances;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawContent, filename } = await req.json();
    
    if (!rawContent) {
      return new Response(JSON.stringify({ error: 'No content provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const remittances = parseERA835(rawContent);
    
    const totalPaid = remittances.reduce((s, r) => s + r.totalPaid, 0);
    const totalClaims = remittances.reduce((s, r) => s + r.claims.length, 0);
    const totalServiceLines = remittances.reduce((s, r) => 
      s + r.claims.reduce((cs, c) => cs + c.serviceLines.length, 0), 0
    );

    return new Response(JSON.stringify({
      success: true,
      filename,
      summary: {
        remittanceCount: remittances.length,
        totalPaid,
        totalClaims,
        totalServiceLines,
      },
      remittances,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
