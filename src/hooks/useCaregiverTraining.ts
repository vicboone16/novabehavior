import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CaregiverTrainingProgram, CaregiverTrainingSession, CaregiverCompetencyCheck, CaregiverGeneralizationProbe } from '@/types/caregiverTraining';

export function useCaregiverTraining() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<CaregiverTrainingProgram[]>([]);
  const [sessions, setSessions] = useState<CaregiverTrainingSession[]>([]);
  const [competencyChecks, setCompetencyChecks] = useState<CaregiverCompetencyCheck[]>([]);
  const [probes, setProbes] = useState<CaregiverGeneralizationProbe[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrograms = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('caregiver_training_programs').select('*').order('title');
      if (error) throw error;
      setPrograms((data || []) as unknown as CaregiverTrainingProgram[]);
    } catch (err: any) {
      toast.error('Failed to load training programs: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async (studentId: string) => {
    const { data, error } = await supabase.from('caregiver_training_sessions').select('*').eq('student_id', studentId).order('session_date', { ascending: false });
    if (error) throw error;
    setSessions((data || []) as unknown as CaregiverTrainingSession[]);
    return data;
  }, []);

  const fetchCompetencyChecks = useCallback(async (studentId: string) => {
    const { data, error } = await supabase.from('caregiver_competency_checks').select('*').eq('student_id', studentId).order('check_date', { ascending: false });
    if (error) throw error;
    setCompetencyChecks((data || []) as unknown as CaregiverCompetencyCheck[]);
  }, []);

  const fetchProbes = useCallback(async (studentId: string) => {
    const { data, error } = await supabase.from('caregiver_generalization_probes').select('*').eq('student_id', studentId).order('probe_date', { ascending: false });
    if (error) throw error;
    setProbes((data || []) as unknown as CaregiverGeneralizationProbe[]);
  }, []);

  const createProgram = useCallback(async (program: Partial<CaregiverTrainingProgram>) => {
    const { data, error } = await supabase.from('caregiver_training_programs').insert({ ...program, created_by: user?.id } as any).select().single();
    if (error) throw error;
    toast.success('Training program created');
    return data;
  }, [user]);

  const logSession = useCallback(async (session: Partial<CaregiverTrainingSession>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('caregiver_training_sessions').insert({ ...session, staff_user_id: user.id } as any).select().single();
    if (error) throw error;
    toast.success('Training session logged');
    return data;
  }, [user]);

  const addCompetencyCheck = useCallback(async (check: Partial<CaregiverCompetencyCheck>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('caregiver_competency_checks').insert({ ...check, evaluator_id: user.id } as any).select().single();
    if (error) throw error;
    toast.success('Competency check recorded');
    return data;
  }, [user]);

  const addProbe = useCallback(async (probe: Partial<CaregiverGeneralizationProbe>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('caregiver_generalization_probes').insert({ ...probe, observer_id: user.id } as any).select().single();
    if (error) throw error;
    toast.success('Generalization probe recorded');
    return data;
  }, [user]);

  return {
    programs, sessions, competencyChecks, probes, isLoading,
    fetchPrograms, fetchSessions, fetchCompetencyChecks, fetchProbes,
    createProgram, logSession, addCompetencyCheck, addProbe,
  };
}
