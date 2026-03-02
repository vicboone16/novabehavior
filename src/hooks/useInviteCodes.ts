import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InviteCode {
  invite_id: string;
  code: string;
  agency_id: string;
  client_id: string;
  created_by: string;
  status: string;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  permissions: any;
  role_slug: string;
  app_context: string;
  invite_scope: string;
  group_id: string | null;
  created_at: string;
}

// Friendly error messages for redeem results
const REDEEM_ERROR_MESSAGES: Record<string, string> = {
  'Invalid invite code': "That code doesn't match. Check it and try again.",
  'This invite code is no longer active': 'This code was already used. Ask for a new one.',
  'This invite code has expired': 'This code expired. Ask your support team for a new one.',
  'This invite code has reached its usage limit': 'This code was already used. Ask for a new one.',
  'You already have access to this learner': 'You are already linked to this learner.',
  'Authentication required': 'Please sign in to use an invite code.',
};

const RATE_LIMIT_KEY = 'invite_code_attempts';
const MAX_ATTEMPTS_PER_HOUR = 10;

function checkClientRateLimit(): boolean {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const attempts: number[] = raw ? JSON.parse(raw) : [];
    const oneHourAgo = Date.now() - 3600000;
    const recent = attempts.filter(t => t > oneHourAgo);
    return recent.length < MAX_ATTEMPTS_PER_HOUR;
  } catch {
    return true;
  }
}

function recordAttempt(): void {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const attempts: number[] = raw ? JSON.parse(raw) : [];
    const oneHourAgo = Date.now() - 3600000;
    const recent = attempts.filter(t => t > oneHourAgo);
    recent.push(Date.now());
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
  } catch {
    // silently fail
  }
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
    maxUses?: number;
    expiresInDays?: number | null;
    permissions?: Record<string, boolean>;
  }) => {
    if (!user) return null;
    try {
      const { data: codeResult, error: codeError } = await supabase
        .rpc('generate_invite_code', { prefix: 'BD' });
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
          max_uses: params.maxUses || 1,
          expires_at: expiresAt,
          permissions: params.permissions || {},
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

  const updateCodeStatus = useCallback(async (inviteId: string, newStatus: string) => {
    if (!user) return;
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'disabled' || newStatus === 'revoked') {
        updateData.revoked_at = new Date().toISOString();
        updateData.revoked_by = user.id;
      }
      if (newStatus === 'active') {
        updateData.revoked_at = null;
        updateData.revoked_by = null;
      }

      const { error } = await (supabase
        .from('invite_codes') as any)
        .update(updateData)
        .eq('invite_id', inviteId);
      if (error) throw error;
      toast.success(`Code ${newStatus === 'active' ? 're-enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error('Failed to update code: ' + err.message);
    }
  }, [user]);

  const redeemCode = useCallback(async (code: string): Promise<{ success: boolean; client_id?: string; agency_id?: string; error?: string } | null> => {
    if (!checkClientRateLimit()) {
      toast.error('Too many attempts. Please wait a few minutes before trying again.');
      return null;
    }

    recordAttempt();

    try {
      if (user) {
        supabase.from('invite_code_attempts').insert({
          user_id: user.id,
          code_tried: code.substring(0, 3) + '***',
          success: false,
        } as any).then();
      }

      const { data, error } = await supabase.rpc('redeem_invite_code', {
        _code: code,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) {
        const friendlyMsg = REDEEM_ERROR_MESSAGES[result.error] || result.error;
        toast.error(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }

      if (user) {
        supabase.from('invite_code_attempts').insert({
          user_id: user.id,
          code_tried: code.substring(0, 3) + '***',
          success: true,
        } as any).then();
      }

      toast.success('Successfully linked to learner!');
      return result;
    } catch (err: any) {
      toast.error('Failed to redeem code: ' + err.message);
      return null;
    }
  }, [user]);

  return { codes, loading, fetchCodes, generateCode, updateCodeStatus, redeemCode };
}
