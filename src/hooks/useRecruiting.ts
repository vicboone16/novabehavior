import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { JobPosting, JobApplicant, OnboardingTemplate, OnboardingTask, MentorAssignment } from '@/types/recruiting';

export function useRecruiting() {
  const { user } = useAuth();
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [mentorAssignments, setMentorAssignments] = useState<MentorAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPostings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('job_postings').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPostings((data || []) as unknown as JobPosting[]);
    } catch (err: any) {
      toast.error('Failed to load job postings: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchApplicants = useCallback(async (postingId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase.from('job_applicants').select('*').order('created_at', { ascending: false });
      if (postingId) query = query.eq('job_posting_id', postingId);
      const { data, error } = await query;
      if (error) throw error;
      setApplicants((data || []) as unknown as JobApplicant[]);
    } catch (err: any) {
      console.error('fetchApplicants failed', err);
      toast.error('Failed to load applicants: ' + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPosting = useCallback(async (posting: Partial<JobPosting>) => {
    if (!user) { toast.error('You must be signed in'); return null; }
    try {
      const { data, error } = await supabase.from('job_postings').insert({ ...posting, created_by: user.id } as any).select().single();
      if (error) throw error;
      toast.success('Job posting created');
      return data;
    } catch (err: any) {
      toast.error('Failed to create posting: ' + (err.message || err));
      return null;
    }
  }, [user]);

  const updatePosting = useCallback(async (id: string, updates: Partial<JobPosting>) => {
    try {
      const { error } = await supabase.from('job_postings').update(updates as any).eq('id', id);
      if (error) throw error;
      toast.success('Job posting updated');
    } catch (err: any) {
      toast.error('Failed to update posting: ' + (err.message || err));
    }
  }, []);

  const addApplicant = useCallback(async (applicant: Partial<JobApplicant>) => {
    try {
      const { data, error } = await supabase.from('job_applicants').insert(applicant as any).select().single();
      if (error) throw error;
      toast.success('Applicant added');
      return data;
    } catch (err: any) {
      toast.error('Failed to add applicant: ' + (err.message || err));
      return null;
    }
  }, []);

  const updateApplicantStatus = useCallback(async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('job_applicants').update({ pipeline_status: status } as any).eq('id', id);
      if (error) throw error;
      toast.success('Applicant status updated');
    } catch (err: any) {
      toast.error('Failed to update status: ' + (err.message || err));
    }
  }, []);

  const fetchOnboardingTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('onboarding_templates').select('*').order('name');
      if (error) throw error;
      setTemplates((data || []) as unknown as OnboardingTemplate[]);
    } catch (err: any) {
      console.error('fetchOnboardingTemplates failed', err);
      toast.error('Failed to load onboarding templates: ' + (err.message || err));
    }
  }, []);

  const createOnboardingTemplate = useCallback(async (template: Partial<OnboardingTemplate>) => {
    try {
      const { data, error } = await supabase.from('onboarding_templates').insert({ ...template, created_by: user?.id } as any).select().single();
      if (error) throw error;
      toast.success('Onboarding template created');
      return data;
    } catch (err: any) {
      toast.error('Failed to create template: ' + (err.message || err));
      return null;
    }
  }, [user]);

  const fetchTasks = useCallback(async (userId?: string) => {
    try {
      let query = supabase.from('onboarding_tasks').select('*').order('due_date');
      if (userId) query = query.eq('new_hire_user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      setTasks((data || []) as unknown as OnboardingTask[]);
    } catch (err: any) {
      console.error('fetchTasks failed', err);
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<OnboardingTask>) => {
    try {
      const { error } = await supabase.from('onboarding_tasks').update(updates as any).eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      toast.error('Failed to update task: ' + (err.message || err));
    }
  }, []);

  const fetchMentorAssignments = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('mentor_assignments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setMentorAssignments((data || []) as unknown as MentorAssignment[]);
    } catch (err: any) {
      console.error('fetchMentorAssignments failed', err);
    }
  }, []);

  const assignMentor = useCallback(async (assignment: Partial<MentorAssignment>) => {
    const { data, error } = await supabase.from('mentor_assignments').insert(assignment as any).select().single();
    if (error) throw error;
    toast.success('Mentor assigned');
    return data;
  }, []);

  return {
    postings, applicants, templates, tasks, mentorAssignments, isLoading,
    fetchPostings, fetchApplicants, createPosting, updatePosting,
    addApplicant, updateApplicantStatus,
    fetchOnboardingTemplates, createOnboardingTemplate, fetchTasks, updateTask,
    fetchMentorAssignments, assignMentor,
  };
}
