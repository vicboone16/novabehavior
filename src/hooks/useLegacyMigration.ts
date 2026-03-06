import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLegacyMigration(agencyId?: string) {
  // Stage legacy behavior_interventions into aba_library_import_staging
  const stageLegacy = useMutation({
    mutationFn: async ({ sourceTable = 'behavior_interventions' }: { sourceTable?: string } = {}) => {
      if (!agencyId) throw new Error('Agency ID required');
      const { data, error } = await supabase.rpc('bulk_stage_legacy_interventions', {
        p_agency_id: agencyId,
        p_source_table: sourceTable,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => toast.success(`Staged ${count} legacy interventions for import`),
    onError: (err: Error) => toast.error(err.message),
  });

  // Process all staged imports into aba_library_interventions
  const processStaged = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error('Agency ID required');
      const { data, error } = await supabase.rpc('bulk_process_staged_imports', {
        p_agency_id: agencyId,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => toast.success(`Imported ${count} interventions into the library`),
    onError: (err: Error) => toast.error(err.message),
  });

  return { stageLegacy, processStaged };
}
