import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  ClientContact,
  ClientSafetyMedical,
  ClientCommunicationAccess,
  ClientSchedulingPreferences,
  ClientLocation,
  ClientTeamAssignment,
  ClientServiceLine,
  ClientDocument,
  ClientCommunicationLog,
  ClientCaseAttribute,
  ProfileCompleteness,
} from '@/types/clientProfile';

export function useClientProfile(clientId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [safetyMedical, setSafetyMedical] = useState<ClientSafetyMedical | null>(null);
  const [communicationAccess, setCommunicationAccess] = useState<ClientCommunicationAccess | null>(null);
  const [schedulingPreferences, setSchedulingPreferences] = useState<ClientSchedulingPreferences | null>(null);
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [teamAssignments, setTeamAssignments] = useState<ClientTeamAssignment[]>([]);
  const [serviceLines, setServiceLines] = useState<ClientServiceLine[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [communicationLog, setCommunicationLog] = useState<ClientCommunicationLog[]>([]);
  const [caseAttributes, setCaseAttributes] = useState<ClientCaseAttribute[]>([]);

  const loadProfile = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      
      const [
        contactsRes,
        safetyRes,
        commAccessRes,
        schedRes,
        locationsRes,
        teamRes,
        servicesRes,
        docsRes,
        commLogRes,
        attrsRes,
      ] = await Promise.all([
        supabase.from('client_contacts').select('*').eq('client_id', clientId),
        supabase.from('client_safety_medical').select('*').eq('client_id', clientId).maybeSingle(),
        supabase.from('client_communication_access').select('*').eq('client_id', clientId).maybeSingle(),
        supabase.from('client_scheduling_preferences').select('*').eq('client_id', clientId).maybeSingle(),
        supabase.from('client_locations').select('*').eq('client_id', clientId).order('is_primary_service_site', { ascending: false }),
        supabase.from('client_team_assignments').select('*').eq('client_id', clientId).order('is_active', { ascending: false }),
        supabase.from('client_service_lines').select('*').eq('client_id', clientId),
        supabase.from('client_documents').select('*').eq('client_id', clientId).order('upload_date', { ascending: false }),
        supabase.from('client_communication_log').select('*').eq('client_id', clientId).order('date_time', { ascending: false }).limit(50),
        supabase.from('client_case_attributes').select('*').eq('client_id', clientId),
      ]);

      if (contactsRes.data) setContacts(contactsRes.data as unknown as ClientContact[]);
      if (safetyRes.data) setSafetyMedical(safetyRes.data as unknown as ClientSafetyMedical);
      if (commAccessRes.data) setCommunicationAccess(commAccessRes.data as unknown as ClientCommunicationAccess);
      if (schedRes.data) setSchedulingPreferences(schedRes.data as unknown as ClientSchedulingPreferences);
      if (locationsRes.data) setLocations(locationsRes.data as unknown as ClientLocation[]);
      if (teamRes.data) setTeamAssignments(teamRes.data as unknown as ClientTeamAssignment[]);
      if (servicesRes.data) setServiceLines(servicesRes.data as unknown as ClientServiceLine[]);
      if (docsRes.data) setDocuments(docsRes.data as unknown as ClientDocument[]);
      if (commLogRes.data) setCommunicationLog(commLogRes.data as unknown as ClientCommunicationLog[]);
      if (attrsRes.data) setCaseAttributes(attrsRes.data as unknown as ClientCaseAttribute[]);

    } catch (error) {
      console.error('Error loading client profile:', error);
      toast.error('Failed to load client profile');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const calculateCompleteness = useCallback((studentData: any): ProfileCompleteness => {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!studentData?.legal_first_name) missing.push('Legal first name');
    if (!studentData?.legal_last_name) missing.push('Legal last name');
    if (!studentData?.dob) missing.push('Date of birth');
    if (!studentData?.status) missing.push('Status');
    
    // Check for supervisor via profile OR team assignments
    const hasSupervisorViaTeam = teamAssignments.some(
      t => t.is_active && (t.role === 'primary_supervisor' || t.role === 'bcba')
    );
    if (!studentData?.primary_supervisor_staff_id && !hasSupervisorViaTeam) {
      missing.push('Primary supervisor');
    }

    // Primary contact required
    const hasPrimaryContact = contacts.some(c => c.is_primary_guardian && c.phones?.length > 0);
    if (!hasPrimaryContact) missing.push('Primary contact with phone');

    // Primary language
    if (!communicationAccess?.primary_language) missing.push('Primary language');

    // Availability windows
    const hasAvailability = schedulingPreferences?.availability_windows?.length > 0;
    if (!hasAvailability) missing.push('Availability windows');

    // Active geocoded location
    const hasActiveLocation = locations.some(l => l.is_active && l.geocode_status === 'success');
    if (!hasActiveLocation) missing.push('Active geocoded location');

    // Safety warnings
    const highSeverityFlags = ['aggression', 'sib', 'elopement', 'pica'];
    const hasHighSeverity = safetyMedical?.safety_flags?.some(f => highSeverityFlags.includes(f));
    if (hasHighSeverity && !safetyMedical?.emergency_protocol_present) {
      warnings.push('High-severity safety flags present without emergency protocol');
    }
    if (hasHighSeverity && (!safetyMedical?.deescalation_supports?.structured?.length && !safetyMedical?.deescalation_supports?.notes)) {
      warnings.push('Consider adding de-escalation supports for safety flags');
    }

    // Calculate score
    const totalRequired = 9;
    const score = Math.round(((totalRequired - missing.length) / totalRequired) * 100);

    let status: 'incomplete' | 'partial' | 'complete' = 'incomplete';
    if (missing.length === 0) {
      status = 'complete';
    } else if (score >= 60) {
      status = 'partial';
    }

    return { status, score, missing, warnings };
  }, [contacts, communicationAccess, schedulingPreferences, locations, safetyMedical]);

  const canActivate = useCallback((studentData: any, overrides?: { skipSupervisor?: boolean }): { canActivate: boolean; reasons: string[]; overridable: string[] } => {
    const reasons: string[] = [];
    const overridable: string[] = [];

    // Check for supervisor - can be overridden
    const hasSupervisorViaTeam = teamAssignments.some(
      t => t.is_active && (t.role === 'primary_supervisor' || t.role === 'bcba')
    );
    if (!studentData?.primary_supervisor_staff_id && !hasSupervisorViaTeam) {
      if (!overrides?.skipSupervisor) {
        overridable.push('Primary supervisor must be assigned');
      }
    }

    // These cannot be overridden
    const hasActiveLocation = locations.some(l => l.is_active && l.geocode_status === 'success');
    if (!hasActiveLocation) {
      reasons.push('At least one active geocoded location is required');
    }

    const hasPrimaryContact = contacts.some(c => c.is_primary_guardian && c.phones?.length > 0);
    if (!hasPrimaryContact) {
      reasons.push('Primary guardian with phone number is required');
    }

    if (!communicationAccess?.primary_language) {
      reasons.push('Primary language must be set');
    }

    const hasAvailability = schedulingPreferences?.availability_windows?.length > 0;
    if (!hasAvailability) {
      reasons.push('At least one availability window is required');
    }

    const canActivateResult = reasons.length === 0 && (overrides?.skipSupervisor || overridable.length === 0);
    return { canActivate: canActivateResult, reasons, overridable };
  }, [contacts, locations, communicationAccess, schedulingPreferences, teamAssignments]);

  return {
    loading,
    contacts,
    safetyMedical,
    communicationAccess,
    schedulingPreferences,
    locations,
    teamAssignments,
    serviceLines,
    documents,
    communicationLog,
    caseAttributes,
    refetch: loadProfile,
    calculateCompleteness,
    canActivate,
  };
}
