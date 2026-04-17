import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const POLL_INTERVAL_MS = 30_000;

export default function PendingApproval() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out' });
    navigate('/auth');
  };

  const checkApproval = async (manual = false) => {
    if (!user) return;
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', user.id)
        .maybeSingle();

      setLastChecked(new Date());

      if (error) {
        if (manual) {
          toast({ title: 'Could not check status', description: error.message, variant: 'destructive' });
        }
        return;
      }

      if (data?.is_approved) {
        toast({ title: 'Approved!', description: 'Welcome aboard. Loading your workspace…' });
        navigate('/', { replace: true });
        return;
      }

      if (manual) {
        toast({
          title: 'Still pending',
          description: 'Your account has not been approved yet. We\'ll keep checking automatically.',
        });
      }
    } finally {
      setChecking(false);
    }
  };

  // Auto-poll every 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => checkApproval(false), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.first_name ||
    user?.email?.split('@')[0] ||
    'there';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <CardTitle className="text-2xl">Awaiting Approval</CardTitle>
          <CardDescription className="text-base">
            Hi {displayName}! Your account has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            An administrator needs to approve your account before you can access the application.
          </p>
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3 text-left">
            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              You'll receive an email when approved. We're also checking your status automatically every 30 seconds.
            </span>
          </div>

          {lastChecked && (
            <p className="text-xs text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={() => checkApproval(true)} disabled={checking} className="w-full">
              <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking…' : 'Check if approved'}
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            If this is taking longer than expected, please contact your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
