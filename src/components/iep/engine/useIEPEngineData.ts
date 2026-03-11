import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export interface IEPMeeting {
  meeting_session_id: string;
  student_id: string;
  client_id: string;
  meeting_date: string;
  meeting_type: string;
  meeting_title: string;
  school_name: string;
  grade_level: string;
  case_manager_name: string;
  status: string;
  readiness_percent: number;
  talking_point_count: number;
  recommendation_count: number;
  goal_draft_count: number;
}

export function useIEPEngineData(studentId: string, meetingSessionId?: string | null) {
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<IEPMeeting | null>(null);
  const [behaviorSummary, setBehaviorSummary] = useState<any[]>([]);
  const [goalProgress, setGoalProgress] = useState<any[]>([]);
  const [intelligenceContext, setIntelligenceContext] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [goalDrafts, setGoalDrafts] = useState<any[]>([]);
  const [talkingPoints, setTalkingPoints] = useState<any[]>([]);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        db.from('v_iep_behavior_summary').select('*').eq('student_id', studentId),
        db.from('v_iep_goal_progress_summary').select('*').eq('student_id', studentId),
        db.from('v_iep_meeting_intelligence_context').select('*').eq('student_id', studentId).limit(1).maybeSingle(),
      ];

      if (meetingSessionId) {
        promises.push(
          db.from('v_iep_meeting_workspace').select('*').eq('meeting_session_id', meetingSessionId).maybeSingle(),
          db.from('iep_meeting_recommendation_items').select('*').eq('meeting_session_id', meetingSessionId),
          db.from('iep_meeting_goal_draft_items').select('*').eq('meeting_session_id', meetingSessionId),
          db.from('iep_meeting_talking_points').select('*').eq('meeting_session_id', meetingSessionId).order('display_order'),
          db.from('iep_meeting_checklist_items').select('*').eq('meeting_session_id', meetingSessionId),
          db.from('iep_meeting_attendees').select('*').eq('meeting_session_id', meetingSessionId),
          db.from('iep_meeting_intelligence_snapshots').select('*').eq('meeting_session_id', meetingSessionId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        );
      }

      const results = await Promise.all(promises);
      setBehaviorSummary(results[0].data || []);
      setGoalProgress(results[1].data || []);
      setIntelligenceContext(results[2].data || null);

      if (meetingSessionId) {
        setMeeting(results[3].data || null);
        setRecommendations(results[4].data || []);
        setGoalDrafts(results[5].data || []);
        setTalkingPoints(results[6].data || []);
        setChecklistItems(results[7].data || []);
        setAttendees(results[8].data || []);
        setSnapshot(results[9]?.data || null);
      }
    } catch (e: any) {
      console.error('IEP engine data error:', e);
    } finally {
      setLoading(false);
    }
  }, [studentId, meetingSessionId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createMeeting = async (data: Partial<IEPMeeting>) => {
    if (!user) return null;
    const { data: created, error } = await db.from('iep_meeting_sessions').insert({
      student_id: studentId,
      client_id: studentId,
      created_by: user.id,
      ...data,
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success('IEP meeting session created');
    return created;
  };

  const seedChecklist = async (sessionId: string) => {
    await db.rpc('seed_iep_meeting_checklist', { p_meeting_session_id: sessionId });
  };

  const seedTalkingPoints = async (sessionId: string) => {
    await db.rpc('seed_iep_meeting_talking_points', {
      p_meeting_session_id: sessionId,
      p_student_id: studentId,
      p_created_by: user?.id,
    });
  };

  const pushOptimization = async (sessionId: string) => {
    await db.rpc('push_school_optimization_to_iep_meeting', {
      p_meeting_session_id: sessionId,
      p_student_id: studentId,
      p_created_by: user?.id,
    });
  };

  const pushGoalDrafts = async (sessionId: string) => {
    await db.rpc('push_approved_goal_drafts_to_iep_meeting', {
      p_meeting_session_id: sessionId,
      p_student_id: studentId,
      p_created_by: user?.id,
    });
  };

  const seedSnapshot = async (sessionId: string) => {
    await db.rpc('seed_iep_meeting_intelligence_snapshot', {
      p_meeting_session_id: sessionId,
      p_created_by: user?.id,
    });
  };

  const toggleChecklistItem = async (itemId: string, isComplete: boolean) => {
    await db.from('iep_meeting_checklist_items').update({ is_complete: isComplete }).eq('id', itemId);
    setChecklistItems(prev => prev.map(i => i.id === itemId ? { ...i, is_complete: isComplete } : i));
  };

  const addTalkingPoint = async (sessionId: string, category: string, text: string) => {
    const { data, error } = await db.from('iep_meeting_talking_points').insert({
      meeting_session_id: sessionId,
      point_category: category,
      point_text: text,
      display_order: talkingPoints.length,
      created_by: user?.id,
    }).select().single();
    if (!error && data) setTalkingPoints(prev => [...prev, data]);
  };

  const addAttendee = async (sessionId: string, name: string, role: string) => {
    const { data, error } = await db.from('iep_meeting_attendees').insert({
      meeting_session_id: sessionId,
      attendee_name: name,
      attendee_role: role,
    }).select().single();
    if (!error && data) setAttendees(prev => [...prev, data]);
  };

  return {
    meeting, behaviorSummary, goalProgress, intelligenceContext,
    recommendations, goalDrafts, talkingPoints, checklistItems, attendees, snapshot,
    loading, refresh, createMeeting, seedChecklist, seedTalkingPoints,
    pushOptimization, pushGoalDrafts, seedSnapshot, toggleChecklistItem,
    addTalkingPoint, addAttendee,
  };
}
