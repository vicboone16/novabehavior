import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BCBAExportResult {
  student_id: string;
  date_from: string;
  date_to: string;
  events: Array<{
    session_date: string;
    event_time: string;
    source_table: string;
    behavior: string;
    measurement_type: string;
    value_numeric: number | null;
    value_text: string | null;
    notes: string | null;
  }>;
}

export function useBCBAExport() {
  const [result, setResult] = useState<BCBAExportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchExport = useCallback(async (studentId: string, dateFrom: string, dateTo: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('build_bcba_session_export', {
        p_student_id: studentId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });
      
      if (!error && data) {
        setResult(data as unknown as BCBAExportResult);
      }
    } catch (err) {
      console.error('[BCBAExport] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, fetchExport };
}
