import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProtocolTemplate, ProtocolAssignment } from '@/types/protocol';

export function useProtocols() {
  const [templates, setTemplates] = useState<ProtocolTemplate[]>([]);
  const [assignments, setAssignments] = useState<ProtocolAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = useCallback(async (filters?: { curriculum_system?: string; domain?: string; status?: string }) => {
    setIsLoading(true);
    try {
      let query = supabase.from('protocol_templates').select('*').order('title');
      if (filters?.curriculum_system) query = query.eq('curriculum_system', filters.curriculum_system);
      if (filters?.domain) query = query.eq('domain', filters.domain);
      if (filters?.status) query = query.eq('status', filters.status);
      const { data, error } = await query;
      if (error) throw error;
      setTemplates((data || []) as unknown as ProtocolTemplate[]);
    } catch (err: any) {
      toast.error('Failed to load protocols: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async (studentId: string) => {
    const { data, error } = await supabase.from('protocol_assignments').select('*, protocol_templates(*)').eq('student_id', studentId).order('created_at', { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((d: any) => ({ ...d, protocol_template: d.protocol_templates }));
    setAssignments(mapped as unknown as ProtocolAssignment[]);
    return mapped;
  }, []);

  const createTemplate = useCallback(async (template: Partial<ProtocolTemplate>) => {
    const { data, error } = await supabase.from('protocol_templates').insert(template as any).select().single();
    if (error) throw error;
    toast.success('Protocol template created');
    return data as unknown as ProtocolTemplate;
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: Partial<ProtocolTemplate>) => {
    const { error } = await supabase.from('protocol_templates').update(updates as any).eq('id', id);
    if (error) throw error;
    toast.success('Protocol updated');
  }, []);

  const assignProtocol = useCallback(async (assignment: Partial<ProtocolAssignment>) => {
    const { data, error } = await supabase.from('protocol_assignments').insert(assignment as any).select().single();
    if (error) throw error;
    toast.success('Protocol assigned');
    return data as unknown as ProtocolAssignment;
  }, []);

  const updateAssignment = useCallback(async (id: string, updates: Partial<ProtocolAssignment>) => {
    const { error } = await supabase.from('protocol_assignments').update(updates as any).eq('id', id);
    if (error) throw error;
  }, []);

  return {
    templates, assignments, isLoading,
    fetchTemplates, fetchAssignments, createTemplate, updateTemplate, assignProtocol, updateAssignment,
  };
}
