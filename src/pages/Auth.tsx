import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, ClipboardList, Target, Smartphone } from 'lucide-react';
import { PinLogin } from '@/components/PinLogin';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');
  const [teacherMode, setTeacherMode] = useState(false);

  const handleLogin = async (e: React.FormEvent, isTeacherMode: boolean = false) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setTeacherMode(isTeacherMode);
    
    // First check if user is approved
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('email', loginEmail.toLowerCase())
      .single();

    const { error } = await signIn(loginEmail, loginPassword);
    const { data: { user: loggedInUser } } = await supabase.auth.getUser();
    setIsLoading(false);

    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back!' });
      // Check if approved after login
      if (profile && !profile.is_approved) {
        navigate('/pending-approval');
      } else if (isTeacherMode) {
        // Check teacher mode permission
        if (loggedInUser?.id) {
          const { data: perms } = await supabase
            .from('feature_permissions')
            .select('teacher_mode_access, teacher_mode_only')
            .eq('user_id', loggedInUser.id)
            .maybeSingle();
          
          if (perms?.teacher_mode_only) {
            navigate('/teacher-dashboard');
          } else if (perms?.teacher_mode_access === false) {
            toast({ title: 'Teacher Mode not enabled', description: 'Contact an administrator to enable Teacher Mode access.', variant: 'destructive' });
            navigate('/');
          } else {
            navigate('/teacher-dashboard');
          }
        } else {
          navigate('/teacher-dashboard');
        }
      } else {
        // Check if user is teacher_mode_only
        if (loggedInUser?.id) {
          const { data: perms } = await supabase
            .from('feature_permissions')
            .select('teacher_mode_only')
            .eq('user_id', loggedInUser.id)
            .maybeSingle();
          
          if (perms?.teacher_mode_only) {
            navigate('/teacher-dashboard');
            return;
          }
        }
        navigate('/');
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword || !signupConfirmPassword || !firstName || !lastName) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (signupPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: `${firstName.trim()} ${lastName.trim().charAt(0)}.`,
        },
      },
    });
    
    setIsLoading(false);

    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Account created!', 
        description: 'Your account is pending approval by an administrator.' 
      });
      navigate('/pending-approval');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Student Behavior Tracker</h1>
          <p className="text-muted-foreground">Track, analyze, and improve student behaviors</p>
        </div>

        {/* Features preview */}
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>Multi-student</span>
          </div>
          <div className="flex items-center gap-1">
            <ClipboardList className="w-4 h-4" />
            <span>ABC Tracking</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            <span>Goals</span>
          </div>
        </div>

        <Card>
          <Tabs defaultValue="login">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              {loginMethod === 'password' ? (
                <form onSubmit={(e) => handleLogin(e, false)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-3">
                    <div className="flex gap-2 w-full">
                      <Button type="submit" className="flex-1" disabled={isLoading}>
                        {isLoading && !teacherMode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Sign In
                      </Button>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        className="flex-1" 
                        disabled={isLoading}
                        onClick={(e) => handleLogin(e as unknown as React.FormEvent, true)}
                      >
                        {isLoading && teacherMode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Teacher Mode
                      </Button>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      onClick={() => setLoginMethod('pin')}
                    >
                      <Smartphone className="w-4 h-4" />
                      Use PIN login instead
                    </button>
                  </CardFooter>
                </form>
              ) : (
                <CardContent>
                  <PinLogin
                    onSuccess={() => navigate('/')}
                    onTeacherModeSuccess={() => navigate('/teacher-dashboard')}
                    onSwitchToPassword={() => setLoginMethod('password')}
                  />
                </CardContent>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name *</Label>
                      <Input
                        id="first-name"
                        type="text"
                        placeholder="First"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name *</Label>
                      <Input
                        id="last-name"
                        type="text"
                        placeholder="Last"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password *</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Your account will need to be approved by an administrator before you can access the app.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Create Account
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}