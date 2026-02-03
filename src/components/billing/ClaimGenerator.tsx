import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface ClaimGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface SessionForClaim {
  id: string;
  name: string;
  start_time: string;
  end_time: string | null;
  student_ids: string[] | null;
  session_length_minutes: number;
  selected: boolean;
}

export function ClaimGenerator({ open, onOpenChange, onSuccess }: ClaimGeneratorProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionForClaim[]>([]);

  useEffect(() => {
    if (open) {
      fetchUnbilledSessions();
    }
  }, [open]);

  const fetchUnbilledSessions = async () => {
    try {
      setLoading(true);
      
      // Fetch sessions that haven't been billed yet
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'completed')
        .is('billing_status', null)
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSessions(
        (data || []).map(s => ({
          id: s.id,
          name: s.name,
          start_time: s.start_time,
          end_time: s.end_time,
          student_ids: s.student_ids,
          session_length_minutes: s.session_length_minutes,
          selected: false,
        }))
      );
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = (sessionId: string) => {
    setSessions(prev => 
      prev.map(s => s.id === sessionId ? { ...s, selected: !s.selected } : s)
    );
  };

  const selectedSessions = sessions.filter(s => s.selected);
  const totalMinutes = selectedSessions.reduce((sum, s) => sum + s.session_length_minutes, 0);
  const estimatedUnits = Math.ceil(totalMinutes / 15);

  const handleGenerateClaim = async () => {
    if (!user?.id || selectedSessions.length === 0) {
      toast.error('Please select at least one session');
      return;
    }

    try {
      setLoading(true);

      // Generate claim number
      const claimNumber = `CLM-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(Date.now()).slice(-6)}`;

      // Get date range
      const dates = selectedSessions.map(s => new Date(s.start_time));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // Create the claim (simplified - in production would need more data)
      const { data: claim, error } = await supabase
        .from('billing_claims')
        .insert({
          claim_number: claimNumber,
          student_id: selectedSessions[0].student_ids?.[0] || '',
          payer_id: '', // Would need to select payer
          service_date_from: minDate.toISOString().split('T')[0],
          service_date_to: maxDate.toISOString().split('T')[0],
          total_charges: estimatedUnits * 15, // Placeholder rate
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Mark sessions as billed
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ billing_status: 'billed' })
        .in('id', selectedSessions.map(s => s.id));

      if (updateError) throw updateError;

      toast.success('Claim created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating claim:', error);
      toast.error('Failed to create claim');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Select Sessions</h3>
              <Badge variant="secondary">{selectedSessions.length} selected</Badge>
            </div>
            
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No unbilled sessions available.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sessions.map((session) => (
                  <div 
                    key={session.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleSession(session.id)}
                  >
                    <Checkbox checked={session.selected} />
                    <div className="flex-1">
                      <p className="font-medium">{session.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.start_time).toLocaleString()} • {session.session_length_minutes} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedSessions.length > 0 && (
              <Card>
                <CardContent className="py-3">
                  <div className="flex justify-between text-sm">
                    <span>Total Duration:</span>
                    <span className="font-medium">{totalMinutes} minutes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estimated Units:</span>
                    <span className="font-medium">{estimatedUnits} units</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Review & Generate</h3>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Claim Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sessions:</span>
                  <span>{selectedSessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Duration:</span>
                  <span>{totalMinutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Units:</span>
                  <span>{estimatedUnits}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Estimated Charges:</span>
                  <span>${(estimatedUnits * 15).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
              The claim will be created as a draft. You can review and edit the details before submitting.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Claim</DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2].map((s) => (
            <div 
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            renderStep()
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
          >
            {step > 1 ? (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </>
            ) : 'Cancel'}
          </Button>
          
          {step < 2 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              disabled={selectedSessions.length === 0}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleGenerateClaim} disabled={loading}>
              {loading ? 'Creating...' : 'Generate Claim'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
