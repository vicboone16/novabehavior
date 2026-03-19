import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FormDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  grade_band: string;
  schema_json: any;
  is_active: boolean;
}

export interface PackageDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  config_json: any;
  is_active: boolean;
}

export interface ReportDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
}

export interface PackageInstance {
  id: string;
  package_definition_id: string;
  student_id: string;
  school_id: string | null;
  assigned_by: string | null;
  assigned_to: string | null;
  grade_value: string | null;
  grade_band_resolved: string | null;
  routing_source: string;
  status: string;
  due_date: string | null;
  config_json: any;
  created_at: string;
  updated_at: string;
}

export interface PackageInstanceForm {
  id: string;
  package_instance_id: string;
  form_definition_id: string;
  inclusion_rule: string;
  is_required: boolean;
  is_selected: boolean;
  assigned_to: string | null;
  status: string;
  display_order: number;
  form_definition?: FormDefinition;
}

export interface FormInstance {
  id: string;
  form_definition_id: string;
  package_instance_id: string | null;
  package_instance_form_id: string | null;
  student_id: string;
  respondent_name: string | null;
  respondent_role: string | null;
  delivery_method: string;
  status: string;
  version: number;
  started_at: string | null;
  submitted_at: string | null;
  due_date: string | null;
  created_at: string;
  form_definition?: FormDefinition;
}

export interface FormResponse {
  id: string;
  form_instance_id: string;
  response_json: any;
  rendered_summary: string | null;
  is_final: boolean;
  edited_by: string | null;
  created_at: string;
}

export interface ReportDraft {
  id: string;
  report_definition_id: string;
  student_id: string;
  package_instance_id: string | null;
  report_slug: string;
  title: string;
  source_payload: any;
  generated_json: any;
  edited_json: any;
  generation_status: string;
  created_at: string;
  updated_at: string;
}

