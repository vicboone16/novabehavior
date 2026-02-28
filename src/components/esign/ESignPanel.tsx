import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Send, FileSignature, ExternalLink, Download, Loader2, RefreshCw, Clock,
  CheckCircle2, XCircle, Eye, AlertCircle, Plus, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface ESignEnvelope {
  id: string;
  org_id: string;
  client_id: string;
  template_id: string | null;
  provider: string;
  provider_document_id: string | null;
  status: string;
  subject: string | null;
  message: string | null;
  sent_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ESignRecipient {
  id: string;
  envelope_id: string;
  role: string;
  name: string;
  email: string;
  signing_order: number;
  status: string;
}

interface ESignTemplate {
  id: string;
  name: string;
  description: string | null;
  boldsign_template_id: string | null;
  is_active: boolean;
}

interface SignerInput {
  name: string;
  email: string;
  role: string;
  signerOrder: number;
}

interface ESignPanelProps {
  clientId: string;
  orgId: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  draft: { label: 'Draft', icon: Clock, className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', icon: Send, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  viewed: { label: 'Viewed', icon: Eye, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  signed: { label: 'Signed', icon: FileSignature, className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  declined: { label: 'Declined', icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  expired: { label: 'Expired', icon: AlertCircle, className: 'bg-muted text-muted-foreground' },
  voided: { label: 'Voided', icon: XCircle, className: 'bg-muted text-muted-foreground' },
};

export function ESignPanel({ clientId, orgId }: ESignPanelProps) {
  const [envelopes, setEnvelopes] = useState<ESignEnvelope[]>([]);
  const [recipients, setRecipients] = useState<Record<string, ESignRecipient[]>>({});
  const [templates, setTemplates] = useState<ESignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null);
  const [embeddedDialogOpen, setEmbeddedDialogOpen] = useState(false);

  // Send form state
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [signers, setSigners] = useState<SignerInput[]>([
    { name: '', email: '', role: 'signer', signerOrder: 1 },
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [envRes, tmplRes] = await Promise.all([
        supabase
          .from('esign_envelopes')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
        supabase
          .from('esign_document_templates')
          .select('*')
          .eq('is_active', true),
      ]);

      if (envRes.error) throw envRes.error;
      if (tmplRes.error) throw tmplRes.error;

      setEnvelopes((envRes.data as any[]) || []);
      setTemplates((tmplRes.data as any[]) || []);

      // Load recipients for all envelopes
      if (envRes.data?.length) {
        const envIds = envRes.data.map((e: any) => e.id);
        const { data: recs } = await supabase
          .from('esign_recipients')
          .select('*')
          .in('envelope_id', envIds);

        const grouped: Record<string, ESignRecipient[]> = {};
        (recs as any[] || []).forEach((r: any) => {
          if (!grouped[r.envelope_id]) grouped[r.envelope_id] = [];
          grouped[r.envelope_id].push(r);
        });
        setRecipients(grouped);
      }
    } catch (err) {
      console.error('Error loading eSign data:', err);
      toast.error('Failed to load eSign data');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSend = async () => {
    if (!selectedTemplateId || signers.some(s => !s.name || !s.email)) {
      toast.error('Select a template and fill in all signer details');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('esign-boldsign-send', {
        body: {
          templateId: selectedTemplateId,
          clientId,
          orgId,
          subject,
          message,
          signers,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send');

      toast.success('Document sent for signature');
      setSendDialogOpen(false);
      resetSendForm();
      loadData();
    } catch (err: any) {
      console.error('Send error:', err);
      toast.error(err.message || 'Failed to send document');
    } finally {
      setSending(false);
    }
  };

  const handleGetEmbeddedLink = async (envelopeId: string, signerEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('esign-boldsign-embedded-link', {
        body: { envelopeId, signerEmail },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to get link');

      setEmbeddedUrl(data.signLink);
      setEmbeddedDialogOpen(true);
    } catch (err: any) {
      console.error('Embedded link error:', err);
      toast.error(err.message || 'Failed to get signing link');
    }
  };

  const handleDownload = async (envelope: ESignEnvelope) => {
    if (!envelope.provider_document_id) return;
    try {
      const { data, error } = await supabase.functions.invoke('esign-boldsign-download', {
        body: {},
        method: 'GET',
      });
      // For GET with query params, construct manually
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/esign-boldsign-download?documentId=${envelope.provider_document_id}&envelopeId=${envelope.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      if (result.signedUrl) {
        window.open(result.signedUrl, '_blank');
      }
      toast.success('Signed document downloaded');
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error(err.message || 'Failed to download');
    }
  };

  const resetSendForm = () => {
    setSelectedTemplateId('');
    setSubject('');
    setMessage('');
    setSigners([{ name: '', email: '', role: 'signer', signerOrder: 1 }]);
  };

  const addSigner = () => {
    setSigners([...signers, { name: '', email: '', role: 'signer', signerOrder: signers.length + 1 }]);
  };

  const removeSigner = (index: number) => {
    if (signers.length <= 1) return;
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index: number, field: keyof SignerInput, value: string | number) => {
    const updated = [...signers];
    (updated[index] as any)[field] = value;
    setSigners(updated);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            eSignatures
          </h4>
          <p className="text-xs text-muted-foreground">
            Send and track documents for electronic signature
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Send className="h-3.5 w-3.5 mr-1" />
                Send for Signature
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Send Document for Signature</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template *</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No templates configured. Add templates in admin settings.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Document subject" />
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Optional message to signers" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Signers *</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addSigner}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Signer
                    </Button>
                  </div>
                  {signers.map((signer, i) => (
                    <Card key={i}>
                      <CardContent className="pt-3 pb-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Signer {i + 1}</span>
                          {signers.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => removeSigner(i)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Full name"
                          value={signer.name}
                          onChange={e => updateSigner(i, 'name', e.target.value)}
                        />
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={signer.email}
                          onChange={e => updateSigner(i, 'email', e.target.value)}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSend} disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    Send
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Envelope List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : envelopes.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            No eSignature documents yet. Click "Send for Signature" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {envelopes.map(env => {
            const envRecipients = recipients[env.id] || [];
            return (
              <Card key={env.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{env.subject || 'Untitled Document'}</p>
                        {getStatusBadge(env.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {env.sent_at
                            ? `Sent ${formatDistanceToNow(new Date(env.sent_at), { addSuffix: true })}`
                            : `Created ${formatDistanceToNow(new Date(env.created_at), { addSuffix: true })}`}
                        </span>
                        {envRecipients.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {envRecipients.map(r => r.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Open Signing button for pending signers */}
                      {['sent', 'viewed'].includes(env.status) && envRecipients.some(r => r.status === 'pending' || r.status === 'viewed') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const pendingSigner = envRecipients.find(r => r.status === 'pending' || r.status === 'viewed');
                            if (pendingSigner) handleGetEmbeddedLink(env.id, pendingSigner.email);
                          }}
                          title="Open embedded signing"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Download signed PDF */}
                      {env.status === 'completed' && env.provider_document_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(env)}
                          title="Download signed PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Embedded Signing Dialog */}
      <Dialog open={embeddedDialogOpen} onOpenChange={setEmbeddedDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
          </DialogHeader>
          {embeddedUrl ? (
            <iframe
              src={embeddedUrl}
              className="w-full h-full border rounded-md"
              title="BoldSign Embedded Signing"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
