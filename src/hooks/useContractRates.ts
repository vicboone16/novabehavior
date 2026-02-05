import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { toast } from 'sonner';
import type { ContractRate, StudentContractAssignment, ContractService } from '@/types/contractRates';

export function useContractRates() {
  const { user } = useAuth();
  const { currentAgency } = useAgencyContext();
  const [contracts, setContracts] = useState<ContractRate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContracts = useCallback(async () => {
    if (!currentAgency?.id) return;

    try {
      const { data, error } = await supabase
        .from('contract_rates')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .order('organization_name');

      if (error) throw error;
      
      const typedData = (data || []).map(c => ({
        ...c,
        services: (c.services as unknown as ContractService[]) || [],
      })) as ContractRate[];

      setContracts(typedData);
    } catch (err) {
      console.error('Error loading contracts:', err);
    } finally {
      setLoading(false);
    }
  }, [currentAgency?.id]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const createContract = async (
    data: Omit<ContractRate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<boolean> => {
    if (!user || !currentAgency?.id) return false;

    try {
      const insertData = {
        agency_id: currentAgency.id,
        contract_type: data.contract_type,
        organization_name: data.organization_name,
        organization_id: data.organization_id,
        contract_start_date: data.contract_start_date,
        contract_end_date: data.contract_end_date,
        contract_number: data.contract_number,
        services: JSON.parse(JSON.stringify(data.services)),
        billing_frequency: data.billing_frequency,
        invoice_due_days: data.invoice_due_days,
        requires_signature: data.requires_signature,
        status: data.status,
        notes: data.notes,
        created_by: user.id,
      };

      const { error } = await supabase.from('contract_rates').insert(insertData);

      if (error) throw error;
      
      toast.success('Contract created');
      await loadContracts();
      return true;
    } catch (err) {
      console.error('Error creating contract:', err);
      toast.error('Failed to create contract');
      return false;
    }
  };

  const updateContract = async (
    id: string,
    data: Partial<ContractRate>
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
      if (data.services) {
        updateData.services = JSON.parse(JSON.stringify(data.services));
      }

      const { error } = await supabase
        .from('contract_rates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Contract updated');
      await loadContracts();
      return true;
    } catch (err) {
      console.error('Error updating contract:', err);
      toast.error('Failed to update contract');
      return false;
    }
  };

  const deleteContract = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('contract_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Contract deleted');
      await loadContracts();
      return true;
    } catch (err) {
      console.error('Error deleting contract:', err);
      toast.error('Failed to delete contract');
      return false;
    }
  };

  return {
    contracts,
    loading,
    createContract,
    updateContract,
    deleteContract,
    refresh: loadContracts,
  };
}

export function useStudentContractAssignments(studentId?: string) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<StudentContractAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAssignments = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('student_contract_assignments')
        .select(`
          *,
          contract:contract_rates(*)
        `)
        .eq('student_id', studentId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []).map(a => ({
        ...a,
        contract: a.contract ? {
          ...a.contract,
          services: (a.contract.services as unknown as ContractService[]) || [],
        } : undefined,
      })) as StudentContractAssignment[];

      setAssignments(typedData);
    } catch (err) {
      console.error('Error loading assignments:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const assignContract = async (
    data: Omit<StudentContractAssignment, 'id' | 'created_at'>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.from('student_contract_assignments').insert({
        student_id: data.student_id,
        contract_id: data.contract_id,
        start_date: data.start_date,
        end_date: data.end_date,
        funding_source: data.funding_source,
        authorized_hours_per_week: data.authorized_hours_per_week,
        notes: data.notes,
        is_active: data.is_active,
        created_by: user.id,
      });

      if (error) throw error;
      
      toast.success('Contract assigned to student');
      await loadAssignments();
      return true;
    } catch (err) {
      console.error('Error assigning contract:', err);
      toast.error('Failed to assign contract');
      return false;
    }
  };

  const updateAssignment = async (
    id: string,
    data: Partial<StudentContractAssignment>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('student_contract_assignments')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Assignment updated');
      await loadAssignments();
      return true;
    } catch (err) {
      console.error('Error updating assignment:', err);
      toast.error('Failed to update assignment');
      return false;
    }
  };

  const removeAssignment = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('student_contract_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Contract assignment removed');
      await loadAssignments();
      return true;
    } catch (err) {
      console.error('Error removing assignment:', err);
      toast.error('Failed to remove assignment');
      return false;
    }
  };

  return {
    assignments,
    loading,
    assignContract,
    updateAssignment,
    removeAssignment,
    refresh: loadAssignments,
  };
}
