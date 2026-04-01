import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NYDOE_SECTIONS, DEFAULT_HEADER, type NydoeSection, type NydoeHeaderData } from '@/lib/nydoeTemplate';
import { toast } from 'sonner';

export interface NydoeReport {
  id: string;
  student_id: string;
  title: string;
  report_type: string;
  status: string;
  header_data: NydoeHeaderData;
  sections_data: { key: string; content: string }[];
  branding: any;
  created_at: string;
  updated_at: string;
}

export function useNydoeReport(reportId?: string) {
  const { user } = useAuth();
  const [report, setReport] = useState<NydoeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadReport = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('nydoe_reports')
      .select('*')
      .eq('id', reportId)
      .single();
    if (error) {
      console.error('Failed to load NYDOE report:', error);
      toast.error('Failed to load report');
    } else {
      setReport({
        ...data,
        header_data: (data.header_data || DEFAULT_HEADER) as NydoeHeaderData,
        sections_data: (data.sections_data || []) as { key: string; content: string }[],
      } as NydoeReport);
    }
    setLoading(false);
  }, [reportId]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const saveReport = useCallback(async (
    headerData: NydoeHeaderData,
    sectionsData: { key: string; content: string }[]
  ) => {
    if (!reportId || !report) return;
    setSaving(true);
    const { error } = await supabase
      .from('nydoe_reports')
      .update({
        header_data: headerData as any,
        sections_data: sectionsData as any,
        last_edited_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);
    if (error) {
      toast.error('Failed to save report');
      console.error(error);
    } else {
      toast.success('Report saved');
      setReport(prev => prev ? { ...prev, header_data: headerData, sections_data: sectionsData } : null);
    }
    setSaving(false);
  }, [reportId, report, user]);

  const updateStatus = useCallback(async (status: string) => {
    if (!reportId) return;
    const { error } = await supabase
      .from('nydoe_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reportId);
    if (error) {
      toast.error('Failed to update status');
    } else {
      setReport(prev => prev ? { ...prev, status } : null);
      toast.success(`Report marked as ${status}`);
    }
  }, [reportId]);

  return { report, loading, saving, saveReport, updateStatus, loadReport };
}

export function useCreateNydoeReport() {
  const { user } = useAuth();

  const createReport = useCallback(async (studentId: string, studentName: string, reportType = 'initial') => {
    const defaultSections = NYDOE_SECTIONS.map(s => ({
      key: s.key,
      content: s.content,
    }));

    const headerData: NydoeHeaderData = {
      ...DEFAULT_HEADER,
      patientName: studentName,
      reportDate: new Date().toLocaleDateString(),
    };

    const { data, error } = await supabase
      .from('nydoe_reports')
      .insert({
        student_id: studentId,
        title: `NYDOE CR Report - ${studentName}`,
        report_type: reportType,
        status: 'draft',
        header_data: headerData as any,
        sections_data: defaultSections as any,
        created_by: user?.id,
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Failed to create report');
      console.error(error);
      return null;
    }

    toast.success('NYDOE report created');
    return data.id;
  }, [user]);

  return { createReport };
}

export function useStudentNydoeReports(studentId?: string) {
  const [reports, setReports] = useState<NydoeReport[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReports = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('nydoe_reports')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setReports(data.map(d => ({
        ...d,
        header_data: d.header_data as unknown as NydoeHeaderData,
        sections_data: (d.sections_data || []) as { key: string; content: string }[],
      })) as NydoeReport[]);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { loadReports(); }, [loadReports]);

  return { reports, loading, refresh: loadReports };
}
