import { useState, useRef, useEffect } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PinLoginProps {
  onSuccess: () => void;
  onSwitchToPassword: () => void;
}

export function PinLogin({ onSuccess, onSwitchToPassword }: PinLoginProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'pin'>('email');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setStep('pin');
    }
  };

  const handlePinComplete = async (value: string) => {
    if (value.length !== 6) return;
    
    setIsLoading(true);
    try {
      // First, find the user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email.toLowerCase())
        .single();

      if (profileError || !profile) {
        toast({ 
          title: 'User not found', 
          description: 'No account found with this email',
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }

      // Verify PIN using the database function
      const { data: isValid, error: pinError } = await supabase
        .rpc('verify_pin', { 
          _user_id: profile.user_id, 
          _pin: value 
        });

      if (pinError || !isValid) {
        toast({ 
          title: 'Invalid PIN', 
          description: 'The PIN you entered is incorrect',
          variant: 'destructive' 
        });
        setPin('');
        setIsLoading(false);
        return;
      }

      // PIN is valid - sign in with a special method
      // We'll use a server-side approach via edge function
      const { data, error } = await supabase.functions.invoke('pin-auth', {
        body: { email: email.toLowerCase(), pin: value }
      });

      if (error || !data?.access_token) {
        toast({ 
          title: 'Login failed', 
          description: 'Unable to complete PIN login. Try password login instead.',
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }

      // Set the session
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      });

      toast({ title: 'Welcome back!' });
      onSuccess();
    } catch (error) {
      console.error('PIN login error:', error);
      toast({ 
        title: 'Login failed', 
        description: 'An error occurred. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin-email">Email</Label>
              <Input
                id="pin-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!email.trim()}>
              Continue with PIN
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">{email}</p>
            <button 
              className="text-xs text-primary hover:underline"
              onClick={() => setStep('email')}
            >
              Change email
            </button>
          </div>
          
          <div className="space-y-2">
            <Label className="text-center block">Enter your 6-digit PIN</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={pin}
                onChange={(value) => {
                  setPin(value);
                  if (value.length === 6) {
                    handlePinComplete(value);
                  }
                }}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={onSwitchToPassword}
        >
          Use password instead
        </button>
      </div>
    </div>
  );
}

interface SetupPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function SetupPinDialog({ open, onOpenChange, userId }: SetupPinDialogProps) {
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinCreate = (value: string) => {
    if (value.length === 6) {
      setPin(value);
      setStep('confirm');
    }
  };

  const handlePinConfirm = async (value: string) => {
    if (value.length !== 6) return;
    
    if (value !== pin) {
      toast({ 
        title: 'PINs do not match', 
        description: 'Please try again',
        variant: 'destructive' 
      });
      setConfirmPin('');
      setStep('create');
      setPin('');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('set_user_pin', {
        _user_id: userId,
        _pin: pin
      });

      if (error || !data) {
        throw new Error('Failed to set PIN');
      }

      toast({ title: 'PIN set successfully!' });
      onOpenChange(false);
      setPin('');
      setConfirmPin('');
      setStep('create');
    } catch (error) {
      toast({ 
        title: 'Failed to set PIN', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPin('');
      setConfirmPin('');
      setStep('create');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Set Up Quick PIN
          </DialogTitle>
          <DialogDescription>
            {step === 'create' 
              ? 'Create a 6-digit PIN for quick mobile login'
              : 'Confirm your PIN'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          {step === 'create' ? (
            <InputOTP
              maxLength={6}
              value={pin}
              onChange={(value) => {
                setPin(value);
                if (value.length === 6) {
                  setTimeout(() => setStep('confirm'), 300);
                }
              }}
              disabled={isLoading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          ) : (
            <InputOTP
              maxLength={6}
              value={confirmPin}
              onChange={(value) => {
                setConfirmPin(value);
                if (value.length === 6) {
                  handlePinConfirm(value);
                }
              }}
              disabled={isLoading}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
