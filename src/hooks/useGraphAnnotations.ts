import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { GraphAnnotation, GraphConfiguration } from '@/types/graphing';

export function useGraphAnnotations() {
  const [annotations, setAnnotations] = useState<GraphAnnotation[]>([]);
  const [configurations, setConfigurations] = useState<GraphConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnnotations = useCallback(async (studentId: string, behaviorId?: string, targetId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase.from('graph_annotations').select('*').eq('student_id', studentId).order('position_date');
      if (behaviorId) query = query.eq('behavior_id', behaviorId);
      if (targetId) query = query.eq('target_id', targetId);
      const { data, error } = await query;
      if (error) throw error;
      setAnnotations((data || []) as unknown as GraphAnnotation[]);
    } catch (err: any) {
      toast.error('Failed to load annotations: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchConfigurations = useCallback(async (studentId?: string) => {
    let query = supabase.from('graph_configurations').select('*').order('name');
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) throw error;
    setConfigurations((data || []) as unknown as GraphConfiguration[]);
  }, []);

  const addAnnotation = useCallback(async (annotation: Partial<GraphAnnotation>) => {
    const { data, error } = await supabase.from('graph_annotations').insert(annotation as any).select().single();
    if (error) throw error;
    toast.success('Annotation added');
    return data as unknown as GraphAnnotation;
  }, []);

  const updateAnnotation = useCallback(async (id: string, updates: Partial<GraphAnnotation>) => {
    const { error } = await supabase.from('graph_annotations').update(updates as any).eq('id', id);
    if (error) throw error;
  }, []);

  const deleteAnnotation = useCallback(async (id: string) => {
    const { error } = await supabase.from('graph_annotations').delete().eq('id', id);
    if (error) throw error;
    setAnnotations(prev => prev.filter(a => a.id !== id));
    toast.success('Annotation deleted');
  }, []);

  const saveConfiguration = useCallback(async (config: Partial<GraphConfiguration>) => {
    const { data, error } = await supabase.from('graph_configurations').insert(config as any).select().single();
    if (error) throw error;
    toast.success('Graph configuration saved');
    return data as unknown as GraphConfiguration;
  }, []);

  return {
    annotations, configurations, isLoading,
    fetchAnnotations, fetchConfigurations, addAnnotation, updateAnnotation, deleteAnnotation, saveConfiguration,
  };
}
