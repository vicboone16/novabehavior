import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CustomForm, CustomFormSubmission } from '@/types/formBuilder';

export function useFormBuilder() {
  const { user } = useAuth();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [submissions, setSubmissions] = useState<CustomFormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchForms = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('custom_forms').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      setForms((data || []) as unknown as CustomForm[]);
    } catch (err: any) {
      toast.error('Failed to load forms: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async (formId?: string) => {
    let query = supabase.from('custom_form_submissions').select('*, custom_forms(*)').order('created_at', { ascending: false });
    if (formId) query = query.eq('form_id', formId);
    const { data, error } = await query;
    if (error) throw error;
    const mapped = (data || []).map((d: any) => ({ ...d, form: d.custom_forms }));
    setSubmissions(mapped as unknown as CustomFormSubmission[]);
  }, []);

  const createForm = useCallback(async (form: Partial<CustomForm>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('custom_forms').insert({ ...form, created_by: user.id } as any).select().single();
    if (error) throw error;
    toast.success('Form created');
    return data as unknown as CustomForm;
  }, [user]);

  const updateForm = useCallback(async (id: string, updates: Partial<CustomForm>) => {
    const { error } = await supabase.from('custom_forms').update(updates as any).eq('id', id);
    if (error) throw error;
    toast.success('Form updated');
  }, []);

  const deleteForm = useCallback(async (id: string) => {
    const { error } = await supabase.from('custom_forms').delete().eq('id', id);
    if (error) throw error;
    setForms(prev => prev.filter(f => f.id !== id));
    toast.success('Form deleted');
  }, []);

  const submitForm = useCallback(async (submission: Partial<CustomFormSubmission>) => {
    const { data, error } = await supabase.from('custom_form_submissions').insert({ ...submission, submitted_at: new Date().toISOString(), status: 'submitted' } as any).select().single();
    if (error) throw error;
    toast.success('Form submitted');
    return data;
  }, []);

  return {
    forms, submissions, isLoading,
    fetchForms, fetchSubmissions, createForm, updateForm, deleteForm, submitForm,
  };
}
