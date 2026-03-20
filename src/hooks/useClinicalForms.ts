import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ClinicalFormTemplate {
  id: string;
  form_key: string;
  form_name: string;
  form_category: string;
  description: string | null;
  delivery_modes: string[];
  sections: any[];
  scoring_config: any;
  export_layout: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicalFormSubmission {
  id: string;
  template_id: string;
  student_id: string | null;
  respondent_name: string | null;
  respondent_email: string | null;
  respondent_relationship: string | null;
  status: string;
  responses: Record<string, any>;
  scores: any;
  access_token: string;
  expires_at: string | null;
  submitted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  template?: ClinicalFormTemplate;
}

export function useClinicalForms() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ClinicalFormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<ClinicalFormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = useCallback(async (category?: string) => {
    setIsLoading(true);
    try {
      let query = supabase.from('clinical_form_templates').select('*').eq('is_active', true).order('form_name');
      if (category) query = query.eq('form_category', category);
      const { data, error } = await query;
      if (error) throw error;
      setTemplates((data || []) as unknown as ClinicalFormTemplate[]);
    } catch (err: any) {
      toast.error('Failed to load form templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async (templateId?: string, studentId?: string) => {
    try {
      let query = supabase.from('clinical_form_submissions').select('*, clinical_form_templates(*)').order('created_at', { ascending: false });
      if (templateId) query = query.eq('template_id', templateId);
      if (studentId) query = query.eq('student_id', studentId);
      const { data, error } = await query;
      if (error) throw error;
      const mapped = (data || []).map((d: any) => ({
        ...d,
        template: d.clinical_form_templates,
      }));
      setSubmissions(mapped as unknown as ClinicalFormSubmission[]);
    } catch (err: any) {
      toast.error('Failed to load submissions');
    }
  }, []);

  const createSubmission = useCallback(async (opts: {
    templateId: string;
    studentId?: string;
    respondentName?: string;
    respondentEmail?: string;
    respondentRelationship?: string;
    sendEmail?: boolean;
  }) => {
    if (!user) return null;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data, error } = await supabase
      .from('clinical_form_submissions')
      .insert({
        template_id: opts.templateId,
        student_id: opts.studentId || null,
        respondent_name: opts.respondentName || null,
        respondent_email: opts.respondentEmail || null,
        respondent_relationship: opts.respondentRelationship || null,
        created_by: user.id,
        status: 'sent',
        expires_at: expiresAt.toISOString(),
      } as any)
      .select()
      .single();

    if (error) throw error;

    if (opts.sendEmail && data && opts.respondentEmail) {
      const { error: emailError } = await supabase.functions.invoke('send-magic-link-email', {
        body: { type: 'clinical_form', recordId: data.id },
      });
      if (emailError) {
        toast.success('Form link created but email delivery failed. Copy the link to share.');
      } else {
        toast.success(`Form sent to ${opts.respondentEmail}`);
      }
    } else {
      toast.success('Form link created');
    }

    return data;
  }, [user]);

  const saveResponses = useCallback(async (submissionId: string, responses: Record<string, any>, status?: string) => {
    const updates: any = { responses, updated_at: new Date().toISOString() };
    if (status) {
      updates.status = status;
      if (status === 'submitted') updates.submitted_at = new Date().toISOString();
    }
    const { error } = await supabase.from('clinical_form_submissions').update(updates).eq('id', submissionId);
    if (error) throw error;
    if (status === 'submitted') toast.success('Form submitted successfully');
  }, []);

  const copyFormLink = useCallback((accessToken: string) => {
    const url = `${window.location.origin}/clinical-form/${accessToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Form link copied to clipboard');
  }, []);

  return {
    templates,
    submissions,
    isLoading,
    fetchTemplates,
    fetchSubmissions,
    createSubmission,
    saveResponses,
    copyFormLink,
  };
}
