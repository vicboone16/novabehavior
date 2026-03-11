import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const results = { escalated: 0, notified: 0 };

    // 1. Crisis requests not acknowledged within 30 minutes
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const { data: crisisRequests } = await supabase
      .from('service_requests')
      .select('id, agency_id, title, assigned_to')
      .eq('priority', 'crisis')
      .is('acknowledged_at', null)
      .not('status', 'in', '("completed","closed","cancelled")')
      .lt('created_at', thirtyMinAgo);

    if (crisisRequests && crisisRequests.length > 0) {
      for (const req of crisisRequests) {
        await supabase
          .from('service_requests')
          .update({
            status: 'escalated',
            escalated_at: now.toISOString(),
            escalated_reason: 'Crisis request not acknowledged within 30 minutes',
          })
          .eq('id', req.id);

        await supabase.from('service_request_updates').insert({
          request_id: req.id,
          agency_id: req.agency_id,
          user_id: req.assigned_to || '00000000-0000-0000-0000-000000000000',
          update_type: 'auto_escalation',
          note_text: 'Auto-escalated: Crisis request not acknowledged within 30 minutes',
          new_status: 'escalated',
        });

        results.escalated++;
      }
    }

    // 2. High priority requests overdue
    const { data: overdueRequests } = await supabase
      .from('service_requests')
      .select('id, agency_id, assigned_to')
      .in('priority', ['high', 'urgent'])
      .not('status', 'in', '("completed","closed","cancelled","escalated")')
      .not('due_date', 'is', null)
      .lt('due_date', now.toISOString());

    if (overdueRequests && overdueRequests.length > 0) {
      for (const req of overdueRequests) {
        await supabase.from('service_request_updates').insert({
          request_id: req.id,
          agency_id: req.agency_id,
          user_id: req.assigned_to || '00000000-0000-0000-0000-000000000000',
          update_type: 'overdue_notification',
          note_text: 'High-priority request is overdue',
        });
        results.notified++;
      }
    }

    // 3. Urgent requests unassigned for 4+ hours
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const { data: unassignedUrgent } = await supabase
      .from('service_requests')
      .select('id, agency_id')
      .in('priority', ['urgent', 'crisis'])
      .is('assigned_to', null)
      .not('status', 'in', '("completed","closed","cancelled","escalated")')
      .lt('created_at', fourHoursAgo);

    if (unassignedUrgent && unassignedUrgent.length > 0) {
      for (const req of unassignedUrgent) {
        await supabase
          .from('service_requests')
          .update({
            status: 'escalated',
            escalated_at: now.toISOString(),
            escalated_reason: 'Urgent request unassigned for over 4 hours',
          })
          .eq('id', req.id);

        await supabase.from('service_request_updates').insert({
          request_id: req.id,
          agency_id: req.agency_id,
          user_id: '00000000-0000-0000-0000-000000000000',
          update_type: 'auto_escalation',
          note_text: 'Auto-escalated: Urgent request unassigned for 4+ hours',
          new_status: 'escalated',
        });

        results.escalated++;
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
