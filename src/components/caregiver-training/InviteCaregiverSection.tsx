import { useState, useEffect } from 'react';
import { Copy, Plus, XCircle, Clock, CheckCircle2, AlertTriangle, UserPlus, RefreshCw, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
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
  disabled: { icon: XCircle, variant: 'destructive', label: 'Disabled' },
  revoked: { icon: XCircle, variant: 'destructive', label: 'Revoked' },
};

function isExpired(code: InviteCode): boolean {
  return !!code.expires_at && new Date(code.expires_at) < new Date();
}

function canReEnable(code: InviteCode): boolean {
  return (
    (code.status === 'disabled' || code.status === 'revoked') &&
    code.uses_count < code.max_uses &&
    !isExpired(code)
  );
}

export function InviteCaregiverSection({ studentId }: InviteCaregiverSectionProps) {
  const { codes, loading, fetchCodes, generateCode, updateCodeStatus } = useInviteCodes();
  const { currentAgency } = useAgencyContext();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendCode, setSendCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Generate form state
  const [maxUses, setMaxUses] = useState('1');
  const [expiresInDays, setExpiresInDays] = useState('30');

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
      maxUses: parseInt(maxUses) || 1,
      expiresInDays: expiresInDays === 'none' ? null : parseInt(expiresInDays),
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

  const handleDisable = async (inviteId: string) => {
    await updateCodeStatus(inviteId, 'disabled');
    fetchCodes(studentId);
  };

  const handleReEnable = async (inviteId: string) => {
    await updateCodeStatus(inviteId, 'active');
    fetchCodes(studentId);
  };

  const handleShowSend = (code: string) => {
    setSendCode(code);
    setShowSendDialog(true);
  };

  const messageTemplate = `Hi! You've been invited to connect with your child's care team through the Behavior Decoded app.\n\nYour invite code is: ${sendCode}\n\nSteps:\n1. Download or open the Behavior Decoded app\n2. Go to Settings → Link to Provider\n3. Enter the code above\n4. Tap "Link" to connect\n\nThis code will let you view progress, submit logs, and stay connected with the team.`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageTemplate);
    toast.success('Message copied to clipboard');
  };

  const getDisplayStatus = (code: InviteCode) => {
    if (isExpired(code) && code.status === 'active') return 'expired';
    if (code.uses_count >= code.max_uses && code.status === 'active') return 'used';
    return code.status;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Invite Codes
        </h3>
        <Button size="sm" onClick={() => { setGeneratedCode(null); setMaxUses('1'); setExpiresInDays('30'); setShowGenerateDialog(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Generate New Code
        </Button>
      </div>

      {codes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No invite codes generated yet</p>
            <p className="text-xs mt-1">Generate a code to link a parent or caregiver</p>
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
                  <TableHead>Created At</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const displayStatus = getDisplayStatus(code);
                  const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.active;
                  const Icon = config.icon;
                  return (
                    <TableRow key={code.invite_id}>
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
                        {code.expires_at ? format(new Date(code.expires_at), 'MMM d, yyyy') : 'Never'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(code.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopyCode(code.code)} title="Copy code">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleShowSend(code.code)} title="Send to parent">
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          {code.status === 'active' && !isExpired(code) && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDisable(code.invite_id)} title="Disable code">
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canReEnable(code) && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => handleReEnable(code.invite_id)} title="Re-enable code">
                              <RefreshCw className="h-3.5 w-3.5" />
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
            <DialogTitle>Generate New Invite Code</DialogTitle>
            <DialogDescription>
              Create a code for a parent/caregiver to link their account to this learner.
            </DialogDescription>
          </DialogHeader>

          {generatedCode ? (
            <div className="space-y-4">
              <div className="text-center p-6 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Share this code with the caregiver:</p>
                <code className="text-2xl font-mono font-bold tracking-wider">{generatedCode}</code>
                <div className="flex justify-center gap-2 mt-3">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleCopyCode(generatedCode)}>
                    <Copy className="h-3.5 w-3.5" /> Copy Code
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setShowGenerateDialog(false); handleShowSend(generatedCode); }}>
                    <Send className="h-3.5 w-3.5" /> Send to Parent
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">How many times this code can be redeemed</p>
              </div>
              <div>
                <Label>Expiration</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="none">No expiry</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Send to Parent Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Send to Parent
            </DialogTitle>
            <DialogDescription>
              Copy this message and send it to the caregiver via your preferred channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              readOnly
              value={messageTemplate}
              rows={10}
              className="text-sm font-mono resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>Close</Button>
            <Button onClick={handleCopyMessage} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
