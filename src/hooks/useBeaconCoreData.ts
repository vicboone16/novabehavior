import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

// ─── Beacon Today KPIs (for Intelligence dashboard) ─────
export interface BeaconTodayKPIs {
  pointsAwarded: number;
  pointsRedeemed: number;
  rewardRedemptions: number;
  maydayAlerts: number;
  topTriggers: { trigger: string; count: number }[];
  promptCompletionPct: number;
  engagementPct: number | null;
}

export function useBeaconTodayKPIs(agencyId: string | null) {
  const [kpis, setKpis] = useState<BeaconTodayKPIs>({
    pointsAwarded: 0,
    pointsRedeemed: 0,
    rewardRedemptions: 0,
    maydayAlerts: 0,
    topTriggers: [],
    promptCompletionPct: 0,
    engagementPct: null,
  });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) { setLoading(false); return; }
    try {
      setLoading(true);
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      let pointsQ = db.from('beacon_points_ledger').select('points_delta').gte('created_at', startOfDay);
      let maydayQ = db.from('mayday_alerts').select('id').gte('created_at', startOfDay);
      let redemptionsQ = db.from('beacon_reward_redemptions').select('id').gte('created_at', startOfDay);
      let abcQ = db.from('teacher_abc_events').select('antecedent').gte('occurred_at', startOfDay);

      if (agencyId !== 'all') {
        pointsQ = pointsQ.eq('agency_id', agencyId);
        maydayQ = maydayQ.eq('agency_id', agencyId);
        redemptionsQ = redemptionsQ.eq('agency_id', agencyId);
        abcQ = abcQ.eq('agency_id', agencyId);
      }

      const [pointsRes, maydayRes, redemptionsRes, abcRes] = await Promise.all([
        pointsQ, maydayQ, redemptionsQ, abcQ,
      ]);

      const points = (pointsRes.data || []) as any[];
      let awarded = 0, redeemed = 0;
      for (const p of points) {
        if (p.points_delta > 0) awarded += p.points_delta;
        else redeemed += Math.abs(p.points_delta);
      }

      // Top triggers from ABC events
      const triggerMap = new Map<string, number>();
      for (const e of (abcRes.data || []) as any[]) {
        if (e.antecedent) {
          triggerMap.set(e.antecedent, (triggerMap.get(e.antecedent) || 0) + 1);
        }
      }
      const topTriggers = [...triggerMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([trigger, count]) => ({ trigger, count }));

      setKpis({
        pointsAwarded: awarded,
        pointsRedeemed: redeemed,
        rewardRedemptions: (redemptionsRes.data || []).length,
        maydayAlerts: (maydayRes.data || []).length,
        topTriggers,
        promptCompletionPct: 0,
        engagementPct: null,
      });
    } catch (err) {
      console.error('useBeaconTodayKPIs error:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { kpis, loading, refresh: fetch };
}

// ─── Student Reward Summary ─────────────────────────────
export interface StudentRewardSummary {
  student_id: string;
  total_earned: number;
  total_spent: number;
  balance: number;
  earned_today: number;
  spent_today: number;
}

export function useStudentRewardSummary(studentId: string | null) {
  const [summary, setSummary] = useState<StudentRewardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    db.from('v_beacon_student_reward_summary')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle()
      .then(({ data }: any) => {
        setSummary(data || null);
        setLoading(false);
      });
  }, [studentId]);

  return { summary, loading };
}

// ─── Classroom Presence ─────────────────────────────────
export interface PresenceRecord {
  student_id: string;
  status: string;
  changed_at: string;
}

export function useClassroomPresence(classroomId: string | null) {
  const [records, setRecords] = useState<PresenceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classroomId) { setLoading(false); return; }
    db.from('v_classroom_presence_today')
      .select('*')
      .eq('classroom_id', classroomId)
      .then(({ data }: any) => {
        setRecords(data || []);
        setLoading(false);
      });
  }, [classroomId]);

  return { records, loading };
}

// ─── Parent Snapshot Generation ─────────────────────────
export function useParentSnapshotGeneration() {
  const generateDailySnapshot = useCallback(async (studentId: string) => {
    // Fetch latest inputs from the view
    const { data: inputs } = await db
      .from('v_daily_student_snapshot_inputs')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (!inputs) return null;

    // Create a daily snapshot record
    const { data, error } = await db
      .from('daily_student_snapshots')
      .insert({
        student_id: studentId,
        snapshot_date: new Date().toISOString().split('T')[0],
        payload: inputs,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const generateWeeklyReport = useCallback(async (studentId: string, weekStart: string) => {
    const { data, error } = await db
      .from('weekly_student_reports')
      .insert({
        student_id: studentId,
        week_start: weekStart,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  return { generateDailySnapshot, generateWeeklyReport };
}

// ─── Teacher ABC Recent (for student profile) ───────────
export interface TeacherABCEvent {
  id: string;
  student_id: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  intensity: number | null;
  setting: string | null;
  notes: string | null;
  occurred_at: string;
}

export function useTeacherABCRecent(studentId: string | null) {
  const [events, setEvents] = useState<TeacherABCEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    db.from('v_teacher_abc_recent')
      .select('*')
      .eq('student_id', studentId)
      .limit(50)
      .then(({ data }: any) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, [studentId]);

  return { events, loading };
}
