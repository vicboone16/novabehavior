import { useState, useEffect } from 'react';
import {
  Building,
  FileCheck,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Clock,
  Loader2,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Payer {
  id: string;
  name: string;
  payer_type: string | null;
  phone: string | null;
  email: string | null;
}

interface ClientPayer {
  id: string;
  payer_id: string;
  member_id: string | null;
  group_number: string | null;
  is_primary: boolean;
  is_active: boolean;
  payer: Payer;
}

interface Authorization {
  id: string;
  payer_id: string;
  auth_number: string;
  start_date: string;
  end_date: string;
  service_codes: string[] | null;
  units_approved: number;
  units_used: number;
  units_remaining: number;
  unit_type: string | null;
  status: string;
  notes: string | null;
  payer: Payer;
}

interface PayersAuthorizationsTabProps {
  studentId: string;
}

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

export function PayersAuthorizationsTab({ studentId }: PayersAuthorizationsTabProps) {
  const [clientPayers, setClientPayers] = useState<ClientPayer[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [allPayers, setAllPayers] = useState<Payer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payersExpanded, setPayersExpanded] = useState(true);
  const [authsExpanded, setAuthsExpanded] = useState(true);

  // Dialog states
  const [showAddPayer, setShowAddPayer] = useState(false);
  const [showAddAuth, setShowAddAuth] = useState(false);
  const [editingPayer, setEditingPayer] = useState<ClientPayer | null>(null);
  const [editingAuth, setEditingAuth] = useState<Authorization | null>(null);
  const [deletePayerConfirm, setDeletePayerConfirm] = useState<string | null>(null);
  const [deleteAuthConfirm, setDeleteAuthConfirm] = useState<string | null>(null);

  // Form states for payer
  const [payerMode, setPayerMode] = useState<'select' | 'create'>('select');
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [newPayerName, setNewPayerName] = useState('');
  const [newPayerType, setNewPayerType] = useState('');
  const [memberId, setMemberId] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  // Form states for auth
  const [authPayerId, setAuthPayerId] = useState('');
  const [authNumber, setAuthNumber] = useState('');
  const [authStartDate, setAuthStartDate] = useState('');
  const [authEndDate, setAuthEndDate] = useState('');
  const [authUnitsApproved, setAuthUnitsApproved] = useState('');
  const [authUnitType, setAuthUnitType] = useState('15min');
  const [authServiceCodes, setAuthServiceCodes] = useState<string[]>(['97153']);
  const [authNotes, setAuthNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch client payers with payer details
      const { data: cpData } = await supabase
        .from('client_payers')
        .select(`
          id, payer_id, member_id, group_number, is_primary, is_active,
          payer:payers(id, name, payer_type, phone, email)
        `)
        .eq('student_id', studentId)
        .eq('is_active', true);

      // Fetch authorizations with payer details
      const { data: authData } = await supabase
        .from('authorizations')
        .select(`
          id, payer_id, auth_number, start_date, end_date, service_codes,
          units_approved, units_used, units_remaining, unit_type, status, notes,
          payer:payers(id, name, payer_type, phone, email)
        `)
        .eq('student_id', studentId)
        .order('end_date', { ascending: false });

      // Fetch all payers for selection
      const { data: allPayersData } = await supabase
        .from('payers')
        .select('id, name, payer_type, phone, email')
        .eq('is_active', true)
        .order('name');

      if (cpData) {
        setClientPayers(cpData as unknown as ClientPayer[]);
      }
      if (authData) {
        setAuthorizations(authData as unknown as Authorization[]);
      }
      if (allPayersData) {
        setAllPayers(allPayersData);
      }
    } catch (error) {
      console.error('Error fetching payer/auth data:', error);
      toast.error('Failed to load payer data');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPayerForm = () => {
    setPayerMode('select');
    setSelectedPayerId('');
    setNewPayerName('');
    setNewPayerType('');
    setMemberId('');
    setGroupNumber('');
    setIsPrimary(false);
  };

  const resetAuthForm = () => {
    setAuthPayerId('');
    setAuthNumber('');
    setAuthStartDate('');
    setAuthEndDate('');
    setAuthUnitsApproved('');
    setAuthUnitType('15min');
    setAuthServiceCodes(['97153']);
    setAuthNotes('');
  };

  const handleSavePayer = async () => {
    setIsSaving(true);
    try {
      let payerId = selectedPayerId;

      if (payerMode === 'create') {
        if (!newPayerName.trim()) {
          toast.error('Please enter a payer name');
          return;
        }
        const { data: newPayer, error } = await supabase
          .from('payers')
          .insert({ name: newPayerName.trim(), payer_type: newPayerType || null })
          .select('id')
          .single();

        if (error) throw error;
        payerId = newPayer.id;
      }

      if (!payerId) {
        toast.error('Please select a payer');
        return;
      }

      if (editingPayer) {
        // Update existing
        await supabase
          .from('client_payers')
          .update({
            payer_id: payerId,
            member_id: memberId || null,
            group_number: groupNumber || null,
            is_primary: isPrimary,
          })
          .eq('id', editingPayer.id);
      } else {
        // Insert new
        await supabase
          .from('client_payers')
          .insert({
            student_id: studentId,
            payer_id: payerId,
            member_id: memberId || null,
            group_number: groupNumber || null,
            is_primary: isPrimary,
            is_active: true,
          });
      }

      // If setting as primary, unset others
      if (isPrimary) {
        await supabase
          .from('client_payers')
          .update({ is_primary: false })
          .eq('student_id', studentId)
          .neq('payer_id', payerId);
      }

      toast.success(editingPayer ? 'Payer updated' : 'Payer added');
      setShowAddPayer(false);
      setEditingPayer(null);
      resetPayerForm();
      fetchData();
    } catch (error) {
      console.error('Error saving payer:', error);
      toast.error('Failed to save payer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAuth = async () => {
    if (!authPayerId) {
      toast.error('Please select a payer');
      return;
    }
    if (!authNumber.trim()) {
      toast.error('Please enter an authorization number');
      return;
    }
    if (!authStartDate || !authEndDate) {
      toast.error('Please enter dates');
      return;
    }

    setIsSaving(true);
    try {
      const authData = {
        student_id: studentId,
        payer_id: authPayerId,
        auth_number: authNumber.trim(),
        start_date: authStartDate,
        end_date: authEndDate,
        units_approved: parseInt(authUnitsApproved) || 0,
        unit_type: authUnitType,
        service_codes: authServiceCodes,
        notes: authNotes || null,
        status: 'active',
      };

      if (editingAuth) {
        await supabase
          .from('authorizations')
          .update(authData)
          .eq('id', editingAuth.id);
      } else {
        await supabase
          .from('authorizations')
          .insert(authData);
      }

      toast.success(editingAuth ? 'Authorization updated' : 'Authorization added');
      setShowAddAuth(false);
      setEditingAuth(null);
      resetAuthForm();
      fetchData();
    } catch (error) {
      console.error('Error saving authorization:', error);
      toast.error('Failed to save authorization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayer = async () => {
    if (!deletePayerConfirm) return;
    try {
      await supabase
        .from('client_payers')
        .update({ is_active: false })
        .eq('id', deletePayerConfirm);
      toast.success('Payer removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove payer');
    }
    setDeletePayerConfirm(null);
  };

  const handleDeleteAuth = async () => {
    if (!deleteAuthConfirm) return;
    try {
      await supabase
        .from('authorizations')
        .delete()
        .eq('id', deleteAuthConfirm);
      toast.success('Authorization deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete authorization');
    }
    setDeleteAuthConfirm(null);
  };

  const openEditPayer = (cp: ClientPayer) => {
    setEditingPayer(cp);
    setPayerMode('select');
    setSelectedPayerId(cp.payer_id);
    setMemberId(cp.member_id || '');
    setGroupNumber(cp.group_number || '');
    setIsPrimary(cp.is_primary);
    setShowAddPayer(true);
  };

  const openEditAuth = (auth: Authorization) => {
    setEditingAuth(auth);
    setAuthPayerId(auth.payer_id);
    setAuthNumber(auth.auth_number);
    setAuthStartDate(auth.start_date);
    setAuthEndDate(auth.end_date);
    setAuthUnitsApproved(auth.units_approved.toString());
    setAuthUnitType(auth.unit_type || '15min');
    setAuthServiceCodes(auth.service_codes || []);
    setAuthNotes(auth.notes || '');
    setShowAddAuth(true);
  };

  const getAuthStatus = (auth: Authorization) => {
    const today = new Date();
    const endDate = parseISO(auth.end_date);
    const daysLeft = differenceInDays(endDate, today);
    const usagePercent = auth.units_approved > 0 
      ? (auth.units_used / auth.units_approved) * 100 
      : 0;

    if (auth.status === 'exhausted' || usagePercent >= 100) {
      return { label: 'Exhausted', variant: 'destructive' as const, warning: true };
    }
    if (auth.status === 'expired' || daysLeft < 0) {
      return { label: 'Expired', variant: 'destructive' as const, warning: true };
    }
    if (daysLeft <= 30 || usagePercent >= 80) {
      return { label: daysLeft <= 30 ? `${daysLeft} days left` : `${Math.round(usagePercent)}% used`, variant: 'secondary' as const, warning: true };
    }
    return { label: 'Active', variant: 'default' as const, warning: false };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payers Section */}
      <Collapsible open={payersExpanded} onOpenChange={setPayersExpanded}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                {payersExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Building className="w-5 h-5" />
                <CardTitle className="text-lg">Payers</CardTitle>
                <Badge variant="secondary" className="ml-2">{clientPayers.length}</Badge>
              </CollapsibleTrigger>
              <Button size="sm" onClick={() => { resetPayerForm(); setShowAddPayer(true); }}>
                <Plus className="w-4 h-4 mr-1" />
                Add Payer
              </Button>
            </div>
            <CardDescription>Insurance payers linked to this client</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {clientPayers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No payers configured</p>
                  <Button variant="link" className="mt-2" onClick={() => setShowAddPayer(true)}>
                    Add a payer
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientPayers.map(cp => (
                    <div 
                      key={cp.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{cp.payer.name}</span>
                            {cp.is_primary && (
                              <Badge variant="outline" className="text-xs">Primary</Badge>
                            )}
                            {cp.payer.payer_type && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {cp.payer.payer_type}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {cp.member_id && <span>Member: {cp.member_id}</span>}
                            {cp.member_id && cp.group_number && <span> • </span>}
                            {cp.group_number && <span>Group: {cp.group_number}</span>}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditPayer(cp)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeletePayerConfirm(cp.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Authorizations Section */}
      <Collapsible open={authsExpanded} onOpenChange={setAuthsExpanded}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                {authsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FileCheck className="w-5 h-5" />
                <CardTitle className="text-lg">Authorizations</CardTitle>
                <Badge variant="secondary" className="ml-2">{authorizations.length}</Badge>
              </CollapsibleTrigger>
              <Button size="sm" onClick={() => { resetAuthForm(); setShowAddAuth(true); }}>
                <Plus className="w-4 h-4 mr-1" />
                Add Authorization
              </Button>
            </div>
            <CardDescription>Active and past authorizations for services</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {authorizations.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No authorizations configured</p>
                  <Button variant="link" className="mt-2" onClick={() => setShowAddAuth(true)}>
                    Add an authorization
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {authorizations.map(auth => {
                    const status = getAuthStatus(auth);
                    const usagePercent = auth.units_approved > 0 
                      ? Math.min((auth.units_used / auth.units_approved) * 100, 100)
                      : 0;

                    return (
                      <div 
                        key={auth.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          status.warning ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700" : "bg-muted/30"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium">{auth.auth_number}</span>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {auth.payer.name} • {format(parseISO(auth.start_date), 'MMM d, yyyy')} – {format(parseISO(auth.end_date), 'MMM d, yyyy')}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditAuth(auth)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteAuthConfirm(auth.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Units: {auth.units_used} / {auth.units_approved}</span>
                            <span className="text-muted-foreground">
                              {auth.units_remaining} remaining
                            </span>
                          </div>
                          <Progress value={usagePercent} className="h-2" />
                        </div>

                        {auth.service_codes && auth.service_codes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {auth.service_codes.map(code => (
                              <Badge key={code} variant="outline" className="text-xs font-mono">
                                {code}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Add/Edit Payer Dialog */}
      <Dialog open={showAddPayer} onOpenChange={(o) => { if (!o) { setShowAddPayer(false); setEditingPayer(null); resetPayerForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPayer ? 'Edit Payer' : 'Add Payer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingPayer && allPayers.length > 0 && (
              <div className="flex gap-2">
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

            {payerMode === 'select' && allPayers.length > 0 ? (
              <div>
                <Label>Select Payer</Label>
                <Select value={selectedPayerId} onValueChange={setSelectedPayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a payer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allPayers.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.payer_type && `(${p.payer_type})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Payer Name *</Label>
                  <Input
                    value={newPayerName}
                    onChange={(e) => setNewPayerName(e.target.value)}
                    placeholder="e.g., Blue Cross"
                  />
                </div>
                <div>
                  <Label>Payer Type</Label>
                  <Select value={newPayerType} onValueChange={setNewPayerType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Member ID</Label>
                <Input value={memberId} onChange={(e) => setMemberId(e.target.value)} />
              </div>
              <div>
                <Label>Group #</Label>
                <Input value={groupNumber} onChange={(e) => setGroupNumber(e.target.value)} />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Set as primary payer</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddPayer(false); setEditingPayer(null); resetPayerForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSavePayer} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPayer ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Auth Dialog */}
      <Dialog open={showAddAuth} onOpenChange={(o) => { if (!o) { setShowAddAuth(false); setEditingAuth(null); resetAuthForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAuth ? 'Edit Authorization' : 'Add Authorization'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Payer *</Label>
              <Select value={authPayerId} onValueChange={setAuthPayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payer..." />
                </SelectTrigger>
                <SelectContent>
                  {clientPayers.length > 0 ? (
                    clientPayers.map(cp => (
                      <SelectItem key={cp.payer_id} value={cp.payer_id}>
                        {cp.payer.name}
                      </SelectItem>
                    ))
                  ) : (
                    allPayers.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Authorization Number *</Label>
              <Input value={authNumber} onChange={(e) => setAuthNumber(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={authStartDate} onChange={(e) => setAuthStartDate(e.target.value)} />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={authEndDate} onChange={(e) => setAuthEndDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Units Approved</Label>
                <Input
                  type="number"
                  min="0"
                  value={authUnitsApproved}
                  onChange={(e) => setAuthUnitsApproved(e.target.value)}
                />
              </div>
              <div>
                <Label>Unit Type</Label>
                <Select value={authUnitType} onValueChange={setAuthUnitType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15min">15-minute</SelectItem>
                    <SelectItem value="30min">30-minute</SelectItem>
                    <SelectItem value="1hr">Hourly</SelectItem>
                    <SelectItem value="session">Per session</SelectItem>
                    <SelectItem value="day">Per day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Service Codes</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                {SERVICE_CODES.map(s => (
                  <label key={s.code} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authServiceCodes.includes(s.code)}
                      onChange={() => {
                        setAuthServiceCodes(prev =>
                          prev.includes(s.code)
                            ? prev.filter(c => c !== s.code)
                            : [...prev, s.code]
                        );
                      }}
                      className="rounded"
                    />
                    <span className="font-mono">{s.code}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={authNotes} onChange={(e) => setAuthNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddAuth(false); setEditingAuth(null); resetAuthForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveAuth} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingAuth ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmations */}
      <ConfirmDialog
        open={!!deletePayerConfirm}
        onOpenChange={(o) => !o && setDeletePayerConfirm(null)}
        title="Remove Payer?"
        description="This will remove the payer from this client. The payer will still exist in the system for other clients."
        confirmLabel="Remove"
        onConfirm={handleDeletePayer}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!deleteAuthConfirm}
        onOpenChange={(o) => !o && setDeleteAuthConfirm(null)}
        title="Delete Authorization?"
        description="This will permanently delete this authorization. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteAuth}
        variant="destructive"
      />
    </div>
  );
}
