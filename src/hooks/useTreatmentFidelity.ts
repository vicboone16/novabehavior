import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  TreatmentFidelityCheck, 
  FidelityCheckTemplate, 
  FidelityCheckItem,
  FidelityStats 
} from '@/types/treatmentFidelity';

export function useTreatmentFidelity(studentId?: string) {
  const { user } = useAuth();
  const [checks, setChecks] = useState<TreatmentFidelityCheck[]>([]);
  const [templates, setTemplates] = useState<FidelityCheckTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FidelityStats | null>(null);

  const loadChecks = useCallback(async () => {
    if (!studentId) return;
    
    try {
      const { data, error } = await supabase
        .from('treatment_fidelity_checks')
        .select(`
          *,
          observer:profiles!treatment_fidelity_checks_observer_user_id_fkey(display_name, first_name, last_name),
          implementer:profiles!treatment_fidelity_checks_implementer_user_id_fkey(display_name, first_name, last_name),
          student:students!treatment_fidelity_checks_student_id_fkey(name)
        `)
        .eq('student_id', studentId)
        .order('check_date', { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []).map(d => ({
        ...d,
        items: (d.items as unknown as FidelityCheckItem[]) || [],
      })) as TreatmentFidelityCheck[];
      
      setChecks(typedData);
      calculateStats(typedData);
    } catch (err) {
      console.error('Error loading fidelity checks:', err);
    }
  }, [studentId]);

  const loadTemplates = useCallback(async () => {
    try {
      let query = supabase
        .from('fidelity_check_templates')
        .select('*')
        .eq('is_active', true);

      if (studentId) {
        query = query.or(`student_id.eq.${studentId},student_id.is.null`);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      
      const typedData = (data || []).map(t => ({
        ...t,
        items: (t.items as unknown as { text: string }[]) || [],
      })) as FidelityCheckTemplate[];
      
      setTemplates(typedData);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  }, [studentId]);

  const calculateStats = (checkData: TreatmentFidelityCheck[]) => {
    if (checkData.length === 0) {
      setStats(null);
      return;
    }

    const avgPercentage = checkData.reduce((sum, c) => sum + (c.fidelity_percentage || 0), 0) / checkData.length;
    const belowThreshold = checkData.filter(c => (c.fidelity_percentage || 0) < 80).length;

    // Calculate trend from last 5 checks
    const recentChecks = checkData.slice(0, 5);
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentChecks.length >= 2) {
      const recent = recentChecks.slice(0, 2).reduce((s, c) => s + (c.fidelity_percentage || 0), 0) / 2;
      const older = recentChecks.slice(-2).reduce((s, c) => s + (c.fidelity_percentage || 0), 0) / 2;
      if (recent > older + 5) trend = 'up';
      else if (recent < older - 5) trend = 'down';
    }

    setStats({
      averagePercentage: Math.round(avgPercentage * 10) / 10,
      totalChecks: checkData.length,
      belowThresholdCount: belowThreshold,
      trend,
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadChecks(), loadTemplates()]);
      setLoading(false);
    };
    load();
  }, [loadChecks, loadTemplates]);

  const createCheck = async (
    data: Omit<TreatmentFidelityCheck, 'id' | 'created_at' | 'updated_at' | 'fidelity_percentage'>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const insertData = {
        student_id: data.student_id,
        template_id: data.template_id,
        session_id: data.session_id,
        check_date: data.check_date,
        intervention_id: data.intervention_id,
        items: JSON.parse(JSON.stringify(data.items)),
        items_implemented: data.items_implemented,
        items_total: data.items_total,
        setting: data.setting,
        duration_minutes: data.duration_minutes,
        notes: data.notes,
        implementer_user_id: data.implementer_user_id,
        observer_user_id: user.id,
      };

      const { error } = await supabase.from('treatment_fidelity_checks').insert(insertData);

      if (error) throw error;
      
      toast.success('Fidelity check saved');
      await loadChecks();
      return true;
    } catch (err) {
      console.error('Error creating fidelity check:', err);
      toast.error('Failed to save fidelity check');
      return false;
    }
  };

  const updateCheck = async (
    id: string,
    data: Partial<TreatmentFidelityCheck>
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { ...data };
      if (data.items) {
        updateData.items = data.items as unknown as Record<string, unknown>[];
      }
      
      const { error } = await supabase
        .from('treatment_fidelity_checks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Fidelity check updated');
      await loadChecks();
      return true;
    } catch (err) {
      console.error('Error updating fidelity check:', err);
      toast.error('Failed to update fidelity check');
      return false;
    }
  };

  const deleteCheck = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('treatment_fidelity_checks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Fidelity check deleted');
      await loadChecks();
      return true;
    } catch (err) {
      console.error('Error deleting fidelity check:', err);
      toast.error('Failed to delete fidelity check');
      return false;
    }
  };

  const createTemplate = async (
    data: Omit<FidelityCheckTemplate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const insertData = {
        student_id: data.student_id,
        intervention_id: data.intervention_id,
        name: data.name,
        items: JSON.parse(JSON.stringify(data.items)),
        is_active: data.is_active,
        created_by: user.id,
      };

      const { error } = await supabase.from('fidelity_check_templates').insert(insertData);

      if (error) throw error;
      
      toast.success('Template created');
      await loadTemplates();
      return true;
    } catch (err) {
      console.error('Error creating template:', err);
      toast.error('Failed to create template');
      return false;
    }
  };

  return {
    checks,
    templates,
    stats,
    loading,
    createCheck,
    updateCheck,
    deleteCheck,
    createTemplate,
    refresh: () => Promise.all([loadChecks(), loadTemplates()]),
  };
}
