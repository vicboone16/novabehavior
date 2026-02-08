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

  // Create a magic link submission and optionally send email
  const createMagicLinkSubmission = useCallback(async (opts: {
    formId: string;
    studentId?: string;
    recipientName: string;
    recipientEmail: string;
    recipientRelationship?: string;
    sendEmail?: boolean;
  }) => {
    if (!user) return null;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry

    const { data, error } = await supabase
      .from('custom_form_submissions')
      .insert({
        form_id: opts.formId,
        student_id: opts.studentId || null,
        respondent_name: opts.recipientName,
        respondent_email: opts.recipientEmail,
        respondent_relationship: opts.recipientRelationship || null,
        created_by: user.id,
        status: 'draft',
        expires_at: expiresAt.toISOString(),
      } as any)
      .select()
      .single();

    if (error) throw error;

    if (opts.sendEmail && data) {
      const { error: emailError } = await supabase.functions.invoke('send-magic-link-email', {
        body: { type: 'custom_form', recordId: data.id },
      });

      if (emailError) {
        console.error('Email send failed:', emailError);
        toast.success('Form link created but email delivery failed. Copy the link to share.');
      } else {
        toast.success(`Form emailed to ${opts.recipientEmail}`);
      }
    } else {
      toast.success('Form link created');
    }

    return data;
  }, [user]);

  // Copy magic link for a submission
  const copyFormLink = useCallback((accessToken: string) => {
    const url = `${window.location.origin}/form/${accessToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Form link copied to clipboard');
  }, []);

  return {
    forms, submissions, isLoading,
    fetchForms, fetchSubmissions, createForm, updateForm, deleteForm, submitForm,
    createMagicLinkSubmission, copyFormLink,
  };
}
