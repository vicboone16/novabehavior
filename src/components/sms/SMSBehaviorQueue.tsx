import { useState, useEffect, useCallback } from 'react';
import { Check, X, MessageSquare, Clock, User, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface SmsEntry {
  id: string;
  raw_body: string;
  from_phone: string;
  received_at: string;
  entry_type: 'frequency' | 'duration' | 'observed_zero' | 'no_behaviors' | 'abc';
  parsed_student_code: string | null;
  parsed_behavior_code: string | null;
  parsed_count: number | null;
  parsed_duration_seconds: number | null;
  student_id: string | null;
  behavior_id: string | null;
  staff_id: string | null;
  count: number;
  duration_seconds: number | null;
  observation_minutes: number | null;
  logged_at: string;
  abc_antecedent: string | null;
  abc_behavior_raw: string | null;
  abc_consequence: string | null;
  notes: string | null;
  status: 'pending' | 'needs_student' | 'approved' | 'rejected';
}

interface BehaviorOpt { id: string; name: string }
interface StaffOpt { id: string; full_name: string }
interface StudentOpt { id: string; firstName: string; lastName: string }

function fmtDuration(secs: number | null) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Single queue card ────────────────────────────────────────────────────────

function QueueCard({
  entry, students, staffList, onApproved, onRejected,
}: {
  entry: SmsEntry;
  students: StudentOpt[];
  staffList: StaffOpt[];
  onApproved: (id: string) => void;
  onRejected: (id: string) => void;
}) {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState(entry.student_id ?? '');
  const [behaviorId, setBehaviorId] = useState(entry.behavior_id ?? '');
  const [staffId, setStaffId] = useState(entry.staff_id ?? user?.id ?? '');
  const [count, setCount] = useState(String(entry.count ?? 1));
  const [durationMins, setDurationMins] = useState(
    entry.duration_seconds ? String(Math.round(entry.duration_seconds / 60)) : ''
  );
  const [obsMins, setObsMins] = useState(entry.observation_minutes ? String(entry.observation_minutes) : '');
  const [loggedAt, setLoggedAt] = useState(entry.logged_at.slice(0, 16));
  const [antecedent, setAntecedent] = useState(entry.abc_antecedent ?? '');
  const [behaviorText, setBehaviorText] = useState(entry.abc_behavior_raw ?? entry.raw_body);
  const [consequence, setConsequence] = useState(entry.abc_consequence ?? '');
  const [behaviors, setBehaviors] = useState<BehaviorOpt[]>([]);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (!studentId) { setBehaviors([]); return; }
    supabase
      .from('student_behavior_map')
      .select('behavior_entry_id, behaviors(id, name)')
      .eq('student_id', studentId)
      .eq('active', true)
      .then(({ data }) => {
        const opts: BehaviorOpt[] = (data ?? [])
          .map((r: any) => r.behaviors ? { id: r.behaviors.id, name: r.behaviors.name } : null)
          .filter(Boolean) as BehaviorOpt[];
        opts.sort((a, b) => a.name.localeCompare(b.name));
        setBehaviors(opts);
      });
  }, [studentId]);

  async function findOrCreateSession(sId: string, uId: string, dateStr: string, timeIso: string) {
    const { data: existing } = await supabase
      .from('sessions')
      .select('id, student_ids')
      .eq('user_id', uId)
      .gte('start_time', `${dateStr}T00:00:00`)
      .lte('start_time', `${dateStr}T23:59:59`)
      .limit(30);
    const found = (existing ?? []).find((s: any) =>
      Array.isArray(s.student_ids) && s.student_ids.includes(sId)
    );
    if (found) return found.id as string;
    const { data: newS, error } = await supabase
      .from('sessions')
      .insert({
        user_id: uId,
        name: 'SMS Entry',
        start_time: timeIso,
        session_length_minutes: 0,
        interval_length_seconds: 15,
        student_ids: [sId],
        status: 'completed',
      })
      .select('id')
      .single();
    if (error) throw error;
    return newS.id as string;
  }

  async function handleApprove() {
    if (entry.entry_type !== 'abc' && entry.entry_type !== 'no_behaviors' && (!studentId || !behaviorId)) {
      toast.error('Select student and behavior first.');
      return;
    }
    if (entry.entry_type !== 'abc' && entry.entry_type !== 'no_behaviors' && !studentId) {
      toast.error('Select student first.');
      return;
    }
    setApproving(true);
    try {
      const loggedAtIso = new Date(loggedAt).toISOString();
      const dateStr = loggedAt.slice(0, 10);
      const uId = staffId || user!.id;
      const updates: Record<string, any> = {
        status: 'approved', approved_by: user!.id, approved_at: new Date().toISOString(),
        student_id: studentId || null,
        behavior_id: behaviorId || null,
        staff_id: uId,
        logged_at: loggedAtIso,
      };

      // ── ABC entry ──────────────────────────────────────────────────────
      if (entry.entry_type === 'abc') {
        if (!studentId) { toast.error('Select student first.'); setApproving(false); return; }
        // Store into student historical_data.abcEntries
        const { data: stu } = await supabase
          .from('students').select('historical_data').eq('id', studentId).single();
        const hd: any = stu?.historical_data ?? {};
        const existing = Array.isArray(hd.abcEntries) ? hd.abcEntries : [];
        const newEntry = {
          id: crypto.randomUUID(),
          studentId,
          behaviorId: behaviorId || null,
          antecedent,
          behavior: behaviorText,
          consequence,
          frequencyCount: 1,
          timestamp: loggedAtIso,
        };
        await supabase
          .from('students')
          .update({ historical_data: { ...hd, abcEntries: [...existing, newEntry] } })
          .eq('id', studentId);
        await supabase.from('sms_behavior_log').update({ ...updates, abc_antecedent: antecedent, abc_behavior_raw: behaviorText, abc_consequence: consequence }).eq('id', entry.id);
        toast.success('ABC entry logged.');
        onApproved(entry.id);
        return;
      }

      // ── No behaviors today → observed_zero for ALL of student's behaviors ──
      if (entry.entry_type === 'no_behaviors') {
        if (!studentId) { toast.error('Select student first.'); setApproving(false); return; }
        const sessionId = await findOrCreateSession(studentId, uId, dateStr, loggedAtIso);
        const { data: sbm } = await supabase
          .from('student_behavior_map').select('behavior_entry_id').eq('student_id', studentId).eq('active', true);
        const behIds = (sbm ?? []).map((r: any) => r.behavior_entry_id).filter(Boolean);
        for (const bId of behIds) {
          await supabase.from('behavior_session_data').insert({
            session_id: sessionId, student_id: studentId, behavior_id: bId,
            frequency: 0, data_state: 'observed_zero', created_at: loggedAtIso,
          });
        }
        await (supabase as any).rpc('rebuild_behavior_daily_aggregates', { p_student_id: studentId }).catch(() => {});
        await supabase.from('sms_behavior_log').update({ ...updates, session_id: sessionId }).eq('id', entry.id);
        window.dispatchEvent(new CustomEvent('behavior-data-edited', { detail: { studentId } }));
        toast.success(`Observed zero logged for ${behIds.length} behaviors.`);
        onApproved(entry.id);
        return;
      }

      // ── Frequency / Duration / Observed Zero ──────────────────────────────
      const countNum = parseInt(count, 10);
      if (isNaN(countNum) || countNum < 0) { toast.error('Invalid count.'); setApproving(false); return; }

      const sessionId = await findOrCreateSession(studentId, uId, dateStr, loggedAtIso);
      const durSecs = durationMins ? Math.round(parseFloat(durationMins) * 60) : null;
      const obsMin = obsMins ? parseFloat(obsMins) : null;

      const { data: bsdRow, error: bsdErr } = await supabase
        .from('behavior_session_data')
        .insert({
          session_id: sessionId, student_id: studentId, behavior_id: behaviorId,
          frequency: entry.entry_type === 'observed_zero' ? 0 : countNum,
          duration_seconds: durSecs,
          observation_minutes: obsMin,
          data_state: entry.entry_type === 'observed_zero' ? 'observed_zero' : 'measured',
          created_at: loggedAtIso,
        })
        .select('id').single();
      if (bsdErr) throw bsdErr;

      await (supabase as any).rpc('rebuild_behavior_daily_aggregates', { p_student_id: studentId }).catch(() => {});
      await supabase.from('sms_behavior_log').update({ ...updates, count: countNum, duration_seconds: durSecs, observation_minutes: obsMin, session_id: sessionId, bsd_row_id: bsdRow.id }).eq('id', entry.id);
      window.dispatchEvent(new CustomEvent('behavior-data-edited', { detail: { studentId } }));
      toast.success('Entry approved and logged.');
      onApproved(entry.id);
    } catch (err: any) {
      toast.error(`Approval failed: ${err.message || err}`);
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      await supabase.from('sms_behavior_log')
        .update({ status: 'rejected', approved_by: user!.id, approved_at: new Date().toISOString() })
        .eq('id', entry.id);
      toast.success('Entry rejected.');
      onRejected(entry.id);
    } catch (err: any) {
      toast.error(`Reject failed: ${err.message || err}`);
    } finally {
      setRejecting(false);
    }
  }

  const senderProfile = staffList.find(s => s.id === entry.staff_id);
  const isNeedsStudent = entry.status === 'needs_student';

  const typeLabel: Record<string, string> = {
    frequency: 'Frequency', duration: 'Duration', observed_zero: 'Observed Zero',
    no_behaviors: 'No Behaviors', abc: 'ABC Entry',
  };
  const typeBadgeColor: Record<string, string> = {
    frequency: 'text-blue-600 border-blue-300',
    duration: 'text-purple-600 border-purple-300',
    observed_zero: 'text-green-600 border-green-300',
    no_behaviors: 'text-green-700 border-green-400',
    abc: 'text-amber-600 border-amber-300',
  };

  return (
    <div className={`border rounded-lg p-4 space-y-3 bg-card ${isNeedsStudent ? 'border-amber-300 bg-amber-50/30' : ''}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{entry.raw_body}</span>
            <Badge variant="outline" className={`text-[10px] ${typeBadgeColor[entry.entry_type]}`}>
              {typeLabel[entry.entry_type]}
            </Badge>
            {isNeedsStudent && (
              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-400 bg-amber-100">
                Awaiting student reply
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {senderProfile?.full_name || entry.from_phone}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(entry.received_at), 'M/d h:mm a')}
            </span>
          </div>
        </div>
      </div>

      {/* ABC fields */}
      {entry.entry_type === 'abc' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">A — Antecedent (what happened before)</label>
            <Input value={antecedent} onChange={e => setAntecedent(e.target.value)} placeholder="What triggered the behavior?" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">B — Behavior (what the student did)</label>
            <Input value={behaviorText} onChange={e => setBehaviorText(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">C — Consequence (what happened after)</label>
            <Input value={consequence} onChange={e => setConsequence(e.target.value)} placeholder="Staff response / outcome" className="h-8 text-xs" />
          </div>
        </div>
      )}

      {/* Main editable fields */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Student</label>
          <Select value={studentId} onValueChange={v => { setStudentId(v); setBehaviorId(''); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select student…" /></SelectTrigger>
            <SelectContent>
              {students.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.firstName} {s.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {entry.entry_type !== 'no_behaviors' && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Behavior</label>
            <Select value={behaviorId} onValueChange={setBehaviorId} disabled={!studentId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={!studentId ? 'Select student first' : 'Select behavior…'} />
              </SelectTrigger>
              <SelectContent>
                {behaviors.map(b => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(entry.entry_type === 'frequency' || entry.entry_type === 'duration') && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Count</label>
            <Input type="number" min={0} value={count} onChange={e => setCount(e.target.value)} className="h-8 text-xs" />
          </div>
        )}

        {entry.entry_type === 'duration' && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Duration (minutes)</label>
              <Input type="number" min={0} step={0.5} value={durationMins} onChange={e => setDurationMins(e.target.value)} placeholder="e.g. 30" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Observation Period (min) — for rate</label>
              <Input type="number" min={0} value={obsMins} onChange={e => setObsMins(e.target.value)} placeholder="Optional" className="h-8 text-xs" />
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Date & Time</label>
          <Input type="datetime-local" value={loggedAt} onChange={e => setLoggedAt(e.target.value)} className="h-8 text-xs" />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Staff</label>
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select staff…" /></SelectTrigger>
            <SelectContent>
              {staffList.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={handleApprove} disabled={approving || rejecting || isNeedsStudent}>
          {approving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Approve & Log
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleReject} disabled={approving || rejecting}>
          {rejecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
          Reject
        </Button>
      </div>
      {isNeedsStudent && (
        <p className="text-[11px] text-amber-700 text-center">
          Waiting for staff to reply with the student code via SMS.
        </p>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SMSBehaviorQueue() {
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [entries, setEntries] = useState<SmsEntry[]>([]);
  const [staffList, setStaffList] = useState<StaffOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const statuses = showHistory ? ['pending', 'needs_student', 'approved', 'rejected'] : ['pending', 'needs_student'];
    const [entriesRes, staffRes, studentsRes] = await Promise.all([
      supabase.from('sms_behavior_log').select('*')
        .in('status', statuses).order('received_at', { ascending: false }).limit(60),
      supabase.from('profiles').select('id, full_name').order('full_name'),
      supabase.from('students').select('id, first_name, last_name')
        .eq('is_archived', false).order('first_name'),
    ]);
    setEntries((entriesRes.data ?? []) as SmsEntry[]);
    setStaffList((staffRes.data ?? []) as StaffOpt[]);
    setStudents(
      (studentsRes.data ?? []).map((s: any) => ({
        id: s.id,
        firstName: s.first_name ?? '',
        lastName: s.last_name ?? '',
      }))
    );
    setLoading(false);
  }, [showHistory]);

  useEffect(() => { load(); }, [load]);

  const remove = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));
  const pending = entries.filter(e => e.status === 'pending' || e.status === 'needs_student');
  const past = entries.filter(e => e.status === 'approved' || e.status === 'rejected');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {pending.length} pending {pending.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowHistory(v => !v)}>
            {showHistory ? 'Hide History' : 'Show History'}
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={load}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : pending.length === 0 && !showHistory ? (
        <div className="py-12 text-center space-y-2">
          <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No pending SMS entries.</p>
          <p className="text-xs text-muted-foreground">Text your Twilio number to log a behavior.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(e => (
            <QueueCard key={e.id} entry={e} students={students} staffList={staffList} onApproved={remove} onRejected={remove} />
          ))}
          {showHistory && past.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground pt-2 border-t">History</p>
              {past.map(e => (
                <div key={e.id} className="border rounded-md px-3 py-2 text-xs flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="font-mono truncate flex-1">{e.raw_body}</span>
                  <Badge variant="outline" className={e.status === 'approved' ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'}>
                    {e.status}
                  </Badge>
                  <span className="shrink-0">{format(parseISO(e.received_at), 'M/d h:mm a')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
