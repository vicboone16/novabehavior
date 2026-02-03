import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  OrgCoverageSettings,
  PayerPlan,
  CoverageRuleInsurance,
  CoverageRuleSchool,
  CoverageCheck,
  CoverageTask,
  CoverageMode,
} from '@/types/coverage';

export function useCoverage(clientId?: string) {
  const [loading, setLoading] = useState(true);
  const [orgSettings, setOrgSettings] = useState<OrgCoverageSettings | null>(null);
  const [payerPlans, setPayerPlans] = useState<PayerPlan[]>([]);
  const [insuranceRules, setInsuranceRules] = useState<CoverageRuleInsurance[]>([]);
  const [schoolRules, setSchoolRules] = useState<CoverageRuleSchool[]>([]);
  const [coverageChecks, setCoverageChecks] = useState<CoverageCheck[]>([]);
  const [coverageTasks, setCoverageTasks] = useState<CoverageTask[]>([]);
  const [effectiveMode, setEffectiveMode] = useState<CoverageMode>('SCHOOL_LIGHT');

  const loadCoverageData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load org settings
      const { data: orgData } = await supabase
        .from('org_coverage_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (orgData) setOrgSettings(orgData as unknown as OrgCoverageSettings);

      if (clientId) {
        // Load client-specific data
        const [
          plansRes,
          insuranceRes,
          schoolRes,
          checksRes,
          tasksRes,
          clientRes,
        ] = await Promise.all([
          supabase.from('payer_plans').select('*').eq('client_id', clientId).order('is_primary', { ascending: false }),
          supabase.from('coverage_rules_insurance').select('*').eq('client_id', clientId).eq('is_active', true),
          supabase.from('coverage_rules_school').select('*').eq('client_id', clientId).eq('is_active', true),
          supabase.from('coverage_checks').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(20),
          supabase.from('coverage_tasks').select('*').eq('client_id', clientId).order('due_date'),
          supabase.from('students').select('coverage_mode_override').eq('id', clientId).single(),
        ]);

        if (plansRes.data) setPayerPlans(plansRes.data as unknown as PayerPlan[]);
        if (insuranceRes.data) setInsuranceRules(insuranceRes.data as unknown as CoverageRuleInsurance[]);
        if (schoolRes.data) setSchoolRules(schoolRes.data as unknown as CoverageRuleSchool[]);
        if (checksRes.data) setCoverageChecks(checksRes.data as unknown as CoverageCheck[]);
        if (tasksRes.data) setCoverageTasks(tasksRes.data as unknown as CoverageTask[]);

        // Determine effective mode
        const clientOverride = clientRes.data?.coverage_mode_override;
        setEffectiveMode((clientOverride || orgData?.coverage_mode || 'SCHOOL_LIGHT') as CoverageMode);
      }
    } catch (error) {
      console.error('Error loading coverage data:', error);
      toast.error('Failed to load coverage data');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadCoverageData();
  }, [loadCoverageData]);

  const runCoverageCheck = async (triggerReason: string, sessionId?: string) => {
    if (!clientId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Determine which rules to check based on mode
      const rulesToCheck = effectiveMode === 'INSURANCE_STRICT' 
        ? insuranceRules.map(r => r.id)
        : schoolRules.map(r => r.id);

      // Evaluate coverage
      let resultStatus: 'pass' | 'warn' | 'fail' = 'pass';
      let summary = '';

      if (effectiveMode === 'INSURANCE_STRICT') {
        const hasValidRules = insuranceRules.some(r => r.coverage_status === 'covered' || r.coverage_status === 'covered_auth_required');
        const hasOverdue = insuranceRules.some(r => 
          r.next_verification_due_at && new Date(r.next_verification_due_at) < new Date()
        );
        
        if (!hasValidRules) {
          resultStatus = 'fail';
          summary = 'No valid coverage rules found';
        } else if (hasOverdue) {
          resultStatus = 'warn';
          summary = 'Coverage verification is overdue';
        } else {
          summary = 'All coverage rules verified';
        }
      } else {
        const hasActiveRules = schoolRules.some(r => r.status === 'active');
        if (!hasActiveRules) {
          resultStatus = 'warn';
          summary = 'No active service line rules found';
        } else {
          summary = 'Service line eligibility confirmed';
        }
      }

      // Insert coverage check record
      const { data: checkData, error } = await supabase
        .from('coverage_checks')
        .insert({
          client_id: clientId,
          mode_used: effectiveMode,
          trigger_reason: triggerReason,
          performed_by: user?.id,
          performed_by_type: 'staff',
          result_status: resultStatus,
          summary,
          linked_rules_checked: rulesToCheck,
          session_id: sessionId,
        })
        .select()
        .single();

      if (error) throw error;

      // Create task if coverage failed
      if (resultStatus === 'fail') {
        await supabase.from('coverage_tasks').insert({
          client_id: clientId,
          task_type: 'resolve_coverage_block',
          due_date: new Date().toISOString().split('T')[0],
          priority: 'high',
          status: 'pending',
          reason: summary,
          linked_session_ids: sessionId ? [sessionId] : [],
        });
      }

      await loadCoverageData();
      toast.success(`Coverage check complete: ${resultStatus.toUpperCase()}`);
      return checkData;
    } catch (error) {
      console.error('Error running coverage check:', error);
      toast.error('Failed to run coverage check');
      return null;
    }
  };

  const updateOrgMode = async (mode: CoverageMode) => {
    try {
      const { error } = await supabase
        .from('org_coverage_settings')
        .update({ coverage_mode: mode })
        .eq('id', orgSettings?.id);

      if (error) throw error;
      setOrgSettings(prev => prev ? { ...prev, coverage_mode: mode } : null);
      toast.success(`Coverage mode set to ${mode}`);
    } catch (error) {
      toast.error('Failed to update coverage mode');
    }
  };

  return {
    loading,
    orgSettings,
    payerPlans,
    insuranceRules,
    schoolRules,
    coverageChecks,
    coverageTasks,
    effectiveMode,
    refetch: loadCoverageData,
    runCoverageCheck,
    updateOrgMode,
  };
}

export function useCoverageTasks(filters?: { status?: string; priority?: string; assignedTo?: string }) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<CoverageTask[]>([]);
  const [stats, setStats] = useState({ due7: 0, due14: 0, due30: 0, overdue: 0 });

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('coverage_tasks')
        .select('*')
        .order('due_date');

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setTasks(data as unknown as CoverageTask[]);

      // Calculate stats
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const pendingTasks = (data || []).filter((t: any) => t.status === 'pending');
      setStats({
        overdue: pendingTasks.filter((t: any) => new Date(t.due_date) < now).length,
        due7: pendingTasks.filter((t: any) => new Date(t.due_date) <= in7Days).length,
        due14: pendingTasks.filter((t: any) => new Date(t.due_date) <= in14Days).length,
        due30: pendingTasks.filter((t: any) => new Date(t.due_date) <= in30Days).length,
      });
    } catch (error) {
      console.error('Error loading coverage tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.priority, filters?.assignedTo]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const completeTask = async (taskId: string, notes: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('coverage_tasks')
      .update({
        status: 'completed',
        resolution_notes: notes,
        completed_at: new Date().toISOString(),
        completed_by: user?.id,
      })
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to complete task');
      return false;
    }
    
    toast.success('Task completed');
    await loadTasks();
    return true;
  };

  return { loading, tasks, stats, refetch: loadTasks, completeTask };
}
