import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Copy, Plus, Loader2, Link2, Ban, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface InviteCode {
  id: string;
  code: string;
  agency_id: string;
  role: string;
  max_uses: number;
  uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
}

interface AgencyInviteCodesTabProps {
  agencyId: string;
}

export function AgencyInviteCodesTab({ agencyId }: AgencyInviteCodesTabProps) {
  const { user } = useAuth();
  const { agencies } = useAgencyContext();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // New code form
  const [selectedAgencyId, setSelectedAgencyId] = useState(agencyId);
  const [newRole, setNewRole] = useState('staff');
  const [newMaxUses, setNewMaxUses] = useState('10');
  const [newExpiresDays, setNewExpiresDays] = useState('30');

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agency_invite_codes')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCodes((data || []) as InviteCode[]);
    } catch (err: any) {
      toast.error('Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { data: generatedCode, error: codeErr } = await supabase.rpc('generate_agency_invite_code');
      if (codeErr) throw codeErr;

      const expiresAt = newExpiresDays !== 'never'
        ? new Date(Date.now() + parseInt(newExpiresDays) * 86400000).toISOString()
        : null;

      const { error } = await supabase
        .from('agency_invite_codes')
        .insert({
          code: generatedCode,
          agency_id: selectedAgencyId,
          role: newRole,
          max_uses: parseInt(newMaxUses),
          expires_at: expiresAt,
          created_by: user.id,
        });

      if (error) throw error;
      toast.success('Invite code created');
      setShowCreate(false);
      fetchCodes();
    } catch (err: any) {
      toast.error('Failed to create code: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (code: InviteCode) => {
    try {
      const { error } = await supabase
        .from('agency_invite_codes')
        .update({ is_active: !code.is_active, updated_at: new Date().toISOString() })
        .eq('id', code.id);
      if (error) throw error;
      toast.success(code.is_active ? 'Code disabled' : 'Code re-enabled');
      fetchCodes();
    } catch (err: any) {
      toast.error('Failed to update code');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const isExpired = (c: InviteCode) => c.expires_at && new Date(c.expires_at) < new Date();
  const isExhausted = (c: InviteCode) => c.uses >= c.max_uses;

  const getStatusBadge = (c: InviteCode) => {
    if (!c.is_active) return <Badge variant="secondary">Disabled</Badge>;
    if (isExpired(c)) return <Badge variant="destructive">Expired</Badge>;
    if (isExhausted(c)) return <Badge variant="secondary">Used Up</Badge>;
    return <Badge className="bg-green-600 text-white">Active</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Generate invite codes for staff to join this agency.
        </p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Code
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No invite codes yet</p>
            <p className="text-xs mt-1">Create one to invite staff to this agency</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-bold">{c.code}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(c.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      {getStatusBadge(c)}
                      <Badge variant="outline" className="capitalize">{c.role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.uses}/{c.max_uses} uses
                      {c.expires_at && ` · Expires ${new Date(c.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(c)}
                    title={c.is_active ? 'Disable' : 'Re-enable'}
                  >
                    {c.is_active ? <Ban className="h-4 w-4 text-destructive" /> : <RotateCcw className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Code Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Agency Invite Code</DialogTitle>
            <DialogDescription>
              Anyone with this code can join the agency with the selected role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {agencies.length > 1 && (
              <div>
                <Label>Agency</Label>
                <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {agencies.map((m) => (
                      <SelectItem key={m.agency_id} value={m.agency_id}>
                        {m.agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="bcba">BCBA</SelectItem>
                  <SelectItem value="rbt">RBT</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max Uses</Label>
              <Input
                type="number"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                min={1}
              />
            </div>
            <div>
              <Label>Expires In</Label>
              <Select value={newExpiresDays} onValueChange={setNewExpiresDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Generate Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
