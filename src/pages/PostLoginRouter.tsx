/**
 * PostLoginRouter — Determines the correct destination after email/password login.
 *
 * Flow:
 * 1. Check approval status
 * 2. Check teacher_mode_only flag
 * 3. Check agency memberships:
 *    - Multiple agencies → show selector
 *    - One agency → auto-set context and navigate to /
 *    - No agencies → show "Continue in Independent Mode" option
 * 4. Never calls rpc_join_* — that's only for explicit "Join Agency" actions
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2, User, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface AgencyOption {
  id: string;
  agency_id: string;
  role: string;
  is_primary: boolean;
  agency_name: string;
}

interface DiagnosticError {
  step: string;
  table?: string;
  rpc?: string;
  message: string;
  code?: string;
}

export default function PostLoginRouter() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile } = useAuth();
  const [status, setStatus] = useState<'loading' | 'select_agency' | 'no_agency' | 'error'>('loading');
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [diagnosticError, setDiagnosticError] = useState<DiagnosticError | null>(null);
  const [settingAgency, setSettingAgency] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      console.log('[PostLoginRouter] No user, redirecting to /auth');
      navigate('/auth', { replace: true });
      return;
    }

    resolveDestination();
  }, [user, authLoading]);

  const resolveDestination = async () => {
    if (!user) return;

    try {
      // Step 1: Check approval
      console.log('[PostLoginRouter] Step 1: Checking approval for', user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('[PostLoginRouter] Profile query failed:', profileError);
        setDiagnosticError({
          step: 'Check Approval',
          table: 'profiles',
          message: profileError.message,
          code: profileError.code,
        });
        setStatus('error');
        return;
      }

      if (profileData && !profileData.is_approved) {
        console.log('[PostLoginRouter] User not approved, redirecting');
        navigate('/pending-approval', { replace: true });
        return;
      }

      // Step 2: Check teacher_mode_only
      console.log('[PostLoginRouter] Step 2: Checking feature permissions');
      const { data: perms, error: permsError } = await supabase
        .from('feature_permissions')
        .select('teacher_mode_only')
        .eq('user_id', user.id)
        .maybeSingle();

      if (permsError) {
        console.warn('[PostLoginRouter] Feature permissions query failed (non-fatal):', permsError);
      }

      if (perms?.teacher_mode_only) {
        console.log('[PostLoginRouter] teacher_mode_only=true, routing to teacher dashboard');
        navigate('/teacher-dashboard', { replace: true });
        return;
      }

      // Step 3: Check agency memberships
      console.log('[PostLoginRouter] Step 3: Checking agency memberships');
      const { data: memberships, error: membershipError } = await supabase
        .from('agency_memberships')
        .select('id, agency_id, role, is_primary, agencies!inner(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipError) {
        console.error('[PostLoginRouter] Agency memberships query failed:', membershipError);
        setDiagnosticError({
          step: 'Load Agency Memberships',
          table: 'agency_memberships',
          message: membershipError.message,
          code: membershipError.code,
        });
        setStatus('error');
        return;
      }

      const activeMemberships: AgencyOption[] = (memberships || []).map((m: any) => ({
        id: m.id,
        agency_id: m.agency_id,
        role: m.role,
        is_primary: m.is_primary,
        agency_name: m.agencies?.name || 'Unknown Agency',
      }));

      console.log('[PostLoginRouter] Found', activeMemberships.length, 'active memberships');

      if (activeMemberships.length === 0) {
        // No agencies — offer independent mode
        setStatus('no_agency');
        return;
      }

      if (activeMemberships.length === 1) {
        // Auto-set the single agency
        await setAgencyContext(activeMemberships[0].agency_id);
        navigate('/', { replace: true });
        return;
      }

      // Multiple agencies — let user choose
      setAgencies(activeMemberships);
      setStatus('select_agency');

    } catch (err: any) {
      console.error('[PostLoginRouter] Unexpected error:', err);
      setDiagnosticError({
        step: 'General',
        message: err?.message || 'Unknown error during post-login routing',
      });
      setStatus('error');
    }
  };

  const setAgencyContext = async (agencyId: string) => {
    if (!user) return;
    setSettingAgency(true);
    try {
      console.log('[PostLoginRouter] Setting agency context to', agencyId);
      await supabase
        .from('user_agency_context')
        .upsert(
          { user_id: user.id, current_agency_id: agencyId, last_switched_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    } catch (err) {
      console.warn('[PostLoginRouter] Failed to set agency context (non-fatal):', err);
    } finally {
      setSettingAgency(false);
    }
  };

  const handleSelectAgency = async (agency: AgencyOption) => {
    setSettingAgency(true);
    await setAgencyContext(agency.agency_id);
    toast.success(`Switched to ${agency.agency_name}`);
    navigate('/', { replace: true });
  };

  const handleIndependentMode = () => {
    console.log('[PostLoginRouter] Continuing in independent mode');
    navigate('/', { replace: true });
  };

  // --- Loading state ---
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Setting up your workspace…</p>
        </div>
      </div>
    );
  }

  // --- Error state with diagnostics ---
  if (status === 'error' && diagnosticError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full border-destructive/50">
          <CardHeader className="text-center space-y-2">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
            <CardTitle className="text-lg text-destructive">Access Check Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              An error occurred while verifying your access. Details below may help your administrator resolve this.
            </p>
            <div className="bg-muted rounded-lg p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Step</span>
                <span className="text-foreground">{diagnosticError.step}</span>
              </div>
              {diagnosticError.table && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Table</span>
                  <span className="text-foreground">{diagnosticError.table}</span>
                </div>
              )}
              {diagnosticError.rpc && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RPC</span>
                  <span className="text-foreground">{diagnosticError.rpc}</span>
                </div>
              )}
              {diagnosticError.code && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code</span>
                  <span className="text-foreground">{diagnosticError.code}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Message</span>
                <span className="text-foreground text-right max-w-[200px] break-words">{diagnosticError.message}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="text-foreground">{user?.id?.slice(0, 8)}…</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setStatus('loading'); resolveDestination(); }}>
                Retry
              </Button>
              <Button size="sm" className="flex-1" onClick={handleIndependentMode}>
                Continue Anyway
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- No agency: Independent Mode ---
  if (status === 'no_agency') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center space-y-2">
            <User className="w-10 h-10 text-primary mx-auto" />
            <CardTitle className="text-lg">Welcome!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              You don't have any agency memberships yet. You can continue in independent mode or join an agency later.
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={handleIndependentMode}>
                <User className="w-4 h-4 mr-2" />
                Continue in Independent Mode
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/', { replace: true })}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Join Agency Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Select Agency ---
  if (status === 'select_agency') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center space-y-2">
            <Building2 className="w-10 h-10 text-primary mx-auto" />
            <CardTitle className="text-lg">Select Your Agency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              You belong to multiple agencies. Choose one to start with — you can switch later.
            </p>
            <div className="space-y-2">
              {agencies.map((agency) => (
                <Button
                  key={agency.id}
                  variant="outline"
                  className="w-full justify-between h-auto py-3"
                  disabled={settingAgency}
                  onClick={() => handleSelectAgency(agency)}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div className="text-left">
                      <div className="font-medium">{agency.agency_name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{agency.role}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={handleIndependentMode}
            >
              Continue without selecting an agency
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
