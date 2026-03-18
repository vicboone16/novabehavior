import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClassroomSummary {
  id: string;
  name: string;
  agency_id: string;
  grade_level: string | null;
  studentCount: number;
  behaviorEventsToday: number;
  engagementPctToday: number | null;
  promptCompletionToday: number | null;
  signalSummary: string;
  activeSignalCount: number;
}

export interface StudentTodayCard {
  student_id: string;
  student_name: string;
  behaviorCountToday: number;
  lastEngagementResponse: string | null;
  probeActivity: number;
  topTrigger: string | null;
}

export interface ClassroomTodaySnapshot {
  totalBehaviorEvents: number;
  engagementPct: number | null;
  completedPrompts: number;
  expectedPrompts: number;
  snoozedPrompts: number;
  activeProbes: number;
  finishedProbes: number;
  // Beacon extensions
  pointsAwardedToday: number;
  pointsRedeemedToday: number;
  maydayEventsToday: number;
  rewardRedemptionsToday: number;
  staffPresent: number;
}

export interface LiveEventItem {
  id: string;
  type: 'frequency' | 'abc' | 'data_event' | 'data_point' | 'session' | 'clinical_session' | 'signal' | 'incident' | 'points' | 'reward' | 'mayday' | 'presence';
  student_name: string;
  student_id: string;
  label: string;
  detail: string | null;
  occurred_at: string;
  severity?: string;
}

export interface ClassroomFlag {
  type: 'highest_events' | 'lowest_engagement' | 'top_trigger' | 'reliability';
  label: string;
  value: string;
}

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start: start.toISOString(), end: now.toISOString(), dateStr: start.toISOString().split('T')[0] };
}

/**
 * Fetches classrooms for an agency with today's operational stats.
 */
