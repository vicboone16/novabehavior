import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, Award, Calendar, Check, Clock, FileText, 
  Loader2, Plus, Shield, Upload, X
} from 'lucide-react';
import { format, differenceInDays, addDays, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface Credential {
  id: string;
  user_id: string;
  credential_type: string;
  credential_number: string | null;
  issuing_body: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  is_verified: boolean;
  verified_by: string | null;
  document_path: string | null;
  notes: string | null;
  created_at: string;
  // Joined data
  user_name?: string;
  user_email?: string;
}

interface CredentialTrackerProps {
  userId?: string; // If provided, show only for this user
  showAllStaff?: boolean; // Admin view of all staff credentials
}

export function CredentialTracker({ userId, showAllStaff = false }: CredentialTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; display_name: string; email: string }[]>([]);
  
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  
  const [form, setForm] = useState({
    user_id: userId || '',
    credential_type: '',
    credential_number: '',
    issuing_body: '',
    issue_date: '',
    expiration_date: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [userId, showAllStaff]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Build query based on view mode
      let query = supabase.from('staff_credentials').select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: credentialsData, error } = await query.order('expiration_date', { ascending: true });
      
      if (error) throw error;

      // Load profiles for name display
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .eq('is_approved', true);

      setProfiles(profilesData || []);

      // Merge profile data with credentials
      const enrichedCredentials = (credentialsData || []).map(c => {
        const profile = profilesData?.find(p => p.user_id === c.user_id);
        return {
          ...c,
          user_name: profile?.display_name || 'Unknown',
          user_email: profile?.email,
        };
      });

      setCredentials(enrichedCredentials);
    } catch (error: any) {
      toast({ title: 'Failed to load credentials', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getExpirationStatus = (expirationDate: string | null) => {
    if (!expirationDate) return { status: 'unknown', label: 'No expiration', color: 'text-muted-foreground' };
    
    const expDate = new Date(expirationDate);
    const daysUntil = differenceInDays(expDate, new Date());
    
    if (isPast(expDate)) {
      return { status: 'expired', label: 'Expired', color: 'text-destructive' };
    }
    if (daysUntil <= 30) {
      return { status: 'expiring-soon', label: `${daysUntil} days`, color: 'text-orange-500' };
    }
    if (daysUntil <= 90) {
      return { status: 'warning', label: `${daysUntil} days`, color: 'text-yellow-500' };
    }
    return { status: 'valid', label: `${daysUntil} days`, color: 'text-green-500' };
  };

  const handleSaveCredential = async () => {
    try {
      const payload = {
        user_id: form.user_id || userId || user?.id,
        credential_type: form.credential_type,
        credential_number: form.credential_number || null,
        issuing_body: form.issuing_body || null,
        issue_date: form.issue_date || null,
        expiration_date: form.expiration_date || null,
        notes: form.notes || null,
      };

      if (editingCredential) {
        const { error } = await supabase
          .from('staff_credentials')
          .update(payload)
          .eq('id', editingCredential.id);
        if (error) throw error;
        toast({ title: 'Credential updated' });
      } else {
        const { error } = await supabase.from('staff_credentials').insert(payload);
        if (error) throw error;
        toast({ title: 'Credential added' });
      }

      setShowAddCredential(false);
      setEditingCredential(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({ title: 'Failed to save credential', description: error.message, variant: 'destructive' });
    }
  };

  const handleVerifyCredential = async (credential: Credential) => {
    try {
      const { error } = await supabase
        .from('staff_credentials')
        .update({
          is_verified: true,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', credential.id);

      if (error) throw error;
      toast({ title: 'Credential verified' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Failed to verify', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteCredential = async (id: string) => {
    try {
      const { error } = await supabase.from('staff_credentials').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Credential removed' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setForm({
      user_id: userId || '',
      credential_type: '',
      credential_number: '',
      issuing_body: '',
      issue_date: '',
      expiration_date: '',
      notes: '',
    });
  };

  const openEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setForm({
      user_id: credential.user_id,
      credential_type: credential.credential_type,
      credential_number: credential.credential_number || '',
      issuing_body: credential.issuing_body || '',
      issue_date: credential.issue_date || '',
      expiration_date: credential.expiration_date || '',
      notes: credential.notes || '',
    });
    setShowAddCredential(true);
  };

  // Group credentials by expiration status for alerts
  const expiredCredentials = credentials.filter(c => {
    const status = getExpirationStatus(c.expiration_date);
    return status.status === 'expired';
  });

  const expiringCredentials = credentials.filter(c => {
    const status = getExpirationStatus(c.expiration_date);
    return status.status === 'expiring-soon';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts for expiring/expired credentials */}
      {(expiredCredentials.length > 0 || expiringCredentials.length > 0) && (
        <div className="space-y-2">
          {expiredCredentials.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-center gap-3 py-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span className="font-medium text-destructive">
                  {expiredCredentials.length} expired credential{expiredCredentials.length > 1 ? 's' : ''} require attention
                </span>
              </CardContent>
            </Card>
          )}
          {expiringCredentials.length > 0 && (
            <Card className="border-orange-500/50 bg-orange-500/5">
              <CardContent className="flex items-center gap-3 py-3">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-orange-600">
                  {expiringCredentials.length} credential{expiringCredentials.length > 1 ? 's' : ''} expiring within 30 days
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main credentials card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Credentials & Certifications
            </CardTitle>
            <CardDescription>
              Track and manage professional credentials and their expiration dates
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setShowAddCredential(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Credential
          </Button>
        </CardHeader>
        <CardContent>
          {credentials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No credentials on file</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowAddCredential(true)}
              >
                Add First Credential
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {showAllStaff && <TableHead>Staff Member</TableHead>}
                  <TableHead>Credential</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Issuing Body</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map(credential => {
                  const expStatus = getExpirationStatus(credential.expiration_date);
                  return (
                    <TableRow key={credential.id}>
                      {showAllStaff && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {credential.user_name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{credential.user_name}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{credential.credential_type}</TableCell>
                      <TableCell>{credential.credential_number || '-'}</TableCell>
                      <TableCell>{credential.issuing_body || '-'}</TableCell>
                      <TableCell>
                        {credential.expiration_date 
                          ? format(new Date(credential.expiration_date), 'MMM d, yyyy')
                          : 'No expiration'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-medium", expStatus.color)}>
                            {expStatus.label}
                          </span>
                          {credential.is_verified && (
                            <Badge variant="outline" className="text-green-600 border-green-500/30">
                              <Check className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!credential.is_verified && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleVerifyCredential(credential)}
                              title="Verify credential"
                            >
                              <Shield className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(credential)}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCredential(credential.id)}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Credential Dialog */}
      <Dialog open={showAddCredential} onOpenChange={(open) => {
        setShowAddCredential(open);
        if (!open) {
          setEditingCredential(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCredential ? 'Edit Credential' : 'Add Credential'}
            </DialogTitle>
            <DialogDescription>
              Enter credential details. Expiration dates will trigger reminders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {showAllStaff && !userId && (
              <div className="space-y-2">
                <Label>Staff Member</Label>
                <Select 
                  value={form.user_id}
                  onValueChange={(v) => setForm(f => ({ ...f, user_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.display_name || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Credential Type *</Label>
                <Select 
                  value={form.credential_type}
                  onValueChange={(v) => setForm(f => ({ ...f, credential_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BCBA">BCBA</SelectItem>
                    <SelectItem value="BCBA-D">BCBA-D</SelectItem>
                    <SelectItem value="BCaBA">BCaBA</SelectItem>
                    <SelectItem value="RBT">RBT</SelectItem>
                    <SelectItem value="QBA">QBA</SelectItem>
                    <SelectItem value="State License">State License</SelectItem>
                    <SelectItem value="CPR/First Aid">CPR/First Aid</SelectItem>
                    <SelectItem value="NPI">NPI</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Credential Number</Label>
                <Input
                  value={form.credential_number}
                  onChange={(e) => setForm(f => ({ ...f, credential_number: e.target.value }))}
                  placeholder="e.g., 1-23-45678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Issuing Body</Label>
              <Input
                value={form.issuing_body}
                onChange={(e) => setForm(f => ({ ...f, issuing_body: e.target.value }))}
                placeholder="e.g., BACB, State Board"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => setForm(f => ({ ...f, issue_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Input
                  type="date"
                  value={form.expiration_date}
                  onChange={(e) => setForm(f => ({ ...f, expiration_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCredential(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCredential} disabled={!form.credential_type}>
              {editingCredential ? 'Update' : 'Add'} Credential
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
