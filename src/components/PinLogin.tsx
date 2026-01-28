import { useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinComplete = async (value: string) => {
    if (value.length !== 6) return;

    // Basic client-side validation (server validates too)
    if (!/^\d{6}$/.test(value)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be exactly 6 digits',
        variant: 'destructive',
      });
      setPin('');
      return;
    }
    
    setIsLoading(true);
    try {
      // Call the backend function to verify PIN and get a session (PIN-only)
      const { data, error } = await supabase.functions.invoke('pin-auth', {
        body: { pin: value },
      });

      if (error) {
        throw new Error(error.message || 'PIN verification failed');
      }

      if (data?.error) {
        if (data.pending) {
          toast({ 
            title: 'Account pending approval', 
            description: 'Your account is awaiting administrator approval',
            variant: 'destructive' 
          });
        } else {
          toast({ 
            title: 'Login failed', 
            description: data.error,
            variant: 'destructive' 
          });
        }
        setPin('');
        setIsLoading(false);
        return;
      }

      if (!data?.access_token) {
        toast({ 
          title: 'Login failed', 
          description: 'Unable to complete PIN login. Try password login instead.',
          variant: 'destructive' 
        });
        setPin('');
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
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PIN Input - Primary focus */}
      <div className="space-y-4">
        <div className="text-center">
          <Smartphone className="w-12 h-12 mx-auto text-primary mb-2" />
          <h3 className="text-lg font-semibold">Quick PIN Login</h3>
          <p className="text-sm text-muted-foreground mt-1">Enter your PIN to sign in</p>
        </div>
        
        <div className="space-y-2">
          <Label className="text-center block text-muted-foreground">Enter your 6-digit PIN</Label>
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
              autoFocus
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

      {/* Switch to password login */}
      <div className="text-center pt-2 border-t">
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={onSwitchToPassword}
        >
          Use email & password instead
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
