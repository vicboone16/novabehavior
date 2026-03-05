import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupervisorSignal {
  id: string;
  agency_id: string;
  client_id: string | null;
  client_name?: string;
  rule_id: string | null;
  signal_type: string;
  severity: string;
  title: string;
  message: string | null;
  context_json: Record<string, any>;
  source: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_note: string | null;
}

export interface SignalRule {
  id: string;
  agency_id: string | null;
  rule_key: string;
  display_name: string;
  category: string;
  severity: string;
  threshold_value: number;
  threshold_unit: string;
  time_window_minutes: number | null;
  comparison: string;
  description: string | null;
  is_active: boolean;
}

export function useSupervisorSignals(agencyId: string | null) {
  const [signals, setSignals] = useState<SupervisorSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = useCallback(async () => {
    if (!agencyId) { setSignals([]); setLoading(false); return; }
    try {
      setLoading(true);
      let query = (supabase.from as any)('ci_signals')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });
      if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
      const { data, error } = await query;

      if (error) { console.error('[Signals] fetch error:', error); setSignals([]); setLoading(false); return; }

      const rows = (data || []) as any[];
      if (rows.length === 0) { setSignals([]); setLoading(false); return; }

      // Resolve client names
      const clientIds = rows.filter(r => r.client_id).map(r => r.client_id);
      const nameMap = new Map<string, string>();
      if (clientIds.length > 0) {
        const { data: students } = await supabase.from('students').select('id, first_name, last_name').in('id', clientIds);
        if (students) {
          for (const s of students as any[]) {
            nameMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown');
          }
        }
      }

      setSignals(rows.map(r => ({
        ...r,
        context_json: r.context_json || {},
        client_name: r.client_id ? nameMap.get(r.client_id) || undefined : undefined,
      })));
    } catch (err) {
      console.error('[Signals] unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  // Realtime subscription
  useEffect(() => {
    if (!agencyId) return;
    const channel = supabase
      .channel('ci_signals_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ci_signals' }, () => {
        fetchSignals();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agencyId, fetchSignals]);

  const resolveSignal = async (signalId: string, userId: string, note?: string) => {
    const { error } = await (supabase.from as any)('ci_signals')
      .update({ resolved_at: new Date().toISOString(), resolved_by: userId, resolved_note: note || null })
      .eq('id', signalId);
    if (!error) setSignals(prev => prev.filter(s => s.id !== signalId));
    return !error;
  };

  return { signals, loading, refresh: fetchSignals, resolveSignal };
}

export function useSignalRules(agencyId: string | null) {
  const [rules, setRules] = useState<SignalRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setRules([]); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      // Get global + agency-specific rules
      let query = (supabase.from as any)('ci_signal_rules').select('*').eq('is_active', true);
      const { data, error } = await query;
      if (!error && data) {
        // Filter: global (null agency) + matching agency
        const filtered = (data as any[]).filter(r =>
          r.agency_id === null || r.agency_id === agencyId || agencyId === 'all'
        );
        setRules(filtered as SignalRule[]);
      }
      setLoading(false);
    };
    fetch();
  }, [agencyId]);

  return { rules, loading };
}
