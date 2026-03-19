import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

// ─── Behavior Decoded Bridge ─────────────────────────────
export function useBehaviorDecodedBridge() {
  const { user } = useAuth();

  const fetchLinks = useCallback(async (studentId: string) => {
    const { data, error } = await db
      .from('behavior_decoded_links')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);

  const createLink = useCallback(async (studentId: string, parentContactId: string, linkMode: string = 'optional') => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await db
      .from('behavior_decoded_links')
      .insert({ student_id: studentId, parent_contact_id: parentContactId, link_mode: linkMode })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, [user]);

  const updateLinkStatus = useCallback(async (linkId: string, portalStatus: string) => {
    const { error } = await db
      .from('behavior_decoded_links')
      .update({ portal_status: portalStatus, updated_at: new Date().toISOString() })
      .eq('id', linkId);
    if (error) throw error;
  }, []);

  const fetchSyncLog = useCallback(async (studentId: string) => {
    const { data, error } = await db
      .from('behavior_decoded_sync_log')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  }, []);

  return { fetchLinks, createLink, updateLinkStatus, fetchSyncLog };
}

// ─── Notification Orchestration ──────────────────────────
export function useNotificationOrchestration() {
  const { user } = useAuth();

  const fetchProviders = useCallback(async () => {
    const { data, error } = await db.from('notification_providers').select('*').order('provider_name');
    if (error) throw error;
    return data || [];
  }, []);

  const toggleProvider = useCallback(async (providerId: string, active: boolean) => {
    const { error } = await db.from('notification_providers').update({ active }).eq('id', providerId);
    if (error) throw error;
  }, []);

  const fetchEvents = useCallback(async (opts?: { scopeType?: string; scopeId?: string; limit?: number }) => {
    let q = db.from('notification_events').select('*').order('created_at', { ascending: false });
    if (opts?.scopeType) q = q.eq('scope_type', opts.scopeType);
    if (opts?.scopeId) q = q.eq('scope_id', opts.scopeId);
    q = q.limit(opts?.limit || 50);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, []);

  const fetchDispatchQueue = useCallback(async (status?: string) => {
    let q = db.from('v_notification_dispatch_pending').select('*');
    if (status) q = q.eq('delivery_status', status);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, []);

  return { fetchProviders, toggleProvider, fetchEvents, fetchDispatchQueue };
}

// ─── Reward Effectiveness & Reinforcer Preferences ──────
export function useRewardEffectiveness() {
  const { user } = useAuth();

  const fetchObservations = useCallback(async (studentId: string) => {
    const { data, error } = await db
      .from('reward_effectiveness_observations')
      .select('*')
      .eq('student_id', studentId)
      .order('observation_window_start', { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);

  const createObservation = useCallback(async (obs: {
    student_id: string;
    reward_id?: string;
    observation_window_start: string;
    observation_window_end: string;
    pre_behavior_json: any;
    post_behavior_json: any;
    engagement_delta?: number;
    behavior_delta?: number;
    notes?: string;
  }) => {
    const { data, error } = await db.from('reward_effectiveness_observations').insert(obs).select().single();
    if (error) throw error;
    return data;
  }, []);

  const fetchEffectivenessSummary = useCallback(async (studentId: string) => {
    const { data, error } = await db
      .from('v_reward_effectiveness_summary')
      .select('*')
      .eq('student_id', studentId);
    if (error) throw error;
    return data || [];
  }, []);

  const fetchPreferences = useCallback(async (studentId: string) => {
    const { data, error } = await db
      .from('student_reinforcer_preferences')
      .select('*')
      .eq('student_id', studentId)
      .eq('active', true)
      .order('preference_rank');
    if (error) throw error;
    return data || [];
  }, []);

  const upsertPreference = useCallback(async (pref: {
    student_id: string;
    reward_id?: string;
    preference_label?: string;
    preference_rank: number;
    active?: boolean;
  }) => {
    const { data, error } = await db
      .from('student_reinforcer_preferences')
      .upsert(pref, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  return { fetchObservations, createObservation, fetchEffectivenessSummary, fetchPreferences, upsertPreference };
}

// ─── AI Suggestions (Beacon AI) ─────────────────────────
export function useBeaconAI() {
  const { user } = useAuth();

  const fetchSuggestions = useCallback(async (opts?: { scopeType?: string; scopeId?: string; status?: string }) => {
    let q = db.from('beacon_ai_suggestions').select('*').order('created_at', { ascending: false });
    if (opts?.scopeType) q = q.eq('scope_type', opts.scopeType);
    if (opts?.scopeId) q = q.eq('scope_id', opts.scopeId);
    if (opts?.status) q = q.eq('status', opts.status);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, []);

  const fetchOpenSuggestions = useCallback(async (scopeId?: string) => {
    let q = db.from('v_open_ai_suggestions').select('*');
    if (scopeId) q = q.eq('scope_id', scopeId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, []);

  const reviewSuggestion = useCallback(async (suggestionId: string, status: string) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await db
      .from('beacon_ai_suggestions')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', suggestionId);
    if (error) throw error;
  }, [user]);

  const submitFeedback = useCallback(async (suggestionId: string, feedbackType: string, feedbackText?: string) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await db
      .from('beacon_ai_feedback')
      .insert({ suggestion_id: suggestionId, feedback_type: feedbackType, feedback_text: feedbackText, created_by: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, [user]);

  return { fetchSuggestions, fetchOpenSuggestions, reviewSuggestion, submitFeedback };
}

// ─── District/School Reporting ───────────────────────────
export function useDistrictReporting() {
  const fetchSnapshots = useCallback(async (opts?: { scopeType?: string; scopeId?: string }) => {
    let q = db.from('v_reporting_snapshots_recent').select('*');
    if (opts?.scopeType) q = q.eq('scope_type', opts.scopeType);
    if (opts?.scopeId) q = q.eq('scope_id', opts.scopeId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, []);

  const fetchLeaderboards = useCallback(async (scopeType: string, scopeId: string, periodType?: string) => {
    let q = db
      .from('school_leaderboards')
      .select('*')
      .eq('scope_type', scopeType)
      .eq('scope_id', scopeId)
      .order('generated_at', { ascending: false });
    if (periodType) q = q.eq('period_type', periodType);
    q = q.limit(10);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, []);

  const fetchAutomationRules = useCallback(async (scopeType?: string, scopeId?: string) => {
    let q = db.from('automation_rules').select('*').order('rule_name');
    if (scopeType) q = q.eq('scope_type', scopeType);
    if (scopeId) q = q.eq('scope_id', scopeId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, []);

  const toggleAutomationRule = useCallback(async (ruleId: string, active: boolean) => {
    const { error } = await db
      .from('automation_rules')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', ruleId);
    if (error) throw error;
  }, []);

  return { fetchSnapshots, fetchLeaderboards, fetchAutomationRules, toggleAutomationRule };
}
