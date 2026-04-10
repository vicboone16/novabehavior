import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function twiml(msg: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(msg)}</Message></Response>`;
  return new Response(xml, {
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface ParsedSMS {
  entryType: "frequency" | "duration" | "observed_zero" | "no_behaviors" | "abc" | "unknown";
  studentCode?: string;
  behaviorCode?: string;
  count?: number;
  durationSeconds?: number;
  loggedAt?: string;
}

function parseSMS(body: string): ParsedSMS {
  const trimmed = body.trim();
  const lower = trimmed.toLowerCase();

  // Extract trailing time like 2:30PM or date like 2024-12-01
  let loggedAt: string | undefined;
  const timeMatch = trimmed.match(/\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\s*$/);
  const dateMatch = trimmed.match(/\s+(\d{4}-\d{2}-\d{2})\s*$/);
  let cleaned = trimmed;
  if (timeMatch) {
    loggedAt = timeMatch[1];
    cleaned = trimmed.slice(0, timeMatch.index!).trim();
  } else if (dateMatch) {
    loggedAt = dateMatch[1];
    cleaned = trimmed.slice(0, dateMatch.index!).trim();
  }

  const parts = cleaned.split(/\s+/);

  // "no behaviors today" pattern
  if (lower.includes("no behaviors")) {
    const code = parts.length > 0 && !lower.startsWith("no ") ? parts[0].toUpperCase() : undefined;
    return { entryType: "no_behaviors", studentCode: code, loggedAt };
  }

  // STUDENT BEHAVIOR COUNT DURATION — 4 parts
  if (parts.length === 4) {
    const studentCode = parts[0].toUpperCase();
    const behaviorCode = parts[1].toUpperCase();
    const count = parseInt(parts[2]);
    const dur = parts[3].match(/^(\d+)\s*(min|m|mins|minutes?)$/i);
    if (!isNaN(count) && dur) {
      return {
        entryType: "duration",
        studentCode,
        behaviorCode,
        count,
        durationSeconds: parseInt(dur[1]) * 60,
        loggedAt,
      };
    }
  }

  // STUDENT BEHAVIOR COUNT or BEHAVIOR COUNT [DURATION]
  if (parts.length >= 2 && parts.length <= 3) {
    const lastPart = parts[parts.length - 1];
    const durMatch = lastPart.match(/^(\d+)\s*(min|m|mins|minutes?)$/i);
    let durationSeconds: number | undefined;
    let effectiveParts = [...parts];
    if (durMatch) {
      durationSeconds = parseInt(durMatch[1]) * 60;
      effectiveParts = parts.slice(0, -1);
    }

    if (effectiveParts.length === 3) {
      const studentCode = effectiveParts[0].toUpperCase();
      const behaviorCode = effectiveParts[1].toUpperCase();
      const count = parseInt(effectiveParts[2]);
      if (!isNaN(count)) {
        const entryType = count === 0 ? "observed_zero" : durationSeconds ? "duration" : "frequency";
        return { entryType, studentCode, behaviorCode, count, durationSeconds, loggedAt };
      }
    }

    if (effectiveParts.length === 2) {
      const maybeCount = parseInt(effectiveParts[1]);
      if (!isNaN(maybeCount)) {
        return {
          entryType: maybeCount === 0 ? "observed_zero" : durationSeconds ? "duration" : "frequency",
          behaviorCode: effectiveParts[0].toUpperCase(),
          count: maybeCount,
          durationSeconds,
          loggedAt,
        };
      }
    }
  }

  // Free-form ABC: 5+ words
  if (parts.length >= 5) {
    const first = parts[0];
    const studentCode = first.length <= 10 && /^[A-Za-z]+$/.test(first) ? first.toUpperCase() : undefined;
    return { entryType: "abc", studentCode, loggedAt };
  }

  return { entryType: "unknown", loggedAt };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const contentType = req.headers.get("content-type") || "";
    let body: string, from: string, messageSid: string;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      body = params.get("Body") || "";
      from = params.get("From") || "";
      messageSid = params.get("MessageSid") || "";
    } else {
      const json = await req.json();
      body = json.Body || json.body || "";
      from = json.From || json.from || "";
      messageSid = json.MessageSid || json.messageSid || "";
    }

    if (!body) return twiml("No message body received.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up staff by phone
    const normalizedPhone = from.replace(/\D/g, "").slice(-10);
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .or(`phone.ilike.%${normalizedPhone},secondary_phone.ilike.%${normalizedPhone}`)
      .limit(1);

    const staffId = profileRows?.[0]?.id || Deno.env.get("SMS_OWNER_USER_ID") || null;
    const staffName = profileRows?.[0]
      ? `${profileRows[0].first_name || ""} ${profileRows[0].last_name || ""}`.trim()
      : "Unknown";

    // ── STEP 0: Check if this is a student-code reply for a waiting entry ──
    // If the entire message is a single short token, check if it's a student code
    // reply to a previous "needs_student" entry from this phone number.
    const trimmedBody = body.trim().toUpperCase();
    const isSingleToken = /^[A-Za-z0-9]{1,15}$/.test(trimmedBody);

    if (isSingleToken) {
      const { data: waiting } = await supabase
        .from("sms_behavior_log")
        .select("id")
        .eq("from_phone", from)
        .eq("status", "needs_student")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (waiting) {
        // Try to resolve the body as a student code
        const { data: sc } = await supabase
          .from("sms_student_codes")
          .select("student_id")
          .eq("code", trimmedBody)
          .maybeSingle();

        if (sc) {
          await supabase
            .from("sms_behavior_log")
            .update({ student_id: sc.student_id, status: "pending" })
            .eq("id", waiting.id);

          const { data: stu } = await supabase
            .from("students")
            .select("first_name, last_name")
            .eq("id", sc.student_id)
            .maybeSingle();
          const name = stu ? `${stu.first_name || ""} ${stu.last_name || ""}`.trim() : "student";
          return twiml(`Got it! Updated previous entry for ${name}.`);
        }
        // If it didn't resolve as a student code, fall through to normal parsing
      }
    }

    // ── STEP 1: Parse the SMS ──
    const parsed = parseSMS(body);

    // If unknown/unparseable, store as ABC
    if (parsed.entryType === "unknown") {
      parsed.entryType = "abc" as any;
    }

    // ── STEP 2: Resolve student ──
    let studentId: string | null = null;
    let studentName: string | null = null;
    if (parsed.studentCode) {
      const { data: sc } = await supabase
        .from("sms_student_codes")
        .select("student_id")
        .eq("code", parsed.studentCode)
        .limit(1)
        .maybeSingle();
      if (sc) {
        studentId = sc.student_id;
        const { data: stu } = await supabase
          .from("students")
          .select("first_name, last_name")
          .eq("id", studentId)
          .maybeSingle();
        if (stu) studentName = `${stu.first_name || ""} ${stu.last_name || ""}`.trim();
      }
    }

    // ── STEP 3: Resolve behavior ──
    let behaviorId: string | null = null;
    let behaviorLabel: string | null = null;
    if (parsed.behaviorCode) {
      // Try student-specific first
      if (studentId) {
        const { data: specific } = await supabase
          .from("sms_behavior_shortcodes")
          .select("behavior_id, label")
          .eq("code", parsed.behaviorCode)
          .eq("student_id", studentId)
          .maybeSingle();
        if (specific) {
          behaviorId = specific.behavior_id;
          behaviorLabel = specific.label;
        }
      }

      if (!behaviorId) {
        const { data: global } = await supabase
          .from("sms_behavior_shortcodes")
          .select("behavior_id, label")
          .eq("code", parsed.behaviorCode)
          .is("student_id", null)
          .maybeSingle();
        if (global) {
          behaviorId = global.behavior_id;
          behaviorLabel = global.label;
        }
      }
    }

    // ── STEP 4: Determine status ──
    let status = "pending";

    // If behavior resolved but no student → needs_student
    if (behaviorId && !studentId && parsed.entryType !== "no_behaviors" && parsed.entryType !== "abc") {
      status = "needs_student";
    }

    // ── STEP 5: Insert the log row ──
    const { error: insertErr } = await supabase.from("sms_behavior_log").insert({
      raw_body: body,
      from_phone: from,
      twilio_message_sid: messageSid || null,
      entry_type: parsed.entryType,
      parsed_student_code: parsed.studentCode || null,
      parsed_behavior_code: parsed.behaviorCode || null,
      parsed_count: parsed.count ?? null,
      parsed_duration_seconds: parsed.durationSeconds ?? null,
      student_id: studentId,
      behavior_id: behaviorId,
      staff_id: staffId,
      count: parsed.count ?? null,
      duration_seconds: parsed.durationSeconds ?? null,
      logged_at: parsed.loggedAt || new Date().toISOString(),
      status,
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return twiml("Error saving entry. Please try again.");
    }

    // ── STEP 6: Build confirmation TwiML ──
    if (status === "needs_student") {
      return twiml(`Got ${behaviorLabel || parsed.behaviorCode} ×${parsed.count ?? 0}. Which student? Reply with their code.`);
    }

    const msgParts: string[] = [];
    if (parsed.entryType === "no_behaviors") {
      msgParts.push(`No behaviors recorded${studentName ? ` for ${studentName}` : ""}.`);
    } else if (parsed.entryType === "abc") {
      msgParts.push(`ABC note queued for review${studentName ? ` (${studentName})` : ""}.`);
    } else {
      const bLabel = behaviorLabel || parsed.behaviorCode || "behavior";
      const sLabel = studentName || parsed.studentCode || "student";
      const countStr = parsed.count !== undefined ? ` ×${parsed.count}` : "";
      const durStr = parsed.durationSeconds ? ` (${parsed.durationSeconds / 60}min)` : "";
      msgParts.push(`Queued for review: ${sLabel}, ${bLabel}${countStr}${durStr}.`);
    }
    msgParts.push(`Logged by ${staffName}.`);

    return twiml(msgParts.join(" "));
  } catch (e) {
    console.error("sms-behavior-intake error:", e);
    return twiml("Something went wrong. Please try again.");
  }
});
