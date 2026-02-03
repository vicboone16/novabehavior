import { useState, useEffect, useCallback } from 'react';
import { 
  Check, ChevronRight, Building, FileCheck, ClipboardList, Settings, 
  Loader2, Plus, Trash2, AlertTriangle, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

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
  is_active: boolean;
}

interface ServiceRow {
  id: string;
  serviceName: string;
  cptCode: string;
  unitType: 'units_15min' | 'units_hourly' | 'flat';
  unitsApproved: string;
  rate: string;
  modifier: string;
  placeOfService: string;
}

const STEPS = [
  { id: 1, title: 'Payer', icon: Building },
  { id: 2, title: 'Authorization', icon: FileCheck },
  { id: 3, title: 'Approved Services', icon: ClipboardList },
  { id: 4, title: 'Tracking Rules', icon: Settings },
];

const PAYER_TYPES = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'regional_center', label: 'Regional Center' },
  { value: 'school_district', label: 'School District' },
  { value: 'private', label: 'Private' },
];

const SUBMISSION_METHODS = [
  { value: 'portal', label: 'Portal' },
  { value: 'fax', label: 'Fax' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
];

const UNIT_TYPES = [
  { value: 'units_15min', label: '15-min units' },
  { value: 'units_hourly', label: 'Hourly units' },
  { value: 'flat', label: 'Flat (not unit-based)' },
];

const PLACES_OF_SERVICE = [
  { value: 'home', label: 'Home' },
  { value: 'school', label: 'School' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'telehealth', label: 'Telehealth' },
  { value: 'other', label: 'Other' },
];

const SERVICE_OPTIONS = [
  { value: 'aba_direct', label: 'ABA Direct' },
  { value: 'bcba_supervision', label: 'BCBA Supervision' },
  { value: 'parent_training', label: 'Parent Training' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'group_therapy', label: 'Group Therapy' },
];

const AUTH_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'expired', label: 'Expired' },
  { value: 'exhausted', label: 'Exhausted' },
];

function createEmptyService(): ServiceRow {
  return {
    id: crypto.randomUUID(),
    serviceName: '',
    cptCode: '',
    unitType: 'units_15min',
    unitsApproved: '',
    rate: '',
    modifier: '',
    placeOfService: '',
  };
}

