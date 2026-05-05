import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function PendingApproval() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out' });
    navigate('/auth');
  };

  const handleCheckApproval = async () => {
    setChecking(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (data?.is_approved) {
        toast({ title: 'Account approved!', description: 'Redirecting you now…' });
        navigate('/post-login');
      } else {
        toast({
          title: 'Still pending',
          description: 'Your account hasn\'t been approved yet. Try again later.',
        });
      }
    } catch {
      toast({ title: 'Could not check status', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const displayName = user?.user_metadata?.display_name ||
                      user?.user_metadata?.first_name ||
                      user?.email?.split('@')[0] ||
                      'there';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">Awaiting Approval</CardTitle>
          <CardDescription className="text-base">
            Hi {displayName}! Your account has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            An administrator needs to approve your account before you can access the application.
            You'll receive an email once your account is approved, or you can check your status below.
          </p>
          <p className="text-sm text-muted-foreground">
            If approval is taking longer than expected, contact your administrator directly.
          </p>
          <Button className="w-full" onClick={handleCheckApproval} disabled={checking}>
            {checking ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {checking ? 'Checking…' : 'Check Approval Status'}
          </Button>
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
