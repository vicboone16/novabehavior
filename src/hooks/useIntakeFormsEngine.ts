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
    // Convert to a map: { fieldKey: valueRaw }
    const map: Record<string, any> = {};
    for (const row of (data || [])) {
      map[(row as any).field_key] = (row as any).value_raw;
    }
    return { answers: (data || []) as unknown as FormAnswer[], map };
  }, []);

  // ─── Create Instance ──────────────────────────────────────
  const createInstance = useMutation({
    mutationFn: async (params: {
      templateId: string;
      studentId: string;
      completionMode?: string;
      assignedTo?: string;
      linkedEntityType?: string;
      linkedEntityId?: string;
    }) => {
      // Get form_definition_id
      const { data: defData } = await supabase
        .from('form_definitions')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();

      const { data, error } = await supabase
        .from('form_instances')
        .insert({
          template_id: params.templateId,
          student_id: params.studentId,
          form_definition_id: defData?.id || params.templateId,
          completion_mode: params.completionMode || 'internal',
          assigned_to: params.assignedTo || null,
          linked_entity_type: params.linkedEntityType || 'student',
          linked_entity_id: params.linkedEntityId || params.studentId,
          status: 'draft',
          created_by: user?.id,
          owner_user_id: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-instances'] });
      toast.success('Form created');
    },
    onError: (err: any) => toast.error('Failed to create form: ' + err.message),
  });

  // ─── Save Individual Answer (field-level) ─────────────────
  const saveAnswer = useCallback(async (params: {
    instanceId: string;
    sectionKey: string;
    fieldKey: string;
    fieldLabel: string;
    value: any;
    repeatIndex?: number;
    sourceType?: string;
    aiGenerated?: boolean;
    confidenceScore?: number;
  }) => {
    const { data: existing } = await supabase
      .from('form_answers')
      .select('id')
      .eq('form_instance_id', params.instanceId)
      .eq('field_key', params.fieldKey)
      .eq('repeat_index', params.repeatIndex || 0)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('form_answers')
        .update({
          value_raw: params.value,
          manually_edited: params.sourceType !== 'ai',
          ai_generated: params.aiGenerated || false,
          confidence_score: params.confidenceScore || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', (existing as any).id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('form_answers')
        .insert({
          form_instance_id: params.instanceId,
          section_key: params.sectionKey,
          field_key: params.fieldKey,
          field_label: params.fieldLabel,
          repeat_index: params.repeatIndex || 0,
          value_raw: params.value,
          source_type: params.sourceType || 'manual',
          ai_generated: params.aiGenerated || false,
          confidence_score: params.confidenceScore || null,
        } as any);
      if (error) throw error;
    }
  }, []);

  // ─── Batch Save All Answers (autosave / submit) ───────────
  const saveAllAnswers = useMutation({
    mutationFn: async (params: {
      instanceId: string;
      answers: Record<string, any>;
      sections: FormTemplateSection[];
      isFinal?: boolean;
    }) => {
      // Build a field lookup for section_key + label
      const fieldLookup: Record<string, { sectionKey: string; label: string }> = {};
      for (const section of params.sections) {
        for (const field of (section.fields || [])) {
          fieldLookup[field.field_key] = { sectionKey: section.section_key, label: field.field_label };
        }
      }

      // Upsert each answer
      const entries = Object.entries(params.answers).filter(([_, v]) => v !== undefined && v !== '');
      for (const [fieldKey, value] of entries) {
        const lookup = fieldLookup[fieldKey];
        if (!lookup) continue;
        await saveAnswer({
          instanceId: params.instanceId,
          sectionKey: lookup.sectionKey,
          fieldKey,
          fieldLabel: lookup.label,
          value,
        });
      }

      // Update instance timestamp + status
      const updates: any = {
        last_saved_at: new Date().toISOString(),
        status: params.isFinal ? 'submitted' : 'in_progress',
      };
      if (params.isFinal) {
        updates.submitted_at = new Date().toISOString();
      }
      if (!params.isFinal) {
        // Update started_at on first save
        updates.started_at = new Date().toISOString();
      }

      await supabase
        .from('form_instances')
        .update(updates)
        .eq('id', params.instanceId);

      // Create version snapshot on submit/finalize
      if (params.isFinal) {
        const { data: versionCount } = await supabase
          .from('form_versions')
          .select('version_no')
          .eq('form_instance_id', params.instanceId)
          .order('version_no', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextVersion = ((versionCount as any)?.version_no || 0) + 1;
        await supabase.from('form_versions').insert({
          form_instance_id: params.instanceId,
          version_no: nextVersion,
          snapshot_type: 'submit',
          snapshot_json: params.answers,
          created_by: user?.id,
        } as any);
      }
    },
    onSuccess: (_, vars) => {
      if (vars.isFinal) {
        queryClient.invalidateQueries({ queryKey: ['intake-instances'] });
        toast.success('Form submitted');
      }
    },
  });

  // ─── Update Status ─────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async (params: { instanceId: string; status: string }) => {
      const updates: any = { status: params.status };
      if (params.status === 'finalized') updates.finalized_at = new Date().toISOString();
      if (params.status === 'staff_review') updates.reviewed_at = new Date().toISOString();

      const { error } = await supabase
        .from('form_instances')
        .update(updates)
        .eq('id', params.instanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-instances'] });
      toast.success('Status updated');
    },
  });

  // ─── Create Packet ─────────────────────────────────────────
  const createPacket = useMutation({
    mutationFn: async (params: {
      packetName: string;
      linkedEntityId: string;
      linkedEntityType?: string;
      deliveryMethod?: string;
      dueAt?: string;
      templateIds: string[];
    }) => {
      const { data: packet, error } = await supabase
        .from('form_packets')
        .insert({
          packet_name: params.packetName,
          linked_entity_id: params.linkedEntityId,
          linked_entity_type: params.linkedEntityType || 'student',
          delivery_method: params.deliveryMethod || 'magic_link',
          due_at: params.dueAt || null,
          sent_by: user?.id,
          status: 'draft',
        } as any)
        .select()
        .single();
      if (error) throw error;

      if (params.templateIds.length > 0) {
        const items = params.templateIds.map((tid, idx) => ({
          packet_id: packet.id,
          template_id: tid,
          display_order: idx,
          assignment_mode: 'parent',
          required: true,
        }));
        const { error: itemsErr } = await supabase.from('form_packet_items').insert(items as any);
        if (itemsErr) throw itemsErr;
      }

      return packet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-packets'] });
      toast.success('Packet created');
    },
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
    updateStatus,
    createPacket,
    saveSignature,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-templates'] });
      queryClient.invalidateQueries({ queryKey: ['intake-instances'] });
      queryClient.invalidateQueries({ queryKey: ['intake-packets'] });
    },
  };
}
