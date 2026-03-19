import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────
export interface FormTemplate {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string | null;
  entity_scope: string;
  audience: string;
  version: number;
  is_active: boolean;
  allow_parent_completion: boolean;
  allow_internal_completion: boolean;
  allow_hybrid_completion: boolean;
  allow_ai_prefill: boolean;
  require_signature_parent: boolean;
  require_signature_staff: boolean;
  require_signature_assessor: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormTemplateSection {
  id: string;
  template_id: string;
  section_key: string;
  title: string;
  description: string | null;
  display_order: number;
  is_collapsible: boolean;
  is_repeatable: boolean;
  ai_extractable: boolean;
  created_at: string;
  fields?: FormTemplateField[];
}

export interface FormTemplateField {
  id: string;
  template_id: string;
  section_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  is_repeatable: boolean;
  display_order: number;
  options_json: any;
  default_value: any;
  validation_rules: any;
  conditional_logic: any;
  ai_mapping: any;
  profile_mapping: any;
  ui_config: any;
  created_at: string;
}

export interface FormInstance {
  id: string;
  form_definition_id: string;
  template_id: string | null;
  student_id: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  packet_id: string | null;
  assigned_to: string | null;
  assigned_contact_id: string | null;
  assigned_by: string | null;
  completion_mode: string | null;
  delivery_method: string;
  status: string;
  started_at: string | null;
  last_saved_at: string | null;
  submitted_at: string | null;
  finalized_at: string | null;
  reviewed_at: string | null;
  locked_at: string | null;
  editable_after_submit: boolean | null;
  respondent_name: string | null;
  respondent_role: string | null;
  title_override: string | null;
  due_date: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  owner_user_id: string | null;
  created_by: string | null;
  // Joined
  form_templates?: FormTemplate;
  form_signatures?: FormSignature[];
}

export interface FormAnswer {
  id: string;
  form_instance_id: string;
  section_key: string;
  field_key: string;
  field_label: string;
  repeat_index: number;
  value_raw: any;
  value_normalized: any;
  source_type: string;
  source_reference: string | null;
  confidence_score: number | null;
  ai_generated: boolean;
  manually_edited: boolean;
  verified_by_staff: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormSignature {
  id: string;
  form_instance_id: string;
  signer_name: string;
  signer_role: string;
  signer_email: string | null;
  consent_text: string | null;
  signature_data: any;
  signed_at: string;
  ip_address: string | null;
  device_info: string | null;
  created_at: string;
}

export interface FormPacket {
  id: string;
  packet_name: string;
  packet_code: string | null;
  linked_entity_type: string;
  linked_entity_id: string;
  delivery_method: string;
  recipient_contact_id: string | null;
  status: string;
  due_at: string | null;
  reminder_schedule: any;
  sent_by: string | null;
  created_at: string;
  updated_at: string;
}

export type IntakeTabKey = 'templates' | 'assigned' | 'pending' | 'submitted' | 'signatures' | 'packets' | 'builder' | 'routing';

// ─── Hook ────────────────────────────────────────────────────
export function useIntakeFormsEngine(opts?: { studentId?: string; referralId?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ─── Templates ─────────────────────────────────────────────
  const templatesQuery = useQuery({
    queryKey: ['intake-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as FormTemplate[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─── Template Sections + Fields ────────────────────────────
  const loadTemplateSections = useCallback(async (templateId: string) => {
    const { data, error } = await supabase
      .from('form_template_sections')
      .select('*, form_template_fields(*)')
      .eq('template_id', templateId)
      .order('display_order');
    if (error) throw error;
    return (data || []).map((s: any) => ({
      ...s,
      fields: (s.form_template_fields || []).sort((a: any, b: any) => a.display_order - b.display_order),
    })) as FormTemplateSection[];
  }, []);

  // ─── Instances (global or scoped) ─────────────────────────
  const instancesQuery = useQuery({
    queryKey: ['intake-instances', opts?.studentId, opts?.referralId],
    queryFn: async () => {
      let query = supabase
        .from('form_instances')
        .select('*, form_templates(*), form_signatures(*)')
        .order('updated_at', { ascending: false });

      if (opts?.studentId) {
        query = query.eq('student_id', opts.studentId);
      }
      if (opts?.referralId) {
        query = query.eq('linked_entity_id', opts.referralId).eq('linked_entity_type', 'referral');
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data || []) as unknown as FormInstance[];
    },
  });

  // ─── Packets ───────────────────────────────────────────────
  const packetsQuery = useQuery({
    queryKey: ['intake-packets', opts?.studentId],
    queryFn: async () => {
      let query = supabase
        .from('form_packets')
        .select('*, form_packet_items(*, form_templates(*))')
        .order('created_at', { ascending: false });

      if (opts?.studentId) {
        query = query.eq('linked_entity_id', opts.studentId);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data || []) as unknown as (FormPacket & { form_packet_items: any[] })[];
    },
  });

  // ─── Load Answers for an Instance ─────────────────────────
  const loadAnswers = useCallback(async (instanceId: string) => {
    const { data, error } = await supabase
      .from('form_answers')
      .select('*')
      .eq('form_instance_id', instanceId)
      .order('created_at');
    if (error) throw error;
    const map: Record<string, any> = {};
    for (const row of (data || [])) {
      map[(row as any).field_key] = (row as any).value_raw;
    }
    return { answers: (data || []) as unknown as FormAnswer[], map };
  }, []);

  // ─── Create Instance (via RPC) ────────────────────────────
  const createInstance = useMutation({
    mutationFn: async (params: {
      templateCode: string;
      studentId: string;
      completionMode?: string;
      linkedEntityType?: string;
      linkedEntityId?: string;
      assignedContactId?: string;
      packetId?: string;
      titleOverride?: string;
      sourceType?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_form_instance', {
        p_template_code: params.templateCode,
        p_linked_entity_type: params.linkedEntityType || 'student',
        p_linked_entity_id: params.linkedEntityId || params.studentId,
        p_completion_mode: params.completionMode || 'internal',
        p_created_by: user?.id || null,
        p_assigned_contact_id: params.assignedContactId || null,
        p_packet_id: params.packetId || null,
        p_title_override: params.titleOverride || null,
        p_source_type: params.sourceType || 'manual',
      });
      if (error) throw error;
      return data as string; // returns UUID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-instances'] });
      toast.success('Form created');
    },
    onError: (err: any) => toast.error('Failed to create form: ' + err.message),
  });

  // ─── Save Individual Answer (via RPC) ─────────────────────
  const saveAnswer = useCallback(async (params: {
    instanceId: string;
    fieldKey: string;
    value: any;
    repeatIndex?: number;
    sourceType?: string;
    sourceReference?: string;
    confidenceScore?: number;
    aiGenerated?: boolean;
    manuallyEdited?: boolean;
  }) => {
    const { data, error } = await supabase.rpc('save_form_answer', {
      p_form_instance_id: params.instanceId,
      p_field_key: params.fieldKey,
      p_value_raw: params.value,
      p_repeat_index: params.repeatIndex ?? 0,
      p_source_type: params.sourceType || 'manual',
      p_source_reference: params.sourceReference || null,
      p_confidence_score: params.confidenceScore ?? null,
      p_ai_generated: params.aiGenerated ?? false,
      p_manually_edited: params.manuallyEdited ?? false,
    });
    if (error) throw error;
    return data;
  }, []);

  // ─── Batch Save All Answers (via RPC) ─────────────────────
  const saveAllAnswers = useMutation({
    mutationFn: async (params: {
      instanceId: string;
      answers: Record<string, any>;
      sections?: FormTemplateSection[];
      sourceType?: string;
      aiGenerated?: boolean;
    }) => {
      // Build answers array for bulk RPC
      const answersArray = Object.entries(params.answers)
        .filter(([_, v]) => v !== undefined && v !== '')
        .map(([fieldKey, value]) => ({
          field_key: fieldKey,
          value_raw: value,
          repeat_index: 0,
        }));

      if (answersArray.length === 0) return 0;

      const { data, error } = await supabase.rpc('save_form_answers_bulk', {
        p_form_instance_id: params.instanceId,
        p_answers: answersArray,
        p_source_type: params.sourceType || 'manual',
        p_ai_generated: params.aiGenerated ?? false,
        p_manually_edited: !(params.aiGenerated ?? false),
      });
      if (error) throw error;
      return data as number;
    },
    onError: (err: any) => toast.error('Save failed: ' + err.message),
  });

  // ─── Autosave (via RPC) ───────────────────────────────────
  const autosaveInstance = useMutation({
    mutationFn: async (params: { instanceId: string }) => {
      const { data, error } = await supabase.rpc('autosave_form_instance', {
        p_form_instance_id: params.instanceId,
        p_created_by: user?.id || null,
      });
      if (error) throw error;
      return data as string;
    },
  });

  // ─── Submit (via RPC) ─────────────────────────────────────
  const submitInstance = useMutation({
    mutationFn: async (params: { instanceId: string }) => {
      const { data, error } = await supabase.rpc('submit_form_instance', {
        p_form_instance_id: params.instanceId,
        p_created_by: user?.id || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-instances'] });
      toast.success('Form submitted');
    },
    onError: (err: any) => toast.error('Submit failed: ' + err.message),
  });

  // ─── Finalize (via RPC) ───────────────────────────────────
  const finalizeInstance = useMutation({
    mutationFn: async (params: { instanceId: string }) => {
      const { data, error } = await supabase.rpc('finalize_form_instance', {
        p_form_instance_id: params.instanceId,
        p_created_by: user?.id || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-instances'] });
      toast.success('Form finalized and locked');
    },
    onError: (err: any) => toast.error('Finalize failed: ' + err.message),
  });

  // ─── Create Packet (via RPC) ──────────────────────────────
  const createPacket = useMutation({
    mutationFn: async (params: {
      packetName: string;
      linkedEntityId: string;
      linkedEntityType?: string;
      deliveryMethod?: string;
      dueAt?: string;
      recipientContactId?: string;
      templateCodes?: string[];
    }) => {
      // 1. Create the packet
      const { data: packetId, error } = await supabase.rpc('create_form_packet', {
        p_packet_name: params.packetName,
        p_linked_entity_type: params.linkedEntityType || 'student',
        p_linked_entity_id: params.linkedEntityId,
        p_recipient_contact_id: params.recipientContactId || null,
        p_sent_by: user?.id || null,
        p_due_at: params.dueAt || null,
        p_delivery_method: params.deliveryMethod || 'portal_link',
      });
      if (error) throw error;

      // 2. Add templates to packet
      if (params.templateCodes && params.templateCodes.length > 0) {
        for (let i = 0; i < params.templateCodes.length; i++) {
          const { error: addErr } = await supabase.rpc('add_template_to_packet', {
            p_packet_id: packetId as string,
            p_template_code: params.templateCodes[i],
            p_display_order: i + 1,
            p_created_by: user?.id || null,
          });
          if (addErr) throw addErr;
        }
      }

      return packetId as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-packets'] });
      toast.success('Packet created');
    },
    onError: (err: any) => toast.error('Failed to create packet: ' + err.message),
  });

  // ─── Mark Packet Sent (via RPC) ───────────────────────────
  const markPacketSent = useMutation({
    mutationFn: async (params: { packetId: string }) => {
      const { data, error } = await supabase.rpc('mark_packet_sent', {
        p_packet_id: params.packetId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-packets'] });
      toast.success('Packet sent');
    },
    onError: (err: any) => toast.error('Failed to send packet: ' + err.message),
  });

  // ─── Save Signature ────────────────────────────────────────
  const saveSignature = useMutation({
    mutationFn: async (params: {
      instanceId: string;
      signerName: string;
      signerRole: string;
      signatureData: any;
      consentText?: string;
    }) => {
      const { error } = await supabase.from('form_signatures').insert({
        form_instance_id: params.instanceId,
        signer_name: params.signerName,
        signer_role: params.signerRole,
        signature_data: params.signatureData,
        consent_text: params.consentText || null,
        signed_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-instances'] });
      toast.success('Signature captured');
    },
  });

  // ─── Computed ──────────────────────────────────────────────
  const instances = instancesQuery.data || [];
  const draftInstances = instances.filter(i => i.status === 'draft' || i.status === 'in_progress');
  const pendingInstances = instances.filter(i => ['sent', 'parent_opened', 'parent_partially_completed'].includes(i.status));
  const submittedInstances = instances.filter(i => ['submitted', 'staff_review'].includes(i.status));
  const finalizedInstances = instances.filter(i => i.status === 'finalized');
  const signedInstances = instances.filter(i => (i.form_signatures || []).length > 0);

  return {
    templates: templatesQuery.data || [],
    instances,
    packets: packetsQuery.data || [],
    draftInstances,
    pendingInstances,
    submittedInstances,
    finalizedInstances,
    signedInstances,
    isLoading: templatesQuery.isLoading || instancesQuery.isLoading,
    // Actions
    createInstance,
    saveAllAnswers,
    saveAnswer,
    loadAnswers,
    loadTemplateSections,
    autosaveInstance,
    submitInstance,
    finalizeInstance,
    createPacket,
    markPacketSent,
    saveSignature,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-templates'] });
      queryClient.invalidateQueries({ queryKey: ['intake-instances'] });
      queryClient.invalidateQueries({ queryKey: ['intake-packets'] });
    },
  };
}
