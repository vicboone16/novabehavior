import { useState, useEffect } from 'react';
import { Copy, Plus, XCircle, Clock, CheckCircle2, AlertTriangle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInviteCodes, InviteCode } from '@/hooks/useInviteCodes';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface InviteCaregiverSectionProps {
  studentId: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  active: { icon: Clock, variant: 'default', label: 'Active' },
  used: { icon: CheckCircle2, variant: 'secondary', label: 'Used' },
  expired: { icon: AlertTriangle, variant: 'outline', label: 'Expired' },
  revoked: { icon: XCircle, variant: 'destructive', label: 'Revoked' },
};

export function InviteCaregiverSection({ studentId }: InviteCaregiverSectionProps) {
  const { codes, loading, fetchCodes, generateCode, revokeCode } = useInviteCodes();
  const { currentAgency } = useAgencyContext();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Generate form state
  const [expiresInDays, setExpiresInDays] = useState('14');
  const [canViewNotes, setCanViewNotes] = useState(false);
  const [canViewDocuments, setCanViewDocuments] = useState(false);
  const [canCollectData, setCanCollectData] = useState(false);

  useEffect(() => {
    fetchCodes(studentId);
  }, [studentId, fetchCodes]);

  const handleGenerate = async () => {
    if (!currentAgency) {
      toast.error('No agency selected');
      return;
    }
    const result = await generateCode({
      agencyId: currentAgency.id,
      clientId: studentId,
      permissionLevel: 'view',
      canViewNotes,
      canViewDocuments,
      canCollectData,
      expiresInDays: parseInt(expiresInDays) || 14,
    });
    if (result) {
      setGeneratedCode(result.code);
      fetchCodes(studentId);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const handleRevoke = async (codeId: string) => {
    await revokeCode(codeId);
    fetchCodes(studentId);
  };

  const activeCodes = codes.filter(c => c.status === 'active');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Invite Codes
        </h3>
        <Button size="sm" onClick={() => { setGeneratedCode(null); setShowGenerateDialog(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Invite Caregiver
        </Button>
      </div>

      {codes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No invite codes generated yet</p>
            <p className="text-xs mt-1">Generate a code to link a parent or caregiver from Behavior Decoded</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const config = STATUS_CONFIG[code.status] || STATUS_CONFIG.active;
                  const Icon = config.icon;
                  return (
                    <TableRow key={code.id}>
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{code.code}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1 text-[10px]">
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{code.uses_count}/{code.max_uses}</TableCell>
                      <TableCell className="text-xs">
                        {code.expires_at ? format(new Date(code.expires_at), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(code.created_at), 'MMM d')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopyCode(code.code)} title="Copy code">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          {code.status === 'active' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRevoke(code.id)} title="Revoke">
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Generate Code Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invite Code</DialogTitle>
            <DialogDescription>
              Create a code for a parent/caregiver to link their Behavior Decoded account to this learner.
            </DialogDescription>
          </DialogHeader>

          {generatedCode ? (
            <div className="space-y-4">
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Share this code with the caregiver:</p>
                <code className="text-2xl font-mono font-bold tracking-wider">{generatedCode}</code>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => handleCopyCode(generatedCode)}>
                  <Copy className="h-3.5 w-3.5" /> Copy Code
                </Button>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                <p className="font-medium mb-1">Instructions for the caregiver:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Open the Behavior Decoded app</li>
                  <li>Go to Settings → Link to Provider</li>
                  <li>Enter the code above</li>
                  <li>Tap "Link" to connect</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Code Expiration</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Permission Flags</Label>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Can view session notes</Label>
                  <Switch checked={canViewNotes} onCheckedChange={setCanViewNotes} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Can view documents</Label>
                  <Switch checked={canViewDocuments} onCheckedChange={setCanViewDocuments} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Can collect data</Label>
                  <Switch checked={canCollectData} onCheckedChange={setCanCollectData} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              {generatedCode ? 'Done' : 'Cancel'}
            </Button>
            {!generatedCode && (
              <Button onClick={handleGenerate}>Generate Code</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
