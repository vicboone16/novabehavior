import { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, ScrollText, Shield, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentContractAssignments, useContractRates } from '@/hooks/useContractRates';
import { useAllConfiguredPayers } from '@/hooks/usePayerDirectory';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  CONTRACT_TYPE_LABELS, 
  FUNDING_SOURCE_LABELS,
  type FundingSource 
} from '@/types/contractRates';

interface StudentPayer {
  id: string;
  student_id: string;
  payer_id: string;
  member_id?: string;
  group_number?: string;
  is_primary: boolean;
  is_active: boolean;
  effective_date?: string;
  termination_date?: string;
  billing_order: number;
  created_at: string;
  payer?: {
    id: string;
    name: string;
    payer_type: string;
    payer_id?: string;
  };
}

const BILLING_ORDER_LABELS: Record<number, string> = {
  1: 'Primary',
  2: 'Secondary',
  3: 'Tertiary',
};

interface StudentPayerAssignmentsProps {
  studentId: string;
  studentName: string;
}

export function StudentPayerAssignments({ studentId, studentName }: StudentPayerAssignmentsProps) {
  const { user } = useAuth();
  const { assignments: contractAssignments, loading: contractsLoading, assignContract, removeAssignment } = useStudentContractAssignments(studentId);
  const { contracts } = useContractRates();
  const { payers: configuredPayers } = useAllConfiguredPayers();
  
  const [insurancePayers, setInsurancePayers] = useState<StudentPayer[]>([]);
  const [loadingPayers, setLoadingPayers] = useState(true);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<'insurance' | 'contract'>('insurance');
  
  // Insurance form state
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [billingOrder, setBillingOrder] = useState<number>(1);
  const [effectiveDate, setEffectiveDate] = useState('');
  
  // Contract form state
  const [selectedContractId, setSelectedContractId] = useState('');
  const [fundingSource, setFundingSource] = useState<FundingSource>('district_funded');
  const [authorizedHours, setAuthorizedHours] = useState('');
  const [contractStartDate, setContractStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Load student's insurance payers
  useEffect(() => {
    loadInsurancePayers();
  }, [studentId]);

  const loadInsurancePayers = async () => {
    try {
      const { data, error } = await supabase
        .from('student_payers')
        .select(`
          *,
          payer:payers(id, name, payer_type, payer_id)
        `)
        .eq('student_id', studentId)
        .order('billing_order', { ascending: true });

      if (error) throw error;
      
      // Map the data to our interface
      const mappedData: StudentPayer[] = (data || []).map(row => ({
        id: row.id,
        student_id: row.student_id,
        payer_id: row.payer_id,
        member_id: row.member_id || undefined,
        group_number: row.group_number || undefined,
        is_primary: row.is_primary,
        is_active: row.is_active,
        effective_date: row.effective_date || undefined,
        termination_date: row.termination_date || undefined,
        billing_order: row.billing_order || 1,
        created_at: row.created_at,
        payer: row.payer ? {
          id: row.payer.id,
          name: row.payer.name,
          payer_type: row.payer.payer_type,
          payer_id: row.payer.payer_id,
        } : undefined,
      }));
      
      setInsurancePayers(mappedData);
    } catch (err) {
      console.error('Error loading payers:', err);
    } finally {
      setLoadingPayers(false);
    }
  };

  const handleAddInsurance = async () => {
    if (!selectedPayerId || !user) return;

    try {
      // Determine next billing order if not explicitly set
      const nextOrder = billingOrder || (activePayers.length + 1);

      const { error } = await supabase.from('student_payers').insert({
        student_id: studentId,
        payer_id: selectedPayerId,
        member_id: memberId || null,
        group_number: groupNumber || null,
        is_primary: nextOrder === 1,
        billing_order: nextOrder,
        is_active: true,
        effective_date: effectiveDate || null,
        created_by: user.id,
      });

      if (error) throw error;
      
      toast.success(`${BILLING_ORDER_LABELS[nextOrder] || `#${nextOrder}`} insurance added`);
      resetForm();
      setShowAddDialog(false);
      loadInsurancePayers();
    } catch (err: any) {
      console.error('Error adding payer:', err);
      if (err.code === '23505') {
        toast.error('A payer with this billing order already exists');
      } else {
        toast.error('Failed to add insurance payer');
      }
    }
  };

  const handleAddContract = async () => {
    if (!selectedContractId) return;

    const success = await assignContract({
      student_id: studentId,
      contract_id: selectedContractId,
      start_date: contractStartDate,
      funding_source: fundingSource,
      authorized_hours_per_week: authorizedHours ? parseFloat(authorizedHours) : undefined,
      is_active: true,
    });

    if (success) {
      resetForm();
      setShowAddDialog(false);
    }
  };

  const handleRemoveInsurance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('student_payers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Insurance payer removed');
      loadInsurancePayers();
    } catch (err) {
      console.error('Error removing payer:', err);
      toast.error('Failed to remove payer');
    }
  };

  const resetForm = () => {
    setSelectedPayerId('');
    setMemberId('');
    setGroupNumber('');
    setBillingOrder(activePayers.length + 1);
    setEffectiveDate('');
    setSelectedContractId('');
    setFundingSource('district_funded');
    setAuthorizedHours('');
    setContractStartDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const activeContractAssignments = contractAssignments.filter(a => a.is_active);
  const activePayers = insurancePayers.filter(p => p.is_active);
  const availableContracts = contracts.filter(c => 
    c.status === 'active' && 
    !activeContractAssignments.some(a => a.contract_id === c.id)
  );
  const availablePayers = configuredPayers.filter(p => 
    p.is_active && 
    !insurancePayers.some(sp => sp.payer_id === p.id)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Payers & Funding Sources
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Payer
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Assign insurance payers and school/district contracts to this client
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Insurance Payers */}
        {activePayers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Insurance Payers
            </h4>
            <div className="space-y-2">
              {activePayers.map((payer) => (
                <div
                  key={payer.id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {payer.billing_order}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{payer.payer?.name}</span>
                        <Badge 
                          variant={payer.billing_order === 1 ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {BILLING_ORDER_LABELS[payer.billing_order] || `#${payer.billing_order}`}
                        </Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        {payer.member_id && <span>Member: {payer.member_id}</span>}
                        {payer.group_number && <span>Group: {payer.group_number}</span>}
                        {payer.effective_date && (
                          <span>Eff: {format(new Date(payer.effective_date), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveInsurance(payer.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contract Assignments */}
        {activeContractAssignments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ScrollText className="w-4 h-4" />
              School/District Contracts
            </h4>
            <div className="space-y-2">
              {activeContractAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <ScrollText className="w-5 h-5 text-accent-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{assignment.contract?.organization_name}</span>
                        {assignment.contract?.contract_type && (
                          <Badge variant="secondary" className="text-xs">
                            {CONTRACT_TYPE_LABELS[assignment.contract.contract_type]}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        {assignment.funding_source && (
                          <span>{FUNDING_SOURCE_LABELS[assignment.funding_source]}</span>
                        )}
                        {assignment.authorized_hours_per_week && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {assignment.authorized_hours_per_week} hrs/wk
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(assignment.start_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeAssignment(assignment.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {activePayers.length === 0 && activeContractAssignments.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No payers or contracts assigned</p>
            <p className="text-xs mt-1">Add insurance payers or school/district contracts for billing</p>
          </div>
        )}
      </CardContent>

      {/* Add Payer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payer to {studentName}</DialogTitle>
          </DialogHeader>

          <Tabs value={addType} onValueChange={(v) => setAddType(v as 'insurance' | 'contract')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="insurance" className="gap-2">
                <Building2 className="w-4 h-4" />
                Insurance
              </TabsTrigger>
              <TabsTrigger value="contract" className="gap-2">
                <ScrollText className="w-4 h-4" />
                Contract
              </TabsTrigger>
            </TabsList>

            <TabsContent value="insurance" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Payer</Label>
                <Select value={selectedPayerId} onValueChange={setSelectedPayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose insurance payer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePayers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No available payers. Configure payers in Billing → Payer Config first.
                      </div>
                    ) : (
                      availablePayers.map((payer) => (
                        <SelectItem key={payer.id} value={payer.id}>
                          {payer.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Member ID</Label>
                  <Input
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="Member ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Group Number</Label>
                  <Input
                    value={groupNumber}
                    onChange={(e) => setGroupNumber(e.target.value)}
                    placeholder="Group #"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Billing Order</Label>
                <Select 
                  value={billingOrder.toString()} 
                  onValueChange={(v) => setBillingOrder(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Primary (billed first)</SelectItem>
                    <SelectItem value="2">Secondary (billed after primary)</SelectItem>
                    <SelectItem value="3">Tertiary</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Primary insurance is billed first. Secondary is billed for remaining balance.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="contract" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Contract</Label>
                <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose contract..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContracts.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No available contracts. Create contracts in Billing → Contracts first.
                      </div>
                    ) : (
                      availableContracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.organization_name} ({CONTRACT_TYPE_LABELS[contract.contract_type]})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Funding Source</Label>
                <Select value={fundingSource} onValueChange={(v) => setFundingSource(v as FundingSource)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FUNDING_SOURCE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={contractStartDate}
                    onChange={(e) => setContractStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Authorized Hrs/Wk</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={authorizedHours}
                    onChange={(e) => setAuthorizedHours(e.target.value)}
                    placeholder="e.g., 10"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addType === 'insurance' ? handleAddInsurance : handleAddContract}
              disabled={addType === 'insurance' ? !selectedPayerId : !selectedContractId}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add {addType === 'insurance' ? 'Insurance' : 'Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
