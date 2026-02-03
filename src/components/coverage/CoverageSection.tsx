import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, ShieldCheck, ShieldAlert, ShieldX, 
  Plus, RefreshCw, Calendar, Clock, AlertTriangle,
  FileCheck, Building, School
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { useCoverage } from '@/hooks/useCoverage';
import {
  COVERAGE_MODES,
  COVERAGE_STATUSES,
  VERIFICATION_SOURCES,
  CPT_CODES_ABA,
  SCHOOL_SERVICE_LINES,
  type CoverageMode,
} from '@/types/coverage';

interface CoverageSectionProps {
  clientId: string;
}

export function CoverageSection({ clientId }: CoverageSectionProps) {
  const {
    loading,
    orgSettings,
    payerPlans,
    insuranceRules,
    schoolRules,
    coverageChecks,
    effectiveMode,
    refetch,
    runCoverageCheck,
    updateOrgMode,
  } = useCoverage(clientId);

  const [isAddInsuranceRuleOpen, setIsAddInsuranceRuleOpen] = useState(false);
  const [isAddSchoolRuleOpen, setIsAddSchoolRuleOpen] = useState(false);
  const [isAddPayerPlanOpen, setIsAddPayerPlanOpen] = useState(false);
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  const [insuranceFormData, setInsuranceFormData] = useState({
    payer_plan_id: '',
    cpt_code: '',
    coverage_status: 'unknown',
    verification_source: '',
    coverage_notes: '',
  });

  const [schoolFormData, setSchoolFormData] = useState({
    service_line: '',
    source: 'IEP',
    allowed_settings: [] as string[],
    notes: '',
  });

  const [payerFormData, setPayerFormData] = useState({
    payer_name: '',
    plan_name: '',
    member_id: '',
    group_number: '',
    effective_start_date: '',
    effective_end_date: '',
    is_primary: true,
  });

  const handleRunCheck = async () => {
    setIsRunningCheck(true);
    await runCoverageCheck('manual');
    setIsRunningCheck(false);
  };

  const handleAddInsuranceRule = async () => {
    if (!insuranceFormData.cpt_code) {
      toast.error('CPT code is required');
      return;
    }

    try {
      const cadenceDays = orgSettings?.default_verification_cadence_days || 30;
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + cadenceDays);

      const { error } = await supabase.from('coverage_rules_insurance').insert({
        client_id: clientId,
        payer_plan_id: insuranceFormData.payer_plan_id || null,
        cpt_code: insuranceFormData.cpt_code,
        coverage_status: insuranceFormData.coverage_status,
        verification_source: insuranceFormData.verification_source || null,
        coverage_notes: insuranceFormData.coverage_notes || null,
        last_verified_at: new Date().toISOString(),
        next_verification_due_at: nextDue.toISOString(),
        is_active: true,
      });

      if (error) throw error;
      toast.success('Insurance coverage rule added');
      setIsAddInsuranceRuleOpen(false);
      setInsuranceFormData({ payer_plan_id: '', cpt_code: '', coverage_status: 'unknown', verification_source: '', coverage_notes: '' });
      refetch();
    } catch (error) {
      console.error('Error adding rule:', error);
      toast.error('Failed to add coverage rule');
    }
  };

  const handleAddSchoolRule = async () => {
    if (!schoolFormData.service_line) {
      toast.error('Service line is required');
      return;
    }

    try {
      const cadenceDays = orgSettings?.default_verification_cadence_days || 30;
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + cadenceDays);

      const { error } = await supabase.from('coverage_rules_school').insert({
        client_id: clientId,
        service_line: schoolFormData.service_line,
        source: schoolFormData.source,
        allowed_settings: schoolFormData.allowed_settings,
        notes: schoolFormData.notes || null,
        status: 'active',
        last_verified_at: new Date().toISOString(),
        next_verification_due_at: nextDue.toISOString(),
        is_active: true,
      });

      if (error) throw error;
      toast.success('School coverage rule added');
      setIsAddSchoolRuleOpen(false);
      setSchoolFormData({ service_line: '', source: 'IEP', allowed_settings: [], notes: '' });
      refetch();
    } catch (error) {
      toast.error('Failed to add coverage rule');
    }
  };

  const handleAddPayerPlan = async () => {
    if (!payerFormData.payer_name || !payerFormData.effective_start_date) {
      toast.error('Payer name and effective date are required');
      return;
    }

    try {
      const { error } = await supabase.from('payer_plans').insert({
        client_id: clientId,
        ...payerFormData,
        is_active: true,
      });

      if (error) throw error;
      toast.success('Payer plan added');
      setIsAddPayerPlanOpen(false);
      setPayerFormData({ payer_name: '', plan_name: '', member_id: '', group_number: '', effective_start_date: '', effective_end_date: '', is_primary: true });
      refetch();
    } catch (error) {
      toast.error('Failed to add payer plan');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = COVERAGE_STATUSES.find(s => s.value === status);
    return <Badge className={config?.color || 'bg-muted'}>{config?.label || status}</Badge>;
  };

  const getModeIcon = (mode: CoverageMode) => {
    switch (mode) {
      case 'INSURANCE_STRICT':
        return <Building className="h-4 w-4" />;
      case 'SCHOOL_LIGHT':
        return <School className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getVerificationStatus = (nextDue: string | null) => {
    if (!nextDue) return { label: 'Never verified', color: 'text-muted-foreground' };
    const days = differenceInDays(new Date(nextDue), new Date());
    if (days < 0) return { label: 'Overdue', color: 'text-red-600' };
    if (days <= 7) return { label: `Due in ${days} days`, color: 'text-orange-600' };
    if (days <= 14) return { label: `Due in ${days} days`, color: 'text-yellow-600' };
    return { label: `Due in ${days} days`, color: 'text-green-600' };
  };

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle & Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getModeIcon(effectiveMode)}
              <div>
                <CardTitle className="text-base">Coverage Mode</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {COVERAGE_MODES.find(m => m.value === effectiveMode)?.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={effectiveMode}
                onValueChange={(value: CoverageMode) => updateOrgMode(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COVERAGE_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleRunCheck} disabled={isRunningCheck}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRunningCheck ? 'animate-spin' : ''}`} />
                Run Check
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Mode-Specific Content */}
      <Tabs defaultValue={effectiveMode === 'INSURANCE_STRICT' ? 'insurance' : 'school'}>
        <TabsList>
          {(effectiveMode === 'INSURANCE_STRICT' || effectiveMode === 'HYBRID') && (
            <TabsTrigger value="insurance">
              <Building className="h-4 w-4 mr-2" />
              Insurance Rules ({insuranceRules.length})
            </TabsTrigger>
          )}
          {(effectiveMode === 'SCHOOL_LIGHT' || effectiveMode === 'HYBRID') && (
            <TabsTrigger value="school">
              <School className="h-4 w-4 mr-2" />
              School Rules ({schoolRules.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="plans">
            <FileCheck className="h-4 w-4 mr-2" />
            Payer Plans ({payerPlans.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            History ({coverageChecks.length})
          </TabsTrigger>
        </TabsList>

        {/* Insurance Rules Tab */}
        <TabsContent value="insurance" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Insurance Coverage Rules</h4>
            <Dialog open={isAddInsuranceRuleOpen} onOpenChange={setIsAddInsuranceRuleOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Insurance Coverage Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payer Plan</Label>
                    <Select
                      value={insuranceFormData.payer_plan_id}
                      onValueChange={(v) => setInsuranceFormData({ ...insuranceFormData, payer_plan_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payer plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {payerPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.payer_name} - {plan.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>CPT Code *</Label>
                    <Select
                      value={insuranceFormData.cpt_code}
                      onValueChange={(v) => setInsuranceFormData({ ...insuranceFormData, cpt_code: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select CPT code" />
                      </SelectTrigger>
                      <SelectContent>
                        {CPT_CODES_ABA.map((cpt) => (
                          <SelectItem key={cpt.code} value={cpt.code}>
                            {cpt.code} - {cpt.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Coverage Status</Label>
                    <Select
                      value={insuranceFormData.coverage_status}
                      onValueChange={(v) => setInsuranceFormData({ ...insuranceFormData, coverage_status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COVERAGE_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Verification Source</Label>
                    <Select
                      value={insuranceFormData.verification_source}
                      onValueChange={(v) => setInsuranceFormData({ ...insuranceFormData, verification_source: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How was this verified?" />
                      </SelectTrigger>
                      <SelectContent>
                        {VERIFICATION_SOURCES.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={insuranceFormData.coverage_notes}
                      onChange={(e) => setInsuranceFormData({ ...insuranceFormData, coverage_notes: e.target.value })}
                      placeholder="Optional notes..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddInsuranceRuleOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddInsuranceRule}>Add Rule</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {insuranceRules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No insurance coverage rules defined</p>
                <p className="text-sm">Add coverage rules to enable session billing validation</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {insuranceRules.map((rule) => {
                const verificationStatus = getVerificationStatus(rule.next_verification_due_at);
                return (
                  <Card key={rule.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{rule.cpt_code}</span>
                              {getStatusBadge(rule.coverage_status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {CPT_CODES_ABA.find(c => c.code === rule.cpt_code)?.description || 'ABA Service'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm ${verificationStatus.color}`}>
                            {verificationStatus.label}
                          </span>
                          {rule.last_verified_at && (
                            <p className="text-xs text-muted-foreground">
                              Last verified: {format(new Date(rule.last_verified_at), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* School Rules Tab */}
        <TabsContent value="school" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">School Service Line Rules</h4>
            <Dialog open={isAddSchoolRuleOpen} onOpenChange={setIsAddSchoolRuleOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add School Coverage Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Service Line *</Label>
                    <Select
                      value={schoolFormData.service_line}
                      onValueChange={(v) => setSchoolFormData({ ...schoolFormData, service_line: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service line" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHOOL_SERVICE_LINES.map((line) => (
                          <SelectItem key={line} value={line}>{line}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={schoolFormData.source}
                      onValueChange={(v) => setSchoolFormData({ ...schoolFormData, source: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IEP">IEP</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="site_policy">Site Policy</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={schoolFormData.notes}
                      onChange={(e) => setSchoolFormData({ ...schoolFormData, notes: e.target.value })}
                      placeholder="Optional notes..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddSchoolRuleOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddSchoolRule}>Add Rule</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {schoolRules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <School className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No school service line rules defined</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {schoolRules.map((rule) => {
                const verificationStatus = getVerificationStatus(rule.next_verification_due_at);
                return (
                  <Card key={rule.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <School className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{rule.service_line}</span>
                              <Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>
                                {rule.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Source: {rule.source}</p>
                          </div>
                        </div>
                        <span className={`text-sm ${verificationStatus.color}`}>
                          {verificationStatus.label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Payer Plans Tab */}
        <TabsContent value="plans" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Payer Plans</h4>
            <Dialog open={isAddPayerPlanOpen} onOpenChange={setIsAddPayerPlanOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Payer Plan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payer Name *</Label>
                    <Input
                      value={payerFormData.payer_name}
                      onChange={(e) => setPayerFormData({ ...payerFormData, payer_name: e.target.value })}
                      placeholder="e.g., Blue Cross Blue Shield"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plan Name</Label>
                    <Input
                      value={payerFormData.plan_name}
                      onChange={(e) => setPayerFormData({ ...payerFormData, plan_name: e.target.value })}
                      placeholder="e.g., PPO"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Member ID</Label>
                      <Input
                        value={payerFormData.member_id}
                        onChange={(e) => setPayerFormData({ ...payerFormData, member_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Group Number</Label>
                      <Input
                        value={payerFormData.group_number}
                        onChange={(e) => setPayerFormData({ ...payerFormData, group_number: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Effective Start *</Label>
                      <Input
                        type="date"
                        value={payerFormData.effective_start_date}
                        onChange={(e) => setPayerFormData({ ...payerFormData, effective_start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Effective End</Label>
                      <Input
                        type="date"
                        value={payerFormData.effective_end_date}
                        onChange={(e) => setPayerFormData({ ...payerFormData, effective_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={payerFormData.is_primary}
                      onCheckedChange={(c) => setPayerFormData({ ...payerFormData, is_primary: c })}
                    />
                    <Label>Primary Insurance</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddPayerPlanOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddPayerPlan}>Add Plan</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {payerPlans.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payer plans configured</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {payerPlans.map((plan) => (
                <Card key={plan.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{plan.payer_name}</span>
                          {plan.plan_name && <span className="text-muted-foreground">- {plan.plan_name}</span>}
                          {plan.is_primary && <Badge>Primary</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Effective: {format(new Date(plan.effective_start_date), 'MMM d, yyyy')}
                          {plan.effective_end_date && ` - ${format(new Date(plan.effective_end_date), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {coverageChecks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No coverage checks performed yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {coverageChecks.map((check) => (
                <Card key={check.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {check.result_status === 'pass' ? (
                          <ShieldCheck className="h-5 w-5 text-green-500" />
                        ) : check.result_status === 'warn' ? (
                          <ShieldAlert className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <ShieldX className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium capitalize">{check.trigger_reason.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">{check.summary}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {format(new Date(check.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
