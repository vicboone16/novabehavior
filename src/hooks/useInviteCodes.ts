import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InviteCode {
  id: string;
  code: string;
  agency_id: string;
  client_id: string;
  created_by: string;
  permission_level: string;
  can_collect_data: boolean;
  can_view_notes: boolean;
  can_view_documents: boolean;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useInviteCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCodes = useCallback(async (clientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCodes((data || []) as unknown as InviteCode[]);
    } catch (err: any) {
      toast.error('Failed to load invite codes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateCode = useCallback(async (params: {
    agencyId: string;
    clientId: string;
    permissionLevel?: string;
    canCollectData?: boolean;
    canViewNotes?: boolean;
    canViewDocuments?: boolean;
    maxUses?: number;
    expiresInDays?: number;
  }) => {
    if (!user) return null;
    try {
      // Generate code via DB function
      const { data: codeResult, error: codeError } = await supabase
        .rpc('generate_invite_code');
      if (codeError) throw codeError;

      const expiresAt = params.expiresInDays
        ? new Date(Date.now() + params.expiresInDays * 86400000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('invite_codes')
        .insert({
          code: codeResult,
          agency_id: params.agencyId,
          client_id: params.clientId,
          created_by: user.id,
          permission_level: params.permissionLevel || 'view',
          can_collect_data: params.canCollectData || false,
          can_view_notes: params.canViewNotes || false,
          can_view_documents: params.canViewDocuments || false,
          max_uses: params.maxUses || 1,
          expires_at: expiresAt,
        } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success('Invite code generated');
      return data as unknown as InviteCode;
    } catch (err: any) {
      toast.error('Failed to generate invite code: ' + err.message);
      return null;
    }
  }, [user]);

  const revokeCode = useCallback(async (codeId: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase
        .from('invite_codes') as any)
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', codeId);
      if (error) throw error;
      toast.success('Invite code revoked');
    } catch (err: any) {
      toast.error('Failed to revoke code: ' + err.message);
    }
  }, [user]);

  const redeemCode = useCallback(async (code: string) => {
    try {
      const { data, error } = await supabase.rpc('redeem_invite_code', {
        _code: code,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) {
        toast.error(result.error);
        return null;
      }
      toast.success('Successfully linked to learner!');
      return result;
    } catch (err: any) {
      toast.error('Failed to redeem code: ' + err.message);
      return null;
    }
  }, []);

  return { codes, loading, fetchCodes, generateCode, revokeCode, redeemCode };
}
