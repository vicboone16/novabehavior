import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';

export const REQUEST_TYPES = [
  { value: 'bcba_consult', label: 'BCBA Consult' },
  { value: 'parent_training', label: 'Parent Training Request' },
  { value: 'behavior_plan_review', label: 'Behavior Plan Review' },
  { value: 'fba_request', label: 'FBA Request' },
  { value: 'reassessment_request', label: 'Reassessment Request' },
  { value: 'crisis_support', label: 'Crisis Support' },
  { value: 'staffing_support', label: 'Staffing Support' },
  { value: 'supervision_increase', label: 'Supervision Increase' },
  { value: 'schedule_change', label: 'Schedule Change' },
  { value: 'records_request', label: 'Records / Documents Request' },
  { value: 'authorization_renewal', label: 'Authorization Renewal' },
  { value: 'insurance_followup', label: 'Insurance Follow-Up' },
  { value: 'billing_review', label: 'Billing Review' },
  { value: 'intake_review', label: 'Intake Review' },
  { value: 'school_observation', label: 'School Observation' },
  { value: 'program_modification', label: 'Program Modification Request' },
  { value: 'goal_update', label: 'Goal Update Request' },
  { value: 'discharge_transition', label: 'Discharge / Transition Request' },
  { value: 'other', label: 'Other' },
] as const;

export const STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-muted text-muted-foreground' },
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'unassigned', label: 'Unassigned', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  { value: 'assigned', label: 'Assigned', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
  { value: 'waiting_on_info', label: 'Waiting on Info', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'waiting_on_family', label: 'Waiting on Family', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'waiting_on_school', label: 'Waiting on School', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'waiting_on_authorization', label: 'Waiting on Auth', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'escalated', label: 'Escalated', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
] as const;

export const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-muted-foreground' },
  { value: 'normal', label: 'Normal', color: 'text-foreground' },
  { value: 'high', label: 'High', color: 'text-amber-600' },
  { value: 'urgent', label: 'Urgent', color: 'text-orange-600' },
  { value: 'crisis', label: 'Crisis', color: 'text-destructive font-bold' },
] as const;

// Smart routing defaults
export const DEFAULT_ROUTING: Record<string, { role: string; priority?: string }> = {
  authorization_renewal: { role: 'billing_admin' },
  insurance_followup: { role: 'billing_admin' },
  billing_review: { role: 'billing_admin' },
  crisis_support: { role: 'clinical_director', priority: 'crisis' },
  bcba_consult: { role: 'clinical_supervisor' },
  records_request: { role: 'case_manager' },
  program_modification: { role: 'bcba' },
  fba_request: { role: 'bcba' },
  behavior_plan_review: { role: 'bcba' },
  goal_update: { role: 'bcba' },
  intake_review: { role: 'admin' },
};

export interface ServiceRequest {
  id: string;
  agency_id: string;
  client_id: string | null;
  request_type: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  requested_by: string;
  assigned_to: string | null;
  assigned_role: string | null;
  due_date: string | null;
  related_module: string | null;
  tags: string[] | null;
  resolution_summary: string | null;
  internal_notes: string | null;
  escalated_at: string | null;
  escalated_reason: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  student_name?: string;
  requester_name?: string;
  assignee_name?: string;
}

export interface ServiceRequestActivity {
  id: string;
  request_id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
  user_name?: string;
}

export type SRFilter = 'all' | 'my_requests' | 'team_queue' | 'urgent' | 'unassigned' | 'in_progress' | 'waiting' | 'completed' | 'closed';

export function useServiceRequests(filter: SRFilter = 'all') {
  const { user } = useAuth();
  const { currentAgency } = useAgencyContext();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!currentAgency?.id || !user) { setRequests([]); setLoading(false); return; }
    setLoading(true);
    try {
      let query = supabase
        .from('service_requests')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .order('created_at', { ascending: false });

      switch (filter) {
        case 'my_requests':
          query = query.eq('requested_by', user.id);
          break;
        case 'team_queue':
          query = query.or(`assigned_to.eq.${user.id},assigned_to.is.null`);
          break;
        case 'urgent':
          query = query.in('priority', ['urgent', 'crisis']);
          break;
        case 'unassigned':
          query = query.is('assigned_to', null).not('status', 'in', '("completed","closed","cancelled","draft")');
          break;
        case 'in_progress':
          query = query.eq('status', 'in_progress');
          break;
        case 'waiting':
          query = query.in('status', ['waiting_on_info', 'waiting_on_family', 'waiting_on_school', 'waiting_on_authorization']);
          break;
        case 'completed':
          query = query.eq('status', 'completed');
          break;
        case 'closed':
          query = query.in('status', ['closed', 'cancelled']);
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests((data as unknown as ServiceRequest[]) || []);
    } catch (err) {
      console.error('[SR] Error fetching:', err);
    } finally {
      setLoading(false);
    }
  }, [currentAgency?.id, user, filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const createRequest = async (req: Partial<ServiceRequest>) => {
    if (!currentAgency?.id || !user) return null;
    const payload = {
      ...req,
      agency_id: currentAgency.id,
      requested_by: user.id,
      status: req.status || 'submitted',
      priority: req.priority || 'normal',
    };
    
    // Apply smart routing
    const routing = DEFAULT_ROUTING[req.request_type || ''];
    if (routing) {
      if (!payload.assigned_role) payload.assigned_role = routing.role;
      if (routing.priority && !req.priority) payload.priority = routing.priority;
    }

    const { data, error } = await supabase
      .from('service_requests')
      .insert(payload as any)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase.from('service_request_updates').insert({
      request_id: (data as any).id,
      agency_id: currentAgency.id,
      user_id: user.id,
      update_type: 'created',
      note_text: 'Request created',
      new_status: payload.status,
    } as any);

    fetchRequests();
    return data;
  };

  const updateRequest = async (id: string, updates: Partial<ServiceRequest>) => {
    if (!user || !currentAgency?.id) return;
    const { error } = await supabase
      .from('service_requests')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) throw error;

    // Log activity
    if (updates.status) {
      await supabase.from('service_request_updates').insert({
        request_id: id,
        agency_id: currentAgency.id,
        user_id: user.id,
        update_type: 'status_change',
        note_text: `Status changed to ${updates.status}`,
        new_status: updates.status,
      } as any);
    }

    fetchRequests();
  };

  const getActivities = async (requestId: string) => {
    const { data } = await supabase
      .from('service_request_updates')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    return (data || []) as unknown as ServiceRequestActivity[];
  };

  return { requests, loading, refresh: fetchRequests, createRequest, updateRequest, getActivities };
}