export function useClassroomSummaries(agencyId: string | null) {
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) { setClassrooms([]); setLoading(false); return; }
    try {
      setLoading(true);
      const { start, dateStr } = todayRange();

      // Get classrooms
      let cq = supabase.from('classrooms').select('id, name, agency_id, grade_level');
      if (agencyId !== 'all') cq = cq.eq('agency_id', agencyId);
      const { data: rooms } = await cq;
      if (!rooms || rooms.length === 0) { setClassrooms([]); return; }

      // Get classroom members (students)
      const roomIds = rooms.map(r => r.id);
      const { data: members } = await supabase
        .from('classroom_members')
        .select('classroom_id, student_id')
        .in('classroom_id', roomIds)
        .eq('role', 'student');

      const memberMap = new Map<string, string[]>();
      for (const m of (members || []) as any[]) {
        const arr = memberMap.get(m.classroom_id) || [];
        arr.push(m.student_id);
        memberMap.set(m.classroom_id, arr);
      }

      // Get all student IDs across all classrooms
      const allStudentIds = [...new Set((members || []).map((m: any) => m.student_id))];

      // Get today's frequency entries for these students
      let behaviorCounts = new Map<string, number>();
      if (allStudentIds.length > 0) {
        const { data: freqData } = await supabase
          .from('teacher_frequency_entries')
          .select('client_id, count')
          .in('client_id', allStudentIds)
          .eq('session_date', dateStr);
        for (const f of (freqData || []) as any[]) {
          behaviorCounts.set(f.client_id, (behaviorCounts.get(f.client_id) || 0) + (f.count || 1));
        }
      }

      // Get active signals per classroom (from ci_signals)
      const { data: signalsData } = await (supabase.from as any)('ci_signals')
        .select('id, client_id, signal_type')
        .is('resolved_at', null)
        .gte('created_at', start);

      const studentClassroomMap = new Map<string, string>();
      for (const [cid, sids] of memberMap) {
        for (const sid of sids) studentClassroomMap.set(sid, cid);
      }

      const signalsByClassroom = new Map<string, number>();
      const trendingUpByClassroom = new Map<string, number>();
      for (const s of (signalsData || []) as any[]) {
        const cid = s.client_id ? studentClassroomMap.get(s.client_id) : null;
        if (cid) {
          signalsByClassroom.set(cid, (signalsByClassroom.get(cid) || 0) + 1);
          if (s.signal_type === 'escalation' || s.signal_type === 'risk') {
            trendingUpByClassroom.set(cid, (trendingUpByClassroom.get(cid) || 0) + 1);
          }
        }
      }

      const result: ClassroomSummary[] = rooms.map((r: any) => {
        const studentIds = memberMap.get(r.id) || [];
        const behaviorTotal = studentIds.reduce((sum, sid) => sum + (behaviorCounts.get(sid) || 0), 0);
        const sigCount = signalsByClassroom.get(r.id) || 0;
        const trendUp = trendingUpByClassroom.get(r.id) || 0;
        const summary = trendUp > 0
          ? `${trendUp} student${trendUp > 1 ? 's' : ''} trending up`
          : sigCount > 0
            ? `${sigCount} active signal${sigCount > 1 ? 's' : ''}`
            : 'All clear';

        return {
          id: r.id,
          name: r.name,
          agency_id: r.agency_id,
          grade_level: r.grade_level,
          studentCount: studentIds.length,
          behaviorEventsToday: behaviorTotal,
          engagementPctToday: null, // computed when weekly summary exists
          promptCompletionToday: null,
          signalSummary: summary,
          activeSignalCount: sigCount,
        };
      });

      setClassrooms(result);
    } catch (err) {
      console.error('[ClassroomToday] Error fetching summaries:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { classrooms, loading, refresh: fetch };
}

/**
 * Full drilldown data for a single classroom today.
 */
export function useClassroomTodayDrilldown(classroomId: string | null) {
  const [snapshot, setSnapshot] = useState<ClassroomTodaySnapshot | null>(null);
  const [students, setStudents] = useState<StudentTodayCard[]>([]);
  const [events, setEvents] = useState<LiveEventItem[]>([]);
  const [flags, setFlags] = useState<ClassroomFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!classroomId) { setLoading(false); return; }
    try {
      setLoading(true);
      const { start, dateStr } = todayRange();

      // Get students in classroom
      const { data: membersData } = await supabase
        .from('classroom_members')
        .select('student_id')
        .eq('classroom_id', classroomId)
        .eq('role', 'student');

      const studentIds = (membersData || []).map((m: any) => m.student_id);
      if (studentIds.length === 0) {
        setSnapshot({ totalBehaviorEvents: 0, engagementPct: null, completedPrompts: 0, expectedPrompts: 0, snoozedPrompts: 0, activeProbes: 0, finishedProbes: 0, pointsAwardedToday: 0, pointsRedeemedToday: 0, maydayEventsToday: 0, rewardRedemptionsToday: 0, staffPresent: 0 });
        setStudents([]);
        setEvents([]);
        setFlags([]);
        setLoading(false);
        return;
      }

      // Get student names
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .in('id', studentIds);
      const nameMap = new Map<string, string>();
      for (const s of (studentsData || []) as any[]) {
        nameMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown');
      }

      // Parallel fetches for today's data (teacher + clinical + signals + incidents)
      const [freqRes, abcRes, dataEvRes, sessionsRes, dataPointsRes, clinicalRes, signalsRes, incidentRes] = await Promise.all([
        supabase.from('teacher_frequency_entries').select('*').in('client_id', studentIds).eq('session_date', dateStr),
        supabase.from('teacher_abc_events').select('*').in('client_id', studentIds).gte('occurred_at', start),
        supabase.from('teacher_data_events').select('*').in('client_id', studentIds).gte('occurred_at', start),
        supabase.from('teacher_data_sessions').select('*').in('client_id', studentIds).gte('created_at', start),
        supabase.from('teacher_data_points').select('*').in('client_id', studentIds).gte('created_at', start),
        supabase.from('session_data').select('id, student_id, behavior_name, event_type, timestamp, duration_seconds, abc_data').in('student_id', studentIds).gte('timestamp', start),
        (supabase.from as any)('ci_signals').select('id, client_id, signal_type, severity, title, message, created_at').in('client_id', studentIds).gte('created_at', start),
        supabase.from('incident_logs').select('id, client_id, incident_type, severity, title, description, occurred_at').in('client_id', studentIds).gte('occurred_at', start),
      ]);

      const freqRows = (freqRes.data || []) as any[];
      const abcRows = (abcRes.data || []) as any[];
      const dataEvRows = (dataEvRes.data || []) as any[];
      const sessionRows = (sessionsRes.data || []) as any[];
      const dataPointRows = (dataPointsRes.data || []) as any[];
      const clinicalRows = (clinicalRes.data || []) as any[];
      const signalRows = (signalsRes.data || []) as any[];
      const incidentRows = (incidentRes.data || []) as any[];

      // === Snapshot ===
      const totalBehavior = freqRows.reduce((s, f) => s + (f.count || 1), 0) + abcRows.length;
      const activeProbes = sessionRows.filter((s: any) => !s.ended_at).length;
      const finishedProbes = sessionRows.filter((s: any) => s.ended_at).length;
      const completedPrompts = dataEvRows.filter((e: any) => e.event_type === 'prompt_completed').length;
      const expectedPrompts = dataEvRows.filter((e: any) => e.event_type === 'prompt_expected' || e.event_type === 'prompt_completed').length || completedPrompts;
      const snoozedPrompts = dataEvRows.filter((e: any) => e.event_type === 'prompt_snoozed').length;

      // Engagement from data events
      const engagementEvents = dataEvRows.filter((e: any) => e.event_type === 'engagement');
      const engagementPct = engagementEvents.length > 0
        ? Math.round(engagementEvents.reduce((s: number, e: any) => s + (e.value_number || 0), 0) / engagementEvents.length)
        : null;

      setSnapshot({
        totalBehaviorEvents: totalBehavior,
        engagementPct,
        completedPrompts,
        expectedPrompts: Math.max(expectedPrompts, completedPrompts),
        snoozedPrompts,
        activeProbes,
        finishedProbes,
      });

      // === Student Cards ===
      const studentBehavior = new Map<string, number>();
      for (const f of freqRows) {
        studentBehavior.set(f.client_id, (studentBehavior.get(f.client_id) || 0) + (f.count || 1));
      }
      for (const a of abcRows) {
        studentBehavior.set(a.client_id, (studentBehavior.get(a.client_id) || 0) + 1);
      }

      const studentEngagement = new Map<string, string>();
      for (const e of dataEvRows) {
        if (e.event_type === 'engagement' && e.client_id) {
          studentEngagement.set(e.client_id, `${e.value_number || 0}%`);
        }
      }

      const studentProbes = new Map<string, number>();
      for (const s of sessionRows) {
        studentProbes.set(s.client_id, (studentProbes.get(s.client_id) || 0) + 1);
      }

      // Top trigger per student from ABC
      const studentTriggers = new Map<string, Map<string, number>>();
      for (const a of abcRows) {
        if (!a.antecedent) continue;
        const map = studentTriggers.get(a.client_id) || new Map();
        map.set(a.antecedent, (map.get(a.antecedent) || 0) + 1);
        studentTriggers.set(a.client_id, map);
      }

      const cards: StudentTodayCard[] = studentIds.map(sid => {
        const triggers = studentTriggers.get(sid);
        let topTrigger: string | null = null;
        if (triggers) {
          let max = 0;
          for (const [k, v] of triggers) { if (v > max) { max = v; topTrigger = k; } }
        }
        return {
          student_id: sid,
          student_name: nameMap.get(sid) || 'Unknown',
          behaviorCountToday: studentBehavior.get(sid) || 0,
          lastEngagementResponse: studentEngagement.get(sid) || null,
          probeActivity: studentProbes.get(sid) || 0,
          topTrigger,
        };
      });
      setStudents(cards.sort((a, b) => b.behaviorCountToday - a.behaviorCountToday));

      // === Live Event Stream ===
      const allEvents: LiveEventItem[] = [];
      for (const f of freqRows) {
        allEvents.push({
          id: f.entry_id,
          type: 'frequency',
          student_name: nameMap.get(f.client_id) || 'Unknown',
          student_id: f.client_id,
          label: `Frequency: ${f.behavior_name}`,
          detail: `Count: ${f.count}`,
          occurred_at: f.started_at || f.created_at,
        });
      }
      for (const a of abcRows) {
        allEvents.push({
          id: a.event_id,
          type: 'abc',
          student_name: nameMap.get(a.client_id) || 'Unknown',
          student_id: a.client_id,
          label: `ABC: ${a.behavior}`,
          detail: `A: ${a.antecedent} → C: ${a.consequence}`,
          occurred_at: a.occurred_at,
        });
      }
      for (const e of dataEvRows) {
        allEvents.push({
          id: e.event_id,
          type: 'data_event',
          student_name: nameMap.get(e.client_id) || 'Unknown',
          student_id: e.client_id,
          label: `${e.event_type}: ${e.event_label || ''}`.trim(),
          detail: e.value_text || (e.value_number != null ? String(e.value_number) : null),
          occurred_at: e.occurred_at,
        });
      }
      for (const s of sessionRows) {
        allEvents.push({
          id: s.session_id,
          type: 'session',
          student_name: nameMap.get(s.client_id) || 'Unknown',
          student_id: s.client_id,
          label: `Probe: ${s.mode || 'session'}`,
          detail: s.ended_at ? 'Completed' : 'In Progress',
          occurred_at: s.started_at || s.created_at,
        });
      }
      // Clinical session_data events
      for (const c of clinicalRows) {
        allEvents.push({
          id: c.id,
          type: 'clinical_session',
          student_name: nameMap.get(c.student_id) || 'Unknown',
          student_id: c.student_id,
          label: `Clinical: ${c.event_type || 'event'}${c.behavior_name ? ` — ${c.behavior_name}` : ''}`,
          detail: c.duration_seconds ? `Duration: ${c.duration_seconds}s` : null,
          occurred_at: c.timestamp,
        });
      }
      // CI Signals
      for (const s of signalRows) {
        allEvents.push({
          id: s.id,
          type: 'signal',
          student_name: s.client_id ? (nameMap.get(s.client_id) || 'Unknown') : 'Classroom',
          student_id: s.client_id || '',
          label: `Signal: ${s.title || s.signal_type}`,
          detail: s.message,
          occurred_at: s.created_at,
          severity: s.severity,
        });
      }
      // Incident logs
      for (const i of incidentRows) {
        allEvents.push({
          id: i.id,
          type: 'incident',
          student_name: i.client_id ? (nameMap.get(i.client_id) || 'Unknown') : 'Classroom',
          student_id: i.client_id || '',
          label: `Incident: ${i.title || i.incident_type}`,
          detail: i.description ? i.description.substring(0, 120) : null,
          occurred_at: i.occurred_at,
          severity: String(i.severity),
        });
      }
      allEvents.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
      setEvents(allEvents);

      // === Flags ===
      const flagList: ClassroomFlag[] = [];
      if (cards.length > 0) {
        const highest = cards[0];
        if (highest.behaviorCountToday > 0) {
          flagList.push({ type: 'highest_events', label: 'Highest Events', value: `${highest.student_name} (${highest.behaviorCountToday})` });
        }

        // Lowest engagement
        const withEngagement = cards.filter(c => c.lastEngagementResponse);
        if (withEngagement.length > 0) {
          const lowest = withEngagement.sort((a, b) => parseInt(a.lastEngagementResponse || '100') - parseInt(b.lastEngagementResponse || '100'))[0];
          flagList.push({ type: 'lowest_engagement', label: 'Lowest Engagement', value: `${lowest.student_name} (${lowest.lastEngagementResponse})` });
        }

        // Top trigger across classroom
        const allTriggerCounts = new Map<string, number>();
        for (const a of abcRows) {
          if (a.antecedent) allTriggerCounts.set(a.antecedent, (allTriggerCounts.get(a.antecedent) || 0) + 1);
        }
        let topTrigger = '', topCount = 0;
        for (const [k, v] of allTriggerCounts) { if (v > topCount) { topCount = v; topTrigger = k; } }
        if (topTrigger) {
          flagList.push({ type: 'top_trigger', label: 'Top Trigger Today', value: `${topTrigger} (${topCount}x)` });
        }

        // Reliability
        if (expectedPrompts > 0 && completedPrompts / expectedPrompts < 0.7) {
          flagList.push({ type: 'reliability', label: 'Reliability Concern', value: `${Math.round((completedPrompts / expectedPrompts) * 100)}% prompt completion` });
        }
      }
      setFlags(flagList);

    } catch (err) {
      console.error('[ClassroomToday] drilldown error:', err);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Auto-poll every 20 seconds
  useEffect(() => {
    if (!classroomId) return;
    const interval = setInterval(fetch, 20_000);
    return () => clearInterval(interval);
  }, [classroomId, fetch]);

  return { snapshot, students, events, flags, loading, refresh: fetch };
}
