import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Fallback user ID (supervisor) when sender's phone isn't in profiles
const OWNER_USER_ID = Deno.env.get('SMS_OWNER_USER_ID') ?? null

// ── helpers ──────────────────────────────────────────────────────────────────

function twiml(message: string): Response {
  const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`,
    { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } },
  )
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(-10)
}

// ── parser ────────────────────────────────────────────────────────────────────

const DURATION_RE = /^(\d+(?:\.\d+)?)(min|mins|m|sec|secs|s|hr|hrs|h)$/i
const TIME_RE = /^\d{1,2}:\d{2}(am|pm)?$/i
const COUNT_RE = /^\d{1,4}$/
// Matches ISO dates (2024-12-01) and US dates (12/1, 12/1/24, 12/01/2024)
const DATE_RE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)$/
const NO_BEHAVIOR_RE = /\b(no behaviors?|none|zero behaviors?|0 behaviors?|good day|nothing today)\b/i
const ABC_KEYWORDS = /\b(antecedent|consequence|because|after|before|then|pushed|hit|threw|yelled|screamed|bit|kicked|spit)\b/i

interface Parsed {
  entryType: 'frequency' | 'duration' | 'observed_zero' | 'no_behaviors' | 'abc'
  studentCode: string | null
  behaviorCode: string | null
  count: number
  durationSeconds: number | null
  timeText: string | null
  dateText: string | null
  rawSentence: string
}

function parseSms(body: string): Parsed {
  const raw = body.trim()
  const upper = raw.toUpperCase()

  // ── no behaviors today ──
  if (NO_BEHAVIOR_RE.test(raw)) {
    const tokens = raw.trim().split(/\s+/)
    const studentCode = tokens.length > 0 && /^[A-Z]{2,}$/i.test(tokens[0]) ? tokens[0].toUpperCase() : null
    return { entryType: 'no_behaviors', studentCode, behaviorCode: null, count: 0, durationSeconds: null, timeText: null, rawSentence: raw }
  }

  // ── ABC detection: natural-language sentence (> 5 words, no clear pattern) ──
  const wordCount = raw.split(/\s+/).length
  if (wordCount > 5 && ABC_KEYWORDS.test(raw)) {
    const tokens = raw.trim().split(/\s+/)
    const studentCode = /^[A-Z]{2,10}$/i.test(tokens[0]) ? tokens[0].toUpperCase() : null
    return { entryType: 'abc', studentCode, behaviorCode: null, count: 1, durationSeconds: null, timeText: null, rawSentence: raw }
  }

  let tokens = raw.trim().split(/\s+/)
  let timeText: string | null = null
  let dateText: string | null = null
  let durationSeconds: number | null = null
  let count = 1

  // Strip trailing date (e.g. "2024-12-01" or "12/1/24") — historical entries
  if (tokens.length && DATE_RE.test(tokens[tokens.length - 1])) {
    dateText = tokens.pop()!
  }

  // Strip trailing time
  if (tokens.length && TIME_RE.test(tokens[tokens.length - 1])) {
    timeText = tokens.pop()!
  }

  // Find and strip duration token (e.g. "30min", "2hr", "45s")
  const durIdx = tokens.findIndex(t => DURATION_RE.test(t))
  if (durIdx !== -1) {
    const m = tokens[durIdx].match(DURATION_RE)!
    tokens.splice(durIdx, 1)
    const val = parseFloat(m[1])
    const unit = m[2].toLowerCase()
    if (unit.startsWith('h')) durationSeconds = Math.round(val * 3600)
    else if (unit.startsWith('m')) durationSeconds = Math.round(val * 60)
    else durationSeconds = Math.round(val)
  }

  // Strip trailing count
  if (tokens.length && COUNT_RE.test(tokens[tokens.length - 1])) {
    count = parseInt(tokens.pop()!, 10)
  }

  // Remaining tokens: [STUDENT] BEHAVIOR
  let studentCode: string | null = null
  let behaviorCode: string | null = null

  if (tokens.length >= 2) {
    studentCode = tokens[0].toUpperCase()
    behaviorCode = tokens[1].toUpperCase()
  } else if (tokens.length === 1) {
    behaviorCode = tokens[0].toUpperCase()
  }

  const entryType = durationSeconds != null
    ? 'duration'
    : count === 0
      ? 'observed_zero'
      : 'frequency'

  return { entryType, studentCode, behaviorCode, count, durationSeconds, timeText, dateText, rawSentence: raw }
}

// ── main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  let formData: FormData
  try { formData = await req.formData() } catch { return new Response('Bad Request', { status: 400 }) }

  const rawBody = (formData.get('Body') ?? '') as string
  const fromPhone = (formData.get('From') ?? '') as string
  const messageSid = (formData.get('MessageSid') ?? null) as string | null

  if (!rawBody.trim() || !fromPhone) return twiml('Message could not be parsed.')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Dedup
  if (messageSid) {
    const { data: dup } = await supabase
      .from('sms_behavior_log').select('id').eq('twilio_message_sid', messageSid).maybeSingle()
    if (dup) return twiml('Already logged.')
  }

  const phone10 = normalizePhone(fromPhone)

  // ── Check if this is a reply to a "needs_student" entry ──────────────────
  // Look for a recent entry from this phone awaiting a student code
  const { data: waitingEntry } = await supabase
    .from('sms_behavior_log')
    .select('id, behavior_id, count, entry_type')
    .eq('from_phone', fromPhone)
    .eq('status', 'needs_student')
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (waitingEntry) {
    const replyCode = rawBody.trim().toUpperCase().split(/\s+/)[0]
    const { data: sc } = await supabase
      .from('sms_student_codes').select('student_id').eq('code', replyCode).maybeSingle()
    if (sc) {
      const { data: st } = await supabase
        .from('students').select('first_name, last_name').eq('id', sc.student_id).maybeSingle()
      const name = st ? `${st.first_name} ${st.last_name}`.trim() : replyCode
      await supabase
        .from('sms_behavior_log')
        .update({ student_id: sc.student_id, status: 'pending' })
        .eq('id', waitingEntry.id)
      return twiml(`Linked to ${name}. Awaiting supervisor review.`)
    }
    // Not a valid student code — re-prompt
    return twiml(`"${rawBody.trim()}" isn't a known student code. Reply with the student code (e.g., KALEL) to link the pending entry.`)
  }

  // ── Parse the message ─────────────────────────────────────────────────────
  const parsed = parseSms(rawBody)

  // ── Look up staff by phone ────────────────────────────────────────────────
  let staffId: string | null = OWNER_USER_ID
  let staffName = 'Supervisor (default)'

  if (phone10) {
    const { data: allProfiles } = await supabase
      .from('profiles').select('id, full_name, phone, secondary_phone').limit(200)
    const match = (allProfiles ?? []).find((p: any) => {
      return normalizePhone(p.phone ?? '') === phone10 || normalizePhone(p.secondary_phone ?? '') === phone10
    })
    if (match) { staffId = match.id; staffName = match.full_name ?? 'Staff' }
  }

  // ── Resolve student code ──────────────────────────────────────────────────
  let studentId: string | null = null
  let studentName: string | null = null

  if (parsed.studentCode) {
    const { data: sc } = await supabase
      .from('sms_student_codes').select('student_id').eq('code', parsed.studentCode).maybeSingle()
    if (sc) {
      studentId = sc.student_id
      const { data: st } = await supabase
        .from('students').select('first_name, last_name').eq('id', studentId).maybeSingle()
      if (st) studentName = `${st.first_name} ${st.last_name}`.trim()
    }
  }

  // ── Resolve behavior code (student-specific wins over global) ─────────────
  let behaviorId: string | null = null
  let behaviorLabel: string | null = null

  if (parsed.behaviorCode) {
    if (studentId) {
      const { data: sbc } = await supabase
        .from('sms_behavior_shortcodes').select('behavior_id, label')
        .eq('code', parsed.behaviorCode).eq('student_id', studentId).maybeSingle()
      if (sbc) { behaviorId = sbc.behavior_id; behaviorLabel = sbc.label }
    }
    if (!behaviorId) {
      const { data: gbc } = await supabase
        .from('sms_behavior_shortcodes').select('behavior_id, label')
        .eq('code', parsed.behaviorCode).is('student_id', null).maybeSingle()
      if (gbc) { behaviorId = gbc.behavior_id; behaviorLabel = gbc.label }
    }
    if (behaviorId && !behaviorLabel) {
      const { data: bd } = await supabase
        .from('behaviors').select('name').eq('id', behaviorId).maybeSingle()
      behaviorLabel = bd?.name ?? parsed.behaviorCode
    }
  }

  // ── Compute logged_at (supports historical dates) ─────────────────────────
  let loggedAt = new Date().toISOString()
  try {
    // Determine base date: parsed date string or today
    let baseDate = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    if (parsed.dateText) {
      // Normalise US format 12/1 or 12/1/24 → YYYY-MM-DD
      const parts = parsed.dateText.split('/')
      if (parts.length >= 2) {
        const mm = parts[0].padStart(2, '0')
        const dd = parts[1].padStart(2, '0')
        const yy = parts[2]
          ? (parts[2].length === 2 ? `20${parts[2]}` : parts[2])
          : new Date().getFullYear().toString()
        baseDate = `${yy}-${mm}-${dd}`
      } else {
        baseDate = parsed.dateText // already ISO
      }
    }
    if (parsed.timeText) {
      const t = parsed.timeText.replace(/([ap]m)/i, ' $1')
      const d = new Date(`${baseDate} ${t}`)
      if (!isNaN(d.getTime())) loggedAt = d.toISOString()
    } else if (parsed.dateText) {
      // Date with no time → noon on that day
      const d = new Date(`${baseDate}T12:00:00`)
      if (!isNaN(d.getTime())) loggedAt = d.toISOString()
    }
  } catch { /* keep now */ }

  // ── Build record ──────────────────────────────────────────────────────────
  const needsStudent = !studentId && parsed.entryType !== 'abc' && parsed.entryType !== 'no_behaviors'
  const status = needsStudent ? 'needs_student' : 'pending'

  const record: Record<string, any> = {
    raw_body: rawBody,
    from_phone: fromPhone,
    twilio_message_sid: messageSid,
    entry_type: parsed.entryType,
    parsed_student_code: parsed.studentCode,
    parsed_behavior_code: parsed.behaviorCode,
    parsed_count: parsed.count,
    parsed_duration_seconds: parsed.durationSeconds,
    parsed_time_text: parsed.timeText,
    student_id: studentId,
    behavior_id: behaviorId,
    staff_id: staffId,
    count: parsed.count,
    duration_seconds: parsed.durationSeconds,
    logged_at: loggedAt,
    status,
  }

  const { error: insertErr } = await supabase.from('sms_behavior_log').insert(record)
  if (insertErr) {
    console.error('sms-behavior-intake insert:', insertErr)
    return twiml('Error saving. Please try again.')
  }

  // ── Build reply ───────────────────────────────────────────────────────────
  if (needsStudent) {
    return twiml(
      `Got it: ${behaviorLabel ?? parsed.behaviorCode} ×${parsed.count}. ` +
      `Which student? Reply with their code (e.g., KALEL).`
    )
  }

  const parts: string[] = []
  if (studentName) parts.push(studentName)
  else if (parsed.studentCode) parts.push(`"${parsed.studentCode}" (not found)`)

  if (parsed.entryType === 'no_behaviors') {
    parts.push('No behaviors observed — observed zero for all behaviors')
  } else if (parsed.entryType === 'abc') {
    parts.push('ABC entry draft created')
  } else if (parsed.entryType === 'duration') {
    const mins = parsed.durationSeconds ? Math.round(parsed.durationSeconds / 60) : '?'
    parts.push(`${behaviorLabel ?? parsed.behaviorCode} ×${parsed.count} (${mins} min)`)
  } else if (parsed.entryType === 'observed_zero') {
    parts.push(`${behaviorLabel ?? parsed.behaviorCode} — observed zero`)
  } else {
    parts.push(`${behaviorLabel ?? parsed.behaviorCode} ×${parsed.count}`)
  }

  return twiml(`Queued for review: ${parts.join(', ')}. Logged by ${staffName}.`)
})