export function InsuranceSetupWizard({
  studentId,
  open,
  onComplete,
  onCancel,
}: InsuranceSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [stepLoading, setStepLoading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [existingPayers, setExistingPayers] = useState<Payer[]>([]);

  // Step 1: Payer
  const [payerMode, setPayerMode] = useState<'select' | 'create'>('select');
  const [selectedPayerId, setSelectedPayerId] = useState<string>('');
  const [newPayerName, setNewPayerName] = useState('');
  const [newPayerType, setNewPayerType] = useState<string>('');
  const [newPayerPhone, setNewPayerPhone] = useState('');
  const [newPayerFax, setNewPayerFax] = useState('');
  const [newPayerEmail, setNewPayerEmail] = useState('');
  const [newPayerAddress, setNewPayerAddress] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState('');
  const [memberId, setMemberId] = useState('');
  const [groupNumber, setGroupNumber] = useState('');

  // Step 2: Authorization
  const [authNumber, setAuthNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [authStatus, setAuthStatus] = useState('active');
  const [authNotes, setAuthNotes] = useState('');

  // Step 3: Services
  const [services, setServices] = useState<ServiceRow[]>([createEmptyService()]);

  // Step 4: Tracking rules
  const [isDefaultAuth, setIsDefaultAuth] = useState(true);
  const [matchingRule, setMatchingRule] = useState('service_first');
  const [alertExpiring30, setAlertExpiring30] = useState(true);
  const [alertLowUnits, setAlertLowUnits] = useState(true);
  const [alertNoMatch, setAlertNoMatch] = useState(false);
  const [alertExhausted, setAlertExhausted] = useState(false);
  const [warningBehavior, setWarningBehavior] = useState('allow_mark_review');

  // Computed
  const selectedPayer = existingPayers.find(p => p.id === selectedPayerId);
  const endDateWarning = endDate && differenceInDays(parseISO(endDate), new Date()) <= 7;

  // Fetch payers
  const fetchPayers = useCallback(async () => {
    setStepLoading(true);
    setStepError(null);
    try {
      const { data, error } = await supabase
        .from('payers')
        .select('id, name, payer_type, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setExistingPayers(data || []);
      if (!data || data.length === 0) {
        setPayerMode('create');
      }
    } catch (err: any) {
      setStepError('Failed to load payers. Please try again.');
      console.error(err);
    } finally {
      setStepLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPayers();
    }
  }, [open, fetchPayers]);

  // Validation
  const validateStep1 = (): boolean => {
    if (payerMode === 'select') {
      if (!selectedPayerId) {
        toast.error('Please select a payer or create a new one to continue.');
        return false;
      }
      if (selectedPayer && !selectedPayer.is_active) {
        toast.error('This payer is inactive. Please select an active payer or reactivate it.');
        return false;
      }
    } else {
      if (!newPayerName.trim()) {
        toast.error('Please enter a payer name.');
        return false;
      }
      if (!newPayerType) {
        toast.error('Please select a payer type.');
        return false;
      }
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!authNumber.trim()) {
      toast.error('Please enter a valid authorization number and date range.');
      return false;
    }
    if (!startDate || !endDate) {
      toast.error('Please enter a valid authorization number and date range.');
      return false;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('Start Date must be before End Date.');
      return false;
    }
    if (authStatus === 'active' && new Date(endDate) < new Date()) {
      toast.warning('End date is in the past for an Active authorization. Consider marking as Expired.');
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const validServices = services.filter(s => s.serviceName);
    if (validServices.length === 0) {
      toast.error('Please add at least one authorized service with units.');
      return false;
    }
    for (const service of validServices) {
      if (service.unitType !== 'flat' && (!service.unitsApproved || parseInt(service.unitsApproved) <= 0)) {
        toast.error(`Please enter approved units for ${service.serviceName || 'service'}.`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      completeSetup();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  // Service row management
  const addServiceRow = () => {
    setServices([...services, createEmptyService()]);
  };

  const removeServiceRow = (id: string) => {
    if (services.length > 1) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const updateService = (id: string, field: keyof ServiceRow, value: string) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const completeSetup = async () => {
    setIsLoading(true);
    try {
      let payerId = selectedPayerId;

      // Create payer if needed
      if (payerMode === 'create') {
        const { data: newPayer, error: payerError } = await supabase
          .from('payers')
          .insert({
            name: newPayerName.trim(),
            payer_type: newPayerType || null,
            phone: newPayerPhone || null,
            fax: newPayerFax || null,
            email: newPayerEmail || null,
            address: newPayerAddress || null,
            billing_notes: submissionMethod ? `Submission: ${submissionMethod}` : null,
            is_active: true,
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

      // Create authorization
      const { data: authData, error: authError } = await supabase
        .from('authorizations')
        .insert({
          student_id: studentId,
          payer_id: payerId,
          auth_number: authNumber.trim(),
          start_date: startDate,
          end_date: endDate,
          status: authStatus,
          notes: authNotes || null,
          is_default: isDefaultAuth,
          matching_rule: matchingRule,
          warning_behavior: warningBehavior,
          alert_expiring_30_days: alertExpiring30,
          alert_low_units_20: alertLowUnits,
          alert_no_match: alertNoMatch,
          alert_exhausted: alertExhausted,
          units_approved: services.reduce((sum, s) => sum + (parseInt(s.unitsApproved) || 0), 0),
          units_used: 0,
          service_codes: services.filter(s => s.cptCode).map(s => s.cptCode),
        })
        .select('id')
        .single();

      if (authError) throw authError;

      // Create authorized services
      const validServices = services.filter(s => s.serviceName);
      if (validServices.length > 0) {
        const { error: servicesError } = await supabase
          .from('authorized_services')
          .insert(validServices.map(s => ({
            authorization_id: authData.id,
            student_id: studentId,
            service_name: s.serviceName,
            cpt_code: s.cptCode || null,
            unit_type: s.unitType,
            units_approved: s.unitType === 'flat' ? 0 : (parseInt(s.unitsApproved) || 0),
            units_used: 0,
            rate: s.rate ? parseFloat(s.rate) : null,
            modifier: s.modifier || null,
            place_of_service: s.placeOfService || null,
            is_active: true,
          })));

        if (servicesError) throw servicesError;
      }

      // Update student funding mode and tracking state
      const { error: studentError } = await supabase
        .from('students')
        .update({
          funding_mode: 'insurance',
          insurance_tracking_state: 'active',
        })
        .eq('id', studentId);

      if (studentError) throw studentError;

      toast.success('Insurance tracking enabled. Authorizations are ready.');
      onComplete();
    } catch (error: any) {
      console.error('Error completing insurance setup:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Summary data for step 4
  const summaryPayer = payerMode === 'select' ? selectedPayer?.name : newPayerName;
  const summaryServiceCount = services.filter(s => s.serviceName).length;
  const alertsEnabled = [
    alertExpiring30 && 'Expiring within 30 days',
    alertLowUnits && 'Low units (≤20%)',
    alertNoMatch && 'No auth match',
    alertExhausted && 'Units exhausted',
  ].filter(Boolean);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleCancelClick()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Enable Insurance Tracking</DialogTitle>
            <DialogDescription>
              Set up payer and authorization details so sessions can track units automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-between py-4 px-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                      currentStep > step.id
                        ? "bg-primary border-primary text-primary-foreground"
                        : currentStep === step.id
                        ? "border-primary text-primary bg-primary/10"
                        : "border-muted text-muted-foreground"
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs mt-1 text-center max-w-[70px]",
                    currentStep === step.id ? "font-medium" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5 mx-1",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="py-4 min-h-[300px]">
            {stepLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-10 w-1/2" />
              </div>
            ) : stepError ? (
              <div className="flex flex-col items-center justify-center py-8">
                <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
                <p className="text-destructive mb-4">{stepError}</p>
                <Button onClick={fetchPayers}>Retry</Button>
              </div>
            ) : (
              <>
                {/* STEP 1: PAYER */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Step 1: Payer</h3>
                      <p className="text-sm text-muted-foreground">
                        Select an existing payer or create a new one.
                      </p>
                    </div>

                    {existingPayers.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={payerMode === 'select' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPayerMode('select')}
                        >
                          Select Existing
                        </Button>
                        <Button
                          type="button"
                          variant={payerMode === 'create' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPayerMode('create')}
                        >
                          Create New
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
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <p className="text-sm font-medium">Create New Payer</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2 sm:col-span-1">
                            <Label>Payer Name *</Label>
                            <Input
                              value={newPayerName}
                              onChange={(e) => setNewPayerName(e.target.value)}
                              placeholder="e.g., Blue Cross Blue Shield"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <Label>Payer Type *</Label>
                            <Select value={newPayerType} onValueChange={setNewPayerType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type..." />
                              </SelectTrigger>
                              <SelectContent>
                                {PAYER_TYPES.map(t => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Phone</Label>
                            <Input
                              value={newPayerPhone}
                              onChange={(e) => setNewPayerPhone(e.target.value)}
                              placeholder="(555) 123-4567"
                            />
                          </div>
                          <div>
                            <Label>Fax</Label>
                            <Input
                              value={newPayerFax}
                              onChange={(e) => setNewPayerFax(e.target.value)}
                              placeholder="(555) 123-4568"
                            />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={newPayerEmail}
                              onChange={(e) => setNewPayerEmail(e.target.value)}
                              placeholder="claims@payer.com"
                            />
                          </div>
                          <div>
                            <Label>Authorization Submission Method</Label>
                            <Select value={submissionMethod} onValueChange={setSubmissionMethod}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {SUBMISSION_METHODS.map(m => (
                                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Label>Billing Address</Label>
                            <Textarea
                              value={newPayerAddress}
                              onChange={(e) => setNewPayerAddress(e.target.value)}
                              placeholder="Enter billing address..."
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t space-y-3">
                      <p className="text-sm text-muted-foreground">Client Insurance Info (Optional)</p>
                      <div className="grid grid-cols-2 gap-4">
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
                  </div>
                )}

                {/* STEP 2: AUTHORIZATION */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Step 2: Authorization</h3>
                      <p className="text-sm text-muted-foreground">
                        Enter the authorization details exactly as provided by the payer.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Authorization Number *</Label>
                        <Input
                          value={authNumber}
                          onChange={(e) => setAuthNumber(e.target.value)}
                          placeholder="e.g., AUTH-123456"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Authorization Start Date *</Label>
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Authorization End Date *</Label>
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Authorization Status</Label>
                        <Select value={authStatus} onValueChange={setAuthStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AUTH_STATUSES.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={authNotes}
                          onChange={(e) => setAuthNotes(e.target.value)}
                          placeholder="Any notes about this authorization..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: APPROVED SERVICES */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Step 3: Approved Services</h3>
                      <p className="text-sm text-muted-foreground">
                        Add each authorized service so sessions can deduct units correctly.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {services.map((service, index) => (
                        <Card key={service.id} className="relative">
                          <CardContent className="pt-4">
                            {services.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7"
                                onClick={() => removeServiceRow(service.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">Service *</Label>
                                <Select 
                                  value={service.serviceName} 
                                  onValueChange={(v) => updateService(service.id, 'serviceName', v)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SERVICE_OPTIONS.map(s => (
                                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">CPT / Billing Code</Label>
                                <Input
                                  className="h-9"
                                  value={service.cptCode}
                                  onChange={(e) => updateService(service.id, 'cptCode', e.target.value)}
                                  placeholder="97153"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Unit Type *</Label>
                                <Select 
                                  value={service.unitType} 
                                  onValueChange={(v) => updateService(service.id, 'unitType', v as any)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {UNIT_TYPES.map(u => (
                                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {service.unitType !== 'flat' && (
                                <div>
                                  <Label className="text-xs">Units Approved *</Label>
                                  <Input
                                    className="h-9"
                                    type="number"
                                    min="1"
                                    value={service.unitsApproved}
                                    onChange={(e) => updateService(service.id, 'unitsApproved', e.target.value)}
                                    placeholder="480"
                                  />
                                </div>
                              )}
                              <div>
                                <Label className="text-xs">Rate</Label>
                                <Input
                                  className="h-9"
                                  type="number"
                                  step="0.01"
                                  value={service.rate}
                                  onChange={(e) => updateService(service.id, 'rate', e.target.value)}
                                  placeholder="25.00"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Modifier(s)</Label>
                                <Input
                                  className="h-9"
                                  value={service.modifier}
                                  onChange={(e) => updateService(service.id, 'modifier', e.target.value)}
                                  placeholder="HO, 59"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Place of Service</Label>
                                <Select 
                                  value={service.placeOfService} 
                                  onValueChange={(v) => updateService(service.id, 'placeOfService', v)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PLACES_OF_SERVICE.map(p => (
                                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <Button type="button" variant="outline" onClick={addServiceRow} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Service
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 4: TRACKING RULES */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Step 4: Tracking Rules</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose how sessions will match to this authorization.
                      </p>
                    </div>

                    <div className="space-y-5">
                      {/* Default Auth Toggle */}
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <Label className="font-medium">Default Authorization for Sessions</Label>
                          <p className="text-xs text-muted-foreground">
                            Use this authorization as the default for new sessions
                          </p>
                        </div>
                        <Switch checked={isDefaultAuth} onCheckedChange={setIsDefaultAuth} />
                      </div>

                      {/* Matching Rule */}
                      <div>
                        <Label>Matching Rule *</Label>
                        <RadioGroup value={matchingRule} onValueChange={setMatchingRule} className="mt-2 space-y-2">
                          <div className="flex items-start gap-3 p-3 border rounded-lg">
                            <RadioGroupItem value="service_first" id="service_first" className="mt-1" />
                            <div>
                              <Label htmlFor="service_first" className="font-medium cursor-pointer">
                                Match by Service first (recommended)
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Automatically select the correct service row based on the session's service type.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 border rounded-lg">
                            <RadioGroupItem value="default_auth" id="default_auth" className="mt-1" />
                            <Label htmlFor="default_auth" className="font-medium cursor-pointer">
                              Always use default authorization
                            </Label>
                          </div>
                          <div className="flex items-start gap-3 p-3 border rounded-lg">
                            <RadioGroupItem value="manual" id="manual" className="mt-1" />
                            <Label htmlFor="manual" className="font-medium cursor-pointer">
                              Manual selection per session
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Alerts */}
                      <div>
                        <Label>Alerts</Label>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox id="alert1" checked={alertExpiring30} onCheckedChange={(c) => setAlertExpiring30(!!c)} />
                            <Label htmlFor="alert1" className="font-normal cursor-pointer">
                              Alert when authorization expires within 30 days
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox id="alert2" checked={alertLowUnits} onCheckedChange={(c) => setAlertLowUnits(!!c)} />
                            <Label htmlFor="alert2" className="font-normal cursor-pointer">
                              Alert when units remaining drop below 20%
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox id="alert3" checked={alertNoMatch} onCheckedChange={(c) => setAlertNoMatch(!!c)} />
                            <Label htmlFor="alert3" className="font-normal cursor-pointer">
                              Alert when a session has no matching authorization
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox id="alert4" checked={alertExhausted} onCheckedChange={(c) => setAlertExhausted(!!c)} />
                            <Label htmlFor="alert4" className="font-normal cursor-pointer">
                              Alert when units are exhausted
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* Warning Behavior */}
                      <div>
                        <Label>Warning Behavior *</Label>
                        <Select value={warningBehavior} onValueChange={setWarningBehavior}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="allow_mark_review">
                              Allow session but mark Needs Review (recommended)
                            </SelectItem>
                            <SelectItem value="block">
                              Block session creation until matched
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Summary Card */}
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <p className="text-sm font-medium mb-2">Review Summary</p>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Payer:</span> {summaryPayer || '—'}</p>
                            <p><span className="text-muted-foreground">Authorization #:</span> {authNumber || '—'}</p>
                            <p><span className="text-muted-foreground">Dates:</span> {startDate && endDate ? `${format(parseISO(startDate), 'MMM d, yyyy')} – ${format(parseISO(endDate), 'MMM d, yyyy')}` : '—'}</p>
                            <p><span className="text-muted-foreground">Services:</span> {summaryServiceCount} service(s) added</p>
                            <p><span className="text-muted-foreground">Alerts enabled:</span> {alertsEnabled.length > 0 ? alertsEnabled.join(', ') : 'None'}</p>
                          </div>
                          {endDateWarning && (
                            <Alert variant="destructive" className="mt-3">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                Authorization ends soon. Consider requesting an extension.
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelClick} disabled={isLoading}>
              Cancel
            </Button>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                Back
              </Button>
            )}
            <Button onClick={handleNext} disabled={isLoading || stepLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : currentStep === 4 ? (
                'Finish & Enable Insurance'
              ) : (
                'Next'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel insurance setup?"
        description="No changes will be saved and the client will remain School-Based."
        confirmLabel="Cancel Setup"
        cancelLabel="Continue Setup"
        onConfirm={confirmCancel}
        variant="destructive"
      />
    </>
  );
}
