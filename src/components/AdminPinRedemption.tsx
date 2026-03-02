import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminPinRedemptionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminPinRedemption({ open, onOpenChange }: AdminPinRedemptionProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRedeem = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_redeem_master_pin', { p_pin: pin.trim() });

      if (error) throw error;

      const result = data as any;
      if (result?.ok) {
        toast({
          title: 'Access granted',
          description: `Joined ${result.granted_agencies} agencies. Reload to see all clients.`,
        });
        onOpenChange(false);
        setPin('');
        // Reload to pick up new agency context
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast({
          title: 'Invalid PIN',
          description: result?.error === 'invalid_pin' ? 'PIN not recognized or expired.' : result?.error,
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Admin Access PIN
          </DialogTitle>
          <DialogDescription>
            Enter your admin master PIN to gain access to all agencies and clients.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="admin-pin">Master PIN</Label>
            <Input
              id="admin-pin"
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleRedeem} disabled={loading || !pin.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Redeem PIN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
