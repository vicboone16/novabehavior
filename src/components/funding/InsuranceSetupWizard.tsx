import { useState, useEffect } from 'react';
import { Check, ChevronRight, Building, FileCheck, ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface InsuranceSetupWizardProps {
  studentId: string;
  open: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

interface Payer {
  id: string;
  name: string;
  payer_type: string | null;
}

const STEPS = [
  { id: 1, title: 'Add/Select Payer', icon: Building },
  { id: 2, title: 'Add Authorization', icon: FileCheck },
  { id: 3, title: 'Confirm Services', icon: ClipboardList },
];

const SERVICE_CODES = [
  { code: '97151', description: 'Behavior Assessment' },
  { code: '97152', description: 'Behavior Assessment (by technician)' },
  { code: '97153', description: 'Adaptive Behavior Treatment (ABA)' },
  { code: '97154', description: 'Group Adaptive Behavior Treatment' },
  { code: '97155', description: 'Adaptive Behavior Treatment w/ Protocol Modification' },
  { code: '97156', description: 'Family Adaptive Behavior Treatment Guidance' },
  { code: '97157', description: 'Multiple-Family Group' },
  { code: '97158', description: 'Group Adaptive Behavior Treatment by Protocol Modification' },
];

export function InsuranceSetupWizard({
  studentId,
  open,
  onComplete,
  onCancel,
}: InsuranceSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [existingPayers, setExistingPayers] = useState<Payer[]>([]);

  // Step 1: Payer
  const [payerMode, setPayerMode] = useState<'select' | 'create'>('select');
  const [selectedPayerId, setSelectedPayerId] = useState<string>('');
  const [newPayerName, setNewPayerName] = useState('');
  const [newPayerType, setNewPayerType] = useState<string>('');
  const [memberId, setMemberId] = useState('');
  const [groupNumber, setGroupNumber] = useState('');

  // Step 2: Authorization
  const [authNumber, setAuthNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [unitsApproved, setUnitsApproved] = useState('');
  const [unitType, setUnitType] = useState('15min');
  const [authNotes, setAuthNotes] = useState('');

  // Step 3: Services
  const [selectedServices, setSelectedServices] = useState<string[]>(['97153']);

  // Fetch existing payers
  useEffect(() => {
    async function fetchPayers() {
      const { data } = await supabase
        .from('payers')
        .select('id, name, payer_type')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setExistingPayers(data);
        if (data.length === 0) {
          setPayerMode('create');
        }
      }
    }
    if (open) {
      fetchPayers();
    }
  }, [open]);

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate payer selection/creation
      if (payerMode === 'select' && !selectedPayerId) {
        toast.error('Please select a payer');
        return;
      }
      if (payerMode === 'create' && !newPayerName.trim()) {
        toast.error('Please enter a payer name');
        return;
      }
    }

    if (currentStep === 2) {
      // Validate authorization
      if (!authNumber.trim()) {
        toast.error('Please enter an authorization number');
        return;
      }
      if (!startDate || !endDate) {
        toast.error('Please enter start and end dates');
        return;
      }
      if (!unitsApproved || parseInt(unitsApproved) <= 0) {
        toast.error('Please enter approved units');
        return;
      }
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete setup
      await completeSetup();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeSetup = async () => {
    setIsLoading(true);
    try {
      let payerId = selectedPayerId;

      // Step 1: Create payer if needed
      if (payerMode === 'create') {
        const { data: newPayer, error: payerError } = await supabase
          .from('payers')
          .insert({
            name: newPayerName.trim(),
            payer_type: newPayerType || null,
          })
          .select('id')
          .single();

        if (payerError) throw payerError;
        payerId = newPayer.id;
      }

      // Link payer to student
      const { error: linkError } = await supabase
        .from('client_payers')
        .upsert({
          student_id: studentId,
          payer_id: payerId,
          member_id: memberId || null,
          group_number: groupNumber || null,
          is_primary: true,
          is_active: true,
        }, { onConflict: 'student_id,payer_id' });

      if (linkError) throw linkError;

      // Step 2: Create authorization
      const { error: authError } = await supabase
        .from('authorizations')
        .insert({
          student_id: studentId,
          payer_id: payerId,
          auth_number: authNumber.trim(),
          start_date: startDate,
          end_date: endDate,
          units_approved: parseInt(unitsApproved),
          unit_type: unitType,
          service_codes: selectedServices,
          notes: authNotes || null,
          status: 'active',
        });

      if (authError) throw authError;

      toast.success('Insurance setup complete!');
      onComplete();
    } catch (error) {
      console.error('Error completing insurance setup:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleService = (code: string) => {
    setSelectedServices(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Insurance Mode Setup</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between py-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    currentStep > step.id
                      ? "bg-primary border-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs mt-1 text-center max-w-[80px]">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <ChevronRight className="w-5 h-5 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="py-4 space-y-4">
          {currentStep === 1 && (
            <>
              {existingPayers.length > 0 && (
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={payerMode === 'select' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPayerMode('select')}
                  >
                    Select Existing
                  </Button>
                  <Button
                    variant={payerMode === 'create' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPayerMode('create')}
                  >
                    Add New
                  </Button>
                </div>
              )}

              {payerMode === 'select' && existingPayers.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <Label>Select Payer</Label>
                    <Select value={selectedPayerId} onValueChange={setSelectedPayerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a payer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {existingPayers.map(payer => (
                          <SelectItem key={payer.id} value={payer.id}>
                            {payer.name} {payer.payer_type && `(${payer.payer_type})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label>Payer Name *</Label>
                    <Input
                      value={newPayerName}
                      onChange={(e) => setNewPayerName(e.target.value)}
                      placeholder="e.g., Blue Cross Blue Shield"
                    />
                  </div>
                  <div>
                    <Label>Payer Type</Label>
                    <Select value={newPayerType} onValueChange={setNewPayerType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medicaid">Medicaid</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-3 border-t">
                <p className="text-sm text-muted-foreground">Client Insurance Info (Optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Member ID</Label>
                    <Input
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      placeholder="Member ID"
                    />
                  </div>
                  <div>
                    <Label>Group #</Label>
                    <Input
                      value={groupNumber}
                      onChange={(e) => setGroupNumber(e.target.value)}
                      placeholder="Group Number"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Authorization Number *</Label>
                <Input
                  value={authNumber}
                  onChange={(e) => setAuthNumber(e.target.value)}
                  placeholder="e.g., AUTH-123456"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Units Approved *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={unitsApproved}
                    onChange={(e) => setUnitsApproved(e.target.value)}
                    placeholder="e.g., 480"
                  />
                </div>
                <div>
                  <Label>Unit Type</Label>
                  <Select value={unitType} onValueChange={setUnitType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15min">15-minute units</SelectItem>
                      <SelectItem value="30min">30-minute units</SelectItem>
                      <SelectItem value="1hr">Hourly units</SelectItem>
                      <SelectItem value="session">Per session</SelectItem>
                      <SelectItem value="day">Per day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={authNotes}
                  onChange={(e) => setAuthNotes(e.target.value)}
                  placeholder="Any notes about this authorization..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the service codes to track under this authorization:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {SERVICE_CODES.map(service => (
                  <label
                    key={service.code}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedServices.includes(service.code)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service.code)}
                      onChange={() => toggleService(service.code)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center",
                        selectedServices.includes(service.code)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground"
                      )}
                    >
                      {selectedServices.includes(service.code) && (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <span className="font-mono font-medium">{service.code}</span>
                      <span className="text-muted-foreground ml-2">—</span>
                      <span className="text-sm ml-2">{service.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              Back
            </Button>
          )}
          <Button onClick={handleNext} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : currentStep === 3 ? (
              'Complete Setup'
            ) : (
              'Next'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