export function useSdcIntake() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all SDC form definitions
  const fetchFormDefinitions = useCallback(async (): Promise<FormDefinition[]> => {
    const { data, error } = await supabase
      .from('form_definitions')
      .select('*')
      .eq('is_active', true)
      .like('slug', 'sdc_%')
      .order('slug');
    if (error) throw error;
    return (data || []) as unknown as FormDefinition[];
  }, []);

  // Fetch package definition with included forms
  const fetchPackageWithForms = useCallback(async () => {
    const { data: pkg, error: pkgErr } = await supabase
      .from('package_definitions')
      .select('*')
      .eq('slug', 'sdc_behavior_intake_package')
      .single();
    if (pkgErr) throw pkgErr;

    const { data: pdfRows, error: pdfErr } = await supabase
      .from('package_definition_forms')
      .select('*, form_definitions(*)')
      .eq('package_definition_id', pkg.id)
      .order('display_order');
    if (pdfErr) throw pdfErr;

    return { packageDef: pkg as unknown as PackageDefinition, forms: pdfRows as any[] };
  }, []);

  // Create a package instance (calls the RPC)
  const createPackageInstance = useCallback(async (opts: {
    studentId: string;
    gradeValue: string;
    schoolId?: string;
    assignedTo?: string;
    dueDate?: string;
  }): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase.rpc('create_sdc_behavior_intake_package', {
      p_student_id: opts.studentId,
      p_grade_value: opts.gradeValue,
      p_school_id: opts.schoolId || null,
      p_assigned_by: user.id,
      p_assigned_to: opts.assignedTo || null,
      p_due_date: opts.dueDate || null,
    });
    if (error) throw error;
    toast.success('SDC Intake Package assigned');
    return data as string;
  }, [user]);

  // Materialize form instances from package
  const materializeFormInstances = useCallback(async (packageInstanceId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('materialize_sdc_package_forms', {
      p_package_instance_id: packageInstanceId,
    });
    if (error) throw error;
    return data as number;
  }, []);

  // Fetch package instance with its forms
  const fetchPackageInstance = useCallback(async (packageInstanceId: string) => {
    const { data: pkg, error: pkgErr } = await supabase
      .from('package_instances')
      .select('*')
      .eq('id', packageInstanceId)
      .single();
    if (pkgErr) throw pkgErr;

    const { data: forms, error: formsErr } = await supabase
      .from('package_instance_forms')
      .select('*, form_definitions(*)')
      .eq('package_instance_id', packageInstanceId)
      .order('display_order');
    if (formsErr) throw formsErr;

    return {
      packageInstance: pkg as unknown as PackageInstance,
      forms: (forms || []).map((f: any) => ({
        ...f,
        form_definition: f.form_definitions,
      })) as PackageInstanceForm[],
    };
  }, []);

  // Fetch all package instances for a student
  const fetchStudentPackages = useCallback(async (studentId: string): Promise<PackageInstance[]> => {
    const { data, error } = await supabase
      .from('package_instances')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as PackageInstance[];
  }, []);

  // Fetch form instances for a package
  const fetchFormInstances = useCallback(async (packageInstanceId: string): Promise<FormInstance[]> => {
    const { data, error } = await supabase
      .from('form_instances')
      .select('*, form_definitions(*)')
      .eq('package_instance_id', packageInstanceId)
      .order('created_at');
    if (error) throw error;
    return (data || []).map((d: any) => ({
      ...d,
      form_definition: d.form_definitions,
    })) as FormInstance[];
  }, []);

  // Save draft response
  const saveDraftResponse = useCallback(async (formInstanceId: string, responseJson: any) => {
    if (!user) throw new Error('Not authenticated');

    // Upsert into form_responses
    const { data: existing } = await supabase
      .from('form_responses')
      .select('id')
      .eq('form_instance_id', formInstanceId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('form_responses')
        .update({
          response_json: responseJson,
          edited_by: user.id,
          edited_at: new Date().toISOString(),
        } as any)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('form_responses')
        .insert({
          form_instance_id: formInstanceId,
          response_json: responseJson,
          is_final: false,
          edited_by: user.id,
        } as any);
      if (error) throw error;
    }

    // Update form instance status
    await supabase
      .from('form_instances')
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString(),
      } as any)
      .eq('id', formInstanceId)
      .is('started_at', null); // only set if not already started

    // Save version
    const { data: versionCount } = await supabase
      .from('form_response_versions')
      .select('version_number')
      .eq('form_instance_id', formInstanceId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase
      .from('form_response_versions')
      .insert({
        form_instance_id: formInstanceId,
        response_json: responseJson,
        version_number: ((versionCount as any)?.version_number || 0) + 1,
        saved_by: user.id,
        save_type: 'draft',
      } as any);

    toast.success('Draft saved');
  }, [user]);

  // Submit final response
  const submitFinalResponse = useCallback(async (
    formInstanceId: string, 
    responseJson: any,
    respondentName?: string,
    respondentRole?: string,
  ) => {
    if (!user) throw new Error('Not authenticated');

    // Upsert response as final
    const { data: existing } = await supabase
      .from('form_responses')
      .select('id')
      .eq('form_instance_id', formInstanceId)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing) {
      await supabase
        .from('form_responses')
        .update({
          response_json: responseJson,
          is_final: true,
          edited_by: user.id,
          edited_at: now,
        } as any)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('form_responses')
        .insert({
          form_instance_id: formInstanceId,
          response_json: responseJson,
          is_final: true,
          edited_by: user.id,
        } as any);
    }

    // Update form instance
    await supabase
      .from('form_instances')
      .update({
        status: 'submitted',
        submitted_at: now,
        ...(respondentName ? { respondent_name: respondentName } : {}),
        ...(respondentRole ? { respondent_role: respondentRole } : {}),
      } as any)
      .eq('id', formInstanceId);

    // Save version
    const { data: versionCount } = await supabase
      .from('form_response_versions')
      .select('version_number')
      .eq('form_instance_id', formInstanceId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase
      .from('form_response_versions')
      .insert({
        form_instance_id: formInstanceId,
        response_json: responseJson,
        version_number: ((versionCount as any)?.version_number || 0) + 1,
        saved_by: user.id,
        save_type: 'final',
      } as any);

    toast.success('Form submitted');
  }, [user]);

  // Fetch current response for a form instance
  const fetchFormResponse = useCallback(async (formInstanceId: string): Promise<FormResponse | null> => {
    const { data, error } = await supabase
      .from('form_responses')
      .select('*')
      .eq('form_instance_id', formInstanceId)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as FormResponse | null;
  }, []);

  // Toggle grade band override for a package instance form
  const toggleFormSelection = useCallback(async (packageInstanceFormId: string, isSelected: boolean) => {
    const { error } = await supabase
      .from('package_instance_forms')
      .update({ is_selected: isSelected } as any)
      .eq('id', packageInstanceFormId);
    if (error) throw error;
  }, []);

  // Create snapshot draft
  const createSnapshotDraft = useCallback(async (packageInstanceId: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase.rpc('create_sdc_snapshot_draft', {
      p_package_instance_id: packageInstanceId,
      p_generated_by: user.id,
    });
    if (error) throw error;
    return data as string;
  }, [user]);

  // Get snapshot source payload
  const getSnapshotSourcePayload = useCallback(async (packageInstanceId: string): Promise<any> => {
    const { data, error } = await supabase.rpc('get_sdc_snapshot_source_payload', {
      p_package_instance_id: packageInstanceId,
    });
    if (error) throw error;
    return data;
  }, []);

  // Fetch report draft
  const fetchReportDraft = useCallback(async (reportDraftId: string): Promise<ReportDraft | null> => {
    const { data, error } = await supabase
      .from('report_drafts')
      .select('*')
      .eq('id', reportDraftId)
      .single();
    if (error) throw error;
    return data as unknown as ReportDraft;
  }, []);

  // Fetch report drafts for a package
  const fetchPackageReportDrafts = useCallback(async (packageInstanceId: string): Promise<ReportDraft[]> => {
    const { data, error } = await supabase
      .from('report_drafts')
      .select('*')
      .eq('package_instance_id', packageInstanceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as ReportDraft[];
  }, []);

  // Save edited snapshot content
  const saveSnapshotEdits = useCallback(async (reportDraftId: string, editedJson: any) => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('report_drafts')
      .update({
        edited_json: editedJson,
        last_edited_by: user.id,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', reportDraftId);
    if (error) throw error;
  }, [user]);

  // Update generated JSON (after AI generation)
  const updateGeneratedJson = useCallback(async (reportDraftId: string, generatedJson: any) => {
    const { error } = await supabase
      .from('report_drafts')
      .update({
        generated_json: generatedJson,
        generation_status: 'completed',
        last_regenerated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', reportDraftId);
    if (error) throw error;
  }, []);

  // Create individual form instance (standalone, not in a package)
  const createIndividualFormInstance = useCallback(async (opts: {
    formSlug: string;
    studentId: string;
    deliveryMethod: string;
    dueDate?: string;
  }): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    // Look up form definition
    const { data: fd, error: fdErr } = await supabase
      .from('form_definitions')
      .select('id')
      .eq('slug', opts.formSlug)
      .single();
    if (fdErr || !fd) throw new Error('Form definition not found');

    const { data, error } = await supabase
      .from('form_instances')
      .insert({
        form_definition_id: fd.id,
        student_id: opts.studentId,
        delivery_method: opts.deliveryMethod,
        status: 'not_started',
        version: 1,
        assigned_by: user.id,
        due_date: opts.dueDate || null,
      } as any)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }, [user]);

  // Create delivery link for a form instance
  const createDeliveryLink = useCallback(async (opts: {
    formInstanceId: string;
    recipientName: string;
    recipientEmail: string;
    expiresAt?: string;
  }): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from('form_delivery_links')
      .insert({
        form_instance_id: opts.formInstanceId,
        token,
        delivery_status: 'sent',
        sent_to_name: opts.recipientName,
        sent_to_email: opts.recipientEmail,
        expires_at: opts.expiresAt || null,
        created_by: user.id,
      } as any);
    if (error) throw error;

    // Update form instance with respondent info
    await supabase
      .from('form_instances')
      .update({
        respondent_name: opts.recipientName,
        delivery_method: 'send_link',
      } as any)
      .eq('id', opts.formInstanceId);

    return token;
  }, [user]);

  // Fetch export history for a package
  const fetchExportHistory = useCallback(async (packageInstanceId: string): Promise<any[]> => {
    const [formExports, reportExports] = await Promise.all([
      supabase
        .from('form_exports')
        .select('*')
        .eq('package_instance_id', packageInstanceId)
        .order('created_at', { ascending: false }),
      supabase
        .from('report_exports')
        .select('*, report_drafts!inner(package_instance_id)')
        .order('created_at', { ascending: false }),
    ]);

    const fExports = (formExports.data || []).map((e: any) => ({
      ...e,
      source: 'form',
    }));

    const rExports = (reportExports.data || [])
      .filter((e: any) => e.report_drafts?.package_instance_id === packageInstanceId)
      .map((e: any) => ({
        ...e,
        export_scope: 'snapshot',
        source: 'report',
      }));

    return [...fExports, ...rExports].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, []);

  // Log generation event
  const logGenerationEvent = useCallback(async (reportDraftId: string, eventType: string, payload?: any) => {
    if (!user) return;
    await supabase.from('report_generation_events').insert({
      report_draft_id: reportDraftId,
      event_type: eventType,
      event_payload: payload || {},
      created_by: user.id,
    } as any);
  }, [user]);

  // Refresh package status via RPC
  const refreshPackageStatus = useCallback(async (packageInstanceId: string) => {
    try {
      await supabase.rpc('refresh_package_instance_status', {
        p_package_instance_id: packageInstanceId,
      });
    } catch {
      // Silently fail if RPC doesn't exist yet
    }
  }, []);

  // Log form export
  const logFormExport = useCallback(async (opts: {
    formInstanceId?: string;
    packageInstanceId?: string;
    exportScope: string;
    exportFormat: string;
    fileName: string;
  }) => {
    if (!user) return;
    await supabase.from('form_exports').insert({
      form_instance_id: opts.formInstanceId || null,
      package_instance_id: opts.packageInstanceId || null,
      export_scope: opts.exportScope,
      export_format: opts.exportFormat,
      file_name: opts.fileName,
      created_by: user.id,
    } as any);
  }, [user]);

  // Log report export
  const logReportExport = useCallback(async (opts: {
    reportDraftId: string;
    exportFormat: string;
    fileName: string;
  }) => {
    if (!user) return;
    await supabase.from('report_exports').insert({
      report_draft_id: opts.reportDraftId,
      export_format: opts.exportFormat,
      file_name: opts.fileName,
      created_by: user.id,
    } as any);
  }, [user]);

  return {
    isLoading,
    fetchFormDefinitions,
    fetchPackageWithForms,
    createPackageInstance,
    materializeFormInstances,
    fetchPackageInstance,
    fetchStudentPackages,
    fetchFormInstances,
    saveDraftResponse,
    submitFinalResponse,
    fetchFormResponse,
    toggleFormSelection,
    createSnapshotDraft,
    getSnapshotSourcePayload,
    fetchReportDraft,
    fetchPackageReportDrafts,
    saveSnapshotEdits,
    updateGeneratedJson,
    logFormExport,
    logReportExport,
    createIndividualFormInstance,
    createDeliveryLink,
    fetchExportHistory,
    logGenerationEvent,
    refreshPackageStatus,
  };
}
