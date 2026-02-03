import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { StaffAvailability, StaffCredential, SupervisorLink } from '@/types/staffProfile';

export function useStaffProfile(userId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [availability, setAvailability] = useState<StaffAvailability[]>([]);
  const [credentials, setCredentials] = useState<StaffCredential[]>([]);
  const [supervisorLinks, setSupervisorLinks] = useState<SupervisorLink[]>([]);
  const [superviseeLinks, setSuperviseeLinks] = useState<SupervisorLink[]>([]);
  const [caseloadCount, setCaseloadCount] = useState(0);

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      // Fetch profile
      const profileRes = await supabase.from('profiles').select('*').eq('user_id', userId).single();
      if (profileRes.data) setProfile(profileRes.data);
      
      // Fetch availability
      const availabilityRes = await supabase.from('staff_availability').select('*').eq('staff_user_id', userId);
      if (availabilityRes.data) setAvailability(availabilityRes.data as unknown as StaffAvailability[]);
      
      // Fetch credentials
      const credentialsRes = await supabase.from('staff_credentials').select('*').eq('user_id', userId);
      if (credentialsRes.data) setCredentials(credentialsRes.data as unknown as StaffCredential[]);
      
      // Fetch supervisor links (where user is supervisee)
      const supervisorRes = await supabase.from('supervisor_links').select('*').eq('supervisee_staff_id', userId);
      if (supervisorRes.data) setSupervisorLinks(supervisorRes.data as unknown as SupervisorLink[]);
      
      // Fetch supervisee links (where user is supervisor)
      const superviseeRes = await supabase.from('supervisor_links').select('*').eq('supervisor_staff_id', userId);
      if (superviseeRes.data) setSuperviseeLinks(superviseeRes.data as unknown as SupervisorLink[]);
      
      // Fetch caseload count
      const caseloadRes = await supabase.from('staff_caseloads').select('id', { count: 'exact' }).eq('clinician_user_id', userId).eq('status', 'active');
      if (caseloadRes.count !== null) setCaseloadCount(caseloadRes.count);

    } catch (error) {
      console.error('Error loading staff profile:', error);
      toast.error('Failed to load staff profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = async (updates: Partial<any>) => {
    if (!userId) return false;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      setProfile((prev: any) => ({ ...prev, ...updates }));
      toast.success('Profile updated');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      return false;
    }
  };

  const hasActiveSupervisor = supervisorLinks.some(
    link => link.status === 'active' && (!link.end_date || new Date(link.end_date) > new Date())
  );

  const isRBTorBT = profile?.credential === 'RBT' || profile?.credential === 'BT';
  const canBeScheduled = !isRBTorBT || hasActiveSupervisor;

  return {
    loading,
    profile,
    availability,
    credentials,
    supervisorLinks,
    superviseeLinks,
    caseloadCount,
    hasActiveSupervisor,
    canBeScheduled,
    refetch: loadProfile,
    updateProfile,
  };
}
