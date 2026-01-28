import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function PendingApproval() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out' });
    navigate('/auth');
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
            You'll be able to log in once your account is approved.
          </p>
          <p className="text-sm text-muted-foreground">
            If you believe this is taking too long, please contact your administrator.
          </p>
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
