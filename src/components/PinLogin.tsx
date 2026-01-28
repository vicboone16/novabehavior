import { useState, useEffect } from 'react';
import { Loader2, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface PinLoginProps {
  onSuccess: () => void;
  onSwitchToPassword: () => void;
}

export function PinLogin({ onSuccess, onSwitchToPassword }: PinLoginProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');

  // Load saved email from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pin_login_email');
    if (stored) {
      setSavedEmail(stored);
      setEmail(stored);
    }
  }, []);

  const handlePinComplete = async (value: string) => {
    if (value.length !== 6) return;
    
    const emailToUse = email.trim().toLowerCase();
    
    if (!emailToUse) {
      setShowEmailInput(true);
      toast({ 
        title: 'Email required', 
        description: 'Please enter your email to continue',
        variant: 'destructive' 
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Call the edge function to verify PIN and get session
      const { data, error } = await supabase.functions.invoke('pin-auth', {
        body: { email: emailToUse, pin: value }
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

      // Save email for future logins
      localStorage.setItem('pin_login_email', emailToUse);

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

  const handleEmailSave = () => {
    if (email.trim()) {
      localStorage.setItem('pin_login_email', email.trim().toLowerCase());
      setSavedEmail(email.trim().toLowerCase());
      setShowEmailInput(false);
      toast({ title: 'Email saved', description: 'Now enter your PIN' });
    }
  };

  return (
    <div className="space-y-6">
      {/* PIN Input - Primary focus */}
      <div className="space-y-4">
        <div className="text-center">
          <Smartphone className="w-12 h-12 mx-auto text-primary mb-2" />
          <h3 className="text-lg font-semibold">Quick PIN Login</h3>
          {savedEmail && !showEmailInput && (
            <p className="text-sm text-muted-foreground mt-1">
              Logging in as <span className="font-medium">{savedEmail}</span>
            </p>
          )}
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

      {/* Collapsible Email Input */}
      <Collapsible open={showEmailInput} onOpenChange={setShowEmailInput}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground py-2"
          >
            {showEmailInput ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide email
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {savedEmail ? 'Change email' : 'Enter your email first'}
              </>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
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
          <Button 
            type="button" 
            variant="secondary" 
            className="w-full"
            onClick={handleEmailSave}
            disabled={!email.trim()}
          >
            Save & Continue
          </Button>
        </CollapsibleContent>
      </Collapsible>

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
