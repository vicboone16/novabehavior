import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ERAImport, ERARemittanceRecord, ERALineItem } from '@/types/era';

export function useERAProcessing() {
  const { user } = useAuth();
  const [imports, setImports] = useState<ERAImport[]>([]);
  const [remittances, setRemittances] = useState<ERARemittanceRecord[]>([]);
  const [lineItems, setLineItems] = useState<ERALineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchImports = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('era_imports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setImports((data || []) as unknown as ERAImport[]);
    } catch (err: any) {
      toast.error('Failed to load ERA imports: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRemittances = useCallback(async (importId: string) => {
    const { data, error } = await supabase.from('era_remittances').select('*').eq('import_id', importId).order('created_at', { ascending: false });
    if (error) throw error;
    setRemittances((data || []) as unknown as ERARemittanceRecord[]);
    return data as unknown as ERARemittanceRecord[];
  }, []);

  const fetchLineItems = useCallback(async (remittanceId: string) => {
    const { data, error } = await supabase.from('era_line_items').select('*').eq('remittance_id', remittanceId).order('created_at', { ascending: true });
    if (error) throw error;
    setLineItems((data || []) as unknown as ERALineItem[]);
    return data as unknown as ERALineItem[];
  }, []);

  const createImport = useCallback(async (filename: string, rawContent: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('era_imports')
      .insert({ filename, raw_content: rawContent, imported_by: user.id, file_size: rawContent.length } as any)
      .select()
      .single();
    if (error) throw error;
    toast.success('ERA file imported successfully');
    return data as unknown as ERAImport;
  }, [user]);

  const updateImportStatus = useCallback(async (id: string, status: string, error?: string) => {
    await supabase.from('era_imports').update({ parse_status: status, parse_error: error } as any).eq('id', id);
  }, []);

  const postPayment = useCallback(async (lineItemId: string, claimId: string) => {
    const { error } = await supabase.from('era_line_items').update({ posted: true, posted_at: new Date().toISOString(), claim_id: claimId } as any).eq('id', lineItemId);
    if (error) throw error;
    toast.success('Payment posted');
  }, []);

  const updateMatchStatus = useCallback(async (lineItemId: string, status: string, claimId?: string, confidence?: number) => {
    const updates: any = { match_status: status };
    if (claimId) updates.claim_id = claimId;
    if (confidence !== undefined) updates.match_confidence = confidence;
    await supabase.from('era_line_items').update(updates).eq('id', lineItemId);
  }, []);

  return {
    imports, remittances, lineItems, isLoading,
    fetchImports, fetchRemittances, fetchLineItems,
    createImport, updateImportStatus, postPayment, updateMatchStatus,
  };
}
