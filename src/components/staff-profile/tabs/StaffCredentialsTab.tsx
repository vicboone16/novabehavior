import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Shield, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import type { StaffCredential } from '@/types/staffProfile';
import { CREDENTIAL_TYPES } from '@/types/staffProfile';

interface StaffCredentialsTabProps {
  userId: string;
  credentials: StaffCredential[];
  refetch: () => void;
}

export function StaffCredentialsTab({ userId, credentials, refetch }: StaffCredentialsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    credential_type: '',
    credential_number: '',
    issuing_body: '',
    issue_date: '',
    expiration_date: '',
    notes: '',
  });

  const handleAdd = async () => {
    if (!formData.credential_type) {
      toast.error('Credential type is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('staff_credentials').insert({
        user_id: userId,
        credential_type: formData.credential_type,
        credential_number: formData.credential_number || null,
        issuing_body: formData.issuing_body || null,
        issue_date: formData.issue_date || null,
        expiration_date: formData.expiration_date || null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success('Credential added');
      setDialogOpen(false);
      setFormData({
        credential_type: '',
        credential_number: '',
        issuing_body: '',
        issue_date: '',
        expiration_date: '',
        notes: '',
      });
      refetch();
    } catch (error) {
      console.error('Error adding credential:', error);
      toast.error('Failed to add credential');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string, expirationDate: string | null) => {
    if (expirationDate) {
      const daysUntilExpiry = differenceInDays(new Date(expirationDate), new Date());
      if (daysUntilExpiry < 0) {
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      }
      if (daysUntilExpiry < 30) {
        return <Clock className="h-4 w-4 text-amber-500" />;
      }
    }
    
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'invalid':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getExpiryBadge = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    
    const daysUntilExpiry = differenceInDays(new Date(expirationDate), new Date());
    
    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (daysUntilExpiry < 30) {
      return <Badge className="bg-amber-500">Expires in {daysUntilExpiry} days</Badge>;
    }
    if (daysUntilExpiry < 90) {
      return <Badge variant="outline">Expires in {daysUntilExpiry} days</Badge>;
    }
    return null;
  };

  // Group credentials by expiry status
  const expiredCredentials = credentials.filter(c => 
    c.expiration_date && differenceInDays(new Date(c.expiration_date), new Date()) < 0
  );
  const expiringCredentials = credentials.filter(c =>
    c.expiration_date && 
    differenceInDays(new Date(c.expiration_date), new Date()) >= 0 &&
    differenceInDays(new Date(c.expiration_date), new Date()) < 30
  );

  return (
    <div className="space-y-6 mt-6">
      {/* Alerts */}
      {(expiredCredentials.length > 0 || expiringCredentials.length > 0) && (
        <div className="space-y-3">
          {expiredCredentials.length > 0 && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Expired Credentials</p>
                <p className="text-sm text-muted-foreground">
                  {expiredCredentials.map(c => c.credential_type).join(', ')} need renewal
                </p>
              </div>
            </div>
          )}
          {expiringCredentials.length > 0 && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-700">Expiring Soon</p>
                <p className="text-sm text-muted-foreground">
                  {expiringCredentials.map(c => c.credential_type).join(', ')} expire within 30 days
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Credentials & Certifications
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Credential
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Credential</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Credential Type *</Label>
                  <Select
                    value={formData.credential_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, credential_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CREDENTIAL_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Credential Number</Label>
                  <Input
                    value={formData.credential_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, credential_number: e.target.value }))}
                    placeholder="e.g., 123456"
                  />
                </div>
                
                <div>
                  <Label>Issuing Body</Label>
                  <Input
                    value={formData.issuing_body}
                    onChange={(e) => setFormData(prev => ({ ...prev, issuing_body: e.target.value }))}
                    placeholder="e.g., BACB"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Issue Date</Label>
                    <Input
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Expiration Date</Label>
                    <Input
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiration_date: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                
                <Button onClick={handleAdd} disabled={saving} className="w-full">
                  {saving ? 'Adding...' : 'Add Credential'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {credentials.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Issuing Body</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map(cred => (
                  <TableRow key={cred.id}>
                    <TableCell className="font-medium">{cred.credential_type}</TableCell>
                    <TableCell>{cred.credential_number || '—'}</TableCell>
                    <TableCell>{cred.issuing_body || '—'}</TableCell>
                    <TableCell>
                      {cred.issue_date ? format(new Date(cred.issue_date), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cred.expiration_date ? format(new Date(cred.expiration_date), 'MMM d, yyyy') : '—'}
                        {getExpiryBadge(cred.expiration_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(cred.verification_status, cred.expiration_date)}
                        <span className="capitalize">{cred.verification_status}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Credentials</h3>
              <p className="text-muted-foreground">Add credentials to track certifications and licenses.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
