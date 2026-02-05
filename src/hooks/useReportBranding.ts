import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ReportBranding, GeneratedReport, ContactInfo } from '@/types/reportBranding';

export function useReportBranding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [brandings, setBrandings] = useState<ReportBranding[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBrandings = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('report_branding')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;
      setBrandings((data || []) as unknown as ReportBranding[]);
    } catch (error) {
      console.error('Error fetching brandings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBrandings();
  }, [fetchBrandings]);

  const createBranding = async (branding: {
    organization_name: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    footer_text?: string;
    contact_info?: ContactInfo;
    is_default?: boolean;
  }) => {
    try {
      // If setting as default, unset other defaults first
      if (branding.is_default) {
        await supabase
          .from('report_branding')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('report_branding')
        .insert({
          organization_name: branding.organization_name,
          logo_url: branding.logo_url,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          footer_text: branding.footer_text,
          contact_info: (branding.contact_info || null) as unknown as null,
          is_default: branding.is_default,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Branding Created',
        description: 'Report branding saved successfully',
      });

      await fetchBrandings();
      return data as unknown as ReportBranding;
    } catch (error) {
      console.error('Error creating branding:', error);
      toast({
        title: 'Error',
        description: 'Failed to create branding',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateBranding = async (brandingId: string, updates: Partial<ReportBranding>) => {
    try {
      // If setting as default, unset other defaults first
      if (updates.is_default) {
        await supabase
          .from('report_branding')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.organization_name !== undefined) updateData.organization_name = updates.organization_name;
      if (updates.logo_url !== undefined) updateData.logo_url = updates.logo_url;
      if (updates.primary_color !== undefined) updateData.primary_color = updates.primary_color;
      if (updates.secondary_color !== undefined) updateData.secondary_color = updates.secondary_color;
      if (updates.footer_text !== undefined) updateData.footer_text = updates.footer_text;
      if (updates.is_default !== undefined) updateData.is_default = updates.is_default;
      if (updates.contact_info !== undefined) updateData.contact_info = updates.contact_info;

      const { error } = await supabase
        .from('report_branding')
        .update(updateData)
        .eq('id', brandingId);

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Branding updated',
      });

      await fetchBrandings();
    } catch (error) {
      console.error('Error updating branding:', error);
      toast({
        title: 'Error',
        description: 'Failed to update branding',
        variant: 'destructive',
      });
    }
  };

  const deleteBranding = async (brandingId: string) => {
    try {
      const { error } = await supabase
        .from('report_branding')
        .delete()
        .eq('id', brandingId);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Branding removed',
      });

      await fetchBrandings();
    } catch (error) {
      console.error('Error deleting branding:', error);
    }
  };

  const getDefaultBranding = () => {
    return brandings.find(b => b.is_default) || brandings[0] || null;
  };

  return {
    brandings,
    isLoading,
    createBranding,
    updateBranding,
    deleteBranding,
    getDefaultBranding,
    refresh: fetchBrandings,
  };
}

export function useGeneratedReports(studentId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from('generated_reports')
        .select('*')
        .eq('generated_by', user.id)
        .order('generated_at', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports((data || []) as unknown as GeneratedReport[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, studentId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const createReport = async (report: {
    student_id: string;
    report_type: string;
    branding_id?: string;
    date_range_start?: string;
    date_range_end?: string;
    content: unknown;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .insert({
          student_id: report.student_id,
          report_type: report.report_type,
          branding_id: report.branding_id,
          date_range_start: report.date_range_start,
          date_range_end: report.date_range_end,
          content: report.content as unknown as null,
          generated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Report Generated',
        description: 'Report created successfully',
      });

      await fetchReports();
      return data as unknown as GeneratedReport;
    } catch (error) {
      console.error('Error creating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    reports,
    isLoading,
    createReport,
    refresh: fetchReports,
  };
}
